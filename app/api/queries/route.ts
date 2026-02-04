import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { SPREADSHEET_ID, SHEET_RANGES } from "../../config/sheet-constants";
import {
  parseQueries,
  parseUsers,
  parsePreferences,
  Query,
} from "../../utils/sheets";

// ----------------------------------------------------------------------
// GET HANDLER
// ----------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });

    // Validate token info to get email
    const oauth2 = google.oauth2({ version: "v2", auth });
    const tokenInfo = await oauth2.tokeninfo({ access_token: token });
    const userEmail = tokenInfo.data.email;

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch in parallel
    const [queriesRes, usersRes, prefsRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGES.QUERIES, // "Queries!A:V"
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGES.USERS, // "Users!A:E"
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGES.PREFERENCES, // "Preferences!A:E"
      }),
    ]);

    const queries = parseQueries(queriesRes.data.values || []);
    const users = parseUsers(usersRes.data.values || []);
    const preferences = parsePreferences(
      prefsRes.data.values || [],
      userEmail || "",
    );

    return NextResponse.json({
      queries,
      users,
      preferences,
      userEmail,
    });
  } catch (error: any) {
    console.error("API Error:", error);
    // Google API errors can be objects, not strings
    const errorMessage = typeof error.message === 'string' 
      ? error.message 
      : JSON.stringify(error.message || error);
    
    // Google API 401/400 often means token issues
    if (
      error.code === 401 ||
      error.status === 400 ||
      error.status === 401 ||
      errorMessage.includes("invalid_token") ||
      errorMessage.includes("Invalid Credentials")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: errorMessage || "Failed to fetch data" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------------
// POST HANDLER (Write Operations)
// ----------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, queryId, data } = body;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: token });
    const sheets = google.sheets({ version: "v4", auth });

    switch (action) {
      case "assign":
        return await handleAssign(sheets, queryId, data);
      case "updateStatus":
        return await handleUpdateStatus(sheets, queryId, data);
      case "edit":
        return await handleEdit(sheets, queryId, data);
      case "add":
        return await handleAdd(sheets, data);
      case "delete":
        return await handleDelete(sheets, queryId, data);
      case "approveDelete":
        return await handleApproveDelete(sheets, queryId, data?.approvedBy);
      case "rejectDelete":
        return await handleRejectDelete(sheets, queryId, data?.rejectedBy);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("API POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

// Row Index Cache - Stores queryId -> rowIndex mapping
// This cache is in-memory and will reset on server restart
// For production, consider Redis or similar for persistent cache
const rowIndexCache = new Map<
  string,
  { rowIndex: number; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clears expired entries from the row index cache
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of rowIndexCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      rowIndexCache.delete(key);
    }
  }
}

/**
 * Invalidates cache entry for a specific query
 */
function invalidateCacheEntry(queryId: string) {
  rowIndexCache.delete(queryId);
}

// Mapping of Column Names to A1 Letter
const COL_MAP: Record<string, string> = {
  "Query ID": "A",
  "Query Description": "B",
  "Query Type": "C",
  Status: "D",
  "Added By": "E",
  "Added Date Time": "F",
  "Assigned To": "G",
  "Assigned By": "H",
  "Assignment Date Time": "I",
  Remarks: "J",
  "Proposal Sent Date Time": "K",
  "Whats Pending": "L",
  "Entered In SF Date Time": "M",
  "Event ID in SF": "N",
  "Event Title in SF": "O",
  "Discarded Date Time": "P",
  GmIndicator: "Q",
  "Delete Requested Date Time": "R",
  "Delete Requested By": "S",
  "Last Edited Date Time": "T",
  "Last Edited By": "U",
  "Last Activity Date Time": "V",
  // Deletion workflow columns (Bucket H)
  "Previous Status": "W",
  "Delete Approved By": "X",
  "Delete Approved Date Time": "Y",
  "Delete Rejected": "Z",
};



/**
 * Finds the row number (1-based) for a given Query ID.
 * Uses cache to avoid repeated API calls.
 * Reads Column A only for efficiency.
 */
async function findRowIndex(
  sheets: any,
  queryId: string,
): Promise<number | null> {
  // Check cache first
  const cached = rowIndexCache.get(queryId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✓ Row index cache hit for ${queryId}`);
    return cached.rowIndex;
  }

  // Clean expired entries periodically
  if (rowIndexCache.size > 100) {
    cleanExpiredCache();
  }

  // Cache miss - fetch from API
  console.log(`⟳ Row index cache miss for ${queryId}, fetching...`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Queries!A:A", // Only fetch IDs
  });

  const rows = response.data.values || [];
  const index = rows.findIndex((row: string[]) => row[0] === queryId);

  if (index === -1) return null;

  const rowIndex = index + 1; // Convert 0-based array index to 1-based sheet row

  // Cache the result
  rowIndexCache.set(queryId, {
    rowIndex,
    timestamp: Date.now(),
  });

  return rowIndex;
}

/**
 * Updates specific cells in a row using batchUpdate.
 */
async function updateRowCells(
  sheets: any,
  rowIndex: number,
  updates: Partial<Record<string, string>>,
) {
  const data = Object.entries(updates)
    .map(([field, value]) => {
      const col = COL_MAP[field];
      if (!col) return null;
      return {
        range: `Queries!${col}${rowIndex}`,
        values: [[value]],
      };
    })
    .filter(Boolean);

  if (data.length === 0) return;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: {
      valueInputOption: "USER_ENTERED",
      data,
    },
  });
}

// --- ACTION HANDLERS ---

async function handleAssign(
  sheets: any,
  queryId: string,
  data: { assignee: string; assignedBy?: string; remarks?: string },
) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = new Date().toLocaleString("en-GB");

  // Also status -> B if currently A (implicit logic, but safer to trust status update explicitly?
  // No, the store handles optimistic status change, so we should update status on server too if needed.
  // Ideally, the store sends explicit status update if status changes.
  // BUT the store's assignQueryOptimistic DOES change status A->B locally.
  // So we should verify current status?
  // Let's assume the store logic is correct and we just update the specific fields requested.
  // Wait! If store changes status A->B, it typically queues ONE action 'assign'.
  // So 'assign' handler MUST handle status change if implied.
  // In `queryStore`: assignQueryOptimistic sets Status='B' if it was 'A'.
  // But it does NOT queue a separate 'updateStatus' action.
  // So we MUST update status to 'B' here if we can.
  // However, we don't know the *current* status without fetching.
  // Let's fetching the current status to be safe.

  const statusRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queries!D${rowIndex}`,
  });
  const currentStatus = statusRes.data.values?.[0]?.[0];

  const updates: any = {
    "Assigned To": data.assignee,
    "Assignment Date Time": now,
    "Last Activity Date Time": now,
  };

  // Add Assigned By if provided (who performed the assignment)
  if (data.assignedBy) {
    updates["Assigned By"] = data.assignedBy;
  }

  if (data.remarks) updates["Remarks"] = data.remarks;
  if (currentStatus === "A") updates["Status"] = "B";

  await updateRowCells(sheets, rowIndex, updates);
  return NextResponse.json({ success: true });
}

async function handleUpdateStatus(
  sheets: any,
  queryId: string,
  data: { newStatus: string; fields?: any },
) {
  console.log("🔧 API handleUpdateStatus called");
  console.log("  Query ID:", queryId);
  console.log("  New Status:", data.newStatus);
  console.log("  Fields:", JSON.stringify(data.fields, null, 2));

  const rowIndex = await findRowIndex(sheets, queryId);
  console.log("  Row index found:", rowIndex);

  if (!rowIndex) {
    console.error("❌ Query not found in sheet");
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  // Get current status to detect backward transitions
  const statusRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queries!D${rowIndex}`,
  });
  const currentStatus = statusRes.data.values?.[0]?.[0] || "";

  const now = new Date().toLocaleString("en-GB");
  const updates: any = {
    Status: data.newStatus,
    "Last Activity Date Time": now,
    ...data.fields,
  };

  // Check for backward transition and clear fields
  const bucketOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const oldIndex = bucketOrder.indexOf(currentStatus);
  const newIndex = bucketOrder.indexOf(data.newStatus);

  if (newIndex >= 0 && oldIndex >= 0 && newIndex < oldIndex) {
    console.log(`  ⬅️ Backward transition detected: ${currentStatus} → ${data.newStatus}`);
    
    // Moving to A: Clear assignment fields
    if (data.newStatus === "A") {
      updates["Assigned To"] = "";
      updates["Assigned By"] = "";
      updates["Assignment Date Time"] = "";
      updates["Remarks"] = "";
      updates["Proposal Sent Date Time"] = "";
      updates["Whats Pending"] = "";
      updates["Entered In SF Date Time"] = "";
      updates["Event ID in SF"] = "";
      updates["Event Title in SF"] = "";
      updates["Discarded Date Time"] = "";
    }
    // Moving to B: Clear proposal and SF fields
    else if (data.newStatus === "B") {
      updates["Proposal Sent Date Time"] = "";
      updates["Whats Pending"] = "";
      updates["Entered In SF Date Time"] = "";
      updates["Event ID in SF"] = "";
      updates["Event Title in SF"] = "";
      updates["Discarded Date Time"] = "";
    }
    // Moving to C or D: Clear SF fields
    else if (["C", "D"].includes(data.newStatus)) {
      updates["Entered In SF Date Time"] = "";
      updates["Event ID in SF"] = "";
      updates["Event Title in SF"] = "";
      updates["Discarded Date Time"] = "";
    }
    // Moving to E or F: Clear discard fields
    else if (["E", "F"].includes(data.newStatus)) {
      updates["Discarded Date Time"] = "";
    }
  }

  console.log("  Updates to apply:", JSON.stringify(updates, null, 2));

  await updateRowCells(sheets, rowIndex, updates);
  console.log("✅ Row updated successfully");

  return NextResponse.json({ success: true });
}

async function handleEdit(sheets: any, queryId: string, data: any) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = new Date().toLocaleString("en-GB");
  const updates: any = {
    ...data,
    "Last Edited Date Time": now,
    "Last Activity Date Time": now,
  };
  // "Last Edited By" should be set.
  // I will add token email logic in main POST and pass it down.

  await updateRowCells(sheets, rowIndex, updates);
  return NextResponse.json({ success: true });
}

async function handleAdd(sheets: any, data: Query) {
  // data is the full Query object from optimistic store
  // We need to append a new row.
  // We should generate a new REAL ID here or accept the temp one?
  // User/Plan says: "Replace temp ID with real ID after sync".
  // So server generates ID.

  const realId = `Q-${Date.now()}`; // Simple ID generation
  const now = new Date().toLocaleString("en-GB");

  // Construct row in correct order (Columns A-Z)
  // Mapping
  const newRow: string[] = [];
  const fields = Object.values(COL_MAP); // This gives A, B, C... NOT ordered keys.

  // We need keys in column order A->Z
  const keysInOrder = Object.entries(COL_MAP)
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([key]) => key);

  keysInOrder.forEach((key) => {
    if (key === "Query ID") newRow.push(realId);
    else newRow.push(data[key as keyof Query] || "");
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: "Queries!A:Z",
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [newRow],
    },
  });

  // Invalidate entire cache since row indices have shifted
  console.log("⚠ Clearing row index cache (new row added)");
  rowIndexCache.clear();

  return NextResponse.json({ success: true, queryId: realId });
}

async function handleDelete(
  sheets: any,
  queryId: string,
  data: { requestedBy: string; isAdmin?: boolean },
) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = new Date().toLocaleString("en-GB");

  if (data.isAdmin) {
    // Admin/Pseudo Admin: Permanent delete - remove the row from sheet
    try {
      // Get sheet ID for Queries sheet
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
      });
      const queriesSheet = spreadsheet.data.sheets?.find(
        (s: any) => s.properties?.title === "Queries"
      );
      const sheetId = queriesSheet?.properties?.sheetId || 0;

      // Delete the row
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex - 1, // 0-indexed
                  endIndex: rowIndex, // exclusive
                },
              },
            },
          ],
        },
      });

      // Invalidate cache since row indices shifted
      rowIndexCache.clear();

      return NextResponse.json({ success: true, permanent: true });
    } catch (error: any) {
      console.error("Failed to delete row:", error);
      return NextResponse.json(
        { error: "Failed to permanently delete query" },
        { status: 500 }
      );
    }
  } else {
    // Non-admin: Move to Bucket H (Pending Approval)
    // First, get current status to store as previousStatus
    const statusRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!D${rowIndex}`,
    });
    const currentStatus = statusRes.data.values?.[0]?.[0] || "";

    const updates = {
      Status: "H",
      "Previous Status": currentStatus,
      "Delete Requested Date Time": now,
      "Delete Requested By": data.requestedBy,
      "Delete Rejected": "", // Clear any previous rejection
      "Last Activity Date Time": now,
    };

    await updateRowCells(sheets, rowIndex, updates);
    return NextResponse.json({ success: true, pending: true, status: "H" });
  }
}


/**
 * Approve a pending deletion (Admin only) - sets approval then removes the row
 */
async function handleApproveDelete(sheets: any, queryId: string, approvedBy?: string) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = new Date().toLocaleString("en-GB");

  // First, record who approved (for audit trail before deletion)
  // Note: In future, could keep approved records for evaporation period
  if (approvedBy) {
    await updateRowCells(sheets, rowIndex, {
      "Delete Approved By": approvedBy,
      "Delete Approved Date Time": now,
    });
  }

  try {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const queriesSheet = spreadsheet.data.sheets?.find(
      (s: any) => s.properties?.title === "Queries"
    );
    const sheetId = queriesSheet?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });

    rowIndexCache.clear();
    return NextResponse.json({ success: true, approved: true });
  } catch (error: any) {
    console.error("Failed to approve delete:", error);
    return NextResponse.json(
      { error: "Failed to approve deletion" },
      { status: 500 }
    );
  }
}


/**
 * Reject a pending deletion (Admin only) - returns to previous status with Del-Rej flag
 */
async function handleRejectDelete(sheets: any, queryId: string, approvedBy?: string) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  // Get current Previous Status to restore
  const prevStatusRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `Queries!W${rowIndex}`, // Previous Status column
  });
  const previousStatus = prevStatusRes.data.values?.[0]?.[0] || "A";

  const now = new Date().toLocaleString("en-GB");

  const updates = {
    Status: previousStatus, // Return to previous status
    "Previous Status": "", // Clear previous status
    "Delete Requested Date Time": "", // Clear delete request
    "Delete Requested By": "",
    "Delete Rejected": "true", // Mark as rejected (shows "Del-Rej" indicator)
    "Last Activity Date Time": now,
  };

  await updateRowCells(sheets, rowIndex, updates);
  return NextResponse.json({ success: true, restoredStatus: previousStatus });
}
