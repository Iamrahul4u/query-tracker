import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Query, User } from "../utils/sheets";

interface QueryDetailModalProps {
  query: Query;
  users: User[];
  currentUser: User | null;
  onClose: () => void;
  onEdit?: (query: Query) => void;
}

const BUCKET_NAMES: Record<string, string> = {
  A: "Pending (Unassigned)",
  B: "Pending Proposal",
  C: "Proposal Sent",
  D: "Proposal Sent Partially",
  E: "Partial Proposal + In SF",
  F: "Full Proposal + In SF",
  G: "Discarded",
  H: "Deleted",
};

/**
 * Format date from DD/MM/YYYY HH:MM:SS to user-friendly format
 * Returns "6:30 PM, 21 January 2026"
 */
function formatAuditDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";

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

    // Format as "6:30 PM, 21 January 2026"
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dateFormatted = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return `${timeStr}, ${dateFormatted}`;
  } catch {
    return dateStr;
  }
}

/**
 * Convert email to display name
 * Looks up user by email and returns their name, or extracts name from email if not found
 */
function getDisplayName(email: string | undefined, users: User[]): string {
  if (!email) return "—";

  // Find user by email
  const user = users.find(
    (u) => u.Email?.toLowerCase() === email.toLowerCase(),
  );
  if (user?.Name) return user.Name;

  // Fallback: extract name from email (before @)
  const namePart = email.split("@")[0];
  // Convert to title case: "rahulgupta" -> "Rahulgupta"
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

export function QueryDetailModal({
  query,
  users,
  currentUser,
  onClose,
  onEdit,
}: QueryDetailModalProps) {
  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Audit trail expanded by default (client requirement)
  const [showAuditTrail, setShowAuditTrail] = useState(true);

  // Role-based Edit button visibility (from role-based-access-control.md)
  const roleLC = (currentUser?.Role || "").toLowerCase();
  const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(roleLC);
  const userEmailLC = (currentUser?.Email || "").toLowerCase();
  const assignedToLC = (query["Assigned To"] || "").toLowerCase().trim();
  const isOwnQuery = assignedToLC && assignedToLC === userEmailLC;

  // Edit button restrictions:
  // - Bucket A: ALL users can edit (no restrictions)
  // - Senior/Admin/Pseudo Admin: Can edit ANY query in any bucket
  // - Junior: Can edit their own queries EXCEPT in G/H buckets
  const canEdit =
    query.Status === "A" || // ALL users can edit Bucket A
    isAdminOrSenior || // Admin/Senior can edit all buckets
    (isOwnQuery && query.Status !== "G" && query.Status !== "H"); // Junior can edit own except G/H

  const handleEdit = () => {
    onEdit?.(query);
    onClose();
  };

  // Helper to get display name for audit trail
  const displayName = (email: string | undefined) =>
    getDisplayName(email, users);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-start">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-gray-800 break-words">
              {query["Query Description"]}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              ID: {query["Query ID"]}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {/* Status & Type */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Status
              </p>
              <p className="font-medium text-gray-800">
                {query["Status"]}) {BUCKET_NAMES[query["Status"]] || "Unknown"}
              </p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Type
              </p>
              <p className="font-medium text-gray-800">
                {query["Query Type"] || "—"}
              </p>
            </div>
          </div>

          {/* Assignment */}
          {query["Assigned To"] && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Assigned To
              </p>
              <p className="font-medium text-gray-800">
                {displayName(query["Assigned To"])}
              </p>
            </div>
          )}

          {/* Remarks - shown in ALL buckets when present */}
          {query["Remarks"] && (
            <div className="mb-6 p-3 bg-amber-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Remarks
              </p>
              <div className="text-sm text-gray-600">
                <span className="italic">&quot;{query["Remarks"]}&quot;</span>
                {query["Remark Added By"] && (
                  <span className="text-xs text-gray-500 ml-2">
                    —{" "}
                    <span className="font-medium">
                      {displayName(query["Remark Added By"])}
                    </span>
                    {query["Remark Added Date Time"] && (
                      <span className="ml-1">
                        @ {formatAuditDate(query["Remark Added Date Time"])}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Deleted From (for Bucket H only) */}
          {query["Status"] === "H" && query["Previous Status"] && (
            <div className="mb-6 p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Deleted From
              </p>
              <p className="font-medium text-gray-800">
                {query["Previous Status"]}){" "}
                {BUCKET_NAMES[query["Previous Status"]] || "Unknown"}
              </p>
            </div>
          )}

          {/* Event Info (for E/F) */}
          {(query["Event ID in SF"] || query["Event Title in SF"]) && (
            <div className="mb-6 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Salesforce Event
              </p>
              <p className="font-medium text-gray-800">
                {query["Event Title in SF"] || "—"}
              </p>
              <p className="text-xs text-gray-500">
                ID: {query["Event ID in SF"] || "—"}
              </p>
            </div>
          )}

          {/* What's Pending (for D) */}
          {query["Whats Pending"] && (
            <div className="mb-6 p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                What&apos;s Pending
              </p>
              <p className="text-sm text-gray-800">{query["Whats Pending"]}</p>
            </div>
          )}

          {/* Audit Trail - Collapsible */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="flex items-center justify-between w-full text-left hover:bg-gray-50 -mx-2 px-2 py-1 rounded transition"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                Audit Trail
              </p>
              {showAuditTrail ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showAuditTrail && (
              <div className="space-y-2 text-xs text-gray-600 mt-3">
                {/* Added */}
                {query["Added By"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-green-600 font-medium">Added</span>{" "}
                      by{" "}
                      <span className="font-medium text-gray-700">
                        {displayName(query["Added By"])}
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Added Date Time"])}
                    </span>
                  </div>
                )}

                {/* Assigned/Allocated - Show "Self-assigned" if same person */}
                {query["Assigned By"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      {query["Assigned By"] === query["Assigned To"] ? (
                        <>
                          <span className="text-blue-600 font-medium">
                            Self-assigned
                          </span>{" "}
                          by{" "}
                          <span className="font-medium text-gray-700">
                            {displayName(query["Assigned By"])}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-blue-600 font-medium">
                            Allocated
                          </span>{" "}
                          by{" "}
                          <span className="font-medium text-gray-700">
                            {displayName(query["Assigned By"])}
                          </span>
                          {query["Assigned To"] && (
                            <span className="text-gray-500">
                              {" "}
                              → {displayName(query["Assigned To"])}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Assignment Date Time"])}
                    </span>
                  </div>
                )}

                {/* Proposal Sent */}
                {query["Proposal Sent Date Time"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-green-600 font-medium">
                        Proposal sent
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Proposal Sent Date Time"])}
                    </span>
                  </div>
                )}

                {/* Entered in Salesforce */}
                {query["Entered In SF Date Time"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-purple-600 font-medium">
                        Entered in SF
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Entered In SF Date Time"])}
                    </span>
                  </div>
                )}

                {/* Last Edited - only show if ACTUALLY edited (different time from added) */}
                {query["Last Edited By"] &&
                  query["Last Edited Date Time"] &&
                  query["Added Date Time"] &&
                  query["Last Edited Date Time"] !==
                    query["Added Date Time"] && (
                    <div className="flex justify-between items-center">
                      <span>
                        <span className="text-orange-600 font-medium">
                          Edited
                        </span>{" "}
                        by{" "}
                        <span className="font-medium text-gray-700">
                          {displayName(query["Last Edited By"])}
                        </span>
                      </span>
                      <span className="text-gray-400 text-right">
                        {formatAuditDate(query["Last Edited Date Time"])}
                      </span>
                    </div>
                  )}

                {/* Remark Added/Edited - Show remark text with attribution */}
                {query["Remark Added By"] && query["Remarks"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-blue-600 font-medium">Remark</span>{" "}
                      <span className="italic">
                        &quot;{query["Remarks"]}&quot;
                      </span>
                      {" by "}
                      <span className="font-medium text-gray-700">
                        {displayName(query["Remark Added By"])}
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Remark Added Date Time"])}
                    </span>
                  </div>
                )}

                {/* Discarded */}
                {query["Discarded Date Time"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-red-600 font-medium">
                        Discarded
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Discarded Date Time"])}
                    </span>
                  </div>
                )}

                {/* Delete Requested (for pending deletions) */}
                {query["Delete Requested By"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-red-600 font-medium">
                        Delete requested
                      </span>{" "}
                      by{" "}
                      <span className="font-medium text-gray-700">
                        {displayName(query["Delete Requested By"])}
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Delete Requested Date Time"])}
                    </span>
                  </div>
                )}

                {/* Delete Approved (for completed deletions - admin auto-approve or explicit approval) */}
                {query["Delete Approved By"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-gray-600 font-medium">
                        Delete approved
                      </span>{" "}
                      by{" "}
                      <span className="font-medium text-gray-700">
                        {displayName(query["Delete Approved By"])}
                      </span>
                      {query["Delete Requested By"] ===
                        query["Delete Approved By"] && (
                        <span className="text-gray-400 text-xs ml-1">
                          (self)
                        </span>
                      )}
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Delete Approved Date Time"])}
                    </span>
                  </div>
                )}

                {/* Delete Rejected (for rejected deletions) */}
                {query["Delete Rejected By"] && (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="text-orange-600 font-medium">
                        Delete rejected
                      </span>{" "}
                      by{" "}
                      <span className="font-medium text-gray-700">
                        {displayName(query["Delete Rejected By"])}
                      </span>
                    </span>
                    <span className="text-gray-400 text-right">
                      {formatAuditDate(query["Delete Rejected Date Time"])}
                    </span>
                  </div>
                )}

                {/* No audit entries */}
                {!query["Added By"] &&
                  !query["Assigned By"] &&
                  !query["Last Edited By"] && (
                    <div className="text-gray-400 italic">
                      No audit trail available
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          {onEdit && canEdit && (
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2 transition"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
