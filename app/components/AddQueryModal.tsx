"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { Query } from "../utils/sheets";

interface AddQueryModalProps {
  onClose: () => void;
}

export function AddQueryModal({ onClose }: AddQueryModalProps) {
  const { currentUser, addQueryOptimistic } = useQueryStore();
  const [description, setDescription] = useState("");
  const [queryType, setQueryType] = useState("New");
  const [gmIndicator, setGmIndicator] = useState(false);
  const [error, setError] = useState("");

  const MIN_CHARS = 10;
  const MAX_CHARS = 200;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (description.length < MIN_CHARS) {
      setError(`Description must be at least ${MIN_CHARS} characters.`);
      return;
    }
    if (description.length > MAX_CHARS) {
      setError(`Description must be less than ${MAX_CHARS} characters.`);
      return;
    }

    const newQueryData: Partial<Query> = {
      "Query Description": description,
      "Query Type": queryType,
      GmIndicator: gmIndicator ? "TRUE" : "FALSE",
    };

    await addQueryOptimistic(newQueryData);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">Add New Query</h3>
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

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Query Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              rows={4}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Enter query details..."
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-red-500 min-h-[16px]">{error}</span>
              <span
                className={`text-xs ${description.length > MAX_CHARS ? "text-red-500" : "text-gray-400"}`}
              >
                {description.length}/{MAX_CHARS}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Query Type
            </label>
            <div className="flex gap-2">
              {QUERY_TYPE_ORDER.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setQueryType(type)}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
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

          {/* GM Indicator Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={gmIndicator}
                onChange={(e) => setGmIndicator(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">
                GM Indicator
              </span>
              <span className="text-xs text-gray-500">
                (Shows ✉️ icon in all buckets)
              </span>
            </label>
          </div>

          <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
            <div className="flex-1 text-xs text-gray-400 flex flex-col justify-center">
              <span>Added by: {currentUser?.Name || "Me"}</span>
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!description.trim() || !!error}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Add Query
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
