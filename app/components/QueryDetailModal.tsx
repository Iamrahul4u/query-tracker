import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Query } from "../utils/sheets";

interface QueryDetailModalProps {
  query: Query;
  onClose: () => void;
}

const BUCKET_NAMES: Record<string, string> = {
  A: "Pending (Unassigned)",
  B: "Pending Proposal",
  C: "Proposal Sent",
  D: "Proposal Sent Partially",
  E: "Partial Proposal + In SF",
  F: "Full Proposal + In SF",
  G: "Discarded",
};

export function QueryDetailModal({ query, onClose }: QueryDetailModalProps) {
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
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
                {query["Assigned To"]}
              </p>
              {query["Remarks"] && (
                <p className="text-sm text-gray-600 mt-1 italic">
                  &quot;{query["Remarks"]}&quot;
                </p>
              )}
            </div>
          )}

          {/* Event Info (for E/F) */}
          {(query["Event ID"] || query["Event Title"]) && (
            <div className="mb-6 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Salesforce Event
              </p>
              <p className="font-medium text-gray-800">
                {query["Event Title"] || "—"}
              </p>
              <p className="text-xs text-gray-500">
                ID: {query["Event ID"] || "—"}
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
                {query["Added By"] && (
                  <div className="flex justify-between">
                    <span>
                      Added by{" "}
                      <span className="font-medium text-gray-700">
                        {query["Added By"]}
                      </span>
                    </span>
                    <span className="text-gray-400">
                      {query["Added Date Time"] || "—"}
                    </span>
                  </div>
                )}
                {query["Assigned By"] && (
                  <div className="flex justify-between">
                    <span>
                      Assigned by{" "}
                      <span className="font-medium text-gray-700">
                        {query["Assigned By"]}
                      </span>
                    </span>
                    <span className="text-gray-400">
                      {query["Assignment Date Time"] || "—"}
                    </span>
                  </div>
                )}
                {query["Proposal Sent Date Time"] && (
                  <div className="flex justify-between">
                    <span>Proposal sent</span>
                    <span className="text-gray-400">
                      {query["Proposal Sent Date Time"]}
                    </span>
                  </div>
                )}
                {query["Entered In SF Date Time"] && (
                  <div className="flex justify-between">
                    <span>Entered in SF</span>
                    <span className="text-gray-400">
                      {query["Entered In SF Date Time"]}
                    </span>
                  </div>
                )}
                {query["Last Edited By"] && (
                  <div className="flex justify-between">
                    <span>
                      Last edited by{" "}
                      <span className="font-medium text-gray-700">
                        {query["Last Edited By"]}
                      </span>
                    </span>
                    <span className="text-gray-400">
                      {query["Last Edited Date Time"] || "—"}
                    </span>
                  </div>
                )}
                {query["Discarded Date Time"] && (
                  <div className="flex justify-between">
                    <span className="text-red-600">Discarded</span>
                    <span className="text-gray-400">
                      {query["Discarded Date Time"]}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
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
