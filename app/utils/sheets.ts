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
  "Previous Status"?: string;           // Status before moving to H
  "Delete Approved By"?: string;        // Admin who approved deletion
  "Delete Approved Date Time"?: string; // When deletion was approved
  "Delete Rejected"?: string;           // "true" if deletion was rejected
  [key: string]: string | undefined;
}

export interface User {
  Email: string;
  Name: string;
  Role: "Junior" | "Senior" | "Admin" | string;
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
    BucketOrder: ["A", "B", "C", "D", "E", "F", "G"],
    UserOrder: [],
    HistoryDays: 3,
  };

  if (!rows || rows.length <= 1) return defaultPreferences;

  // Find row for current user
  // Headers: User Email, Preferred View, Column Count, Bucket Order, User Order
  const userRow = rows.find((row) => row[0] === currentUserEmail);

  if (!userRow) return defaultPreferences;

  try {
    return {
      ViewType: userRow[1] || "bucket",
      ColumnCount: Number(userRow[2]) || 4,
      BucketOrder: userRow[3]
        ? JSON.parse(userRow[3])
        : defaultPreferences.BucketOrder,
      UserOrder: userRow[4] ? JSON.parse(userRow[4]) : [],
      HistoryDays: Number(userRow[5]) || 3,
    };
  } catch (e) {
    console.error("Error parsing preferences JSON:", e);
    return defaultPreferences;
  }
}
