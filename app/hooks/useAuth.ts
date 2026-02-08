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
      console.log("🔐 [AUTH-CHECK] Starting authentication check...");

      const urlToken = searchParams.get("token");
      const urlEmail = searchParams.get("email");

      // 1. Check URL token (from extension)
      if (urlToken) {
        console.log("🔐 [AUTH-CHECK] URL token found (extension flow)");
        localStorage.setItem("auth_token", urlToken);
        if (urlEmail) {
          localStorage.setItem("user_email", urlEmail);
        }
        // For extension tokens, set 50 min expiry (no refresh token available)
        const expiryTime = Date.now() + 50 * 60 * 1000;
        localStorage.setItem("token_expiry", String(expiryTime));
        console.log(
          `🔐 [AUTH-CHECK] Extension token stored, expires at: ${new Date(expiryTime).toLocaleTimeString()}`,
        );

        // Clean URL
        window.history.replaceState({}, "", "/dashboard");

        // Initialize data loading
        await initialize(urlToken);
        setAuthChecked(true);
        console.log("✅ [AUTH-CHECK] Extension auth complete");
        return;
      }

      // 2. Check localStorage token
      const storedToken = localStorage.getItem("auth_token");
      const refreshToken = localStorage.getItem("refresh_token");
      const tokenExpiry = localStorage.getItem("token_expiry");

      console.log("🔐 [AUTH-CHECK] LocalStorage check:");
      console.log(`  - auth_token: ${storedToken ? "EXISTS" : "MISSING"}`);
      console.log(
        `  - refresh_token: ${refreshToken ? "EXISTS ✅" : "MISSING ❌"}`,
      );
      console.log(
        `  - token_expiry: ${tokenExpiry ? new Date(Number(tokenExpiry)).toLocaleTimeString() : "MISSING"}`,
      );

      if (!storedToken) {
        console.log(
          "❌ [AUTH-CHECK] No auth token found, redirecting to login",
        );
        router.replace("/");
        return;
      }

      // 3. Check if token is expired
      if (tokenExpiry && Date.now() >= Number(tokenExpiry)) {
        const expiredAgo = Math.floor(
          (Date.now() - Number(tokenExpiry)) / 1000 / 60,
        );
        console.log(
          `⏰ [AUTH-CHECK] Token expired ${expiredAgo} minutes ago, attempting refresh...`,
        );
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          console.log("❌ [AUTH-CHECK] Token refresh failed");
          // Check if we have a refresh token - if yes, it's likely a network error
          const hasRefreshToken = localStorage.getItem("refresh_token");
          if (hasRefreshToken) {
            showToast(
              "Unable to refresh session. Please check your connection.",
              "error",
            );
          } else {
            showToast("Session expired. Please login again.", "error");
          }
          // Only clear auth tokens, not refresh token (user can retry)
          localStorage.removeItem("auth_token");
          localStorage.removeItem("token_expiry");
          router.replace("/");
          return;
        }
      } else if (tokenExpiry) {
        const minutesUntilExpiry = Math.floor(
          (Number(tokenExpiry) - Date.now()) / 1000 / 60,
        );
        console.log(
          `✅ [AUTH-CHECK] Token valid for ${minutesUntilExpiry} more minutes`,
        );
      }

      // 4. Initialize data loading
      const currentToken = localStorage.getItem("auth_token");
      if (currentToken) {
        console.log("🔐 [AUTH-CHECK] Initializing app with valid token...");
        await initialize(currentToken);
        setAuthChecked(true);
        console.log("✅ [AUTH-CHECK] Authentication check complete");
      }
    };

    checkAuth();
  }, [searchParams, router, initialize, showToast]);

  // Token refresh timer - check every 5 minutes for 1-hour tokens
  // Also detects system wake via timer drift
  useEffect(() => {
    if (!authChecked) return;

    console.log("⏰ Starting token refresh timer (5 minute interval)");

    let lastCheck = Date.now();

    const checkAndRefresh = async () => {
      const now = Date.now();
      const elapsed = now - lastCheck;
      lastCheck = now;

      // Detect system wake: if more than 6 minutes passed (timer is 5 min), system likely slept
      if (elapsed > 6 * 60 * 1000) {
        console.log(
          "🌙 System wake detected (timer drift), checking token immediately...",
        );
      }

      const tokenExpiry = localStorage.getItem("token_expiry");

      if (!tokenExpiry) {
        console.warn("⚠️ No token_expiry found, skipping expiry check");
        return;
      }

      const timeUntilExpiry = Number(tokenExpiry) - Date.now();
      const minutesUntilExpiry = timeUntilExpiry / 1000 / 60;

      // Refresh when less than 10 minutes until expiry (for 1-hour tokens)
      const REFRESH_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry

      if (timeUntilExpiry < REFRESH_THRESHOLD && timeUntilExpiry > 0) {
        console.log(
          `⏰ [REFRESH-TIMER] Token expiring in ${minutesUntilExpiry.toFixed(1)} min, refreshing...`,
        );
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          console.error(
            "❌ [REFRESH-TIMER] No refresh token available! User will be logged out.",
          );
        }
        await refreshAccessToken();
      }

      // If already expired, force refresh or logout
      if (timeUntilExpiry <= 0) {
        const expiredAgo = Math.abs(minutesUntilExpiry);
        console.log(
          `❌ [REFRESH-TIMER] Token expired ${expiredAgo.toFixed(1)} min ago, attempting refresh...`,
        );
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          console.error("❌ [REFRESH-TIMER] Refresh failed, logging out user");
          showToast("Session expired. Please login again.", "error");
          logout();
        }
      } else {
        console.log(
          `✅ [REFRESH-TIMER] Token valid for ${minutesUntilExpiry.toFixed(1)} more minutes`,
        );
      }
    };

    // Immediate check
    checkAndRefresh();

    // Check every 5 minutes for 1-hour tokens
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => {
      console.log("🛑 Stopping token refresh timer");
      clearInterval(interval);
    };
  }, [authChecked, showToast]);

  // Visibility change handler - refresh token when tab becomes active
  useEffect(() => {
    if (!authChecked) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible, checking token...");

        const tokenExpiry = localStorage.getItem("token_expiry");
        if (!tokenExpiry) return;

        const timeUntilExpiry = Number(tokenExpiry) - Date.now();

        // If expired or expiring within 5 minutes, refresh immediately
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log("⏰ Token expiring soon or expired, refreshing...");
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

    console.log("🔄 [TOKEN-REFRESH] Starting token refresh...");

    // If no refresh token, try to validate current token (extension flow)
    if (!refreshToken) {
      console.warn(
        "⚠️ [TOKEN-REFRESH] No refresh token available (extension flow or missing)",
      );
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        console.error(
          "❌ [TOKEN-REFRESH] No auth token either, refresh failed",
        );
        return false;
      }

      try {
        console.log(
          "🔄 [TOKEN-REFRESH] Validating current token with Google...",
        );
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${currentToken}`,
        );

        if (response.ok) {
          const data = await response.json();
          const expiresIn = data.expires_in || 3600;
          // For extension tokens, just update expiry if still valid
          const newExpiry = Date.now() + expiresIn * 1000;
          localStorage.setItem("token_expiry", String(newExpiry));
          console.log(
            `✅ [TOKEN-REFRESH] Token validated. Expires in ${expiresIn}s at ${new Date(newExpiry).toLocaleTimeString()}`,
          );
          return true;
        }
        console.error("❌ [TOKEN-REFRESH] Token validation failed");
        return false;
      } catch (error) {
        console.error("❌ [TOKEN-REFRESH] Token validation error:", error);
        return false;
      }
    }

    // Use server-side refresh endpoint
    try {
      console.log("🔄 [TOKEN-REFRESH] Calling /api/auth/refresh...");
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

        console.log(
          `✅ [TOKEN-REFRESH] Token refreshed! New token expires in ${data.expires_in}s at ${new Date(newExpiry).toLocaleTimeString()}`,
        );
        return true;
      } else {
        const error = await response.json();
        console.error("❌ [TOKEN-REFRESH] Refresh failed:", error);

        if (error.requireReauth || response.status === 401) {
          // Refresh token is invalid/revoked - ONLY NOW clear it
          console.error(
            "❌ [TOKEN-REFRESH] Refresh token invalid/revoked - clearing refresh token",
          );
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_email");
          return false;
        }
        // Other errors (500, etc.) - keep refresh token, might be temporary
        console.warn(
          "⚠️ [TOKEN-REFRESH] Server error, keeping refresh token for retry",
        );
        return false;
      }
    } catch (error) {
      console.error("❌ [TOKEN-REFRESH] Network/server error:", error);
      console.warn(
        "⚠️ [TOKEN-REFRESH] Network error - keeping refresh token, user can retry",
      );
      // Network error - KEEP refresh token, user can retry when network is back
      return false;
    }
  };

  const logout = () => {
    console.log("🚪 [LOGOUT] User logging out...");

    // Stop background refresh and clear cache
    const syncManager = SyncManager.getInstance();
    syncManager.stopBackgroundRefresh();
    syncManager.clearCache();

    console.log("🚪 [LOGOUT] Clearing auth-related localStorage...");
    // Clear auth-related localStorage only (preserve drafts)
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("user_email");

    // Clear cached data
    localStorage.removeItem("cached_queries");
    localStorage.removeItem("cached_users");
    localStorage.removeItem("cached_preferences");
    localStorage.removeItem("cache_timestamp");

    // Preserve: queryDrafts, queryDraftsBackup, lastSelectedUser, dashboard preferences

    console.log("🚪 [LOGOUT] Redirecting to login page...");
    // Redirect to login page
    router.push("/");
  };

  return { authChecked, logout };
}
