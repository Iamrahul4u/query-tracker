"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WifiOff, RefreshCw, Wifi } from "lucide-react";

/**
 * ConnectionToast — Gmail-style offline detection + auto-retry
 *
 * Self-contained: all state lives here, so countdown ticks
 * never re-render the parent dashboard.
 *
 * Behavior:
 *   - Listens to `online`/`offline` browser events
 *   - When offline → dark bar slides up from bottom
 *   - Auto-retries with exponential backoff (2s → 4s → 8s → 16s → 30s cap)
 *   - Manual "Retry" button
 *   - On reconnect → calls `onReconnect()` to reload data,
 *     shows brief "Back online" confirmation, then hides
 */
export function ConnectionToast({ onReconnect }: { onReconnect?: () => void }) {
  const [status, setStatus] = useState<"online" | "offline" | "reconnected">("online");
  const [countdown, setCountdown] = useState(0);

  const attemptRef = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  // ── Helpers ──────────────────────────────────────────────

  const clearAllTimers = useCallback(() => {
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
  }, []);

  const ping = useCallback(async (): Promise<boolean> => {
    try {
      await fetch("/api/auth/session", { method: "HEAD", cache: "no-store" });
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleOnline = useCallback(() => {
    clearAllTimers();
    setCountdown(0);
    attemptRef.current = 0;
    setStatus("reconnected");
    onReconnectRef.current?.();
    // Show "Back online" for 3s then hide
    setTimeout(() => setStatus("online"), 3000);
  }, [clearAllTimers]);

  const startBackoff = useCallback(() => {
    clearAllTimers();

    const delay = Math.min(2000 * Math.pow(2, attemptRef.current), 30000);
    const secs = Math.ceil(delay / 1000);
    setCountdown(secs);

    // Tick countdown every second (isolated to this component)
    let remaining = secs;
    countdownTimer.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setCountdown(0);
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    // After delay, ping
    retryTimer.current = setTimeout(async () => {
      const ok = await ping();
      if (ok) {
        handleOnline();
      } else {
        attemptRef.current++;
        startBackoff(); // recurse with next backoff level
      }
    }, delay);
  }, [clearAllTimers, ping, handleOnline]);

  const retryNow = useCallback(async () => {
    clearAllTimers();
    setCountdown(0);
    const ok = await ping();
    if (ok) {
      handleOnline();
    } else {
      attemptRef.current++;
      startBackoff();
    }
  }, [clearAllTimers, ping, handleOnline, startBackoff]);

  // ── Event listeners (stable — no state in deps) ─────────

  useEffect(() => {
    const onOff = () => {
      setStatus("offline");
      attemptRef.current = 0;
      startBackoff();
    };

    const onOn = async () => {
      const ok = await ping();
      if (ok) handleOnline();
    };

    if (typeof window !== "undefined" && !navigator.onLine) {
      onOff();
    }

    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);

    return () => {
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // stable — all refs, no state deps

  // ── Render ──────────────────────────────────────────────

  if (status === "online") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[99999] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto mb-4 flex items-center gap-3 text-white px-5 py-3 rounded-xl shadow-2xl max-w-md w-full animate-slide-up ${
          status === "reconnected"
            ? "bg-green-700 border border-green-600"
            : "bg-gray-800 border border-gray-700"
        }`}
      >
        {status === "reconnected" ? (
          <>
            <Wifi className="w-5 h-5 text-green-300 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">Back online</p>
          </>
        ) : (
          <>
            <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Unable to connect</p>
              {countdown > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Retrying in {countdown}s...
                </p>
              )}
            </div>
            <button
              onClick={retryNow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}
