"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER, BUCKETS } from "../config/sheet-constants";
import { Query } from "../utils/sheets";
import { UserSearchDropdown } from "./UserSearchDropdown";

interface EditQueryModalProps {
  query: Query;
  onClose: () => void;
}

export function EditQueryModal({ query, onClose }: EditQueryModalProps) {
  const {
    currentUser,
    users,
    updateStatusOptimistic,
    editQueryOptimistic,
    deleteQueryOptimistic,
  } = useQueryStore();

  // Local state for all fields
  const [formData, setFormData] = useState<Partial<Query>>({ ...query });
  const [status, setStatus] = useState(query.Status);
  const [assignedTo, setAssignedTo] = useState(query["Assigned To"] || "");
  const [error, setError] = useState("");

  // Ref for scrollable content area
  const contentRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Track original values to detect changes for color coding
  const originalValues = query;

  // Auto-populate date fields when status changes to a new bucket
  // This ensures the relevant date is set to current datetime when transitioning
  useEffect(() => {
    if (status === query.Status) return; // No status change

    // Get current time in IST (Indian Standard Time, UTC+5:30)
    const date = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    const day = String(istDate.getUTCDate()).padStart(2, "0");
    const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
    const year = istDate.getUTCFullYear();
    const hours = String(istDate.getUTCHours()).padStart(2, "0");
    const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(istDate.getUTCSeconds()).padStart(2, "0");
    const now = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    setFormData((prev) => {
      const updates: Partial<Query> = { ...prev };

      // Moving to B (Assigned) - set Assignment Date if empty
      if (status === "B" && !prev["Assignment Date Time"]) {
        updates["Assignment Date Time"] = now;
      }

      // Moving to C or D (Proposal Sent) - set Proposal Sent Date if empty
      if (
        (status === "C" || status === "D") &&
        !prev["Proposal Sent Date Time"]
      ) {
        updates["Proposal Sent Date Time"] = now;
      }

      // Moving to E or F (In SF) - set SF Entry Date if empty
      if (
        (status === "E" || status === "F") &&
        !prev["Entered In SF Date Time"]
      ) {
        updates["Entered In SF Date Time"] = now;
      }

      // Moving to G (Discarded) - set Discarded Date if empty
      if (status === "G" && !prev["Discarded Date Time"]) {
        updates["Discarded Date Time"] = now;
      }

      return updates;
    });
  }, [status, query.Status]);

  // Helper functions to convert between date formats
  // Sheets format: "DD/MM/YYYY HH:MM:SS" (no comma - matches backend)
  // datetime-local format: "YYYY-MM-DDTHH:MM"
  const convertToDateTimeLocal = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      // Handle both formats: "DD/MM/YYYY HH:MM:SS" and "DD/MM/YYYY, HH:MM:SS"
      const normalized = dateStr.replace(", ", " "); // Remove comma if present
      const parts = normalized.split(" ");
      if (parts.length !== 2) return "";

      const [datePart, timePart] = parts;
      const [day, month, year] = datePart.split("/");
      const [hours, minutes] = timePart.split(":");

      // Return YYYY-MM-DDTHH:MM format
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  const convertFromDateTimeLocal = (dateTimeLocal: string): string => {
    if (!dateTimeLocal) return "";
    try {
      // Parse "2026-02-05T08:18"
      const [datePart, timePart] = dateTimeLocal.split("T");
      const [year, month, day] = datePart.split("-");
      const [hours, minutes] = timePart.split(":");

      // Return "DD/MM/YYYY HH:MM:SS" format (no comma - matches backend)
      return `${day}/${month}/${year} ${hours}:${minutes}:00`;
    } catch {
      return "";
    }
  };

  // Determine Role
  const role = (currentUser?.Role || "").toLowerCase();
  const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(role);
  const isAssignedToMe =
    (query["Assigned To"] || "").toLowerCase() ===
    (currentUser?.Email || "").toLowerCase();

  // Permission Check (from role-based-access-control.md)
  // - Senior/Admin/Pseudo Admin: Can edit ANY query
  // - Junior: Can edit Bucket A queries (to add remarks, will self-assign) OR their own queries
  const canEdit = isAdminOrSenior || query.Status === "A" || isAssignedToMe;

  const handleSave = () => {
    if (!canEdit) return;

    // Clear previous error
    setError("");

    // Auto-assign for juniors moving from Bucket A to another bucket
    let finalAssignedTo = assignedTo;
    let finalFormData = { ...formData };

    if (
      !isAdminOrSenior &&
      query.Status === "A" &&
      status !== "A" &&
      !assignedTo
    ) {
      // Junior moving from A to another bucket without assignment -> self-assign
      finalAssignedTo = currentUser?.Email || "";
      finalFormData = {
        ...formData,
        "Assigned To": finalAssignedTo,
      };
    }

    // Validation: Block status change from A to other buckets without assignment
    if (status !== "A" && !finalAssignedTo) {
      setError("Please assign a user before moving to next status");
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      return;
    }

    // CRITICAL: Remove ALL audit trail fields from finalFormData before sending
    // These fields should NEVER be overwritten by the edit modal - they're managed by backend
    const protectedAuditFields = [
      "Added By",
      "Added Date Time",
      "Assigned By",
      "Assignment Date Time",
      "Last Edited By",
      "Last Edited Date Time",
      "Remark Added By",
      "Remark Added Date Time",
      "Delete Requested By",
      "Delete Requested Date Time",
      "Delete Approved By",
      "Delete Approved Date Time",
      "Delete Rejected By",
      "Delete Rejected Date Time",
      "Last Activity Date Time",
    ];

    // Create clean data object without protected audit fields
    const cleanFormData = { ...finalFormData };
    protectedAuditFields.forEach((field) => {
      delete cleanFormData[field as keyof Query];
    });

    // Note: Event ID and Title are optional for E/F per Feb 5th meeting
    // (Previous validation requiring these fields has been removed)

    if (status !== query.Status) {
      // Status Changed -> Use updateStatusOptimistic with clean form data
      updateStatusOptimistic(query["Query ID"], status, cleanFormData);
    } else {
      // Only fields changed -> Use editQueryOptimistic with clean form data
      editQueryOptimistic(query["Query ID"], cleanFormData);
    }
    onClose();
  };

  const handleDelete = () => {
    // Check if user is Admin or Pseudo Admin (ONLY these two get auto-approval)
    const isAdminOrPseudoAdmin = ["admin", "pseudo admin"].includes(role);

    const confirmMessage = isAdminOrPseudoAdmin
      ? "Are you sure you want to delete this query? It will move to Bucket H (Deleted) and be automatically approved."
      : "Are you sure you want to delete this query? It will move to Bucket H (Deleted) and require admin approval.";

    if (confirm(confirmMessage)) {
      deleteQueryOptimistic(
        query["Query ID"],
        currentUser?.Email || "",
        isAdminOrPseudoAdmin, // Admin/Pseudo Admin = auto-approve, Senior/Junior = pending approval
      );
      onClose();
    }
  };

  // Field helper
  const updateField = (field: keyof Query, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Check if a field has been modified
  const isFieldModified = (field: keyof Query): boolean => {
    return formData[field] !== originalValues[field];
  };

  // Get input class based on whether field is modified
  const getInputClass = (
    field: keyof Query,
    baseClass: string = "",
  ): string => {
    const modified = isFieldModified(field);
    return `${baseClass} w-full border rounded-md p-2 text-sm ${
      modified ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-300"
    }`.trim();
  };

  // Determine which fields are editable based on Bucket (Plan 5.3)
  // But also based on Role? Assuming Fields per bucket logic applies to all allowed editors.

  const showField = (field: string) => {
    // Always show Status
    // Logic from Plan:
    // A: Desc, Type, Added By (Added By is usually read only? Plan says editable in A? "Bucket A: Query Description, Query Type, Added By")
    // B: Desc, Type, Remarks
    // C/D: Desc, Whats Pending (D only for Pending? Plan says "Bucket C/D: Query Description, Whats Pending (D only)")
    // E/F: Whats Pending, Event ID in SF, Event Title in SF

    // I'll make Desc editable in A, B, C, D.
    // Type editable in A, B.
    // Remarks editable in B.
    // Whats Pending editable in D, E, F.
    // Event ID in SF/Title editable in E, F.

    const s = status; // Use current selected status to show relevant fields for NEXT step

    // Common
    // Query Description should always be editable
    if (field === "Query Description") return true;
    // Query Type is visible in A-F per FRD (each bucket section lists "Query type" as visible field)
    if (field === "Query Type")
      return ["A", "B", "C", "D", "E", "F"].includes(s);
    // Remarks editable in all buckets (A-H) by any role
    if (field === "Remarks")
      return ["A", "B", "C", "D", "E", "F", "G", "H"].includes(s);
    if (field === "Whats Pending") return ["D", "E", "F"].includes(s);
    if (field === "Event ID in SF") return ["E", "F"].includes(s);
    if (field === "Event Title in SF") return ["E", "F"].includes(s);

    return false;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Edit Query</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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

        <div ref={contentRef} className="p-4 overflow-y-auto scrollbar-visible">
          {/* Read-Only Info */}
          <div className="text-xs text-gray-400 mb-2 flex gap-4">
            <span>ID: {query["Query ID"]}</span>
          </div>

          {/* Assign To Section */}
          {/* Assigned To - Only show for Senior/Admin/Pseudo Admin */}
          {isAdminOrSenior && (
            <div className="mb-4">
              <UserSearchDropdown
                users={users} // Seniors/Admins see all users
                value={assignedTo}
                onChange={(newAssignee) => {
                  setAssignedTo(newAssignee);
                  setFormData((prev) => ({
                    ...prev,
                    "Assigned To": newAssignee,
                  }));
                  // Auto-select Bucket B when assigning from A
                  if (newAssignee && status === "A") {
                    setStatus("B");
                    setFormData((prev) => ({ ...prev, Status: "B" }));
                  }
                }}
                label={assignedTo ? "Assigned To" : "Assign To"}
                placeholder="-- Select User --"
                disabled={!canEdit}
              />
              {!assignedTo && status !== "A" && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Query must be assigned before moving to next status
                </p>
              )}
            </div>
          )}

          {/* Editable Date Fields Section */}
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Date Fields
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {/* Added Date - Show for all buckets */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Added Date
                </label>
                <input
                  type="datetime-local"
                  value={
                    formData["Added Date Time"]
                      ? convertToDateTimeLocal(formData["Added Date Time"])
                      : ""
                  }
                  onChange={(e) =>
                    updateField(
                      "Added Date Time",
                      convertFromDateTimeLocal(e.target.value),
                    )
                  }
                  className={getInputClass("Added Date Time", "text-xs")}
                />
              </div>

              {/* Assigned Date - Show for B-H (not A) */}
              {status !== "A" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Assigned Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData["Assignment Date Time"]
                        ? convertToDateTimeLocal(
                            formData["Assignment Date Time"],
                          )
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "Assignment Date Time",
                        convertFromDateTimeLocal(e.target.value),
                      )
                    }
                    className={getInputClass("Assignment Date Time", "text-xs")}
                  />
                </div>
              )}

              {/* Proposal Sent Date - Show for C-H (not A, B) */}
              {!["A", "B"].includes(status) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Proposal Sent Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData["Proposal Sent Date Time"]
                        ? convertToDateTimeLocal(
                            formData["Proposal Sent Date Time"],
                          )
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "Proposal Sent Date Time",
                        convertFromDateTimeLocal(e.target.value),
                      )
                    }
                    className={getInputClass(
                      "Proposal Sent Date Time",
                      "text-xs",
                    )}
                  />
                </div>
              )}

              {/* SF Entry Date - Show for E-H (not A, B, C, D) */}
              {["E", "F", "G", "H"].includes(status) && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    SF Entry Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData["Entered In SF Date Time"]
                        ? convertToDateTimeLocal(
                            formData["Entered In SF Date Time"],
                          )
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "Entered In SF Date Time",
                        convertFromDateTimeLocal(e.target.value),
                      )
                    }
                    className={getInputClass(
                      "Entered In SF Date Time",
                      "text-xs",
                    )}
                  />
                </div>
              )}

              {/* Discarded Date - Show only for G - Only seniors can access G */}
              {status === "G" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Discarded Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData["Discarded Date Time"]
                        ? convertToDateTimeLocal(
                            formData["Discarded Date Time"],
                          )
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "Discarded Date Time",
                        convertFromDateTimeLocal(e.target.value),
                      )
                    }
                    className={getInputClass("Discarded Date Time", "text-xs")}
                  />
                </div>
              )}

              {/* Deleted Date - Show only for H - Only seniors can access H */}
              {status === "H" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Deleted Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      formData["Delete Requested Date Time"]
                        ? convertToDateTimeLocal(
                            formData["Delete Requested Date Time"],
                          )
                        : ""
                    }
                    onChange={(e) =>
                      updateField(
                        "Delete Requested Date Time",
                        convertFromDateTimeLocal(e.target.value),
                      )
                    }
                    className={getInputClass(
                      "Delete Requested Date Time",
                      "text-xs",
                    )}
                  />
                </div>
              )}
            </div>
            {(isFieldModified("Added Date Time") ||
              isFieldModified("Assignment Date Time") ||
              isFieldModified("Proposal Sent Date Time") ||
              isFieldModified("Entered In SF Date Time") ||
              isFieldModified("Discarded Date Time") ||
              isFieldModified("Delete Requested Date Time")) && (
              <p className="text-xs text-blue-600 mt-2">
                * Modified fields shown in blue
              </p>
            )}
          </div>

          {!canEdit && (
            <div className="bg-yellow-50 text-yellow-800 p-2 rounded text-sm mb-3">
              You do not have permission to edit this query.
            </div>
          )}

          {/* Status Selector */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-0.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value;
                setStatus(newStatus);
                // Also update formData to keep them in sync
                setFormData((prev) => ({ ...prev, Status: newStatus }));
              }}
              disabled={!canEdit}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
            >
              {/* Show allowed transitions based on role
                  Juniors CAN move to G (Discarded) but NOT to H (Deleted) - they must use delete button for H
                  Seniors/Admins can access all buckets
              */}
              {Object.entries(BUCKETS).map(([key, config]) => {
                // Hide only H from Juniors - they cannot delete directly, must use delete button
                if (!isAdminOrSenior && key === "H") {
                  return null;
                }
                return (
                  <option key={key} value={key}>
                    {config.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Dynamic Fields */}

          {/* Query Description (A, B, C, D) */}
          {showField("Query Description") && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                Query Description
                {isFieldModified("Query Description") && (
                  <span className="text-xs text-blue-600 ml-2">* Modified</span>
                )}
              </label>
              <textarea
                value={formData["Query Description"]}
                onChange={(e) =>
                  updateField("Query Description", e.target.value)
                }
                disabled={!canEdit}
                rows={3}
                className={getInputClass("Query Description")}
              />
            </div>
          )}

          {/* Query Type (A, B) */}
          {showField("Query Type") && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                Query Type
              </label>
              <div className="flex gap-2">
                {QUERY_TYPE_ORDER.filter(
                  (type) => type !== "Already Allocated",
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateField("Query Type", type)}
                    disabled={!canEdit}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      formData["Query Type"] === type
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* GM Indicator Checkbox - Only show for E/F status */}
          {(formData.Status === "E" || formData.Status === "F") && (
            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.GmIndicator === "TRUE"}
                  onChange={(e) =>
                    updateField(
                      "GmIndicator",
                      e.target.checked ? "TRUE" : "FALSE",
                    )
                  }
                  disabled={!canEdit}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  GM Indicator
                </span>
                <span className="text-xs text-gray-500">
                  (Gmail entry - shows ✉️ icon)
                </span>
              </label>
            </div>
          )}

          {/* Remarks (B) */}
          {showField("Remarks") && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                Remarks
                {isFieldModified("Remarks") && (
                  <span className="text-xs text-blue-600 ml-2">* Modified</span>
                )}
              </label>
              <input
                type="text"
                value={formData["Remarks"]}
                onChange={(e) => updateField("Remarks", e.target.value)}
                disabled={!canEdit}
                className={getInputClass("Remarks")}
              />
            </div>
          )}

          {/* Whats Pending (D, E, F) */}
          {showField("Whats Pending") && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                What's Pending?
                {isFieldModified("Whats Pending") && (
                  <span className="text-xs text-blue-600 ml-2">* Modified</span>
                )}
              </label>
              <input
                type="text"
                value={formData["Whats Pending"]}
                onChange={(e) => updateField("Whats Pending", e.target.value)}
                disabled={!canEdit}
                className={getInputClass("Whats Pending")}
              />
            </div>
          )}

          {/* Event ID in SF/Title (E, F) */}
          {(showField("Event ID in SF") || showField("Event Title in SF")) && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Event ID in SF
                  {isFieldModified("Event ID in SF") && (
                    <span className="text-xs text-blue-600 ml-2">
                      * Modified
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData["Event ID in SF"]}
                  onChange={(e) =>
                    updateField("Event ID in SF", e.target.value)
                  }
                  disabled={!canEdit}
                  className={getInputClass("Event ID in SF")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">
                  Event Title in SF
                  {isFieldModified("Event Title in SF") && (
                    <span className="text-xs text-blue-600 ml-2">
                      * Modified
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData["Event Title in SF"]}
                  onChange={(e) =>
                    updateField("Event Title in SF", e.target.value)
                  }
                  disabled={!canEdit}
                  className={getInputClass("Event Title in SF")}
                />
              </div>
            </div>
          )}

          {error && (
            <div
              ref={errorRef}
              className="p-3 mb-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
              <p className="text-red-600 text-xs mt-1">
                Please scroll down to fill in the required fields.
              </p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
          {/* Delete Button (Senior/Admin/Pseudo Admin can delete directly, Junior requests deletion) */}
          {/* Don't show delete button if already in deleted bucket (H) or discarded bucket (G) */}
          {(isAdminOrSenior || isAssignedToMe) &&
            !["G", "H"].includes(query.Status) && (
              <button
                onClick={handleDelete}
                className="text-red-500 text-sm hover:text-red-700 font-medium"
              >
                {isAdminOrSenior ? "Delete Query" : "Delete Query"}
              </button>
            )}
          {(!isAdminOrSenior && !isAssignedToMe) ||
          ["G", "H"].includes(query.Status) ? (
            <div></div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 text-sm"
              >
                {!isAdminOrSenior &&
                query.Status === "A" &&
                status !== "A" &&
                !assignedTo
                  ? "Self Assign & Save"
                  : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
