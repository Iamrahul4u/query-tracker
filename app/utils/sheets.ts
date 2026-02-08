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
  "Delete Rejected By"?: string; // Admin who rejected deletion
  "Delete Rejected Date Time"?: string; // When deletion was rejected
  // Remark audit trail
  "Remark Added By"?: string; // User who added/modified remark
  "Remark Added Date Time"?: string; // When remark was added/modified
  // Internal flags (not in sheet)
  _isGhostInOriginalBucket?: boolean; // True when showing pending deletion in original bucket (grayed out)
  [key: string]: string | undefined | boolean;
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
  groupBy?: "type" | "bucket"; // User View only: group by Query Type or Bucket/Status
  hiddenBuckets?: string; // Comma-separated bucket letters like "A,B" or empty for none
  hiddenUsers?: string; // Comma-separated user emails or empty for none
}

export interface Preferences {
  preferredView: "bucket" | "user" | "list"; // Last active view
  bucketViewPrefs: ViewPreferences;
  userViewPrefs: ViewPreferences;
}

export function parseQueries(rows: string[][]): Query[] {
  if (!rows || rows.length <= 1) return [];

  // Trim whitespace from headers to handle \r\n and other whitespace
  const headers = rows[0].map((h) => (h || "").trim());

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
    groupBy: "bucket", // Default to bucket grouping
  };

  const defaultPreferences: Preferences = {
    preferredView: "bucket",
    bucketViewPrefs: { ...defaultViewPrefs },
    userViewPrefs: { ...defaultViewPrefs },
  };

  if (!rows || rows.length <= 1) {
    return defaultPreferences;
  }

  // Find row for current user
  // Structure: A=Email, B=PreferredView, C=BucketViewPreferences (JSON), D=UserViewPreferences (JSON)
  const userRow = rows.find((row) => row[0] === currentUserEmail);

  if (!userRow) {
    return defaultPreferences;
  }

  try {
    const preferredView = (userRow[1] || "bucket") as "bucket" | "user";

    // Parse Bucket View Preferences from column C
    let bucketViewPrefs = { ...defaultViewPrefs };
    if (userRow[2] && userRow[2].trim()) {
      try {
        const parsed = JSON.parse(userRow[2]);
        bucketViewPrefs = { ...defaultViewPrefs, ...parsed };
      } catch (e) {
        // Use defaults on parse error
      }
    }

    // Parse User View Preferences from column D
    let userViewPrefs = { ...defaultViewPrefs };
    if (userRow[3] && userRow[3].trim()) {
      try {
        const parsed = JSON.parse(userRow[3]);
        userViewPrefs = { ...defaultViewPrefs, ...parsed };
      } catch (e) {
        // Use defaults on parse error
      }
    }

    const result = {
      preferredView,
      bucketViewPrefs,
      userViewPrefs,
    };

    return result;
  } catch (e) {
    return defaultPreferences;
  }
}
