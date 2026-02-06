import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { SPREADSHEET_ID } from "../../../config/sheet-constants";

/**
 * PATCH /api/users/role
 * Update user role for testing purposes
 * Body: { email: string, role: "Admin" | "Pseudo Admin" | "Senior" | "Junior" }
 */
export async function PATCH(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Missing email or role" },
        { status: 400 },
      );
    }

    if (!["Admin", "Pseudo Admin", "Senior", "Junior"].includes(role)) {
      return NextResponse.json(
        {
          error: "Invalid role. Must be Admin, Pseudo Admin, Senior, or Junior",
        },
        { status: 400 },
      );
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    const sheets = google.sheets({ version: "v4", auth });

    // First, find the row with this email in Users sheet
    const usersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Users!A:E",
    });

    const users = usersRes.data.values || [];
    let rowIndex = -1;

    // Find the row with matching email (Column A is Email - index 0)
    for (let i = 1; i < users.length; i++) {
      if (users[i][0]?.toLowerCase() === email.toLowerCase()) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the role (Column C)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Users!C${rowIndex}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[role]],
      },
    });

    return NextResponse.json({
      success: true,
      email,
      role,
      message: `Role updated to ${role}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update role" },
      { status: 500 },
    );
  }
}
