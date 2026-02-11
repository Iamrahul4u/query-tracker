"use client";

import { Check, X, Trash2 } from "lucide-react";
import { Query, User } from "../utils/sheets";
import { useQueryStore } from "../stores/queryStore";
import { useState } from "react";

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
    // Parse date - handle both "DD/MM/YYYY HH:MM:SS" and "DD/MM/YYYY, HH:MM:SS" formats
    const normalized = dateStr.replace(", ", " ");
    const parts = normalized.split(" ");

    if (parts.length < 1) return dateStr;

    const datePart = parts[0];
    const timePart = parts[1] || "00:00:00";

    const [day, month, year] = datePart.split("/").map((p) => parseInt(p, 10));
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

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return "-";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

export function PendingDeletions({
  queries,
  users,
  currentUserRole,
}: PendingDeletionsProps) {
  const {
    approveDeleteOptimistic,
    rejectDeleteOptimistic,
    approveAllDeletesOptimistic,
    rejectAllDeletesOptimistic,
  } = useQueryStore();
  const [isProcessing, setIsProcessing] = useState(false);

  // Only show for Admin and Pseudo Admin (NOT Senior or Junior)
  const isAdminOrPseudoAdmin = ["admin", "pseudo admin"].includes(
    currentUserRole.toLowerCase(),
  );
  if (!isAdminOrPseudoAdmin) return null;

  // Filter queries with pending deletion requests (not yet approved or rejected)
  const pendingDeletions = queries.filter(
    (q) =>
      q["Delete Requested By"] &&
      !q["Delete Approved By"] &&
      !q["Delete Rejected"],
  );

  if (pendingDeletions.length === 0) return null;

  const handleApproveAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await approveAllDeletesOptimistic();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await rejectAllDeletesOptimistic();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h3 className="text-sm font-semibold text-red-800">
            Pending Deletions ({pendingDeletions.length})
          </h3>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleApproveAll}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Approve all pending deletions"
          >
            <Check className="w-3 h-3" />
            Approve All
          </button>
          <button
            onClick={handleRejectAll}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reject all pending deletions"
          >
            <X className="w-3 h-3" />
            Reject All
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {pendingDeletions.map((query) => (
          <div
            key={query["Query ID"]}
            className="flex flex-col bg-white rounded-md px-2.5 py-1.5 border border-red-100 gap-1"
          >
            {/* First Row: Query Description + Individual Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {query["Query Description"]}
                </p>
                <span className="text-xs text-gray-400">•</span>
                <p className="text-xs text-gray-500 whitespace-nowrap">
                  Requested by{" "}
                  {getDisplayName(query["Delete Requested By"], users)} on{" "}
                  {formatDate(query["Delete Requested Date Time"])}
                </p>
              </div>

              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => approveDeleteOptimistic(query["Query ID"])}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition disabled:opacity-50"
                  title="Approve deletion"
                >
                  <Check className="w-3 h-3" />
                  Approve
                </button>
                <button
                  onClick={() => rejectDeleteOptimistic(query["Query ID"])}
                  disabled={isProcessing}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition disabled:opacity-50"
                  title="Reject deletion"
                >
                  <X className="w-3 h-3" />
                  Reject
                </button>
              </div>
            </div>

            {/* Second Row: Remarks (if present) */}
            {query.Remarks && query.Remarks.trim() && (
              <div className="flex items-start gap-1.5 pl-1">
                <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                  Remarks:
                </span>
                <p
                  className="text-xs text-gray-700 flex-1"
                  title={query.Remarks}
                >
                  {truncateText(query.Remarks, 100)}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
