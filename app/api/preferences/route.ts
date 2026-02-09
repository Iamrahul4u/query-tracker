import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import { SPREADSHEET_ID, SHEET_RANGES } from "../../config/sheet-constants";
import { Preferences, ViewPreferences } from "../../utils/sheets";

// Service account auth helper (same pattern as queries/route.ts)
function getServiceAccountAuth() {
  let credentials: any;

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      console.error("[getServiceAccountAuth] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY env var");
      throw new Error("Invalid service account credentials in environment");
    }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    try {
      const filePath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      credentials = JSON.parse(fileContent);
    } catch (e) {
      console.error("[getServiceAccountAuth] Failed to read service account file:", e);
      throw new Error("Failed to read service account file");
    }
  } else {
    try {
      const filePath = path.resolve(process.cwd(), "service-account.json");
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        credentials = JSON.parse(fileContent);
      }
    } catch (e) {
      // Ignore
    }
  }

  if (!credentials) {
    return null;
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const preferences: Partial<Preferences> = body;

    // Validate user token to get their email
    const userAuth = new google.auth.OAuth2();
    userAuth.setCredentials({ access_token: token });
    const oauth2 = google.oauth2({ version: "v2", auth: userAuth });
    const tokenInfo = await oauth2.tokeninfo({ access_token: token });
    const userEmail = tokenInfo.data.email;

    if (!userEmail) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Use service account for sheets access
    let sheets;
    const serviceAuth = getServiceAccountAuth();
    if (serviceAuth) {
      console.log("[PREFERENCES] Using service account for write operation");
      sheets = google.sheets({ version: "v4", auth: serviceAuth });
    } else {
      console.log("[PREFERENCES] No service account, falling back to user token");
      sheets = google.sheets({ version: "v4", auth: userAuth });
    }

    // 1. Find User Row in Preferences Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGES.PREFERENCES, // A:D
    });


    const rows = response.data.values || [];
    let rowIndex = rows.findIndex((row: string[]) => row[0] === userEmail);

    // Default preferences
    const defaultViewPrefs: ViewPreferences = {
      layout: "default",
      columns: 4,
      detailView: false,
      sortField: "",
      sortAscending: true,
      sortBuckets: "ALL",
    };

    let currentPrefs: Preferences = {
      preferredView: "bucket",
      bucketViewPrefs: { ...defaultViewPrefs },
      userViewPrefs: { ...defaultViewPrefs },
    };

    // Load existing preferences if row exists
    if (rowIndex !== -1) {
      const row = rows[rowIndex];
      try {
        currentPrefs = {
          preferredView: (row[1] || "bucket") as "bucket" | "user",
          bucketViewPrefs: row[2]
            ? JSON.parse(row[2])
            : { ...defaultViewPrefs },
          userViewPrefs: row[3] ? JSON.parse(row[3]) : { ...defaultViewPrefs },
        };
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Merge updates
    const updatedPrefs: Preferences = {
      preferredView: preferences.preferredView || currentPrefs.preferredView,
      bucketViewPrefs:
        preferences.bucketViewPrefs || currentPrefs.bucketViewPrefs,
      userViewPrefs: preferences.userViewPrefs || currentPrefs.userViewPrefs,
    };

    // Prepare row data
    const rowData = [
      userEmail,
      updatedPrefs.preferredView,
      JSON.stringify(updatedPrefs.bucketViewPrefs),
      JSON.stringify(updatedPrefs.userViewPrefs),
    ];

    if (rowIndex !== -1) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Preferences!A${rowIndex + 1}:D${rowIndex + 1}`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: "Preferences!A:D",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [rowData],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save preferences" },
      { status: 500 },
    );
  }
}
