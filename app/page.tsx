  "use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";

// Google OAuth Client ID (Web Application type)
const GOOGLE_CLIENT_ID =
  "146933475054-k1mcsmec9cft0qr34v2jg3fh82hvi28l.apps.googleusercontent.com";

// Required scopes for Google Sheets access
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup" | "redirect";
            callback: (response: { code?: string; error?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

export default function Home() {
  const [gsiLoaded, setGsiLoaded] = useState(false);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setGsiLoaded(true)}
        strategy="afterInteractive"
      />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            Loading...
          </div>
        }
      >
        <HomeContent gsiLoaded={gsiLoaded} />
      </Suspense>
    </>
  );
}

function HomeContent({ gsiLoaded }: { gsiLoaded: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Checking authentication...");
  const [isLoading, setIsLoading] = useState(true);

  // Check existing auth on mount (URL Param OR LocalStorage)
  useEffect(() => {
    // 1. Check URL Params (Extension Flow)
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("user_email");

    if (urlToken) {
      setStatus("Validating token from extension...");
      fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${urlToken}`,
      )
        .then(async (res) => {
          if (res.ok) {
            const info = await res.json();
            // Store token from extension (no refresh token available)
            localStorage.setItem("auth_token", urlToken);
            localStorage.setItem("user_email", info.email);
            // Set expiry based on token info
            const expiresIn = info.expires_in || 3600;
            localStorage.setItem(
              "token_expiry",
              String(Date.now() + expiresIn * 1000),
            );
            setStatus("Redirecting to dashboard...");
            router.push("/dashboard");
          } else {
            setStatus("Invalid token provided. Please sign in.");
            setIsLoading(false);
          }
        })
        .catch((e) => {
          setStatus("Validation failed. Please sign in.");
          setIsLoading(false);
        });
      return;
    }

    // 2. Check LocalStorage for existing session
    const token = localStorage.getItem("auth_token");
    const tokenExpiry = localStorage.getItem("token_expiry");

    // Helper function to attempt token refresh via HTTP-only cookie
    const attemptRefresh = async () => {
      setStatus("Refreshing session...");
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          console.log("✅ [LOGIN-PAGE] Token refreshed successfully");
          localStorage.setItem("auth_token", data.access_token);
          localStorage.setItem(
            "token_expiry",
            String(Date.now() + data.expires_in * 1000),
          );
          // Restore user identity from refresh response
          if (data.email) {
            localStorage.setItem("user_email", data.email);
            localStorage.setItem("user_name", data.name || data.email);
          }
          setStatus("Redirecting to dashboard...");
          router.push("/dashboard");
        } else {
          const error = await res.json();

          if (error.requireReauth || res.status === 401) {
            console.error(
              "❌ [LOGIN-PAGE] Refresh token invalid/revoked, clearing auth",
            );
            localStorage.removeItem("auth_token");
            localStorage.removeItem("token_expiry");
            localStorage.removeItem("user_email");
            setStatus("Session expired. Please sign in again.");
          } else {
            // Other errors (500, etc.) - keep refresh token, just show error
            console.error(
              "⚠️ [LOGIN-PAGE] Refresh failed but refresh token may still be valid",
            );
            setStatus(
              "Unable to refresh session. Please try again or sign in.",
            );
          }
          setIsLoading(false);
        }
      } catch (error) {
        // Network error - KEEP refresh token, user can retry
        console.error("❌ [LOGIN-PAGE] Network error during refresh:", error);
        setStatus("Network error. Please check your connection and try again.");
        setIsLoading(false);
        // Don't clear anything - user can retry when network is back
      }
    };

    if (token) {
      // Check if token is still valid
      const now = Date.now();
      if (tokenExpiry && now < Number(tokenExpiry)) {
        // Token still valid
        setStatus("Redirecting to dashboard...");
        router.push("/dashboard");
        return;
      }

      // Token expired, try to refresh via cookie
      attemptRefresh();
    } else {
      // No auth_token — try refresh via cookie (may have one from previous session)
      attemptRefresh();
    }
  }, [router, searchParams]);

  // Handle Google Sign-In with Code Client
  const handleGoogleSignIn = useCallback(() => {
    if (!window.google?.accounts?.oauth2) {
      setStatus("Google Sign-In not loaded. Please refresh.");
      return;
    }

    setStatus("Signing in...");
    setIsLoading(true);

    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      ux_mode: "popup",
      // Request offline access to get refresh token for persistent sessions
      // @ts-expect-error - access_type is valid but not in GIS types
      access_type: "offline",
      // Always show consent to ensure refresh token is returned
      prompt: "consent",
      callback: async (response) => {
        if (response.error) {
          setStatus("Sign-in failed. Please try again.");
          setIsLoading(false);
          return;
        }

        if (response.code) {
          setStatus("Completing sign-in...");

          try {
            // Exchange code for tokens via our API
            const tokenRes = await fetch("/api/auth/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: response.code }),
            });

            if (!tokenRes.ok) {
              throw new Error("Token exchange failed");
            }

            const data = await tokenRes.json();

            console.log("🔐 [LOGIN] Token exchange response:");
            console.log(`  - access_token: ${data.access_token ? "✅" : "❌"}`);
            console.log(
              `  - has_refresh_token (cookie): ${data.has_refresh_token ? "✅" : "❌"}`,
            );
            console.log(`  - expires_in: ${data.expires_in}s`);
            console.log(`  - email: ${data.email}`);

            // Store tokens
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("user_email", data.email);
            localStorage.setItem("user_name", data.name || data.email);

            // Refresh token is stored server-side as HTTP-only cookie
            if (data.has_refresh_token) {
              console.log("✅ [LOGIN] Refresh token stored as HTTP-only cookie");
            } else {
              console.warn(
                "⚠️ [LOGIN] No refresh token received - session will expire after 1 hour",
              );
            }

            // Store expiry time
            const expiryTime = Date.now() + data.expires_in * 1000;
            localStorage.setItem("token_expiry", String(expiryTime));
            console.log(
              `🔐 [LOGIN] Token expires at: ${new Date(expiryTime).toLocaleTimeString()}`,
            );

            setStatus("Redirecting to dashboard...");
            router.push("/dashboard");
          } catch (err) {
            setStatus("Sign-in failed. Please try again.");
            setIsLoading(false);
          }
        }
      },
    });

    client.requestCode();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Logo */}
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl font-bold text-white">Q</span>
          </div>

          <h1 className="text-2xl font-semibold text-gray-800 mb-2">
            Query Tracker
          </h1>

          <p className="text-gray-500 mb-6">{status}</p>

          {/* Google Sign-In Button */}
          {!isLoading && (
            <button
              onClick={handleGoogleSignIn}
              disabled={!gsiLoaded}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-gray-700 font-medium">
                {gsiLoaded ? "Sign in with Google" : "Loading..."}
              </span>
            </button>
          )}

          {isLoading && (
            <div className="mb-6">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
