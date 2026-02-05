export interface Query {
  "Query ID": string;
  "Query Description": string;
  "Query Type": "New" | "Ongoing" | "SEO" | string;
  Status: string;
  "Added By": string;
  "Added Date Time": string;
  "Assigned To": string;
  "Assigned By": string;
  "Assignment Date Time": string;
  Remarks: string;
  "Proposal Sent Date Time": string;
  "Whats Pending": string;
  "Entered In SF Date Time": string;
  "Event ID in SF": string;
  "Event Title in SF": string;
  "Discarded Date Time": string;
  GmIndicator: string;
  "Delete Requested Date Time": string;
  "Delete Requested By": string;
  "Last Edited Date Time": string;
  "Last Edited By": string;
  "Last Activity Date Time": string;
  // Deletion workflow fields (Bucket H)
  "Previous Status"?: string; // Status before moving to H
  "Delete Approved By"?: string; // Admin who approved deletion
  "Delete Approved Date Time"?: string; // When deletion was approved
  "Delete Rejected"?: string; // "true" if deletion was rejected
  [key: string]: string | undefined;
}

export interface User {
  Email: string;
  Name: string;
  Role: "Junior" | "Senior" | "Admin" | "Pseudo Admin" | string;
  "Display Order": string;
  "Is Active": string;
  "Display Name"?: string; // 5-6 char short name for compact view
}

export interface ViewPreferences {
  layout: "default" | "linear";
  columns: 2 | 3 | 4;
  detailView: boolean;
  sortField: string;
  sortAscending: boolean;
  sortBuckets: string; // "ALL" or comma-separated like "A,B,C"
}

export interface Preferences {
  preferredView: "bucket" | "user"; // Last active view
  bucketViewPrefs: ViewPreferences;
  userViewPrefs: ViewPreferences;
}

export function parseQueries(rows: string[][]): Query[] {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];

  return rows.slice(1).map((row, index) => {
    const query: any = {};
    headers.forEach((header, i) => {
      query[header] = row[i] || "";
    });
    // Fallback ID if missing
    if (!query["Query ID"]) query["Query ID"] = `ROW-${index + 2}`;
    return query;
  });
}

export function parseUsers(rows: string[][]): User[] {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];

  return rows.slice(1).map((row) => {
    const user: any = {};
    headers.forEach((header, i) => {
      user[header] = row[i] || "";
    });
    return user;
  });
}

export function parsePreferences(
  rows: string[][],
  currentUserEmail: string,
): Preferences {
  const defaultViewPrefs: ViewPreferences = {
    layout: "default",
    columns: 4,
    detailView: false,
    sortField: "",
    sortAscending: true,
    sortBuckets: "ALL",
  };

  const defaultPreferences: Preferences = {
    preferredView: "bucket",
    bucketViewPrefs: { ...defaultViewPrefs },
    userViewPrefs: { ...defaultViewPrefs },
  };

  console.log("[parsePreferences] Parsing for user:", currentUserEmail);
  console.log("[parsePreferences] Total rows:", rows?.length);

  if (!rows || rows.length <= 1) {
    console.log("[parsePreferences] No data rows, returning defaults");
    return defaultPreferences;
  }

  // Find row for current user
  // Structure: A=Email, B=PreferredView, C=BucketViewPreferences (JSON), D=UserViewPreferences (JSON)
  const userRow = rows.find((row) => row[0] === currentUserEmail);

  if (!userRow) {
    console.log("[parsePreferences] No row found for user, returning defaults");
    return defaultPreferences;
  }

  console.log("[parsePreferences] Found user row:", userRow);

  try {
    const preferredView = (userRow[1] || "bucket") as "bucket" | "user";

    // Parse Bucket View Preferences from column C
    let bucketViewPrefs = { ...defaultViewPrefs };
    if (userRow[2] && userRow[2].trim()) {
      try {
        const parsed = JSON.parse(userRow[2]);
        bucketViewPrefs = { ...defaultViewPrefs, ...parsed };
        console.log("[parsePreferences] Parsed bucket prefs:", bucketViewPrefs);
      } catch (e) {
        console.warn(
          "[parsePreferences] Failed to parse bucket prefs, using defaults:",
          e,
        );
      }
    } else {
      console.log("[parsePreferences] No bucket prefs data, using defaults");
    }

    // Parse User View Preferences from column D
    let userViewPrefs = { ...defaultViewPrefs };
    if (userRow[3] && userRow[3].trim()) {
      try {
        const parsed = JSON.parse(userRow[3]);
        userViewPrefs = { ...defaultViewPrefs, ...parsed };
        console.log("[parsePreferences] Parsed user prefs:", userViewPrefs);
      } catch (e) {
        console.warn(
          "[parsePreferences] Failed to parse user prefs, using defaults:",
          e,
        );
      }
    } else {
      console.log("[parsePreferences] No user prefs data, using defaults");
    }

    const result = {
      preferredView,
      bucketViewPrefs,
      userViewPrefs,
    };

    console.log("[parsePreferences] Final result:", result);
    return result;
  } catch (e) {
    console.error(
      "[parsePreferences] Unexpected error, returning defaults:",
      e,
    );
    return defaultPreferences;
  }
}
