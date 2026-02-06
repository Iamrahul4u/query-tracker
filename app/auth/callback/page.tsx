"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Authenticating...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuth() {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token) {
        setError("No authentication token provided");
        return;
      }

      try {
        setStatus("Validating token...");

        // Validate token with Google
        const response = await fetch(
          `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`,
        );

        if (!response.ok) {
          throw new Error("Invalid token");
        }

        const tokenInfo = await response.json();

        // Verify the token has required scopes
        if (!tokenInfo.email) {
          throw new Error("Token does not have email scope");
        }

        setStatus("Token validated! Redirecting...");

        // Store token and email in localStorage
        localStorage.setItem("auth_token", token);
        localStorage.setItem("user_email", tokenInfo.email);
        localStorage.setItem(
          "token_expiry",
          String(Date.now() + tokenInfo.expires_in * 1000),
        );

        // Redirect to dashboard
        setTimeout(() => {
          router.replace("/dashboard");
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleAuth();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
        {/* Logo */}
        <div className="w-16 h-16 bg-google-blue rounded-xl flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-white">Q</span>
        </div>

        {error ? (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="bg-google-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Go Back
            </button>
          </>
        ) : (
          <>
            {/* Loading spinner */}
            <div className="w-12 h-12 border-4 border-gray-200 border-t-google-blue rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Signing you in...
            </h2>
            <p className="text-gray-500">{status}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-google-blue rounded-xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl font-bold text-white">Q</span>
            </div>
            <div className="w-12 h-12 border-4 border-gray-200 border-t-google-blue rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Loading...
            </h2>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
