import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryStore } from "../stores/queryStore";
import { SyncManager } from "../managers/SyncManager";
import { useToast } from "./useToast";

/**
 * Custom hook to handle authentication flow
 * - Checks URL token (from Chrome extension)
 * - Validates localStorage token
 * - Implements automatic token refresh (50 minutes)
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
        // Store expiry time (50 minutes from now - refresh before 60min expiry)
        localStorage.setItem(
          "token_expiry",
          String(Date.now() + 50 * 60 * 1000),
        );

        // Clean URL
        window.history.replaceState({}, "", "/dashboard");

        // Initialize data loading
        await initialize(urlToken);
        setAuthChecked(true);

        // Start token refresh timer
        startTokenRefreshTimer();
        return;
      }

      // 2. Check localStorage token
      const storedToken = localStorage.getItem("auth_token");
      if (!storedToken) {
        console.log("No auth token found, redirecting to login");
        router.replace("/");
        return;
      }

      // 3. Check if token is expired or about to expire
      const tokenExpiry = localStorage.getItem("token_expiry");
      if (tokenExpiry && Date.now() >= Number(tokenExpiry)) {
        console.log("Token expired, attempting refresh...");
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          console.log("Token refresh failed, redirecting to login");
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

        // Start token refresh timer
        startTokenRefreshTimer();
      }
    };

    checkAuth();
  }, [searchParams, router, initialize]);

  // Token refresh timer - checks every 5 minutes
  const startTokenRefreshTimer = () => {
    const interval = setInterval(
      async () => {
        const tokenExpiry = localStorage.getItem("token_expiry");
        const timeUntilExpiry = tokenExpiry
          ? Number(tokenExpiry) - Date.now()
          : 0;

        // If less than 10 minutes until expiry, try to extend/refresh
        if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
          console.log(
            `Token expiring in ${Math.floor(timeUntilExpiry / 60000)} minutes, attempting refresh...`,
          );
          await refreshAccessToken();
        }

        // If already expired, force logout
        if (timeUntilExpiry <= 0) {
          console.log("Token expired, logging out...");
          showToast("Session expired. Please login again.", "error");
          logout();
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    // Also check immediately on mount
    const tokenExpiry = localStorage.getItem("token_expiry");
    const timeUntilExpiry = tokenExpiry ? Number(tokenExpiry) - Date.now() : 0;
    if (timeUntilExpiry < 10 * 60 * 1000 && timeUntilExpiry > 0) {
      refreshAccessToken();
    }

    // Cleanup on unmount
    return () => clearInterval(interval);
  };

  // Refresh access token by validating current token
  const refreshAccessToken = async (): Promise<boolean> => {
    const currentToken = localStorage.getItem("auth_token");
    if (!currentToken) {
      return false;
    }

    try {
      // Validate token with Google
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${currentToken}`,
      );

      if (response.ok) {
        const data = await response.json();
        // Token is still valid
        // Calculate new expiry based on token's actual expiry
        const expiresIn = data.expires_in || 3600; // seconds
        const newExpiry = Date.now() + (expiresIn - 600) * 1000; // Refresh 10 min before actual expiry

        console.log(
          `Token validated. Expires in ${expiresIn}s. Next refresh in ${Math.floor((newExpiry - Date.now()) / 60000)} minutes`,
        );

        localStorage.setItem("token_expiry", String(newExpiry));
        return true;
      } else {
        // Token is invalid
        console.error("Token validation failed:", response.status);
        showToast("Session expired. Please login again.", "error");
        logout();
        return false;
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      // Don't logout on network errors, just log
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
