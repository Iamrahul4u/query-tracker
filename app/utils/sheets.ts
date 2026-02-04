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

export interface Preferences {
  ViewType: string;
  BucketViewMode?: string;
  ColumnCount: number;
  BucketOrder: string[];
  UserOrder: string[];
  HistoryDays: number;
  DetailView?: boolean; // Detail view toggle (1-row vs 2-row cards)
  SortField?: string; // Custom sort field
  SortAscending?: boolean; // Sort direction
  SortBuckets?: string[]; // Buckets to apply custom sort to (default: ["ALL"])
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
  const defaultPreferences: Preferences = {
    ViewType: "bucket",
    ColumnCount: 4,
    BucketOrder: ["A", "B", "C", "D", "E", "F", "G", "H"],
    UserOrder: [],
    HistoryDays: 3,
    DetailView: false,
    SortField: undefined, // No custom sort by default
    SortAscending: true,
    SortBuckets: ["ALL"], // Default: apply to all buckets
  };

  if (!rows || rows.length <= 1) return defaultPreferences;

  // Find row for current user
  // Structure: A=Email, B=View, C=BucketOrder, D=UserOrder, E=DetailView, F=SortField, G=SortAscending, H=SortBuckets
  const userRow = rows.find((row) => row[0] === currentUserEmail);

  if (!userRow) return defaultPreferences;

  try {
    // Parse SortBuckets from column H (comma-separated or "ALL")
    let sortBuckets: string[] = ["ALL"];
    if (userRow[7]) {
      const parsed = userRow[7].trim();
      if (parsed === "ALL" || parsed === "") {
        sortBuckets = ["ALL"];
      } else {
        sortBuckets = parsed
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean);
      }
    }

    return {
      ViewType: userRow[1] || "bucket",
      ColumnCount: 4, // Not stored in sheet, always default to 4
      BucketOrder: userRow[2]
        ? JSON.parse(userRow[2])
        : defaultPreferences.BucketOrder,
      UserOrder: userRow[3] ? JSON.parse(userRow[3]) : [],
      HistoryDays: 3, // Not stored in sheet, always default to 3
      DetailView: userRow[4] === "true" || userRow[4] === "TRUE" || false,
      SortField: userRow[5] || undefined,
      SortAscending:
        userRow[6] === undefined || userRow[6] === ""
          ? true
          : userRow[6] === "true" || userRow[6] === "TRUE",
      SortBuckets: sortBuckets,
    };
  } catch (e) {
    console.error("Error parsing preferences JSON:", e);
    return defaultPreferences;
  }
}
