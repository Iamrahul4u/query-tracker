"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { Query, User } from "../utils/sheets";
import { Plus, X } from "lucide-react";

interface AddQueryModalProps {
  onClose: () => void;
}

interface QueryRow {
  id: string;
  description: string;
  queryType: string;
}

export function AddQueryModal({ onClose }: AddQueryModalProps) {
  const { currentUser, users, addQueryOptimistic } = useQueryStore();
  const [allocateTo, setAllocateTo] = useState("");
  const [queryRows, setQueryRows] = useState<QueryRow[]>([
    { id: "1", description: "", queryType: "New" },
  ]);
  const [error, setError] = useState("");

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
      { id: newId, description: "", queryType: "New" },
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
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

    const now = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Add all queries
    for (const row of queryRows) {
      const newQueryData: Partial<Query> = {
        "Query Description": row.description,
        "Query Type": row.queryType,
        GmIndicator: "", // Empty for new queries (only relevant for E/F buckets)
      };

      if (allocateTo) {
        newQueryData.Status = "B";
        newQueryData["Assigned To"] = allocateTo;
        newQueryData["Assigned By"] = currentUser?.Email || "";
        newQueryData["Assignment Date Time"] = now;
      }

      await addQueryOptimistic(newQueryData);
    }

    onClose();
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
            {/* Allocate To */}
            {canAllocate && (
              <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Allocate To{" "}
                  <span className="text-xs text-gray-500">
                    (applies to all)
                  </span>
                </label>
                <select
                  value={allocateTo}
                  onChange={(e) => setAllocateTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="">-- Unassigned (Bucket A) --</option>
                  {activeUsers.map((user: User) => (
                    <option key={user.Email} value={user.Email}>
                      {user.Name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Query Rows - Responsive: 2 rows on mobile, 1 row on desktop */}
            <div className="space-y-3">
              {queryRows.map((row) => (
                <div key={row.id} className="flex flex-col sm:flex-row gap-2">
                  {/* Row 1: Description + Plus/X icons */}
                  <div className="flex gap-2 items-center flex-1">
                    {/* Description */}
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        updateRow(row.id, "description", e.target.value)
                      }
                      maxLength={MAX_CHARS}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                      placeholder="Enter query description..."
                    />

                    {/* Plus Icon (always) - Desktop only */}
                    <button
                      type="button"
                      onClick={addNewRow}
                      className="hidden sm:flex w-8 h-8 items-center justify-center text-green-600 hover:bg-green-50 rounded"
                    >
                      <Plus className="w-5 h-5" />
                    </button>

                    {/* Remove Icon (only when multiple rows) - Desktop only */}
                    {queryRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="hidden sm:flex w-8 h-8 items-center justify-center text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Row 2: Type Buttons + Icons (mobile) */}
                  <div className="flex gap-2 items-center justify-between sm:justify-start">
                    {/* Type Buttons */}
                    <div className="flex gap-1">
                      {QUERY_TYPE_ORDER.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => updateRow(row.id, "queryType", type)}
                          className={`px-3 py-2 text-xs font-medium rounded border transition-colors ${
                            row.queryType === type
                              ? "bg-blue-50 border-blue-500 text-blue-700"
                              : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {/* Plus/Remove Icons - Mobile only */}
                    <div className="flex gap-1 sm:hidden">
                      <button
                        type="button"
                        onClick={addNewRow}
                        className="w-8 h-8 flex items-center justify-center text-green-600 hover:bg-green-50 rounded"
                      >
                        <Plus className="w-5 h-5" />
                      </button>

                      {queryRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="w-8 h-8 flex items-center justify-center text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 flex justify-between border-t">
            <span className="text-xs text-gray-500 flex items-center">
              {queryRows.length} {queryRows.length === 1 ? "query" : "queries"}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Add All
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
