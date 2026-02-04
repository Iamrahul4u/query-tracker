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
            callback: (response: {
              code?: string;
              error?: string;
            }) => void;
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
            console.error("Invalid token param");
            setStatus("Invalid token provided. Please sign in.");
            setIsLoading(false);
          }
        })
        .catch((e) => {
          console.error("Token validation error", e);
          setStatus("Validation failed. Please sign in.");
          setIsLoading(false);
        });
      return;
    }

    // 2. Check LocalStorage for existing session
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("refresh_token");
    const tokenExpiry = localStorage.getItem("token_expiry");

    // Helper function to attempt token refresh
    const attemptRefresh = async () => {
      if (!refreshToken) {
        setStatus("Sign in to access Query Tracker");
        setIsLoading(false);
        return;
      }

      setStatus("Refreshing session...");
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await res.json();
        
        if (data.access_token) {
          localStorage.setItem("auth_token", data.access_token);
          localStorage.setItem(
            "token_expiry",
            String(Date.now() + data.expires_in * 1000),
          );
          console.log(`✅ Token refreshed. Expires in ${data.expires_in}s`);
          setStatus("Redirecting to dashboard...");
          router.push("/dashboard");
        } else {
          // Refresh failed, need re-login
          localStorage.clear();
          setStatus("Session expired. Please sign in again.");
          setIsLoading(false);
        }
      } catch {
        localStorage.clear();
        setStatus("Session expired. Please sign in again.");
        setIsLoading(false);
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

      // Token expired, try to refresh
      attemptRefresh();
    } else if (refreshToken) {
      // No auth_token but have refresh_token - try to refresh
      console.log("⚠️ auth_token missing but refresh_token exists, attempting refresh...");
      attemptRefresh();
    } else {
      setStatus("Sign in to access Query Tracker");
      setIsLoading(false);
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
      callback: async (response) => {
        if (response.error) {
          console.error("OAuth error:", response.error);
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

            // Store tokens
            localStorage.setItem("auth_token", data.access_token);
            localStorage.setItem("user_email", data.email);
            localStorage.setItem("user_name", data.name || data.email);
            
            // Store refresh token for silent refresh
            if (data.refresh_token) {
              localStorage.setItem("refresh_token", data.refresh_token);
            }
            
            // Store expiry time
            localStorage.setItem(
              "token_expiry",
              String(Date.now() + data.expires_in * 1000),
            );

            console.log(`✅ Logged in. Token expires in ${data.expires_in}s`);
            setStatus("Redirecting to dashboard...");
            router.push("/dashboard");
          } catch (err) {
            console.error("Token exchange error:", err);
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

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-400">or</span>
            </div>
          </div>

          {/* Chrome Extension Instructions */}
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-700 mb-2">
              Use Chrome Extension:
            </h3>
            <ol className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                  1
                </span>
                <span>Install the Query Tracker Chrome extension</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                  2
                </span>
                <span>Click the extension icon in your browser toolbar</span>
              </li>
              <li className="flex items-start">
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                  3
                </span>
                <span>
                  Click &quot;Open Full View&quot; to open this dashboard
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
