"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { Query, User } from "../utils/sheets";
import { Plus, X, Save, RotateCcw, Loader2, Check } from "lucide-react";

interface AddQueryModalProps {
  onClose: () => void;
}

interface QueryRow {
  id: string;
  description: string;
  queryType: string;
  assignedTo: string; // Per-row user assignment
}

export function AddQueryModal({ onClose }: AddQueryModalProps) {
  const { currentUser, users, addQueryOptimistic } = useQueryStore();

  // Get last selected user from localStorage for defaults
  const getLastSelectedUser = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("lastSelectedUser") || "";
    }
    return "";
  };

  // Initialize queryRows from drafts (or backup) if available
  const [queryRows, setQueryRows] = useState<QueryRow[]>(() => {
    if (typeof window !== "undefined") {
      // First try regular drafts
      let saved = localStorage.getItem("queryDrafts");

      // If no drafts, check for backup (from failed submit)
      if (!saved) {
        saved = localStorage.getItem("queryDraftsBackup");
        // Clear backup once used
        if (saved) {
          localStorage.removeItem("queryDraftsBackup");
        }
      }

      if (saved) {
        try {
          const drafts = JSON.parse(saved);
          if (Array.isArray(drafts) && drafts.length > 0) {
            // Ensure backward compatibility: add assignedTo if missing
            return drafts.map((d: any) => ({
              ...d,
              assignedTo: d.assignedTo ?? getLastSelectedUser(),
            }));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return [
      {
        id: "1",
        description: "",
        queryType: "New",
        assignedTo: getLastSelectedUser(),
      },
    ];
  });

  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Ref for auto-save interval
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const savedNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if drafts were restored on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("queryDrafts") ||
        localStorage.getItem("queryDraftsBackup");
      if (saved) {
        try {
          const drafts = JSON.parse(saved);
          if (Array.isArray(drafts) && drafts.length > 0) {
            const hasContent = drafts.some((d: QueryRow) =>
              d.description.trim(),
            );
            if (hasContent) {
              setDraftRestored(true);
              // Auto-clear the notification after 3 seconds
              setTimeout(() => setDraftRestored(false), 3000);
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Track changes to detect unsaved content
  useEffect(() => {
    const currentContent = JSON.stringify(queryRows);
    if (currentContent !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [queryRows]);

  // Auto-save drafts every 10 seconds
  useEffect(() => {
    // Save immediately on mount if there's content
    const hasContent = queryRows.some((row) => row.description.trim());
    if (hasContent) {
      localStorage.setItem("queryDrafts", JSON.stringify(queryRows));
      lastSavedContentRef.current = JSON.stringify(queryRows);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setShowSavedNotification(true);

      // Clear any existing timeout before setting new one
      if (savedNotificationTimeoutRef.current) {
        clearTimeout(savedNotificationTimeoutRef.current);
      }
      savedNotificationTimeoutRef.current = setTimeout(() => {
        setShowSavedNotification(false);
      }, 2000);
    }

    // Set up interval for auto-save
    autoSaveIntervalRef.current = setInterval(() => {
      const hasContent = queryRows.some((row) => row.description.trim());
      const currentContent = JSON.stringify(queryRows);

      if (
        hasContent &&
        currentContent !== lastSavedContentRef.current &&
        typeof window !== "undefined"
      ) {
        localStorage.setItem("queryDrafts", JSON.stringify(queryRows));
        lastSavedContentRef.current = currentContent;
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setShowSavedNotification(true);

        // Clear any existing timeout before setting new one
        if (savedNotificationTimeoutRef.current) {
          clearTimeout(savedNotificationTimeoutRef.current);
        }
        savedNotificationTimeoutRef.current = setTimeout(() => {
          setShowSavedNotification(false);
        }, 2000);
      }
    }, 10000);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (savedNotificationTimeoutRef.current) {
        clearTimeout(savedNotificationTimeoutRef.current);
      }
    };
  }, [queryRows]);

  // Quick Save drafts to localStorage (manual save)
  const saveDrafts = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("queryDrafts", JSON.stringify(queryRows));
      lastSavedContentRef.current = JSON.stringify(queryRows);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      setError(""); // Clear any error
      // Show brief confirmation
      setShowSavedNotification(true);

      // Clear any existing timeout before setting new one
      if (savedNotificationTimeoutRef.current) {
        clearTimeout(savedNotificationTimeoutRef.current);
      }
      savedNotificationTimeoutRef.current = setTimeout(() => {
        setShowSavedNotification(false);
      }, 2000);
    }
  };

  // Clear drafts from localStorage
  const clearDrafts = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("queryDrafts");
      localStorage.removeItem("queryDraftsBackup");
      setQueryRows([
        {
          id: "1",
          description: "",
          queryType: "New",
          assignedTo: getLastSelectedUser(),
        },
      ]);
      setLastSaved(null);
    }
  };

  const MAX_CHARS = 200;

  const canAllocate =
    currentUser?.Role === "Senior" ||
    currentUser?.Role === "Admin" ||
    currentUser?.Role === "Pseudo Admin";

  const activeUsers = users.filter(
    (u: User) => u["Is Active"]?.toLowerCase() === "true",
  );

  const addNewRow = () => {
    const newId = String(Date.now());
    setQueryRows([
      ...queryRows,
      {
        id: newId,
        description: "",
        queryType: "New",
        assignedTo: getLastSelectedUser(),
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (queryRows.length === 1) return;
    setQueryRows(queryRows.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof QueryRow, value: string) => {
    setQueryRows(
      queryRows.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    );
    // Persist user selection to localStorage when assignedTo changes
    if (field === "assignedTo" && value && typeof window !== "undefined") {
      localStorage.setItem("lastSelectedUser", value);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double-submit
    if (isSubmitting) return;

    // Validate
    const emptyRows = queryRows.filter((row) => !row.description.trim());
    if (emptyRows.length > 0) {
      setError("All descriptions must be filled");
      return;
    }

    const tooLongRows = queryRows.filter(
      (row) => row.description.length > MAX_CHARS,
    );
    if (tooLongRows.length > 0) {
      setError(`Descriptions must be less than ${MAX_CHARS} characters`);
      return;
    }

    // Disable button immediately
    setIsSubmitting(true);
    setError("");

    // Create backup before attempting submit (for recovery if something goes wrong)
    if (typeof window !== "undefined") {
      localStorage.setItem("queryDraftsBackup", JSON.stringify(queryRows));
    }

    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      // Add all queries
      for (const row of queryRows) {
        const newQueryData: Partial<Query> = {
          "Query Description": row.description,
          "Query Type": row.queryType,
          GmIndicator: "", // Empty for new queries (only relevant for E/F buckets)
        };

        if (row.assignedTo) {
          newQueryData.Status = "B";
          newQueryData["Assigned To"] = row.assignedTo;
          newQueryData["Assigned By"] = currentUser?.Email || "";
          newQueryData["Assignment Date Time"] = now;
        }

        await addQueryOptimistic(newQueryData);
      }

      // Clear drafts AND backup on successful submit
      if (typeof window !== "undefined") {
        localStorage.removeItem("queryDrafts");
        localStorage.removeItem("queryDraftsBackup");
      }

      onClose();
    } catch (err) {
      // On error, keep backup intact for recovery
      setIsSubmitting(false);
      setError(
        "Failed to add queries. Your drafts are saved and can be recovered.",
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-800">
            Add New Queries
          </h3>
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="p-4 overflow-y-auto flex-1">
            {/* Query Rows - Compact single-line layout */}
            <div className="space-y-2">
              {queryRows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2 py-1.5 px-2 bg-gray-50/50 rounded-lg"
                >
                  {/* Row number */}
                  <span className="text-[10px] text-gray-400 w-4 flex-shrink-0">
                    {index + 1}.
                  </span>

                  {/* Description - flexible width with subtle border */}
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) =>
                      updateRow(row.id, "description", e.target.value)
                    }
                    maxLength={MAX_CHARS}
                    className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:border-blue-400"
                    placeholder="Enter query description..."
                  />

                  {/* Query Type - compact pills with border container */}
                  <div className="flex gap-0.5 flex-shrink-0 border border-gray-200 rounded p-0.5 bg-white">
                    {QUERY_TYPE_ORDER.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateRow(row.id, "queryType", type)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                          row.queryType === type
                            ? "bg-blue-500 text-white"
                            : "text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {type === "SEO Query" ? "SEO" : type}
                      </button>
                    ))}
                  </div>

                  {/* User Dropdown - compact with border */}
                  {canAllocate && (
                    <select
                      value={row.assignedTo}
                      onChange={(e) =>
                        updateRow(row.id, "assignedTo", e.target.value)
                      }
                      className="border border-gray-200 bg-white rounded px-1.5 py-1 text-xs text-gray-600 w-24 flex-shrink-0 focus:outline-none focus:border-blue-400"
                      title="Assign to user"
                    >
                      <option value="">Unassigned</option>
                      {activeUsers.map((user: User) => (
                        <option key={user.Email} value={user.Email}>
                          {user["Display Name"]?.split(" ")[0] ||
                            user.Name?.split(" ")[0] ||
                            user.Email.split("@")[0]}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Action buttons - minimal */}
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={addNewRow}
                      className="w-6 h-6 flex items-center justify-center text-green-600 hover:bg-green-100 rounded"
                      title="Add new row"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    {queryRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:bg-red-100 rounded"
                        title="Remove this row"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}

            {/* Draft Restored Notification */}
            {draftRestored && (
              <div className="mt-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                <Save className="w-3 h-3" />
                Draft saved/restored
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 flex justify-between border-t">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {queryRows.length}{" "}
                {queryRows.length === 1 ? "query" : "queries"}
              </span>

              {/* Save Status Indicator */}
              {showSavedNotification ? (
                <span className="text-[10px] text-green-600 flex items-center gap-1 font-medium">
                  <Check className="w-3 h-3" />
                  Saved
                </span>
              ) : hasUnsavedChanges ? (
                <button
                  type="button"
                  onClick={saveDrafts}
                  className="text-[10px] text-orange-600 flex items-center gap-1 hover:text-orange-700 cursor-pointer underline"
                  title="Click to save now"
                >
                  <Save className="w-3 h-3" />
                  Not Synced (Click to Save)
                </button>
              ) : lastSaved ? (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Saved at{" "}
                  {lastSaved.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}

              {/* Quick Save Button - Hidden, functionality moved to "Not Synced" */}

              {/* Clear Drafts Button */}
              <button
                type="button"
                onClick={clearDrafts}
                disabled={isSubmitting}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Clear all drafts"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-1.5 min-w-[85px] justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add All"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
