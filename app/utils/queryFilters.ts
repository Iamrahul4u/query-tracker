import { Query, User } from "./sheets";
import { BUCKET_ORDER } from "../config/sheet-constants";

/**
 * Filter queries based on user role
 * - Admin/Senior: See all queries
 * - Junior: See Bucket A + Own assigned queries
 */
export function getVisibleQueries(
  queries: Query[],
  currentUser: User | null,
): Query[] {
  if (!currentUser) return [];

  const role = (currentUser.Role || "").toLowerCase();
  if (["admin", "senior"].includes(role)) {
    return queries;
  }

  // Junior sees: Bucket A OR Own Assigned
  return queries.filter(
    (q) =>
      q.Status === "A" ||
      (q["Assigned To"] &&
        q["Assigned To"].toLowerCase() === currentUser.Email.toLowerCase()),
  );
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

        // Parse date: "DD/MM/YYYY, HH:MM:SS"
        const parts = dateStr.split(",")[0].split("/");
        if (parts.length === 3) {
          const d = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
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
 * Calculate dashboard statistics
 */
export function calculateStats(queries: Query[]) {
  return {
    pending: queries.filter((q) => q["Status"] === "A").length,
    inProgress: queries.filter((q) => q["Status"] === "B").length,
    sent: queries.filter((q) => ["C", "D", "E", "F"].includes(q["Status"]))
      .length,
  };
}
