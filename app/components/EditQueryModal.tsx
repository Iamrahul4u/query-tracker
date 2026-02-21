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
  const [callAssignedTo, setCallAssignedTo] = useState(
    (query["Assigned To Call"] || "") as string,
  );
  const [error, setError] = useState("");

  // Confirm modal state for delete / discard remarks enforcement
  const [confirmModal, setConfirmModal] = useState<{
    type: "delete" | "discard";
    remarks: string;
  } | null>(null);
  // Flag to skip remarks check after modal confirms discard
  const [skipRemarksCheck, setSkipRemarksCheck] = useState(false);
  // Deletion Remarks - separate field captured when moving to G or H
  const [deletionRemarks, setDeletionRemarks] = useState(
    (query["Deletion Remarks"] || "") as string,
  );

  // Ref for scrollable content area
  const contentRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  // Track original values to detect changes for color coding
  const originalValues = query;

  // Auto-populate date fields when status changes to a new bucket
  // IMPORTANT: Only set the date for the DESTINATION bucket, not intermediate buckets
  // This prevents false audit trail when skipping buckets (e.g., A→G shouldn't fill B/C/D/E/F dates)
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

      // Only set the date for the DESTINATION bucket (not intermediate buckets)
      // This ensures accurate audit trail - only buckets actually visited get timestamps

      // Moving to B - set Assignment Date if empty
      if (status === "B" && !prev["Assignment Date Time"]) {
        updates["Assignment Date Time"] = now;
      }

      // Moving to C or D - set Proposal Sent Date if empty (both buckets share this field)
      if (
        (status === "C" || status === "D") &&
        !prev["Proposal Sent Date Time"]
      ) {
        updates["Proposal Sent Date Time"] = now;
      }

      // Moving to E or F - set SF Entry Date if empty (both buckets share this field)
      if (
        (status === "E" || status === "F") &&
        !prev["Entered In SF Date Time"]
      ) {
        updates["Entered In SF Date Time"] = now;
      }

      // Moving to G - set Discarded Date if empty
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

  const handleSave = (overrideSkip = false) => {
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
    // EXCEPTION: Bucket G (Discarded) and H (Deleted) never require assignment
    // - Can discard/delete from A directly without assignment
    if (
      status !== "A" &&
      status !== "G" &&
      status !== "H" &&
      !finalAssignedTo
    ) {
      setError("Please assign a user before moving to next status");
      setTimeout(() => {
        errorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
      return;
    }

    // Enforce remarks when discarding (moving to G)
    if (status === "G" && !overrideSkip && !skipRemarksCheck) {
      const currentRemarks = (finalFormData["Remarks"] || "").trim();
      if (!currentRemarks) {
        setConfirmModal({ type: "discard", remarks: "" });
        return;
      }
    }
    // Reset skip flag after use
    setSkipRemarksCheck(false);

    // CRITICAL: Remove ONLY true audit trail fields from finalFormData before sending
    // Audit trail = WHO did something (system-managed)
    // User-editable date fields = WHEN something should happen (user can edit)
    const protectedAuditFields = [
      "Added By",
      // NOTE: "Added Date Time" is user-editable, not protected
      "Assigned By",
      // NOTE: "Assignment Date Time" is user-editable, not protected
      "Last Edited By",
      "Last Edited Date Time",
      "Remark Added By",
      "Remark Added Date Time",
      "Delete Requested By",
      // NOTE: "Delete Requested Date Time" is user-editable, not protected
      "Delete Approved By",
      "Delete Approved Date Time",
      "Delete Rejected By",
      "Delete Rejected Date Time",
      "Last Activity Date Time",
      "Assigned To Call By",
      "Assigned To Call Time",
      "Discarded By",
    ];

    // Create clean data object without protected audit fields
    const cleanFormData = { ...finalFormData };
    protectedAuditFields.forEach((field) => {
      delete cleanFormData[field as keyof Query];
    });

    // CRITICAL: Ensure Status in cleanFormData matches the status state variable
    // This prevents mismatch between formData.Status and status state
    cleanFormData.Status = status;

    // CRITICAL: When moving backwards, remove fields that don't belong in the target bucket
    // The backend will forceClear these, but we shouldn't send them in the first place
    // This prevents the backend from seeing them as "user-provided" values
    const bucketOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const oldIndex = bucketOrder.indexOf(query.Status);
    const newIndex = bucketOrder.indexOf(status);

    if (newIndex >= 0 && oldIndex >= 0 && newIndex < oldIndex) {
      // Moving backwards - remove fields that don't belong in target bucket
      const fieldsToRemove: (keyof Query)[] = [];

      if (status === "A") {
        // Moving to A: Remove ALL fields except Query Description, Type, Added By/Date, Remarks
        fieldsToRemove.push(
          "Assigned To",
          "Assigned By",
          "Assignment Date Time",
          "Proposal Sent Date Time",
          "Whats Pending",
          "Entered In SF Date Time",
          "Event ID in SF",
          "Event Title in SF",
          "GmIndicator",
          "Discarded Date Time",
          "Discarded By",
          "Delete Requested By",
          "Delete Requested Date Time",
          "Previous Status",
          "Delete Rejected",
        );
      } else if (status === "B") {
        // Moving to B: Remove proposal/SF/discard/deletion fields
        fieldsToRemove.push(
          "Proposal Sent Date Time",
          "Whats Pending",
          "Entered In SF Date Time",
          "Event ID in SF",
          "Event Title in SF",
          "GmIndicator",
          "Discarded Date Time",
          "Discarded By",
          "Delete Requested By",
          "Delete Requested Date Time",
          "Previous Status",
          "Delete Rejected",
        );
      } else if (["C", "D"].includes(status)) {
        // Moving to C/D: Remove SF/discard/deletion fields
        fieldsToRemove.push(
          "Entered In SF Date Time",
          "Event ID in SF",
          "Event Title in SF",
          "GmIndicator",
          "Discarded Date Time",
          "Discarded By",
          "Delete Requested By",
          "Delete Requested Date Time",
          "Previous Status",
          "Delete Rejected",
        );
      } else if (["E", "F"].includes(status)) {
        // Moving to E/F: Remove discard/deletion fields
        fieldsToRemove.push(
          "Discarded Date Time",
          "Discarded By",
          "Delete Requested By",
          "Delete Requested Date Time",
          "Previous Status",
          "Delete Rejected",
        );
      }

      // Remove the fields
      fieldsToRemove.forEach((field) => {
        delete cleanFormData[field];
      });
    }

    // Note: Event ID and Title are optional for E/F per Feb 5th meeting
    // (Previous validation requiring these fields has been removed)

    if (status !== query.Status) {
      // Status Changed -> Use updateStatusOptimistic with clean form data
      // When moving to G, pass deletionRemarks (auto-filled to Remarks if empty)
      const extraFields: Record<string, string> = {};
      if (status === "G" || status === "H") {
        const finalDeletionRemarks =
          deletionRemarks.trim() || (cleanFormData["Remarks"] || "").trim();
        if (finalDeletionRemarks) {
          extraFields["Deletion Remarks"] = finalDeletionRemarks;
        }
      }
      updateStatusOptimistic(query["Query ID"], status, { ...cleanFormData, ...extraFields });
    } else {
      // Only fields changed -> Use editQueryOptimistic with clean form data
      editQueryOptimistic(query["Query ID"], cleanFormData);
    }
    onClose();
  };

  const handleDelete = () => {
    // Open remarks modal instead of native browser confirm()
    setConfirmModal({
      type: "delete",
      remarks: (formData["Remarks"] || ""),
    });
  };

  const handleConfirmAction = (remarks: string) => {
    if (!confirmModal) return;
    const isAdminOrPseudoAdmin = ["admin", "pseudo admin"].includes(role);

    if (confirmModal.type === "delete") {
      // Determine final deletion remarks:
      // Use explicit deletionRemarks if set, otherwise fall back to provided remarks
      const finalDeletionRemarks =
        deletionRemarks.trim() || remarks.trim() || (query["Remarks"] || "").trim();
      deleteQueryOptimistic(
        query["Query ID"],
        currentUser?.Email || "",
        isAdminOrPseudoAdmin,
        finalDeletionRemarks,
      );
      setConfirmModal(null);
      onClose();
    } else {
      // Discard: inject remarks into formData then re-trigger save
      setFormData((prev) => ({ ...prev, Remarks: remarks.trim() }));
      setConfirmModal(null);
      setSkipRemarksCheck(true);
      // Use setTimeout so state updates flush before handleSave runs
      setTimeout(() => handleSave(true), 0);
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

          {/* Assign to Call Section - Bucket A only, Admin/Senior only */}
          {isAdminOrSenior && status === "A" && (
            <div className="mb-4">
              <UserSearchDropdown
                users={users}
                value={callAssignedTo}
                onChange={(newAssignee) => {
                  setCallAssignedTo(newAssignee);
                  // Update local formData only — saved with the main Save button
                  setFormData((prev) => ({
                    ...prev,
                    "Assigned To Call": newAssignee,
                  }));
                }}
                label={callAssignedTo ? "Assigned To Call" : "Assign To Call"}
                placeholder="-- Select User for Call --"
                disabled={!canEdit}
              />
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
                // Hide H from ALL roles - deletions must go through the delete button
                // which properly sets Delete Requested By, Previous Status, etc.
                // Only show H if the query is already in H (so user can see current status)
                if (key === "H" && query.Status !== "H") {
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

          {/* Deletion Remarks (G or H) - separate from general Remarks */}
          {["G", "H"].includes(status) && (
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-0.5">
                Deletion Remarks
                <span className="text-xs text-gray-400 ml-2">
                  (auto-filled from Remarks if left empty)
                </span>
              </label>
              <textarea
                value={deletionRemarks}
                onChange={(e) => setDeletionRemarks(e.target.value)}
                disabled={!canEdit}
                rows={2}
                placeholder={`Reason for ${status === "G" ? "discarding" : "deleting"}...`}
                className={`w-full border rounded-md p-2 text-sm ${
                  deletionRemarks && deletionRemarks !== (query["Deletion Remarks"] || "")
                    ? "border-blue-500 text-blue-700 bg-blue-50"
                    : "border-gray-300"
                }`}
              />
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
          {/* Delete Button - shown for non-H queries that the user can edit.
               G-bucket queries CAN be deleted from here (Fix: removed G from block list) */}
          {(isAdminOrSenior || isAssignedToMe) &&
            query.Status !== "H" && (
              <button
                onClick={handleDelete}
                className="text-red-500 text-sm hover:text-red-700 font-medium"
              >
                {query.Status === "G" ? "Delete (from Discarded)" : "Delete Query"}
              </button>
            )}
          {(!isAdminOrSenior && !isAssignedToMe) ||
          query.Status === "H" ? (
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
                onClick={() => handleSave()}
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

      {/* Remarks confirmation modal for delete / discard */}
      {confirmModal && (
        <RemarksConfirmModal
          type={confirmModal.type}
          initialRemarks={confirmModal.remarks}
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Remarks Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────

function RemarksConfirmModal({
  type,
  initialRemarks,
  onConfirm,
  onCancel,
}: {
  type: "delete" | "discard";
  initialRemarks: string;
  onConfirm: (remarks: string) => void;
  onCancel: () => void;
}) {
  const [remarks, setRemarks] = useState(initialRemarks);
  const isDelete = type === "delete";

  const accentColor = isDelete ? "red" : "amber";
  const title = isDelete ? "Delete Query" : "Discard Query";
  const description = isDelete
    ? "Please provide a reason for deleting this query. This will be recorded and shown in the deletion notification."
    : "Please provide a reason for discarding this query. Remarks are required before discarding.";
  const confirmLabel = isDelete ? "Delete" : "Discard";

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120]"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b ${
            isDelete
              ? "border-red-100 bg-red-50"
              : "border-amber-100 bg-amber-50"
          } flex items-center gap-3`}
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              isDelete ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            {isDelete ? (
              <svg
                className="w-5 h-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div>
            <h3
              className={`font-semibold text-base ${
                isDelete ? "text-red-800" : "text-amber-800"
              }`}
            >
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Remarks
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter reason..."
            rows={3}
            autoFocus
            className={`w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 ${
              isDelete
                ? "focus:ring-red-300 focus:border-red-400"
                : "focus:ring-amber-300 focus:border-amber-400"
            } border-gray-300`}
          />
          {!remarks.trim() && (
            <p className="text-xs text-gray-400 mt-1">Remarks are required to proceed.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-100 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(remarks)}
            disabled={!remarks.trim()}
            className={`px-4 py-2 font-medium rounded-md text-sm text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
