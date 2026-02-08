import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DATE_FIELDS, DateFieldKey } from "../utils/queryFilters";
import { BUCKETS } from "../config/sheet-constants";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

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
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  // Sorting and date display options
  sortField?: DateFieldKey;
  onSortFieldChange?: (field: DateFieldKey) => void;
  sortAscending?: boolean;
  onSortAscendingChange?: (ascending: boolean) => void;
  sortBuckets?: string[]; // Buckets to apply custom sort to
  onSortBucketsChange?: (buckets: string[]) => void;
  showDateOnCards?: boolean;
  onShowDateOnCardsChange?: (show: boolean) => void;
  // Detail View toggle (1-row vs 2-row per query card)
  detailView?: boolean;
  onDetailViewChange?: (detail: boolean) => void;
  // Group By toggle (User View only: type vs bucket)
  groupBy?: "type" | "bucket";
  onGroupByChange?: (mode: "type" | "bucket") => void;
  // Save View button
  hasPendingChanges?: boolean;
  showUndo?: boolean;
  onSaveView?: () => void;
  onResetView?: () => void;
  onUndoReset?: () => void;
  // User role for hiding User View from Juniors
  currentUserRole?: string;
  // Hidden Buckets/Users filters
  hiddenBuckets?: string[];
  onHiddenBucketsChange?: (buckets: string[]) => void;
  hiddenUsers?: string[];
  onHiddenUsersChange?: (users: string[]) => void;
  // All users for the user filter dropdown
  allUsers?: Array<{ email: string; name: string }>;
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
  searchQuery = "",
  onSearchChange,
  sortField = "Added Date Time",
  onSortFieldChange,
  sortAscending = true,
  onSortAscendingChange,
  sortBuckets = ["ALL"],
  onSortBucketsChange,
  showDateOnCards = false,
  onShowDateOnCardsChange,
  detailView = false,
  onDetailViewChange,
  groupBy = "bucket",
  onGroupByChange,
  hasPendingChanges = false,
  showUndo = false,
  onSaveView,
  onResetView,
  onUndoReset,
  currentUserRole = "",
  hiddenBuckets = [],
  onHiddenBucketsChange,
  hiddenUsers = [],
  onHiddenUsersChange,
  allUsers = [],
}: CollapsibleFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bucketDropdownOpen, setBucketDropdownOpen] = useState(false);
  const [hiddenBucketDropdownOpen, setHiddenBucketDropdownOpen] =
    useState(false);
  const [hiddenUserDropdownOpen, setHiddenUserDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Check if user is Junior (cannot access User View)
  const isJunior = currentUserRole.toLowerCase() === "junior";

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  };

  // Available buckets for multi-select
  const AVAILABLE_BUCKETS = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // Check if all buckets are selected (either contains "ALL" or all individual buckets)
  const allBucketsSelected =
    sortBuckets.includes("ALL") ||
    AVAILABLE_BUCKETS.every((b) => sortBuckets.includes(b));

  // Toggle bucket selection
  const toggleBucket = (bucket: string) => {
    if (!onSortBucketsChange) return;

    if (bucket === "ALL") {
      // Toggle all buckets on/off
      if (allBucketsSelected) {
        // Deselect all - use empty array (will use default sorting)
        onSortBucketsChange([]);
      } else {
        // Select all - use "ALL" token
        onSortBucketsChange(["ALL"]);
      }
    } else {
      // Toggle individual bucket
      // First, if we have "ALL", convert to all individual buckets then toggle
      const currentBuckets = sortBuckets.includes("ALL")
        ? AVAILABLE_BUCKETS
        : sortBuckets;

      if (currentBuckets.includes(bucket)) {
        // Remove this bucket
        const newBuckets = currentBuckets.filter((b) => b !== bucket);
        onSortBucketsChange(newBuckets);
      } else {
        // Add this bucket
        const newBuckets = [
          ...currentBuckets.filter((b) => b !== "ALL"),
          bucket,
        ];
        // If all buckets are now selected, convert back to ["ALL"]
        if (AVAILABLE_BUCKETS.every((b) => newBuckets.includes(b))) {
          onSortBucketsChange(["ALL"]);
        } else {
          onSortBucketsChange(newBuckets);
        }
      }
    }
  };

  // Show "All" if ALL is selected, otherwise show count of selected buckets
  const selectedCount = allBucketsSelected
    ? 8
    : sortBuckets.filter((b) => b !== "ALL").length;

  // Filter section component for reuse in desktop and drawer
  const ColumnsFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Columns:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => setColumnCount(count as 2 | 3 | 4)}
            className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${columnCount === count ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );

  const LayoutFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Layout:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => setBucketViewMode("default")}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${bucketViewMode === "default" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Independent scroll per bucket"
        >
          Default
        </button>
        <button
          onClick={() => setBucketViewMode("linear")}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${bucketViewMode === "linear" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Synchronized row scrolling"
        >
          Linear
        </button>
      </div>
    </div>
  );

  const CardViewFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Card:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => onDetailViewChange?.(false)}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${!detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Single row per card (compact)"
        >
          Compact
        </button>
        <button
          onClick={() => onDetailViewChange?.(true)}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Two rows per card with all dates"
        >
          Detail
        </button>
      </div>
    </div>
  );

  const GroupByFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Group:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => onGroupByChange?.("bucket")}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${groupBy === "bucket" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Group by workflow stage (bucket)"
        >
          Bucket
        </button>
        <button
          onClick={() => onGroupByChange?.("type")}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${groupBy === "type" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Group by query type"
        >
          Type
        </button>
      </div>
    </div>
  );

  const SortFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-medium text-gray-600">SORT:</span>
      <select
        value={sortField || ""}
        onChange={(e) => onSortFieldChange?.(e.target.value as DateFieldKey)}
        className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700 border-0 focus:ring-1 focus:ring-blue-500"
        title="Sort by date field"
      >
        {DATE_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      {sortField && (
        <button
          onClick={() => onSortAscendingChange?.(!sortAscending)}
          className="w-5 h-5 text-sm font-bold rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition flex items-center justify-center"
          title={
            sortAscending
              ? "Oldest first (click for Newest)"
              : "Newest first (click for Oldest)"
          }
        >
          {sortAscending ? "↑" : "↓"}
        </button>
      )}
      {/* Bucket Multi-Select Dropdown - Only show when custom sort is active */}
      {sortField && (
        <div className="relative">
          <button
            onClick={() => setBucketDropdownOpen(!bucketDropdownOpen)}
            className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition flex items-center gap-1"
            title="Select buckets to apply custom sort"
          >
            <span>{allBucketsSelected ? "All" : `${selectedCount}`}</span>
            <svg
              className="w-2.5 h-2.5"
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
          </button>
          {/* Dropdown Menu */}
          {bucketDropdownOpen && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setBucketDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
                <div className="p-2 space-y-1">
                  <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allBucketsSelected}
                      onChange={() => toggleBucket("ALL")}
                      className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-[10px] font-medium text-gray-700">
                      All Buckets
                    </span>
                  </label>
                  <div className="border-t border-gray-100 my-1"></div>
                  {AVAILABLE_BUCKETS.map((bucket) => {
                    const bucketConfig = BUCKETS[bucket];
                    const bucketLabel = bucketConfig.name.split(") ");
                    return (
                      <label
                        key={bucket}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            allBucketsSelected || sortBuckets.includes(bucket)
                          }
                          onChange={() => toggleBucket(bucket)}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-[10px] font-medium text-gray-700">
                          {bucketLabel[0]}) {bucketLabel[1]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {onResetView && sortField && (
        <button
          onClick={onResetView}
          className="w-5 h-5 text-sm font-bold rounded bg-red-100 text-red-700 hover:bg-red-200 transition flex items-center justify-center"
          title="Reset all preferences to defaults"
        >
          ✕
        </button>
      )}
    </div>
  );

  // Toggle hidden bucket selection
  const toggleHiddenBucket = (bucket: string) => {
    if (!onHiddenBucketsChange) return;
    if (hiddenBuckets.includes(bucket)) {
      onHiddenBucketsChange(hiddenBuckets.filter((b) => b !== bucket));
    } else {
      onHiddenBucketsChange([...hiddenBuckets, bucket]);
    }
  };

  // Toggle hidden user selection
  const toggleHiddenUser = (email: string) => {
    if (!onHiddenUsersChange) return;
    if (hiddenUsers.includes(email)) {
      onHiddenUsersChange(hiddenUsers.filter((u) => u !== email));
    } else {
      onHiddenUsersChange([...hiddenUsers, email]);
    }
  };

  // Filtered users based on search query (first name from Name field)
  const filteredUsers = allUsers.filter((u) => {
    const search = userSearchQuery.toLowerCase();
    if (!search) return true;

    // Extract first name from Name
    const nameFirstName = u.name.split(" ")[0].toLowerCase();

    // Match if Name first name starts with search
    return nameFirstName.startsWith(search);
  });

  // Hidden Buckets Filter (for Bucket View)
  const HiddenBucketsFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Show:
      </span>
      <div className="relative">
        <button
          onClick={() => setHiddenBucketDropdownOpen(!hiddenBucketDropdownOpen)}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition flex items-center gap-1 ${hiddenBuckets.length > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          title="Toggle which buckets to show"
        >
          {hiddenBuckets.length > 0
            ? `${8 - hiddenBuckets.length}/8 Buckets`
            : "All Buckets"}
          <svg
            className="w-3 h-3"
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
        </button>
        {hiddenBucketDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setHiddenBucketDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]">
              <div className="p-2 space-y-1">
                {/* Hide All / Show All buttons */}
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() => onHiddenBucketsChange?.(AVAILABLE_BUCKETS)}
                    className="flex-1 px-2 py-1 text-[10px] text-center text-red-600 hover:bg-red-50 rounded border border-red-200"
                  >
                    Hide All
                  </button>
                  <button
                    onClick={() => onHiddenBucketsChange?.([])}
                    className="flex-1 px-2 py-1 text-[10px] text-center text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                  >
                    Show All
                  </button>
                </div>
                <div className="border-t border-gray-100 my-1" />
                {AVAILABLE_BUCKETS.map((bucket) => {
                  const bucketConfig = BUCKETS[bucket];
                  const isHidden = hiddenBuckets.includes(bucket);
                  return (
                    <label
                      key={bucket}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => toggleHiddenBucket(bucket)}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span
                        className="w-4 h-4 rounded text-[9px] flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: bucketConfig.color }}
                      >
                        {bucket}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${isHidden ? "text-gray-400 line-through" : "text-gray-700"}`}
                      >
                        {bucketConfig.name.split(") ")[1]?.split(" - ")[0] ||
                          bucketConfig.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // Hidden Users Filter (for User View)
  const HiddenUsersFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Show:
      </span>
      <div className="relative">
        <button
          onClick={() => setHiddenUserDropdownOpen(!hiddenUserDropdownOpen)}
          className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition flex items-center gap-1 ${hiddenUsers.length > 0 ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          title="Toggle which users to show"
        >
          {hiddenUsers.length > 0
            ? `${allUsers.length - hiddenUsers.length}/${allUsers.length} Users`
            : "All Users"}
          <svg
            className="w-3 h-3"
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
        </button>
        {hiddenUserDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setHiddenUserDropdownOpen(false)}
            />
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] max-h-[300px] flex flex-col">
              {/* Search input */}
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="p-2 space-y-1 overflow-y-auto flex-1">
                {/* Hide All / Show All buttons */}
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() =>
                      onHiddenUsersChange?.(allUsers.map((u) => u.email))
                    }
                    className="flex-1 px-2 py-1 text-[10px] text-center text-red-600 hover:bg-red-50 rounded border border-red-200"
                  >
                    Hide All
                  </button>
                  <button
                    onClick={() => onHiddenUsersChange?.([])}
                    className="flex-1 px-2 py-1 text-[10px] text-center text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                  >
                    Show All
                  </button>
                </div>
                <div className="border-t border-gray-100 my-1" />
                {filteredUsers.map((user) => {
                  const isHidden = hiddenUsers.includes(user.email);
                  return (
                    <label
                      key={user.email}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!isHidden}
                        onChange={() => toggleHiddenUser(user.email)}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span
                        className={`text-[10px] font-medium truncate ${isHidden ? "text-gray-400 line-through" : "text-gray-700"}`}
                      >
                        {user.name}
                      </span>
                    </label>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="text-[10px] text-gray-400 text-center py-2">
                    No users found
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // SearchInput is inlined to prevent focus loss on re-render

  return (
    <div className="bg-white border-b border-gray-100 transition-all sticky top-[40px] sm:top-[48px] z-40">
      {/* Toggle Handle */}
      {/* Toggle Handle */}
      <div
        className="flex items-center justify-center -mb-2 relative z-10 pointer-events-none"
      >
        <div 
          className="bg-white border border-gray-100 border-t-0 rounded-b-lg px-2 py-0.5 shadow-sm text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer pointer-events-auto"
          onClick={toggleExpanded}
        >
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
        <div className="max-w-full mx-auto px-3 sm:px-4 lg:px-6 py-1">
          <div className="flex flex-wrap items-center gap-2">
            {/* View Toggles - Always visible (User tab hidden for Juniors) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                View:
              </span>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("bucket")}
                  className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${viewMode === "bucket" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Bucket
                </button>
                {!isJunior && (
                  <button
                    onClick={() => setViewMode("user")}
                    className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition ${viewMode === "user" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    User
                  </button>
                )}
              </div>
            </div>

            {/* Desktop Only Filters - Hidden on mobile (<lg / <1024px) */}
            {(viewMode === "bucket" || viewMode === "user") && (
              <>
                <div className="hidden lg:flex">
                  <ColumnsFilter />
                </div>
                <div className="hidden lg:flex">
                  <LayoutFilter />
                </div>
                {onDetailViewChange && (
                  <div className="hidden lg:flex">
                    <CardViewFilter />
                  </div>
                )}
                {/* Group By toggle - Only visible in User View */}
                {viewMode === "user" && onGroupByChange && (
                  <div className="hidden lg:flex">
                    <GroupByFilter />
                  </div>
                )}
                {/* Hidden Buckets Filter - Only visible in Bucket View */}
                {viewMode === "bucket" && onHiddenBucketsChange && (
                  <div className="hidden lg:flex">
                    <HiddenBucketsFilter />
                  </div>
                )}
                {/* Hidden Users Filter - Only visible in User View */}
                {viewMode === "user" && onHiddenUsersChange && (
                  <div className="hidden lg:flex">
                    <HiddenUsersFilter />
                  </div>
                )}
              </>
            )}

            {(viewMode === "bucket" || viewMode === "user") &&
              onSortFieldChange && (
                <div className="hidden lg:flex">
                  <SortFilter />
                </div>
              )}

            {/* Search + Save View - Hidden on mobile - INLINED to prevent focus loss */}
            <div className="hidden lg:flex items-center gap-1.5 ml-auto">
              {/* Undo Button - visible for 10 seconds after reset */}
              {showUndo && onUndoReset && (
                <button
                  onClick={onUndoReset}
                  className="w-5 h-5 text-sm font-bold rounded bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center shadow-sm animate-pulse"
                  title="Undo reset"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                </button>
              )}
              {/* Save View Button - visible when there are pending changes */}
              {hasPendingChanges && onSaveView && (
                <button
                  onClick={onSaveView}
                  className="w-5 h-5 text-sm font-bold rounded bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center shadow-sm"
                  title="Save your current view preferences"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </button>
              )}
              <div className="relative w-36">
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
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="block w-full pl-6 pr-2 py-1 border border-gray-200 rounded text-[10px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Search Description"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange?.("")}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    <svg
                      className="h-3 w-3 text-gray-400 hover:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Filter Button - Shows drawer with all hidden filters */}
            <div className="lg:hidden ml-auto">
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <button className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filters</span>
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Filter Options</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-6 space-y-4">
                    {/* Search - INLINED to prevent focus loss */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase">
                        Search
                      </label>
                      <div className="relative w-full">
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
                          value={searchQuery}
                          onChange={(e) => onSearchChange?.(e.target.value)}
                          className="block w-full pl-7 pr-2 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Search Description"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => onSearchChange?.("")}
                            className="absolute inset-y-0 right-0 pr-2 flex items-center"
                          >
                            <svg
                              className="h-3 w-3 text-gray-400 hover:text-gray-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Columns */}
                    {(viewMode === "bucket" || viewMode === "user") && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">
                          Columns
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                          {[2, 3, 4].map((count) => (
                            <button
                              key={count}
                              onClick={() => setColumnCount(count as 2 | 3 | 4)}
                              className={`px-4 py-2 text-sm font-medium rounded-md transition ${columnCount === count ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Layout */}
                    {(viewMode === "bucket" || viewMode === "user") && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">
                          Layout
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                          <button
                            onClick={() => setBucketViewMode("default")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${bucketViewMode === "default" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                          >
                            Default
                          </button>
                          <button
                            onClick={() => setBucketViewMode("linear")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${bucketViewMode === "linear" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                          >
                            Linear
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Group By - Only in User View */}
                    {viewMode === "user" && onGroupByChange && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">
                          Group By
                        </label>
                        <div className="flex bg-gray-100 rounded-lg p-0.5 w-fit">
                          <button
                            onClick={() => onGroupByChange("bucket")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${groupBy === "bucket" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                          >
                            Bucket
                          </button>
                          <button
                            onClick={() => onGroupByChange("type")}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${groupBy === "type" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                          >
                            Type
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sort */}
                    {(viewMode === "bucket" || viewMode === "user") &&
                      onSortFieldChange && (
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-gray-600 uppercase">
                            Sort By
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={sortField}
                              onChange={(e) =>
                                onSortFieldChange(
                                  e.target.value as DateFieldKey,
                                )
                              }
                              className="flex-1 px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 border-0 focus:ring-1 focus:ring-blue-500"
                            >
                              {DATE_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                onSortAscendingChange?.(!sortAscending)
                              }
                              className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                            >
                              {sortAscending ? "↑ Oldest" : "↓ Newest"}
                            </button>
                          </div>

                          {/* Bucket Multi-Select */}
                          {onSortBucketsChange && (
                            <div className="space-y-2 mt-3">
                              <label className="text-xs font-semibold text-gray-600 uppercase">
                                Apply Sort To
                              </label>
                              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={allBucketsSelected}
                                    onChange={() => toggleBucket("ALL")}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm font-medium text-gray-700">
                                    All Buckets
                                  </span>
                                </label>
                                <div className="border-t border-gray-200 my-2"></div>
                                <div className="grid grid-cols-4 gap-2">
                                  {AVAILABLE_BUCKETS.map((bucket) => (
                                    <label
                                      key={bucket}
                                      className="flex items-center gap-1 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={sortBuckets.includes(bucket)}
                                        onChange={() => toggleBucket(bucket)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm font-medium text-gray-700">
                                        {bucket}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {onResetView && (
                            <button
                              onClick={onResetView}
                              className="w-full px-3 py-2 text-sm font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                            >
                              ✕ Reset All Preferences to Defaults
                            </button>
                          )}
                        </div>
                      )}

                    {/* Save View Button - Mobile */}
                    {hasPendingChanges && onSaveView && (
                      <button
                        onClick={() => {
                          onSaveView();
                          setDrawerOpen(false); // Close drawer after saving
                        }}
                        className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-sm"
                        title="Save your current view preferences"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Save View
                      </button>
                    )}

                    {/* Undo Button - Mobile */}
                    {showUndo && onUndoReset && (
                      <button
                        onClick={() => {
                          onUndoReset();
                          setDrawerOpen(false); // Close drawer after undo
                        }}
                        className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-sm animate-pulse"
                        title="Undo reset"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                        Undo Reset
                      </button>
                    )}

                    {/* Close button */}
                    <DrawerClose asChild>
                      <button className="w-full mt-4 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
                        Done
                      </button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
