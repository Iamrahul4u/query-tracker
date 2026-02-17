import { NextRequest, NextResponse } from "next/server";

// Refresh access token using refresh_token stored in HTTP-only cookie
export async function POST(request: NextRequest) {
  try {
    // Read refresh token from HTTP-only cookie (set during login)
    const refresh_token = request.cookies.get("refresh_token")?.value;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "No refresh token", requireReauth: true },
        { status: 401 },
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "OAuth not configured" },
        { status: 500 },
      );
    }

    // Request new access token from Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("❌ [AUTH-REFRESH] Google token refresh failed:", error);

      // If refresh token is invalid/revoked, clear the cookie and require re-login
      const response = NextResponse.json(
        {
          error: "Refresh token expired or revoked",
          requireReauth: true,
        },
        { status: 401 },
      );
      response.cookies.delete("refresh_token");
      return response;
    }

    const tokens = await tokenResponse.json();

    // Use actual Google token expiry (typically 3600 seconds = 1 hour)
    const expiresIn = tokens.expires_in || 3600;

    // Fetch user info so the client can restore identity after localStorage clear
    let email = "";
    let name = "";
    try {
      const userInfoRes = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        email = userInfo.email || "";
        name = userInfo.name || userInfo.email || "";
      }
    } catch {
      // Non-critical — token refresh still succeeds without user info
      console.warn("⚠️ [AUTH-REFRESH] Could not fetch user info");
    }

    console.log(`✅ [AUTH-REFRESH] Token refreshed, expires in ${expiresIn}s, user: ${email}`);

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: expiresIn, // seconds until access token expires
      token_type: tokens.token_type,
      email,
      name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
