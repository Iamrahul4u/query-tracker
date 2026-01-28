"use client";

import { Suspense, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./LoadingScreen";

/**
 * Internal component that uses useAuth hook
 * Must be wrapped in Suspense due to useSearchParams usage
 */
function AuthContent({ children }: { children: ReactNode }) {
  const { authChecked } = useAuth();

  if (!authChecked) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  return <>{children}</>;
}

/**
 * AuthProvider - Wraps children with authentication logic and Suspense boundary
 *
 * This component handles:
 * - Suspense boundary for useSearchParams in useAuth hook
 * - Authentication state checking
 * - Loading state display
 *
 * Usage:
 * <AuthProvider>
 *   <YourProtectedContent />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <AuthContent>{children}</AuthContent>
    </Suspense>
  );
}
