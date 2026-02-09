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
        range: SHEET_RANGES.QUERIES, // "Queries!A:AD" - includes all audit fields
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGES.USERS, // "Users!A:F"
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGES.PREFERENCES, // "Preferences!A:D"
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
    // Google API errors can be objects, not strings
    const errorMessage =
      typeof error.message === "string"
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

    console.log(`[POST] Action: ${action}, QueryID: ${queryId}`, data);

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
        console.error(`[POST] Invalid action: ${action}`);
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[POST] Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 },
    );
  }
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Get current date/time in IST (Indian Standard Time, UTC+5:30)
 * Returns format: "DD/MM/YYYY HH:MM:SS"
 */
function getISTDateTime(): string {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(date.getTime() + istOffset);

  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(istDate.getUTCSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

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
// CRITICAL: This MUST match the exact column order in Google Sheet
// Current sheet order (from TSV export):
// A=Query ID, B=Query Description, C=Query Type, D=Status, E=Added By, F=Added Date Time,
// G=Assigned To, H=Assigned By, I=Assignment Date Time, J=Remarks, K=Proposal Sent Date Time,
// L=Whats Pending, M=Entered In SF Date Time, N=Event ID in SF, O=Event Title in SF,
// P=Discarded Date Time, Q=GmIndicator, R=Delete Requested Date Time, S=Delete Requested By,
// T=Last Edited Date Time, U=Last Edited By, V=Last Activity Date Time, W=Previous Status,
// X=Delete Approved By, Y=Delete Approved Date Time, Z=Delete Rejected,
// AA=Delete Rejected By, AB=Delete Rejected Date Time, AC=Remark Added By, AD=Remark Added Date Time
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
  "Previous Status": "W",
  "Delete Approved By": "X",
  "Delete Approved Date Time": "Y",
  "Delete Rejected": "Z",
  "Delete Rejected By": "AA",
  "Delete Rejected Date Time": "AB",
  "Remark Added By": "AC",
  "Remark Added Date Time": "AD",
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
    return cached.rowIndex;
  }

  // Clean expired entries periodically
  if (rowIndexCache.size > 100) {
    cleanExpiredCache();
  }

  // Cache miss - fetch from API
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
      if (!col) {
        console.warn(`[updateRowCells] Field "${field}" not found in COL_MAP`);
        return null;
      }
      console.log(
        `[updateRowCells] Mapping ${field} -> ${col}${rowIndex} = "${value}"`,
      );
      return {
        range: `Queries!${col}${rowIndex}`,
        values: [[value]],
      };
    })
    .filter(Boolean);

  if (data.length === 0) {
    console.warn(`[updateRowCells] No valid fields to update`);
    return;
  }

  console.log(`[updateRowCells] Batch updating ${data.length} cells:`, data);

  try {
    const result = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      resource: {
        valueInputOption: "USER_ENTERED", // Interpret TRUE/FALSE as checkbox values
        data,
      },
    });
    console.log(`[updateRowCells] Batch update successful:`, result.data);
  } catch (error: any) {
    console.error(`[updateRowCells] Batch update FAILED:`, error.message);
    throw error;
  }
}

// --- ACTION HANDLERS ---

async function handleAssign(
  sheets: any,
  queryId: string,
  data: {
    assignee: string;
    assignedBy?: string;
    remarks?: string;
    _currentStatus?: string;
  },
) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = getISTDateTime();

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
  // HYBRID APPROACH: Use current status from client if provided
  let currentStatus = data._currentStatus || "";

  if (!currentStatus) {
    console.log(
      `[handleAssign] Fetching current status (not provided by client)`,
    );
    const statusRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!D${rowIndex}`,
    });
    currentStatus = statusRes.data.values?.[0]?.[0] || "";
  }

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
  data: {
    newStatus: string;
    fields?: any;
    _currentStatus?: string;
    _previousStatus?: string;
    _currentRemarks?: string;
    _lastEditedBy?: string;
  },
) {
  const rowIndex = await findRowIndex(sheets, queryId);

  if (!rowIndex) {
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  // HYBRID APPROACH: Use current status from client if provided
  let currentStatus = data._currentStatus || "";

  if (!currentStatus) {
    console.log(
      `[handleUpdateStatus] Fetching current status (not provided by client)`,
    );
    const statusRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!D${rowIndex}`,
    });
    currentStatus = statusRes.data.values?.[0]?.[0] || "";
  }

  const now = getISTDateTime();
  
  // Get current remarks for audit trail comparison (from client or empty)
  const currentRemarks = data._currentRemarks || "";
  const newRemarks = data.fields?.Remarks;
  const lastEditedBy = data._lastEditedBy || "";
  
  const updates: any = {
    Status: data.newStatus,
    "Last Activity Date Time": now,
    ...data.fields,
  };
  
  // If Remarks field is being updated (changed from current value), add audit trail
  if (
    newRemarks !== undefined &&
    newRemarks !== currentRemarks &&
    lastEditedBy
  ) {
    console.log(`[handleUpdateStatus] Remarks changed, setting audit trail`);
    updates["Remark Added By"] = lastEditedBy;
    updates["Remark Added Date Time"] = now;
  }

  // Check for backward transition and clear fields that don't apply to the target bucket
  // Two types of clearing:
  // 1. FORCE clear: Fields that CANNOT exist in the target bucket (always clear, ignore user input)
  // 2. CONDITIONAL clear: Fields that CAN exist in target bucket but weren't provided (clearIfNotProvided)
  const bucketOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const oldIndex = bucketOrder.indexOf(currentStatus);
  const newIndex = bucketOrder.indexOf(data.newStatus);

  // Force clear a field - regardless of user input (field doesn't belong in target bucket)
  const forceClear = (fieldName: string) => {
    updates[fieldName] = "";
    // Also remove from data.fields if present to prevent it from being re-added
    if (data.fields && data.fields[fieldName] !== undefined) {
      delete data.fields[fieldName];
    }
  };

  // Conditionally clear a field - only if user didn't provide it (field CAN exist in target bucket)
  const clearIfNotProvided = (fieldName: string) => {
    if (data.fields && data.fields[fieldName] !== undefined) {
      // User explicitly provided this field - preserve their value
      return;
    }
    updates[fieldName] = "";
  };

  if (newIndex >= 0 && oldIndex >= 0 && newIndex < oldIndex) {
    // Moving to A: Clear ALL fields except Query Description, Type, Added By/Date
    if (data.newStatus === "A") {
      // Force clear - these fields don't belong in A
      forceClear("Assigned To");
      forceClear("Assigned By");
      forceClear("Assignment Date Time");
      forceClear("Remarks");
      forceClear("Remark Added By");
      forceClear("Remark Added Date Time");
      forceClear("Proposal Sent Date Time");
      forceClear("Whats Pending");
      forceClear("Entered In SF Date Time");
      forceClear("Event ID in SF");
      forceClear("Event Title in SF");
      forceClear("GmIndicator");
      forceClear("Discarded Date Time");
      forceClear("Delete Requested By");
      forceClear("Delete Requested Date Time");
      forceClear("Previous Status");
      forceClear("Delete Rejected");
    }
    // Moving to B: Keep Assignment + Remarks, clear proposal/SF/discard/deletion fields
    else if (data.newStatus === "B") {
      // Conditional clear - these CAN exist in B, preserve if user provided
      clearIfNotProvided("Remarks");
      // Force clear - these fields DON'T belong in B
      forceClear("Proposal Sent Date Time");
      forceClear("Whats Pending");
      forceClear("Entered In SF Date Time");
      forceClear("Event ID in SF");
      forceClear("Event Title in SF");
      forceClear("GmIndicator");
      forceClear("Discarded Date Time");
      forceClear("Delete Requested By");
      forceClear("Delete Requested Date Time");
      forceClear("Previous Status");
      forceClear("Delete Rejected");
    }
    // Moving to C or D: Keep proposal fields, clear SF/discard/deletion fields
    else if (["C", "D"].includes(data.newStatus)) {
      // Conditional clear - these CAN exist in C/D
      clearIfNotProvided("Proposal Sent Date Time");
      clearIfNotProvided("Whats Pending");
      // Force clear - these fields DON'T belong in C/D
      forceClear("Entered In SF Date Time");
      forceClear("Event ID in SF");
      forceClear("Event Title in SF");
      forceClear("GmIndicator");
      forceClear("Discarded Date Time");
      forceClear("Delete Requested By");
      forceClear("Delete Requested Date Time");
      forceClear("Previous Status");
      forceClear("Delete Rejected");
    }
    // Moving to E or F: Keep SF fields, clear discard/deletion fields
    else if (["E", "F"].includes(data.newStatus)) {
      // Conditional clear - these CAN exist in E/F
      clearIfNotProvided("Entered In SF Date Time");
      clearIfNotProvided("Event ID in SF");
      clearIfNotProvided("Event Title in SF");
      // Force clear - these fields DON'T belong in E/F
      forceClear("Discarded Date Time");
      forceClear("Delete Requested By");
      forceClear("Delete Requested Date Time");
      forceClear("Previous Status");
      forceClear("Delete Rejected");
    }
    // Moving to G: Clear deletion fields only
    else if (data.newStatus === "G") {
      // Force clear - these fields DON'T belong in G
      forceClear("Delete Requested By");
      forceClear("Delete Requested Date Time");
      forceClear("Previous Status");
      forceClear("Delete Rejected");
    }
  }

  await updateRowCells(sheets, rowIndex, updates);

  return NextResponse.json({ success: true });
}

async function handleEdit(sheets: any, queryId: string, data: any) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  const now = getISTDateTime();

  // HYBRID APPROACH: Use currentRemarks from client if provided, otherwise fetch
  // This reduces API calls by 1 per edit when client sends the value
  let currentRemarks = data._currentRemarks || "";

  // Only fetch if client didn't provide it (fallback for safety)
  if (data._currentRemarks === undefined) {
    console.log(
      `[handleEdit] Fetching current Remarks (not provided by client)`,
    );
    const currentRemarksRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!J${rowIndex}`, // Remarks column
    });
    currentRemarks = currentRemarksRes.data.values?.[0]?.[0] || "";
  }

  console.log(`[handleEdit] Query ${queryId}:`);
  console.log(`  Current Remarks: "${currentRemarks}"`);
  console.log(`  New Remarks: "${data.Remarks}"`);
  console.log(`  Last Edited By: "${data["Last Edited By"]}"`);
  console.log(`  Remarks changed: ${data.Remarks !== currentRemarks}`);

  const updates: any = {
    ...data,
    "Last Edited Date Time": now,
    "Last Activity Date Time": now,
  };

  // Remove internal fields that shouldn't be written to sheet
  delete updates._currentRemarks;

  // If Remarks field is being updated (changed from current value), add audit trail
  if (
    data.Remarks !== undefined &&
    data.Remarks !== currentRemarks &&
    data["Last Edited By"]
  ) {
    console.log(`  ✓ Setting remark audit trail`);
    updates["Remark Added By"] = data["Last Edited By"];
    updates["Remark Added Date Time"] = now;
  } else {
    console.log(`  ✗ NOT setting remark audit trail`);
  }

  await updateRowCells(sheets, rowIndex, updates);
  return NextResponse.json({ success: true });
}

async function handleAdd(sheets: any, data: Query) {
  // Generate unique ID with timestamp + random component to prevent collisions
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const realId = `Q-${timestamp}-${random}`;

  const now = getISTDateTime();

  // Set all required dates on the backend (not frontend)
  const enrichedData: Query = {
    ...data,
    "Query ID": realId,
    "Added Date Time": now,
    "Last Activity Date Time": now,
    "Last Edited Date Time": now,
    "Last Edited By": data["Added By"] || "",
  };

  // If assigned, set assignment date
  if (enrichedData["Assigned To"]) {
    enrichedData["Assignment Date Time"] = now;
  }

  // Helper function to convert column letter to number for proper sorting
  // A=1, B=2, ..., Z=26, AA=27, AB=28, ..., AD=30
  const columnToNumber = (col: string): number => {
    let result = 0;
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + (col.charCodeAt(i) - 64);
    }
    return result;
  };

  // Construct row in correct order (Columns A-AD)
  // Sort by column number, not alphabetically
  const keysInOrder = Object.entries(COL_MAP)
    .sort(([, a], [, b]) => columnToNumber(a) - columnToNumber(b))
    .map(([key]) => key);

  const newRow: string[] = [];
  keysInOrder.forEach((key) => {
    const value = enrichedData[key as keyof Query];
    newRow.push(String(value || ""));
  });

  try {
    const appendResult = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Queries!A:AD", // Extended to AD to include all audit fields
      valueInputOption: "RAW", // Store as raw text strings, not interpreted values
      insertDataOption: "INSERT_ROWS",
      resource: {
        values: [newRow],
      },
    });

    // Invalidate entire cache since row indices have shifted
    rowIndexCache.clear();

    return NextResponse.json({ success: true, queryId: realId });
  } catch (error: any) {
    throw error;
  }
}

async function handleDelete(
  sheets: any,
  queryId: string,
  data: { requestedBy: string; isAdmin?: boolean; _currentStatus?: string },
) {
  console.log(`[handleDelete] Starting delete for query ${queryId}`, data);

  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex) {
    console.error(`[handleDelete] Query not found: ${queryId}`);
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  console.log(`[handleDelete] Found query at row ${rowIndex}`);

  const now = getISTDateTime();

  // HYBRID APPROACH: Use current status from client if provided
  let currentStatus = data._currentStatus || "";

  if (!currentStatus) {
    console.log(
      `[handleDelete] Fetching current status (not provided by client)`,
    );
    const statusRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!D${rowIndex}`,
    });
    currentStatus = statusRes.data.values?.[0]?.[0] || "";
  }

  console.log(`[handleDelete] Current status: ${currentStatus}`);

  // Don't allow deleting if already in H bucket
  if (currentStatus === "H") {
    console.error(`[handleDelete] Query already in deleted bucket`);
    return NextResponse.json(
      { error: "Query is already deleted" },
      { status: 400 },
    );
  }

  // Build updates based on whether user is admin or junior
  const baseUpdates: Record<string, string> = {
    Status: "H",
    "Previous Status": currentStatus || "",
    "Last Activity Date Time": now,
    // Clear any previous rejection fields (in case this was rejected before)
    "Delete Rejected": "",
    "Delete Rejected By": "",
    "Delete Rejected Date Time": "",
  };

  let updates: Record<string, string>;

  if (data.isAdmin) {
    // Admin: Auto-approve - goes directly to H as "deleted" (not pending)
    // Sets Delete Approved By fields so it won't show as pending approval
    updates = {
      ...baseUpdates,
      "Delete Requested Date Time": now,
      "Delete Requested By": data.requestedBy,
      "Delete Approved By": data.requestedBy, // Auto-approved by self
      "Delete Approved Date Time": now,
    };
  } else {
    // Junior: Pending approval - shows in "Pending Deletions" for admin to approve
    updates = {
      ...baseUpdates,
      "Delete Requested Date Time": now,
      "Delete Requested By": data.requestedBy,
      // Don't set Delete Approved fields - leave them empty for pending state
    };
  }

  console.log(`[handleDelete] Applying updates:`, updates);

  try {
    await updateRowCells(sheets, rowIndex, updates);
    rowIndexCache.clear();
    console.log(`[handleDelete] Successfully deleted query ${queryId}`);
    return NextResponse.json({
      success: true,
      pending: !data.isAdmin, // Only pending if not admin
      approved: data.isAdmin, // Admin deletes are auto-approved
      status: "H",
      isAdmin: data.isAdmin || false,
    });
  } catch (error: any) {
    console.error(`[handleDelete] Failed to update:`, error);
    return NextResponse.json(
      {
        error: "Failed to move query to deleted bucket",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * Approve a pending deletion (Admin only) - moves query to H bucket (soft delete)
 * The query stays in the sheet but with Status = H for audit trail
 */
async function handleApproveDelete(
  sheets: any,
  queryId: string,
  approvedBy?: string,
) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex) {
    console.error(`[handleApproveDelete] Query not found: ${queryId}`);
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  const now = getISTDateTime();

  // Update to H status with approval info - query stays in sheet for audit trail
  const updates: Record<string, string> = {
    Status: "H", // Move to deleted bucket
    "Delete Approved By": approvedBy || "",
    "Delete Approved Date Time": now,
    // Keep "Delete Requested By" and "Delete Requested Date Time" for audit trail
    "Last Activity Date Time": now,
  };

  console.log(
    `[handleApproveDelete] Updating query ${queryId} at row ${rowIndex}`,
    updates,
  );

  try {
    await updateRowCells(sheets, rowIndex, updates);
    rowIndexCache.clear();
    console.log(`[handleApproveDelete] Successfully approved query ${queryId}`);
    return NextResponse.json({ success: true, approved: true, status: "H" });
  } catch (error: any) {
    console.error(`[handleApproveDelete] Failed to update:`, error);
    return NextResponse.json(
      { error: "Failed to approve deletion", details: error.message },
      { status: 500 },
    );
  }
}

/**
 * Reject a pending deletion (Admin only) - returns to previous status with Del-Rej flag
 */
async function handleRejectDelete(
  sheets: any,
  queryId: string,
  rejectedBy?: string,
  _previousStatus?: string,
) {
  const rowIndex = await findRowIndex(sheets, queryId);
  if (!rowIndex)
    return NextResponse.json({ error: "Query not found" }, { status: 404 });

  // HYBRID APPROACH: Use previous status from client if provided
  let previousStatus = _previousStatus || "";

  if (!previousStatus) {
    console.log(
      `[handleRejectDelete] Fetching previous status (not provided by client)`,
    );
    const prevStatusRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `Queries!W${rowIndex}`, // Previous Status column
    });
    previousStatus = prevStatusRes.data.values?.[0]?.[0] || "A";
  }

  const now = getISTDateTime();

  const updates: Record<string, string> = {
    Status: previousStatus, // Return to previous status
    "Previous Status": "", // Clear previous status
    // KEEP "Delete Requested Date Time" and "Delete Requested By" for audit trail
    "Delete Rejected": "true", // Mark as rejected (shows "Del-Rej" indicator)
    "Delete Rejected By": rejectedBy || "", // For audit trail
    "Delete Rejected Date Time": now, // For audit trail
    "Last Activity Date Time": now,
  };

  console.log(
    `[handleRejectDelete] Applying updates to row ${rowIndex}:`,
    updates,
  );

  await updateRowCells(sheets, rowIndex, updates);

  console.log(
    `[handleRejectDelete] Successfully rejected deletion for query ${queryId}, restored to status ${previousStatus}`,
  );

  return NextResponse.json({ success: true, restoredStatus: previousStatus });
}
