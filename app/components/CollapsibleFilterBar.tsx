import { useState, useRef, useCallback } from "react";
import { DATE_FIELDS, DateFieldKey } from "../utils/queryFilters";
import { BUCKETS } from "../config/sheet-constants";


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
  // Segregated Buckets filter (Bucket View only)
  segregatedBuckets?: string[];
  onSegregatedBucketsChange?: (buckets: string[]) => void;
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
  segregatedBuckets = [],
  onSegregatedBucketsChange,
  allUsers = [],
}: CollapsibleFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [bucketDropdownOpen, setBucketDropdownOpen] = useState(false);
  const [hiddenBucketDropdownOpen, setHiddenBucketDropdownOpen] =
    useState(false);
  const [hiddenUserDropdownOpen, setHiddenUserDropdownOpen] = useState(false);
  const [segregatedDropdownOpen, setSegregatedDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);

  // Refs for dropdown trigger buttons (to compute fixed-position for panels)
  const bucketDropdownRef = useRef<HTMLButtonElement>(null);
  const hiddenBucketDropdownRef = useRef<HTMLButtonElement>(null);
  const hiddenUserDropdownRef = useRef<HTMLButtonElement>(null);
  const segregatedDropdownRef = useRef<HTMLButtonElement>(null);

  // Compute fixed dropdown position from a trigger ref
  const getDropdownStyle = useCallback(
    (ref: React.RefObject<HTMLButtonElement | null>) => {
      if (!ref.current) return { top: 0, left: 0 };
      const rect = ref.current.getBoundingClientRect();
      return {
        top: rect.bottom + 4,
        left: Math.max(4, Math.min(rect.left, window.innerWidth - 200)),
      };
    },
    [],
  );

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
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">COLUMNS:</span>
      <div className="flex flex-1 sm:flex-none bg-gray-50 rounded p-0.5">
        {[2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => setColumnCount(count as 2 | 3 | 4)}
            className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${columnCount === count ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );

  const LayoutFilter = () => (
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">LAYOUT:</span>
      <div className="flex flex-1 sm:flex-none bg-gray-50 rounded p-0.5">
        <button
          onClick={() => setBucketViewMode("default")}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${bucketViewMode === "default" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Independent scroll per bucket"
        >
          Default
        </button>
        <button
          onClick={() => setBucketViewMode("linear")}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${bucketViewMode === "linear" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Synchronized row scrolling"
        >
          Linear
        </button>
      </div>
    </div>
  );

  const CardViewFilter = () => (
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">CARD:</span>
      <div className="flex flex-1 sm:flex-none bg-gray-50 rounded p-0.5">
        <button
          onClick={() => onDetailViewChange?.(false)}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${!detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Single row per card (compact)"
        >
          Compact
        </button>
        <button
          onClick={() => onDetailViewChange?.(true)}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Two rows per card with all dates"
        >
          Detail
        </button>
      </div>
    </div>
  );

  const GroupByFilter = () => (
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">GROUP:</span>
      <div className="flex flex-1 sm:flex-none bg-gray-50 rounded p-0.5">
        <button
          onClick={() => onGroupByChange?.("bucket")}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${groupBy === "bucket" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Group by workflow stage (bucket)"
        >
          Bucket
        </button>
        <button
          onClick={() => onGroupByChange?.("type")}
          className={`flex-1 sm:flex-none px-1.5 py-0.5 text-[10px] font-medium rounded transition ${groupBy === "type" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Group by query type"
        >
          Type
        </button>
      </div>
    </div>
  );

  const SortFilter = () => (
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">SORT:</span>
      <select
        value={sortField || ""}
        onChange={(e) => onSortFieldChange?.(e.target.value as DateFieldKey)}
        className="flex-1 sm:flex-none px-1 py-0.5 text-[10px] font-medium rounded bg-gray-50 border-0 text-gray-700 focus:ring-1 focus:ring-blue-500 sm:max-w-[100px]"
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
          className="w-4 h-4 text-xs font-bold rounded bg-gray-50 text-gray-700 hover:bg-gray-100 transition flex items-center justify-center"
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
            ref={bucketDropdownRef}
            onClick={() => setBucketDropdownOpen(!bucketDropdownOpen)}
            className="px-1 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center gap-0.5"
            title="Select buckets to apply custom sort"
          >
            <span>{allBucketsSelected ? "All" : `${selectedCount}`}</span>
            <svg
              className="w-2 h-2"
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
              <div
                className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
                style={getDropdownStyle(bucketDropdownRef)}
              >
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
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">SHOW:</span>
      <div className="relative flex-1 sm:flex-none">
        <button
          ref={hiddenBucketDropdownRef}
          onClick={() => setHiddenBucketDropdownOpen(!hiddenBucketDropdownOpen)}
          className={`w-full sm:w-auto px-1.5 py-0.5 text-[10px] font-medium rounded transition flex items-center justify-between sm:justify-start gap-0.5 ${hiddenBuckets.length > 0 ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
          title="Toggle which buckets to show"
        >
          {hiddenBuckets.length > 0
            ? `${8 - hiddenBuckets.length}/8 Buckets`
            : "All Buckets"}
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
        {hiddenBucketDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setHiddenBucketDropdownOpen(false)}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
              style={getDropdownStyle(hiddenBucketDropdownRef)}
            >
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
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">SHOW:</span>
      <div className="relative flex-1 sm:flex-none">
        <button
          ref={hiddenUserDropdownRef}
          onClick={() => setHiddenUserDropdownOpen(!hiddenUserDropdownOpen)}
          className={`w-full sm:w-auto px-1.5 py-0.5 text-xs font-medium rounded transition flex items-center justify-between sm:justify-start gap-1 ${hiddenUsers.length > 0 ? "bg-orange-50 text-orange-700 hover:bg-orange-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
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
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[220px] max-h-[300px] flex flex-col"
              style={getDropdownStyle(hiddenUserDropdownRef)}
            >
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

  // Toggle segregated bucket selection
  const toggleSegregatedBucket = (bucket: string) => {
    if (!onSegregatedBucketsChange) return;
    if (segregatedBuckets.includes(bucket)) {
      onSegregatedBucketsChange(segregatedBuckets.filter((b) => b !== bucket));
    } else {
      onSegregatedBucketsChange([...segregatedBuckets, bucket]);
    }
  };

  // Segregate Buckets Filter (for Bucket View only)
  const SegregateFilter = () => (
    <div className="w-full sm:w-auto flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded">
      <span className="text-[10px] font-medium text-gray-600">SEGREGATE:</span>
      <div className="relative flex-1 sm:flex-none">
        <button
          ref={segregatedDropdownRef}
          onClick={() => setSegregatedDropdownOpen(!segregatedDropdownOpen)}
          className={`w-full sm:w-auto px-1.5 py-0.5 text-[10px] font-medium rounded transition flex items-center justify-between sm:justify-start gap-0.5 ${segregatedBuckets.length > 0 ? "bg-purple-50 text-purple-700 hover:bg-purple-100" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}`}
          title="Split selected buckets by query type"
        >
          {segregatedBuckets.length > 0
            ? `${segregatedBuckets.length} Bucket${segregatedBuckets.length > 1 ? "s" : ""}`
            : "None"}
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
        {segregatedDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSegregatedDropdownOpen(false)}
            />
            <div
              className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[180px]"
              style={getDropdownStyle(segregatedDropdownRef)}
            >
              <div className="p-2 space-y-1">
                {/* Hide All / Show All buttons */}
                <div className="flex gap-1 mb-1">
                  <button
                    onClick={() => onSegregatedBucketsChange?.([])}
                    className="flex-1 px-2 py-1 text-[10px] text-center text-red-600 hover:bg-red-50 rounded border border-red-200"
                  >
                    Hide All
                  </button>
                  <button
                    onClick={() =>
                      onSegregatedBucketsChange?.(AVAILABLE_BUCKETS)
                    }
                    className="flex-1 px-2 py-1 text-[10px] text-center text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                  >
                    Show All
                  </button>
                </div>
                <div className="border-t border-gray-100 my-1" />
                {AVAILABLE_BUCKETS.map((bucket) => {
                  const bucketConfig = BUCKETS[bucket];
                  const isSegregated = segregatedBuckets.includes(bucket);
                  return (
                    <label
                      key={bucket}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isSegregated}
                        onChange={() => toggleSegregatedBucket(bucket)}
                        className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span
                        className="w-4 h-4 rounded text-[9px] flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: bucketConfig.color }}
                      >
                        {bucket}
                      </span>
                      <span className="text-[10px] font-medium text-gray-700">
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

  // SearchInput is inlined to prevent focus loss on re-render

  return (
    <div className="bg-gray-100 border-b border-gray-200 transition-all sticky top-[40px] sm:top-[48px] z-40">
      {/* Toggle Handle */}
      {/* Toggle Handle */}
      <div className="flex items-center justify-center -mb-2 relative z-10 pointer-events-none">
        <div
          className="bg-white border border-gray-200 border-t-0 rounded-b-lg px-2 py-0.5 shadow-sm text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer pointer-events-auto"
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
        <div className="max-w-full mx-auto px-1 py-1">
          {/* Mobile: horizontal scroll with hidden scrollbar. Desktop (sm+): flex-wrap, no scroll needed. */}
          <div className="flex items-center w-full pb-1 gap-1 sm:gap-2 overflow-x-auto scrollbar-hide sm:overflow-visible sm:flex-wrap">

            {/* Filters — left to right. No-wrap on mobile (scroll), wrap on desktop. */}
            <div className="flex items-center gap-0.5 shrink-0 sm:flex-wrap">
              {/* View Toggle - Hide for juniors (only one view) */}
              {!isJunior && (
                <div className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-200 rounded">
                  <span className="text-[8px] sm:text-[10px] font-medium text-gray-600">VIEW:</span>
                  <div className="flex bg-gray-50 rounded p-0.5">
                    <button
                      onClick={() => setViewMode("bucket")}
                      className={`px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium rounded transition ${viewMode === "bucket" ? "bg-white text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      Bucket
                    </button>
                    <button
                      onClick={() => setViewMode("user")}
                      className={`px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[10px] font-medium rounded transition ${viewMode === "user" ? "bg-white text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      User
                    </button>
                  </div>
                </div>
              )}

              {/* Columns Filter */}
              {(viewMode === "bucket" || viewMode === "user") && (
                <div className="shrink-0">
                  <ColumnsFilter />
                </div>
              )}

              {/* Layout Filter */}
              {(viewMode === "bucket" || viewMode === "user") && (
                <div className="shrink-0">
                  <LayoutFilter />
                </div>
              )}

              {/* Card View Filter */}
              {(viewMode === "bucket" || viewMode === "user") &&
                onDetailViewChange && (
                  <div className="shrink-0">
                    <CardViewFilter />
                  </div>
                )}

              {/* Group By Filter (User View only) */}
              {viewMode === "user" && onGroupByChange && (
                <div className="shrink-0">
                  <GroupByFilter />
                </div>
              )}

              {/* Show/Hide Buckets Filter (Bucket View only) */}
              {viewMode === "bucket" && onHiddenBucketsChange && (
                <div className="shrink-0">
                  <HiddenBucketsFilter />
                </div>
              )}

              {/* Segregate Buckets Filter (Bucket View only) */}
              {viewMode === "bucket" && onSegregatedBucketsChange && (
                <div className="shrink-0">
                  <SegregateFilter />
                </div>
              )}

              {/* Show/Hide Users Filter (User View only) */}
              {viewMode === "user" && onHiddenUsersChange && (
                <div className="shrink-0">
                  <HiddenUsersFilter />
                </div>
              )}

              {/* Sort Filter - Hide when search is expanded */}
              {(viewMode === "bucket" || viewMode === "user") &&
                onSortFieldChange &&
                !searchExpanded && (
                  <div className="shrink-0">
                    <SortFilter />
                  </div>
                )}
            </div>

            {/* Right-aligned: Search + Save/Undo/Reset */}
            <div className="flex justify-end items-center gap-1 min-w-0 ml-auto shrink-0">
              {/* Undo Button */}
              {showUndo && onUndoReset && (
                <button
                  onClick={onUndoReset}
                  className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-0.5"
                  title="Undo reset"
                >
                  <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Undo
                </button>
              )}

              {/* Restore Defaults */}
              {onResetView && (
                <button
                  onClick={onResetView}
                  className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 transition"
                  title="Reset all filters to defaults"
                >
                  Reset
                </button>
              )}

              {/* Save View */}
              {hasPendingChanges && onSaveView && (
                <button
                  onClick={onSaveView}
                  className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium rounded bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-0.5"
                  title="Save your current view preferences"
                >
                  <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </button>
              )}

              {/* Collapsible Search */}
              {!searchExpanded ? (
                <button
                  onClick={() => setSearchExpanded(true)}
                  className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-200 rounded transition"
                  title="Search Description"
                >
                  <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              ) : (
                <div className="relative w-28 sm:w-48">
                  <div className="absolute inset-y-0 left-0 pl-1.5 sm:pl-2 flex items-center pointer-events-none">
                    <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) setSearchExpanded(false);
                    }}
                    autoFocus
                    className="block w-full pl-5 sm:pl-6 pr-6 sm:pr-7 py-0.5 sm:py-1 border border-gray-200 rounded text-[9px] sm:text-[10px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                    placeholder="Search..."
                  />
                  <button
                    onClick={() => {
                      onSearchChange?.("");
                      setSearchExpanded(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-1.5 sm:pr-2 flex items-center"
                    title="Close search"
                  >
                    <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
