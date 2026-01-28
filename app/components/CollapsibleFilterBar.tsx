import { useState } from "react";

interface CollapsibleFilterBarProps {
  viewMode: "bucket" | "user" | "list";
  setViewMode: (mode: "bucket" | "user" | "list") => void;
  bucketViewMode: "default" | "linear";
  setBucketViewMode: (mode: "default" | "linear") => void;
  columnCount: 2 | 3 | 4;
  setColumnCount: (cols: 2 | 3 | 4) => void;
  historyDays?: 3 | 7;
  setHistoryDays?: (days: 3 | 7) => void;
  onCollapseChange?: (isExpanded: boolean) => void;
}

export function CollapsibleFilterBar({
  viewMode,
  setViewMode,
  bucketViewMode,
  setBucketViewMode,
  columnCount,
  setColumnCount,
  historyDays,
  setHistoryDays,
  onCollapseChange,
}: CollapsibleFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  };

  return (
    <div className="bg-white border-b border-gray-100 transition-all">
      {/* Toggle Handle */}
      <div
        className="flex items-center justify-center -mb-2 relative z-10 cursor-pointer group"
        onClick={toggleExpanded}
      >
        <div className="bg-white border border-gray-100 border-t-0 rounded-b-lg px-2 py-0.5 shadow-sm text-[10px] text-gray-400 group-hover:text-gray-600 flex items-center gap-1">
          <span>{isExpanded ? "Hide" : "Show"}</span>
          <svg
            className={`w-2.5 h-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                View:
              </span>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("bucket")}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${viewMode === "bucket" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Bucket
                </button>
                <button
                  onClick={() => setViewMode("user")}
                  className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${viewMode === "user" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  User
                </button>
              </div>
            </div>

            {/* Column Count - Hidden on mobile */}
            {(viewMode === "bucket" || viewMode === "user") && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Columns:
                </span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setColumnCount(count as 2 | 3 | 4)}
                      className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${columnCount === count ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Layout Toggle (Bucket view only) - Hidden on mobile */}
            {viewMode === "bucket" && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  Layout:
                </span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setBucketViewMode("default")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${bucketViewMode === "default" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    title="Independent scroll per bucket"
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setBucketViewMode("linear")}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${bucketViewMode === "linear" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    title="Synchronized row scrolling"
                  >
                    Linear
                  </button>
                </div>
              </div>
            )}

            {/* History Toggle */}
            {historyDays && setHistoryDays && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  History:
                </span>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setHistoryDays(3)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${historyDays === 3 ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    3d
                  </button>
                  <button
                    onClick={() => setHistoryDays(7)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${historyDays === 7 ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    7d
                  </button>
                </div>
              </div>
            )}

            {/* Search - Right aligned - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1.5 ml-auto">
              <div className="relative w-48">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg
                    className="h-3 w-3 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-7 pr-2 py-1 border border-gray-200 rounded-md text-[10px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Search queries..."
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
