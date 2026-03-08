import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

// Augment next-auth types with our custom JWT/session fields
declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    expires_at?: number;
    refresh_token?: string;
    error?: "RefreshTokenError";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // First-time login
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          expires_at: account.expires_at,  // Unix timestamp in seconds
          refresh_token: account.refresh_token,
        };
      }
      
      // Subsequent logins, check if the access_token is still valid
      if (Date.now() < (token.expires_at ?? 0) * 1000) {
        return token;
      }
      
      // Access token has expired, try to refresh it
      if (!token.refresh_token) {
        return { ...token, error: "RefreshTokenError" };
      }

      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID as string,
            client_secret: process.env.AUTH_GOOGLE_SECRET as string,
            grant_type: "refresh_token",
            refresh_token: token.refresh_token ?? "",
          }),
        });

        const tokensOrError = await response.json();

        if (!response.ok) throw tokensOrError;

        return {
          ...token,
          access_token: tokensOrError.access_token,
          expires_at: Math.floor(Date.now() / 1000 + tokensOrError.expires_in),
          // Google sometimes only returns a refresh token on the first login.
          // Fall back to the old one if a new one is not received.
          refresh_token: tokensOrError.refresh_token ?? token.refresh_token,
        };
      } catch (error: any) {
        // Network errors (offline, DNS failure, timeout) → keep stale token, retry next time
        const cause = error?.cause;
        const isNetworkError =
          cause?.code === "ENOTFOUND" ||
          cause?.code === "ETIMEDOUT" ||
          cause?.code === "ECONNREFUSED" ||
          cause?.code === "ECONNRESET" ||
          cause?.code === "EAI_AGAIN" ||
          error?.name === "TypeError" && error?.message === "fetch failed";

        if (isNetworkError) {
          console.warn("⚠️ [Auth.js] Network error during token refresh, keeping stale token");
          return token;
        }

        // Actual token rejection (revoked, invalid) → force re-login
        console.error("❌ [Auth.js] Token refresh rejected, forcing re-login", error);
        return { ...token, error: "RefreshTokenError" as const };
      }
    },
    async session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: "/", // We use the custom homepage as sign in
  },
});
