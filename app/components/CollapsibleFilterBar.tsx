import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { DATE_FIELDS, DateFieldKey } from "../utils/queryFilters";
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
  showDateOnCards?: boolean;
  onShowDateOnCardsChange?: (show: boolean) => void;
  // Detail View toggle (1-row vs 2-row per query card)
  detailView?: boolean;
  onDetailViewChange?: (detail: boolean) => void;
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
  showDateOnCards = false,
  onShowDateOnCardsChange,
  detailView = false,
  onDetailViewChange,
}: CollapsibleFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  };

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
            className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${columnCount === count ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
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
  );

  const CardViewFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Card:
      </span>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          onClick={() => onDetailViewChange?.(false)}
          className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${!detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Single row per card (compact)"
        >
          Compact
        </button>
        <button
          onClick={() => onDetailViewChange?.(true)}
          className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${detailView ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          title="Two rows per card with all dates"
        >
          Detail
        </button>
      </div>
    </div>
  );

  const SortFilter = () => (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Sort:
      </span>
      <select
        value={sortField}
        onChange={(e) =>
          onSortFieldChange?.(e.target.value as DateFieldKey)
        }
        className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 border-0 focus:ring-1 focus:ring-blue-500"
      >
        {DATE_FIELDS.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSortAscendingChange?.(!sortAscending)}
        className="px-2 py-1 text-[10px] font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
        title={sortAscending ? "Oldest first" : "Newest first"}
      >
        {sortAscending ? "↑ Oldest" : "↓ Newest"}
      </button>
    </div>
  );

  const DateToggle = () => (
    <button
      onClick={() => onShowDateOnCardsChange?.(!showDateOnCards)}
      className={`px-2 py-1 text-[10px] font-medium rounded-md transition ${
        showDateOnCards
          ? "bg-blue-100 text-blue-700"
          : "bg-gray-100 text-gray-500 hover:text-gray-700"
      }`}
      title="Show dates on query cards"
    >
      📅 Dates
    </button>
  );

  // SearchInput is inlined to prevent focus loss on re-render

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
            {/* View Toggles - Always visible */}
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

            {/* History Toggle - Always visible */}
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
              </>
            )}

            {(viewMode === "bucket" || viewMode === "user") && onSortFieldChange && (
              <div className="hidden lg:flex">
                <SortFilter />
              </div>
            )}

            {(viewMode === "bucket" || viewMode === "user") && onShowDateOnCardsChange && (
              <div className="hidden lg:flex items-center gap-1.5">
                <DateToggle />
              </div>
            )}

            {/* Search - Hidden on mobile - INLINED to prevent focus loss */}
            <div className="hidden lg:flex items-center gap-1.5 ml-auto">
              <div className="relative w-48">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="block w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-md text-[10px] bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Search ID or description..."
                />
                {searchQuery && (
                  <button onClick={() => onSearchChange?.("")} className="absolute inset-y-0 right-0 pr-2 flex items-center">
                    <svg className="h-3 w-3 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Filter Button - Shows drawer with all hidden filters */}
            <div className="lg:hidden ml-auto">
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <button
                    className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
                  >
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
                      <label className="text-xs font-semibold text-gray-600 uppercase">Search</label>
                      <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                          <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => onSearchChange?.(e.target.value)}
                          className="block w-full pl-7 pr-2 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Search ID or description..."
                        />
                        {searchQuery && (
                          <button onClick={() => onSearchChange?.("")} className="absolute inset-y-0 right-0 pr-2 flex items-center">
                            <svg className="h-3 w-3 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Columns */}
                    {(viewMode === "bucket" || viewMode === "user") && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Columns</label>
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
                        <label className="text-xs font-semibold text-gray-600 uppercase">Layout</label>
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

                    {/* Sort */}
                    {(viewMode === "bucket" || viewMode === "user") && onSortFieldChange && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Sort By</label>
                        <div className="flex gap-2">
                          <select
                            value={sortField}
                            onChange={(e) =>
                              onSortFieldChange(e.target.value as DateFieldKey)
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
                            onClick={() => onSortAscendingChange?.(!sortAscending)}
                            className="px-3 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            {sortAscending ? "↑ Oldest" : "↓ Newest"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dates Toggle */}
                    {(viewMode === "bucket" || viewMode === "user") && onShowDateOnCardsChange && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-600 uppercase">Display</label>
                        <button
                          onClick={() => onShowDateOnCardsChange(!showDateOnCards)}
                          className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                            showDateOnCards
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          📅 Show Dates on Cards
                        </button>
                      </div>
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

