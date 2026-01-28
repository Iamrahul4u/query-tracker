import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { SPREADSHEET_ID, SHEET_RANGES } from "../../config/sheet-constants";
import { Preferences } from "../../utils/sheets";

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const preferences: Partial<Preferences> = body;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    // Validate token info to get email
    const oauth2 = google.oauth2({ version: "v2", auth });
    const tokenInfo = await oauth2.tokeninfo({ access_token: token });
    const userEmail = tokenInfo.data.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const sheets = google.sheets({ version: "v4", auth });

    // 1. Find User Row in Preferences Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGES.PREFERENCES, // should be A:F now
    });

    const rows = response.data.values || [];
    let rowIndex = rows.findIndex((row: string[]) => row[0] === userEmail);

    // Data to save
    // Format: Email [0], ViewType [1], ColumnCount [2], BucketOrder [3], UserOrder [4], HistoryDays [5]
    // If updating, we update the whole row to keep it consistent? Or specific cells?
    // Whole row is easier if we have all data.
    // Dashboard should send partial updates, so we might need to merge with existing?
    // Let's assume passed body has only changed fields.
    // We fetch existing row, merge, then save.

    let currentPrefs: any = {};
    if (rowIndex !== -1) {
      const row = rows[rowIndex];
      currentPrefs = {
        ViewType: row[1] || "bucket",
        ColumnCount: Number(row[2]) || 4,
        BucketOrder: row[3] || "[]",
        UserOrder: row[4] || "[]",
        HistoryDays: Number(row[5]) || 3,
      };
    } else {
      // Defaults
      currentPrefs = {
        ViewType: "bucket",
        ColumnCount: 4,
        BucketOrder: JSON.stringify(["A", "B", "C", "D", "E", "F", "G"]),
        UserOrder: "[]",
        HistoryDays: 3,
      };
    }

    // Merge updates
    const updatedPrefs = { ...currentPrefs, ...preferences };

    // Ensure arrays are stringified
    if (Array.isArray(updatedPrefs.BucketOrder))
      updatedPrefs.BucketOrder = JSON.stringify(updatedPrefs.BucketOrder);
    if (Array.isArray(updatedPrefs.UserOrder))
      updatedPrefs.UserOrder = JSON.stringify(updatedPrefs.UserOrder);

    const rowData = [
      userEmail,
      updatedPrefs.ViewType,
      String(updatedPrefs.ColumnCount),
      updatedPrefs.BucketOrder,
      updatedPrefs.UserOrder,
      String(updatedPrefs.HistoryDays),
    ];

    if (rowIndex !== -1) {
      // Update existing row
      // Row index is 0-based in array, so Sheet Row is index + 1
      // But headers might be row 1.
      // parsePreferences checks `rows.slice(1)`.
      // get returns ALL rows including header if range is A:F.
      // rows[0] is headers.
      // So rowIndex in `rows` array is correct.
      // Sheet Row Num = rowIndex + 1. (Row 1 = index 0).

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Preferences!A${rowIndex + 1}:F${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Preferences!A:F",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Preferences API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save preferences" },
      { status: 500 },
    );
  }
}
