"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { Query, User } from "../utils/sheets";
import { Plus } from "lucide-react";

interface AddQueryModalProps {
  onClose: () => void;
}

export function AddQueryModal({ onClose }: AddQueryModalProps) {
  const { currentUser, users, addQueryOptimistic } = useQueryStore();
  const [description, setDescription] = useState("");
  const [queryType, setQueryType] = useState("New");
  const [allocateTo, setAllocateTo] = useState(""); // Empty = Bucket A, else Bucket B
  const [error, setError] = useState("");
  const [addedQueries, setAddedQueries] = useState<string[]>([]); // Track added in this session
  const [showAllocate, setShowAllocate] = useState(false); // Show allocate field after first add

  const MIN_CHARS = 10;
  const MAX_CHARS = 200;

  // Filter active users for Allocate To dropdown
  const activeUsers = users.filter(
    (u: User) => u["Is Active"]?.toLowerCase() === "true",
  );

  const handleSubmit = async (
    e: React.FormEvent,
    keepModalOpen: boolean = false,
  ) => {
    e.preventDefault();

    if (description.length < MIN_CHARS) {
      setError(`Description must be at least ${MIN_CHARS} characters.`);
      return;
    }
    if (description.length > MAX_CHARS) {
      setError(`Description must be less than ${MAX_CHARS} characters.`);
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

    const newQueryData: Partial<Query> = {
      "Query Description": description,
      "Query Type": queryType,
      GmIndicator: "FALSE", // Always FALSE for new queries (GM Indicator only in Edit Modal for E/F)
    };

    // If Allocate To is set, go to Bucket B with assignment fields
    if (allocateTo) {
      newQueryData.Status = "B";
      newQueryData["Assigned To"] = allocateTo;
      newQueryData["Assigned By"] = currentUser?.Email || "";
      newQueryData["Assignment Date Time"] = now;
    }

    await addQueryOptimistic(newQueryData);

    // Track added query
    setAddedQueries([...addedQueries, description.slice(0, 30) + "..."]);

    if (keepModalOpen) {
      // Reset form for next add (keep allocateTo for same user multi-add)
      setDescription("");
      setError("");
      setShowAllocate(true); // Show allocate field after first add
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-gray-800">
              Add New Query
            </h3>
          </div>
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

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4">
          {/* Compact Single Row: Description + Type */}
          <div className="flex gap-2 mb-3">
            {/* Query Description - Compact */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Query Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setError("");
                }}
                maxLength={MAX_CHARS}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Enter query details..."
                autoFocus
              />
            </div>

            {/* Query Type - Compact Inline */}
            <div className="w-48">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <div className="flex gap-1">
                {QUERY_TYPE_ORDER.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setQueryType(type)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded border transition-colors ${
                      queryType === type
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Character Counter and Error */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-red-500 min-h-[16px]">{error}</span>
            <span
              className={`text-xs ${description.length > MAX_CHARS ? "text-red-500" : description.length > MAX_CHARS - 20 ? "text-amber-500" : "text-gray-400"}`}
            >
              {description.length}/{MAX_CHARS}
            </span>
          </div>

          {/* Allocate To - Shows after first add */}
          {showAllocate && (
            <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Allocate To{" "}
                <span className="text-xs text-gray-500">
                  (optional → goes to B)
                </span>
              </label>
              <select
                value={allocateTo}
                onChange={(e) => setAllocateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500 text-sm"
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

          {/* Footer with buttons */}
          <div className="bg-gray-50 -mx-4 -mb-4 px-4 py-3 flex justify-between gap-2 border-t border-gray-200 mt-3">
            <div className="text-xs text-gray-400 flex flex-col justify-center">
              {addedQueries.length > 0 && (
                <span className="text-green-600 font-medium">
                  ✓ {addedQueries.length} added
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 text-sm"
              >
                {addedQueries.length > 0 ? "Done" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={!description.trim() || !!error}
                className="px-4 py-1.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add Query
              </button>
              {addedQueries.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as any, true)}
                  disabled={!description.trim() || !!error}
                  className="px-3 py-1.5 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1"
                  title="Add another query"
                >
                  <Plus className="w-4 h-4" />
                  Add +
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
