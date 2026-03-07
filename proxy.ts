import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Proxy — Next.js 16 convention (replaces deprecated middleware.ts)
 *
 * Auth.js's `auth()` wraps our handler and attaches `req.auth` (the session).
 * We use it to:
 *  1. Redirect authenticated users away from the login page
 *  2. Redirect unauthenticated users to the login page
 *
 * API routes are excluded via the matcher so they return proper 401 JSON
 * from their own `auth()` checks.
 */
export const proxy = auth((req) => {
  const isAuth = !!req.auth;
  const isAuthPage = req.nextUrl.pathname === "/";

  // Authenticated users visiting login page → redirect to dashboard
  if (isAuthPage) {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return null; // Let unauthenticated users see the login page
  }

  // Unauthenticated users visiting protected pages → redirect to login
  if (!isAuth) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return null;
});

// Proxy runs on page routes ONLY.
// API routes are excluded so they return proper 401 JSON via their own auth() check.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|download.png).*)",
  ],
};
