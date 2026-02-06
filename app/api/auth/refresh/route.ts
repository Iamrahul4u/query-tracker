import { NextRequest, NextResponse } from "next/server";

// Refresh access token using refresh_token
export async function POST(request: NextRequest) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Refresh token required" },
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

      // If refresh token is invalid/revoked, user must re-login
      return NextResponse.json(
        {
          error: "Refresh token expired or revoked",
          requireReauth: true,
        },
        { status: 401 },
      );
    }

    const tokens = await tokenResponse.json();

    // Use actual Google token expiry (typically 3600 seconds = 1 hour)
    const expiresIn = tokens.expires_in || 3600;

    return NextResponse.json({
      access_token: tokens.access_token,
      expires_in: expiresIn, // seconds until access token expires
      token_type: tokens.token_type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
