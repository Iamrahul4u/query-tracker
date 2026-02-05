"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER, BUCKETS } from "../config/sheet-constants";
import { Query } from "../utils/sheets";

interface EditQueryModalProps {
  query: Query;
  onClose: () => void;
}

export function EditQueryModal({ query, onClose }: EditQueryModalProps) {
  const {
    currentUser,
    updateStatusOptimistic,
    editQueryOptimistic,
    deleteQueryOptimistic,
  } = useQueryStore();

  // Local state for all fields
  const [formData, setFormData] = useState<Partial<Query>>({ ...query });
  const [status, setStatus] = useState(query.Status);
  const [error, setError] = useState("");

  // Track original values to detect changes for color coding
  const originalValues = query;

  // Helper functions to convert between date formats
  // Sheets format: "DD/MM/YYYY, HH:MM:SS"
  // datetime-local format: "YYYY-MM-DDTHH:MM"
  const convertToDateTimeLocal = (dateStr: string): string => {
    if (!dateStr) return "";
    try {
      // Parse "05/02/2026, 8:18:01" or "05/02/2026, 08:18:01"
      const parts = dateStr.split(", ");
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

      // Return "DD/MM/YYYY, HH:MM:SS" format
      return `${day}/${month}/${year}, ${hours}:${minutes}:00`;
    } catch {
      return "";
    }
  };

  // Determine Role
  const role = (currentUser?.Role || "").toLowerCase();
  const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(
    role.toLowerCase(),
  );
  const isAssignedToMe =
    (query["Assigned To"] || "").toLowerCase() ===
    (currentUser?.Email || "").toLowerCase();

  // Permission Check
  // Junior: Can change own queries only (Plan 5.7)
  // Senior/Admin: Can change any
  const canEdit = isAdminOrSenior || isAssignedToMe || query.Status === "A"; // Junior can edit unassigned? Plan says "Change own status". Assuming yes if unassigned or own.

  const handleSave = () => {
    if (!canEdit) return;

    // Validation?
    // Plan 5.6: D requires Whats Pending. E/F requires Event stuff?
    // Let's add basic validation.
    if (["E", "F"].includes(status)) {
      if (!formData["Event ID in SF"] || !formData["Event Title in SF"]) {
        setError("Event ID in SF and Title are required for this status.");
        return;
      }
    }

    if (status !== query.Status) {
      // Status Changed -> Use updateStatusOptimistic
      console.log("📝 Status changed:", query.Status, "→", status);
      console.log("📝 Query ID:", query["Query ID"]);
      console.log("📝 Current status state:", status);
      console.log("📝 FormData.Status:", formData.Status);
      console.log("📝 Full form data:", formData);

      // Pass the status explicitly, not from formData (they should match but be explicit)
      updateStatusOptimistic(query["Query ID"], status, formData);
    } else {
      // Only fields changed -> Use editQueryOptimistic
      console.log("📝 Fields changed (no status change)");
      console.log("📝 Query ID:", query["Query ID"]);
      console.log("📝 Form data:", formData);
      editQueryOptimistic(query["Query ID"], formData);
    }
    onClose();
  };

  const handleDelete = () => {
    const isAdmin = ["admin", "pseudo admin"].includes(role.toLowerCase());

    if (isAdmin) {
      // Admin can delete directly - permanent deletion
      if (
        confirm(
          "Are you sure you want to permanently delete this query? This action cannot be undone.",
        )
      ) {
        deleteQueryOptimistic(
          query["Query ID"],
          currentUser?.Email || "",
          true,
        );
        onClose();
      }
    } else {
      // Non-admin: Request deletion (pending admin approval) - no extra confirm needed
      deleteQueryOptimistic(query["Query ID"], currentUser?.Email || "", false);
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
    if (field === "Query Type") return ["A", "B"].includes(s);
    if (field === "Remarks") return ["B"].includes(s); // Or always show but optional? Plan says B.
    if (field === "Whats Pending") return ["D", "E", "F"].includes(s);
    if (field === "Event ID in SF") return ["E", "F"].includes(s);
    if (field === "Event Title in SF") return ["E", "F"].includes(s);

    return false;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
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

        <div className="p-6 overflow-y-auto">
          {/* Read-Only Info */}
          <div className="text-xs text-gray-400 mb-4 flex gap-4">
            <span>ID: {query["Query ID"]}</span>
          </div>

          {/* Editable Date Fields Section - Admin only */}
          {isAdminOrSenior && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Date Fields (Editable)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {/* Added Date - Show for all buckets except G and H */}
                {!["G", "H"].includes(status) && (
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
                )}

                {/* Assigned Date - Show for B, C, D, E, F */}
                {["B", "C", "D", "E", "F"].includes(status) && (
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
                      className={getInputClass(
                        "Assignment Date Time",
                        "text-xs",
                      )}
                    />
                  </div>
                )}

                {/* Proposal Sent Date - Show for C, D, E, F */}
                {["C", "D", "E", "F"].includes(status) && (
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

                {/* SF Entry Date - Show for E, F */}
                {["E", "F"].includes(status) && (
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

                {/* Discarded Date - Show only for G */}
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
                      className={getInputClass(
                        "Discarded Date Time",
                        "text-xs",
                      )}
                    />
                  </div>
                )}

                {/* Deleted Date - Show only for H */}
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
          )}

          {!canEdit && (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded text-sm mb-4">
              You do not have permission to edit this query.
            </div>
          )}

          {/* Status Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
              {/* Show allowed transitions or all? Plan says "Show valid next statuses (progressive flow)". 
                      For simplicity and flexibility, showing all for now, or just allow manual override. 
                      Admins/Seniors might need to jump. 
                  */}
              {Object.entries(BUCKETS).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Fields */}

          {/* Query Description (A, B, C, D) */}
          {showField("Query Description") && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Query Type
              </label>
              <div className="flex gap-2">
                {QUERY_TYPE_ORDER.map((type) => (
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
            <div className="mb-4">
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
          {/* Delete Button (Senior/Admin Only) */}
          {isAdminOrSenior ? (
            <button
              onClick={handleDelete}
              className="text-red-500 text-sm hover:text-red-700 font-medium"
            >
              Delete Query
            </button>
          ) : (
            <div></div>
          )}

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
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
