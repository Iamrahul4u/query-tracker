export const SPREADSHEET_ID = "1Itpin1gPmJIy0KK6kBDklfhgOnNapvqywgypZ0h2bqA";
// Actually, I should check if there is an existing constants file or if I should hardcode the ID I saw in previous file view.
// In previous view of route.ts, SPREADSHEET_ID was hardcoded or imported. Let's check route.ts first to be safe, but for now I will define the ranges.

export const SHEET_RANGES = {
  QUERIES: "Queries!A:AD", // Extended to AD to include rejection and remark audit fields (AA-AD)
  USERS: "Users!A:F",
  PREFERENCES: "Preferences!A:D", // Updated: A=Email, B=PreferredView, C=BucketViewPrefs (JSON), D=UserViewPrefs (JSON)
};

export interface BucketConfig {
  name: string;
  description: string;
  color: string;
  visibleFields: string[];
  defaultSortField: string; // Primary sort field for this bucket (per FRD)
  evaporateAfterDays?: number;
}

export const BUCKETS: Record<string, BucketConfig> = {
  A: {
    name: "A) Pending (Unassigned)",
    description: "New queries in common pool",
    color: "#ea4335",
    defaultSortField: "Added Date Time", // Per FRD: Sort by Added Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Added By",
      "Added Date Time",
    ],
  },
  B: {
    name: "B) Pending Proposal",
    description: "Assigned, awaiting proposal",
    color: "#fbbc04",
    defaultSortField: "Assignment Date Time", // Per FRD: Sort by Assigned Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Assigned To",
      "Assigned By",
      "Assignment Date Time",
      "Remarks",
    ],
  },
  C: {
    name: "C) Proposal Sent",
    description: "Full proposal sent, pending SF entry",
    color: "#34a853",
    defaultSortField: "Proposal Sent Date Time", // Per FRD: Sort by Proposal Sent Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Proposal Sent Date Time",
      "Assignment Date Time",
      "Assigned By",
    ],
  },
  D: {
    name: "D) Proposal Sent Partially",
    description: "Partial proposal sent, pending SF entry",
    color: "#ff9800",
    defaultSortField: "Proposal Sent Date Time", // Per FRD: Sort by Proposal Sent Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Proposal Sent Date Time",
      "Whats Pending",
      "Assignment Date Time",
      "Assigned By",
    ],
  },
  E: {
    name: "E) Partial Proposal + In SF",
    description: "Partial proposal sent AND entered in Salesforce",
    color: "#673ab7",
    defaultSortField: "Entered In SF Date Time", // Per FRD: Sort by SF Entry Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Entered In SF Date Time",
      "Proposal Sent Date Time",
      "Whats Pending",
      "Event ID in SF",
      "Event Title in SF",
    ],
  },
  F: {
    name: "F) Full Proposal + In SF",
    description: "FINAL - Full proposal sent AND entered in Salesforce",
    color: "#1a73e8",
    defaultSortField: "Entered In SF Date Time", // Per FRD: Sort by SF Entry Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Entered In SF Date Time",
      "Proposal Sent Date Time",
      "Event ID in SF",
      "Event Title in SF",
      "GmIndicator",
    ],
    evaporateAfterDays: 3,
  },
  G: {
    name: "G) Discarded",
    description: "Query rejected or canceled",
    color: "#9e9e9e",
    defaultSortField: "Discarded Date Time", // Per FRD: Sort by Discarded Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Discarded Date Time",
      "Assignment Date Time",
      "Assigned By",
    ],
    evaporateAfterDays: 3,
  },
  H: {
    name: "H) Deleted (Pending Approval)",
    description: "Delete requested, awaiting Admin approval",
    color: "#795548",
    defaultSortField: "Delete Requested Date Time", // Per FRD: Sort by Deleted Date (newest first)
    visibleFields: [
      "Query Description",
      "Query Type",
      "Delete Requested Date Time",
      "Delete Requested By",
      "Previous Status",
    ],
    evaporateAfterDays: 3, // Only applies to approved deletions, pending deletions always visible
    // After approval: permanently deleted. After rejection: returns to previous bucket.
  },
};

export const BUCKET_ORDER = Object.keys(BUCKETS);

export const QUERY_TYPE_ORDER = ["SEO Query", "New", "Ongoing", "On Hold"];
