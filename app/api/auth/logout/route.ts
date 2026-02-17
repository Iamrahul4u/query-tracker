import { NextResponse } from "next/server";

// Server-side logout - clears the HTTP-only refresh token cookie
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("refresh_token");
  console.log("🚪 [AUTH-LOGOUT] Refresh token cookie cleared");
  return response;
}
