import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStore } from "../stores/queryStore";
import { SyncManager } from "../managers/SyncManager";
import { useToast } from "./useToast";

/**
 * Custom hook to handle authentication flow
 * - Checks URL token (from Chrome extension)
 * - Validates localStorage token
 * - Implements automatic token refresh using refresh_token
 * - Initializes data loading with cache
 * - Redirects to login if invalid
 */
export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const initialize = useQueryStore((state) => state.initialize);
  const { showToast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const urlToken = searchParams.get("token");
      const urlEmail = searchParams.get("email");

      // 1. Check URL token (from extension)
      if (urlToken) {
        localStorage.setItem("auth_token", urlToken);
        if (urlEmail) {
          localStorage.setItem("user_email", urlEmail);
        }
        // For extension tokens, set 50 min expiry (no refresh token available)
        const expiryTime = Date.now() + 50 * 60 * 1000;
        localStorage.setItem("token_expiry", String(expiryTime));

        // Clean URL
        window.history.replaceState({}, "", "/dashboard");

        // Initialize data loading
        await initialize(urlToken);
        setAuthChecked(true);
        return;
      }

      // 2. Check localStorage token
      const storedToken = localStorage.getItem("auth_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const tokenExpiry = localStorage.getItem("token_expiry");

      if (!storedToken) {
        router.replace("/");
        return;
      }

      // 3. Check if token is expired
      if (tokenExpiry && Date.now() >= Number(tokenExpiry)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          showToast("Session expired. Please login again.", "error");
          localStorage.clear();
          router.replace("/");
          return;
        }
      }

      // 4. Initialize data loading
      const currentToken = localStorage.getItem("auth_token");
      if (currentToken) {
        await initialize(currentToken);
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, [searchParams, router, initialize, showToast]);

  // Token refresh timer - check every 5 minutes for 1-hour tokens
  // Also detects system wake via timer drift
  useEffect(() => {
    if (!authChecked) return;

    let lastCheck = Date.now();

    const checkAndRefresh = async () => {
      const now = Date.now();
      const elapsed = now - lastCheck;
      lastCheck = now;

      const tokenExpiry = localStorage.getItem("token_expiry");

      if (!tokenExpiry) {
        return;
      }

      const timeUntilExpiry = Number(tokenExpiry) - Date.now();
      const minutesUntilExpiry = timeUntilExpiry / 1000 / 60;

      // Refresh when less than 10 minutes until expiry (for 1-hour tokens)
      const REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry

      if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
        const refreshToken = localStorage.getItem("refresh_token");
        await refreshAccessToken();
      }

      // If already expired, force refresh or logout
      if (timeUntilExpiry <= 0) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          showToast("Session expired. Please login again.", "error");
          logout();
        }
      }
    };

    // Immediate check
    checkAndRefresh();

    // Check every 5 minutes for 1-hour tokens
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [authChecked, showToast]);

  // Visibility change handler - refresh token when tab becomes active
  useEffect(() => {
    if (!authChecked) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const tokenExpiry = localStorage.getItem("token_expiry");
        if (!tokenExpiry) return;

        const timeUntilExpiry = Number(tokenExpiry) - Date.now();

        // If expired or expiring within 5 minutes, refresh immediately
        if (timeUntilExpiry < 5 * 60 * 1000) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            showToast("Session expired. Please login again.", "error");
            logout();
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authChecked, showToast]);

  // Refresh access token using server-side refresh endpoint
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("refresh_token");

    // If no refresh token, try to validate current token (extension flow)
    if (!refreshToken) {
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        return false;
      }

      try {
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${currentToken}`,
        );

        if (response.ok) {
          const data = await response.json();
          const expiresIn = data.expires_in || 3600;
          // For extension tokens, just update expiry if still valid
          const newExpiry = Date.now() + expiresIn * 1000;
          localStorage.setItem("token_expiry", String(newExpiry));
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    }

    // Use server-side refresh endpoint
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update stored token
        localStorage.setItem("auth_token", data.access_token);
        const newExpiry = Date.now() + data.expires_in * 1000;
        localStorage.setItem("token_expiry", String(newExpiry));

        return true;
      } else {
        const error = await response.json();

        if (error.requireReauth) {
          // Refresh token is invalid, must re-login
          return false;
        }
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  const logout = () => {
    // Stop background refresh and clear cache
    const syncManager = SyncManager.getInstance();
    syncManager.stopBackgroundRefresh();
    syncManager.clearCache();

    localStorage.clear();

    router.push("/");
  };

  return { authChecked, logout };
}
