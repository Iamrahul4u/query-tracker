"use client";

import { Check, X, Trash2 } from "lucide-react";
import { Query, User } from "../utils/sheets";
import { useQueryStore } from "../stores/queryStore";

interface PendingDeletionsProps {
  queries: Query[];
  users: User[];
  currentUserRole: string;
}

/**
 * Get display name from email using users list
 */
function getDisplayName(email: string | undefined, users: User[]): string {
  if (!email) return "-";

  // Defensive check: ensure users is an array
  if (!Array.isArray(users)) {
    const namePart = email.split("@")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }

  const user = users.find(
    (u) => u.Email?.toLowerCase() === email.toLowerCase(),
  );
  if (user?.Name) return user.Name;

  const namePart = email.split("@")[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

/**
 * Format date to user-friendly format
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";

  try {
    const parts = dateStr.split(",")[0].split("/");
    if (parts.length !== 3) return dateStr;

    const [day, month, year] = parts.map((p) => parseInt(p, 10));
    const timePart = dateStr.split(",")[1]?.trim() || "00:00:00";
    const [hours, minutes] = timePart.split(":").map((t) => parseInt(t, 10));
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0);

    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function PendingDeletions({
  queries,
  users,
  currentUserRole,
}: PendingDeletionsProps) {
  const { approveDeleteOptimistic, rejectDeleteOptimistic } = useQueryStore();

  // Only show for Admin, Pseudo Admin, or Senior
  const isAdmin = ["admin", "pseudo admin", "senior"].includes(
    currentUserRole.toLowerCase(),
  );
  if (!isAdmin) return null;

  // Filter queries with pending deletion requests
  const pendingDeletions = queries.filter((q) => q["Delete Requested By"]);

  if (pendingDeletions.length === 0) return null;

  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trash2 className="w-4 h-4 text-red-600" />
        <h3 className="text-sm font-semibold text-red-800">
          Pending Deletions ({pendingDeletions.length})
        </h3>
      </div>

      <div className="space-y-2">
        {pendingDeletions.map((query) => (
          <div
            key={query["Query ID"]}
            className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-red-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {query["Query Description"]}
              </p>
              <p className="text-xs text-gray-500">
                Requested by{" "}
                {getDisplayName(query["Delete Requested By"], users)} on{" "}
                {formatDate(query["Delete Requested Date Time"])}
              </p>
            </div>

            <div className="flex gap-2 ml-3">
              <button
                onClick={() => approveDeleteOptimistic(query["Query ID"])}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition"
                title="Approve deletion"
              >
                <Check className="w-3 h-3" />
                Approve
              </button>
              <button
                onClick={() => rejectDeleteOptimistic(query["Query ID"])}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition"
                title="Reject deletion"
              >
                <X className="w-3 h-3" />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
