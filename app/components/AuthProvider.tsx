"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * AuthProvider - Wraps children with NextAuth SessionProvider
 *
 * Usage:
 * <AuthProvider>
 *   <YourProtectedContent />
 * </AuthProvider>
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

