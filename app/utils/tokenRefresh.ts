/**
 * Token Refresh Utility
 *
 * Centralized token refresh logic that can be used by SyncManager
 * and other parts of the application when API calls fail with 401.
 */

/**
 * Result of a token refresh attempt
 */
export interface RefreshResult {
  token: string | null;
  wasRevoked: boolean; // true = token was revoked, must logout. false = network error, can retry
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns an object indicating success, token value, and whether logout is required.
 */
export async function refreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    console.warn("⚠️ [TOKEN-REFRESH] No refresh token available");
    return { token: null, wasRevoked: true }; // No refresh token = must login
  }

  try {
    console.log("🔄 [TOKEN-REFRESH] Attempting token refresh...");

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();

      // Update stored token and expiry
      localStorage.setItem("auth_token", data.access_token);
      const newExpiry = Date.now() + data.expires_in * 1000;
      localStorage.setItem("token_expiry", String(newExpiry));

      console.log(
        `✅ [TOKEN-REFRESH] Token refreshed! Expires at ${new Date(newExpiry).toLocaleTimeString()}`
      );

      return { token: data.access_token, wasRevoked: false };
    } else {
      const error = await response.json();
      console.error("❌ [TOKEN-REFRESH] Refresh failed:", error);

      // Only mark as revoked if it's actually invalid/revoked (401)
      const wasRevoked = error.requireReauth || response.status === 401;
      if (wasRevoked) {
        console.error("❌ [TOKEN-REFRESH] Refresh token revoked");
      }

      return { token: null, wasRevoked };
    }
  } catch (error) {
    // Network error - DON'T clear auth, user can retry when network is back
    console.error("❌ [TOKEN-REFRESH] Network error (will retry later):", error);
    return { token: null, wasRevoked: false }; // Not revoked, just network issue
  }
}

/**
 * Clear all authentication data and redirect to login
 */
export function clearAllAuth(): void {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("token_expiry");
  localStorage.removeItem("user_email");
}

/**
 * Check if token is expired or expiring soon (within 5 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const tokenExpiry = localStorage.getItem("token_expiry");
  if (!tokenExpiry) return true;

  const timeUntilExpiry = Number(tokenExpiry) - Date.now();
  return timeUntilExpiry < 5 * 60 * 1000; // Less than 5 minutes
}
