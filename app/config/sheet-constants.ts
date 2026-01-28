export const SPREADSHEET_ID = "1Itpin1gPmJIy0KK6kBDklfhgOnNapvqywgypZ0h2bqA";
// Actually, I should check if there is an existing constants file or if I should hardcode the ID I saw in previous file view.
// In previous view of route.ts, SPREADSHEET_ID was hardcoded or imported. Let's check route.ts first to be safe, but for now I will define the ranges.

export const SHEET_RANGES = {
  QUERIES: "Queries!A:V",
  USERS: "Users!A:E",
  PREFERENCES: "Preferences!A:F",
};

export interface BucketConfig {
  name: string;
  description: string;
  color: string;
  visibleFields: string[];
  evaporateAfterDays?: number;
}

export const BUCKETS: Record<string, BucketConfig> = {
  A: {
    name: "A) Pending (Unassigned)",
    description: "New queries in common pool",
    color: "#ea4335",
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
    visibleFields: [
      "Query Description",
      "Query Type",
      "Entered In SF Date Time",
      "Proposal Sent Date Time",
      "Whats Pending",
      "Event ID",
      "Event Title",
    ],
  },
  F: {
    name: "F) Full Proposal + In SF",
    description: "FINAL - Full proposal sent AND entered in Salesforce",
    color: "#1a73e8",
    visibleFields: [
      "Query Description",
      "Query Type",
      "Entered In SF Date Time",
      "Proposal Sent Date Time",
      "Event ID",
      "Event Title",
      "Gm Indicator",
    ],
    evaporateAfterDays: 3,
  },
  G: {
    name: "G) Discarded",
    description: "Query rejected or canceled",
    color: "#9e9e9e",
    visibleFields: [
      "Query Description",
      "Query Type",
      "Discarded Date Time",
      "Assignment Date Time",
      "Assigned By",
    ],
    evaporateAfterDays: 3,
  },
};

export const BUCKET_ORDER = Object.keys(BUCKETS);

export const QUERY_TYPE_ORDER = ["SEO Query", "New", "Ongoing"];
