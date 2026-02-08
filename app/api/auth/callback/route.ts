import { NextRequest, NextResponse } from "next/server";

// Exchange authorization code for tokens
export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code required" },
        { status: 400 },
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

    // Exchange code for tokens with Google
    // CRITICAL: Include access_type=offline to receive refresh_token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || "postmessage", // 'postmessage' for popup flow
        grant_type: "authorization_code",
        access_type: "offline", // Request refresh token for persistent sessions
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json(
        { error: "Token exchange failed" },
        { status: 400 },
      );
    }

    const tokens = await tokenResponse.json();

    console.log("🔐 [AUTH-CALLBACK] Token exchange successful");
    console.log(
      `  - access_token: ${tokens.access_token ? "RECEIVED ✅" : "MISSING ❌"}`,
    );
    console.log(
      `  - refresh_token: ${tokens.refresh_token ? "RECEIVED ✅" : "MISSING ❌"}`,
    );
    console.log(
      `  - expires_in: ${tokens.expires_in}s (${(tokens.expires_in / 60).toFixed(1)} minutes)`,
    );

    // CRITICAL: Warn if refresh token not received
    if (!tokens.refresh_token) {
      console.warn(
        "⚠️ [AUTH-CALLBACK] No refresh_token received! This happens when:",
      );
      console.warn("  1. User previously authorized this app");
      console.warn("  2. Need to revoke access and re-authorize");
      console.warn("  3. Or ensure prompt=consent is set (already configured)");
    }

    // Get user info using the access token
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      },
    );

    if (!userInfoResponse.ok) {
      return NextResponse.json(
        { error: "Failed to get user info" },
        { status: 400 },
      );
    }

    const userInfo = await userInfoResponse.json();

    // Return tokens and user info
    // Use actual Google token expiry (typically 3600 seconds = 1 hour)
    // Token refresh will handle renewal before expiry
    const expiresIn = tokens.expires_in || 3600; // Use Google's actual expiry

    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: expiresIn, // seconds until access token expires
      token_type: tokens.token_type,
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      has_refresh_token: !!tokens.refresh_token, // Flag for frontend validation
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
