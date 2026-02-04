import { Query, User } from "./sheets";
import { BUCKET_ORDER } from "../config/sheet-constants";

/**
 * Filter queries based on user role
 * - Admin/Senior: See all queries
 * - Junior: See ALL Bucket A + Own assigned queries in B-G
 *   (Action restrictions handled in component button visibility)
 */
export function getVisibleQueries(
  queries: Query[],
  currentUser: User | null,
): Query[] {
  if (!currentUser) return [];

  const role = (currentUser.Role || "").toLowerCase();
  if (["admin", "pseudo admin", "senior"].includes(role)) {
    return queries;
  }

  const userEmail = currentUser.Email.toLowerCase();

  // Junior sees:
  // 1. Bucket A - ALL queries (action restrictions in UI components)
  // 2. Bucket B-G - ONLY their own assigned queries
  return queries.filter((q) => {
    // Show all Bucket A queries to Junior
    if (q.Status === "A") {
      return true;
    }

    // For all other buckets (B-G), only show if assigned to this user
    return q["Assigned To"] && q["Assigned To"].toLowerCase() === userEmail;
  });
}

/**
 * Group queries by bucket (status)
 * Applies history day filtering for F and G buckets
 */
export function groupQueriesByBucket(
  queries: Query[],
  historyDays: number,
): Record<string, Query[]> {
  const grouped: Record<string, Query[]> = {};

  BUCKET_ORDER.forEach((bucket) => {
    grouped[bucket] = queries.filter((q) => {
      // Status match
      if (q["Status"] !== bucket) return false;

      // Filter by history days for F (Completed) and G (Discarded)
      if (["F", "G"].includes(bucket)) {
        const dateStr =
          bucket === "F"
            ? q["Entered In SF Date Time"]
            : q["Discarded Date Time"];
        if (!dateStr) return false;

        const d = parseDateRobust(dateStr);
        if (d) {
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - d.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > historyDays) return false;
        }
      }
      return true;
    });
  });

  return grouped;
}

/**
 * Group queries by assigned user
 */
export function groupQueriesByUser(queries: Query[]): Record<string, Query[]> {
  const grouped: Record<string, Query[]> = {};

  queries.forEach((q) => {
    const user = q["Assigned To"] || "Unassigned";
    if (!grouped[user]) grouped[user] = [];
    grouped[user].push(q);
  });

  return grouped;
}

/**
 * Filter queries by history days for F and G buckets
 * Returns queries with F/G status older than historyDays removed
 */
export function filterByHistoryDays(
  queries: Query[],
  historyDays: number,
): Query[] {
  return queries.filter((q) => {
    const status = q["Status"];

    // Only filter F and G buckets by history
    if (!["F", "G"].includes(status)) return true;

    // Get the relevant date for the bucket
    const dateStr =
      status === "F" ? q["Entered In SF Date Time"] : q["Discarded Date Time"];

    if (!dateStr) return false;

    // Parse date: "DD/MM/YYYY, HH:MM:SS"
    const d = parseDateRobust(dateStr);
    if (d) {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= historyDays;
    }
    return true; // Keep if date invalid (safe fallback)
  });
}

/**
 * Robust date parsing (DD/MM/YYYY or MM/DD/YYYY)
 */
function parseDateRobust(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Try DD/MM/YYYY (Standard)
  const parts = dateStr.split(",")[0].split("/");
  if (parts.length === 3) {
    // Check if DD/MM/YYYY
    const d1 = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
    if (!isNaN(d1.getTime())) return d1;

    // Try MM/DD/YYYY (US)
    const d2 = new Date(`${parts[0]}/${parts[1]}/${parts[2]}`);
    if (!isNaN(d2.getTime())) return d2;
  }

  // Fallback to standard parse
  const d3 = new Date(dateStr);
  return !isNaN(d3.getTime()) ? d3 : null;
}

/**
 * Calculate dashboard statistics for all 7 buckets
 */
export function calculateStats(queries: Query[]): Record<string, number> {
  const stats: Record<string, number> = {
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
    G: 0,
  };

  queries.forEach((q) => {
    const status = q["Status"];
    if (status && stats.hasOwnProperty(status)) {
      stats[status]++;
    }
  });

  return stats;
}

/**
 * Filter queries by search term (Query ID or Description)
 * Case-insensitive search
 */
export function filterBySearch(queries: Query[], searchTerm: string): Query[] {
  if (!searchTerm || searchTerm.trim() === "") {
    return queries;
  }

  const term = searchTerm.toLowerCase().trim();

  return queries.filter((q) => {
    const queryId = (q["Query ID"] || "").toLowerCase();
    const description = (q["Query Description"] || "").toLowerCase();

    return queryId.includes(term) || description.includes(term);
  });
}

/**
 * Date field options for sorting and display
 */
export const DATE_FIELDS = [
  { value: "Added Date Time", label: "Added" },
  { value: "Assignment Date Time", label: "Assigned" },
  { value: "Proposal Sent Date Time", label: "Proposal Sent" },
  { value: "Entered In SF Date Time", label: "In SF" },
  { value: "Discarded Date Time", label: "Discarded" },
  { value: "Delete Requested Date Time", label: "Delete Requested" },
] as const;

export type DateFieldKey = (typeof DATE_FIELDS)[number]["value"];

/**
 * Parse date string in DD/MM/YYYY, HH:MM:SS format
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  try {
    // Format: "DD/MM/YYYY, HH:MM:SS"
    const parts = dateStr.split(",")[0].split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts.map((p) => parseInt(p, 10));
      const timePart = dateStr.split(",")[1]?.trim() || "00:00:00";
      const [hours, minutes] = timePart.split(":").map((t) => parseInt(t, 10));
      return new Date(year, month - 1, day, hours || 0, minutes || 0);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Sort queries by a date field
 * @param queries - Array of queries to sort
 * @param dateField - Which date field to sort by
 * @param ascending - true = oldest first, false = newest first
 */
export function sortQueriesByDate(
  queries: Query[],
  dateField: DateFieldKey,
  ascending: boolean = true,
): Query[] {
  return [...queries].sort((a, b) => {
    const dateA = parseDate(a[dateField]);
    const dateB = parseDate(b[dateField]);

    // Handle missing dates - push to end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    const diff = dateA.getTime() - dateB.getTime();
    return ascending ? diff : -diff;
  });
}

/**
 * Get default sort field for a bucket based on requirements
 * Per FRD: Each bucket has a primary date field for sorting
 */
export function getDefaultSortFieldForBucket(bucketKey: string): DateFieldKey {
  const sortMap: Record<string, DateFieldKey> = {
    A: "Added Date Time",
    B: "Assignment Date Time",
    C: "Proposal Sent Date Time",
    D: "Proposal Sent Date Time",
    E: "Entered In SF Date Time",
    F: "Entered In SF Date Time",
    G: "Discarded Date Time",
    H: "Delete Requested Date Time",
  };

  return sortMap[bucketKey] || "Added Date Time";
}

/**
 * Sort queries with bucket-specific logic
 * - If customSortField is provided AND bucket is in sortBuckets, use it (with fallback to bucket default if field missing)
 * - Otherwise use bucket's default sort field
 * - All sorting is newest first (descending) per requirements
 */
export function sortQueriesForBucket(
  queries: Query[],
  bucketKey: string,
  customSortField?: DateFieldKey,
  customAscending?: boolean,
  sortBuckets?: string[],
): Query[] {
  const defaultField = getDefaultSortFieldForBucket(bucketKey);

  // Check if custom sort should apply to this bucket
  const applyCustomSort =
    customSortField &&
    sortBuckets &&
    (sortBuckets.includes("ALL") || sortBuckets.includes(bucketKey));

  const sortField = applyCustomSort ? customSortField : defaultField;
  const ascending =
    applyCustomSort && customAscending !== undefined ? customAscending : false; // Default: newest first

  return [...queries].sort((a, b) => {
    // Try sort field first
    let dateA = parseDate(a[sortField]);
    let dateB = parseDate(b[sortField]);

    // If custom field is missing, fall back to bucket default
    if (applyCustomSort && (!dateA || !dateB)) {
      if (!dateA) dateA = parseDate(a[defaultField]);
      if (!dateB) dateB = parseDate(b[defaultField]);
    }

    // Handle missing dates - push to end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    const diff = dateA.getTime() - dateB.getTime();
    return ascending ? diff : -diff;
  });
}
