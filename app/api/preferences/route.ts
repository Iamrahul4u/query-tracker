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
      range: SHEET_RANGES.PREFERENCES, // A:H (updated to include sort fields and buckets)
    });

    const rows = response.data.values || [];
    let rowIndex = rows.findIndex((row: string[]) => row[0] === userEmail);

    // Data to save
    // Structure: A=Email, B=View, C=BucketOrder, D=UserOrder, E=DetailView, F=SortField, G=SortAscending, H=SortBuckets
    // ColumnCount and HistoryDays are NOT stored in sheet (always use defaults)

    let currentPrefs: any = {};
    if (rowIndex !== -1) {
      const row = rows[rowIndex];
      currentPrefs = {
        ViewType: row[1] || "bucket",
        BucketOrder: row[2] || "[]",
        UserOrder: row[3] || "[]",
        DetailView: row[4] === "true" || row[4] === "TRUE" || false,
        SortField: row[5] || "",
        SortAscending:
          row[6] === undefined || row[6] === ""
            ? true
            : row[6] === "true" || row[6] === "TRUE",
        SortBuckets: row[7] || "ALL",
      };
    } else {
      // Defaults
      currentPrefs = {
        ViewType: "bucket",
        BucketOrder: JSON.stringify(["A", "B", "C", "D", "E", "F", "G", "H"]),
        UserOrder: "[]",
        DetailView: false,
        SortField: "",
        SortAscending: true,
        SortBuckets: "ALL",
      };
    }

    // Merge updates (only update fields that are in the sheet)
    const updatedPrefs = { ...currentPrefs };

    // Only update fields that exist in your sheet structure
    if (preferences.ViewType !== undefined)
      updatedPrefs.ViewType = preferences.ViewType;
    if (preferences.BucketOrder !== undefined) {
      updatedPrefs.BucketOrder = Array.isArray(preferences.BucketOrder)
        ? JSON.stringify(preferences.BucketOrder)
        : preferences.BucketOrder;
    }
    if (preferences.UserOrder !== undefined) {
      updatedPrefs.UserOrder = Array.isArray(preferences.UserOrder)
        ? JSON.stringify(preferences.UserOrder)
        : preferences.UserOrder;
    }
    if (preferences.DetailView !== undefined)
      updatedPrefs.DetailView = preferences.DetailView;
    if (preferences.SortField !== undefined)
      updatedPrefs.SortField = preferences.SortField;
    if (preferences.SortAscending !== undefined)
      updatedPrefs.SortAscending = preferences.SortAscending;
    if (preferences.SortBuckets !== undefined) {
      // Convert array to comma-separated string or "ALL"
      updatedPrefs.SortBuckets = Array.isArray(preferences.SortBuckets)
        ? preferences.SortBuckets.includes("ALL") ||
          preferences.SortBuckets.length === 0
          ? "ALL"
          : preferences.SortBuckets.join(",")
        : preferences.SortBuckets;
    }

    const rowData = [
      userEmail,
      updatedPrefs.ViewType,
      updatedPrefs.BucketOrder,
      updatedPrefs.UserOrder,
      String(updatedPrefs.DetailView), // Convert boolean to string
      updatedPrefs.SortField || "", // Empty string if no custom sort
      String(updatedPrefs.SortAscending), // Convert boolean to string
      updatedPrefs.SortBuckets || "ALL", // Comma-separated buckets or "ALL"
    ];

    if (rowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Preferences!A${rowIndex + 1}:H${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Preferences!A:H",
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
