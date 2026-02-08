import { useRef, useEffect, useState } from "react";
import { Query, User } from "../utils/sheets";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";
import { ExpandedBucketModal } from "./ExpandedBucketModal";
import { useQueryStore } from "../stores/queryStore";

interface BucketViewLinearProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onLoadMore?: (bucketKey: string) => void;
  extendedDays?: Record<string, number>;
  loadingBuckets?: Set<string>;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  hiddenBuckets?: string[];
}

/**
 * Linear View (Synchronized Row Scrolling)
 * - Buckets arranged in rows based on column count
 * - Scrolling in any bucket in a row scrolls all buckets in that row
 * - Each row scrolls independently
 * - Fixed height buckets with synchronized scroll behavior
 * - Page scroll prevented until all buckets in row reach scroll end
 */
export function BucketViewLinear({
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onLoadMore,
  extendedDays = {},
  loadingBuckets = new Set(),
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  hiddenBuckets = [],
}: BucketViewLinearProps) {
  // Filter visible buckets and split into rows based on column count
  const visibleBuckets = BUCKET_ORDER.filter((b) => !hiddenBuckets.includes(b));
  const rows: string[][] = [];
  for (let i = 0; i < visibleBuckets.length; i += columnCount) {
    rows.push(visibleBuckets.slice(i, i + columnCount));
  }

  return (
    <div className="space-y-4">
      {rows.map((rowBuckets, rowIndex) => (
        <SynchronizedRow
          key={`row-${rowIndex}`}
          buckets={rowBuckets}
          groupedQueries={groupedQueries}
          users={users}
          columnCount={columnCount}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
          onApproveDelete={onApproveDelete}
          onRejectDelete={onRejectDelete}
          onLoadMore={onLoadMore}
          extendedDays={extendedDays}
          loadingBuckets={loadingBuckets}
          isFilterExpanded={isFilterExpanded}
          showDateOnCards={showDateOnCards}
          dateField={dateField}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          detailView={detailView}
        />
      ))}
    </div>
  );
}

/**
 * A row of buckets with synchronized scrolling
 * All buckets in this row scroll together
 * Prevents page scroll until all buckets reach their scroll limits
 */
function SynchronizedRow({
  buckets,
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onLoadMore,
  extendedDays = {},
  loadingBuckets = new Set(),
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  buckets: string[];
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: number;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onLoadMore?: (bucketKey: string) => void;
  extendedDays?: Record<string, number>;
  loadingBuckets?: Set<string>;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}) {
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSyncingRef = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const targetScrollRef = useRef<number>(0);
  const currentScrollRef = useRef<number>(0);

  // Smooth scroll animation with easing - applies to each bucket independently
  const animateScroll = () => {
    const diff = targetScrollRef.current - currentScrollRef.current;

    // If close enough, snap to target
    if (Math.abs(diff) < 0.5) {
      currentScrollRef.current = targetScrollRef.current;
      isSyncingRef.current = false;
      rafRef.current = null;
      return;
    }

    // Smooth interpolation (ease-out effect)
    const delta = diff * 0.15;
    currentScrollRef.current += delta;

    // Apply the delta to each scrollable bucket independently
    scrollRefs.current.forEach((element) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      // Only scroll elements that have scrollable content
      if (maxScroll > 5) {
        const newScrollTop = element.scrollTop + delta;
        element.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
      }
    });

    rafRef.current = requestAnimationFrame(animateScroll);
  };

  // Synchronize scroll by adding same delta to all buckets
  const syncScroll = (deltaY: number) => {
    // Update target scroll position
    targetScrollRef.current += deltaY;

    // Start animation if not already running
    if (!isSyncingRef.current) {
      isSyncingRef.current = true;
      currentScrollRef.current = 0; // Reset for delta calculation
      targetScrollRef.current = deltaY;
      rafRef.current = requestAnimationFrame(animateScroll);
    }
  };

  // Handle wheel events for synchronized scrolling
  useEffect(() => {
    const rowElement = rowRef.current;
    if (!rowElement) return;

    const handleWheel = (e: WheelEvent) => {
      // Check which buckets have scrollable content
      const scrollableElements: HTMLDivElement[] = [];
      let canScrollDown = false;
      let canScrollUp = false;

      scrollRefs.current.forEach((element) => {
        const maxScroll = element.scrollHeight - element.clientHeight;

        // Only consider elements that have scrollable content (height > container)
        if (maxScroll > 5) {
          scrollableElements.push(element);
          const currentScroll = element.scrollTop;

          // Can scroll down if not at bottom (with 1px tolerance)
          if (currentScroll < maxScroll - 1) {
            canScrollDown = true;
          }
          // Can scroll up if not at top (with 1px tolerance)
          if (currentScroll > 1) {
            canScrollUp = true;
          }
        }
      });

      // Only prevent default and sync scroll if:
      // 1. There are scrollable elements
      // 2. At least one can scroll in the requested direction
      const shouldPreventDefault =
        scrollableElements.length > 0 &&
        ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp));

      if (shouldPreventDefault) {
        e.preventDefault();
        // Apply the same scroll delta only to scrollable buckets
        syncScroll(e.deltaY);
      }
    };

    rowElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      rowElement.removeEventListener("wheel", handleWheel);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  let gridClass = "";
  if (columnCount === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2";
  } else if (columnCount === 3) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (columnCount === 4) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  }

  return (
    <div ref={rowRef} className={`grid gap-4 ${gridClass}`}>
      {buckets.map((bucketKey) => (
        <BucketColumnWithSync
          key={bucketKey}
          bucketKey={bucketKey}
          config={BUCKETS[bucketKey]}
          queries={groupedQueries[bucketKey] || []}
          users={users}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
          onApproveDelete={onApproveDelete}
          onRejectDelete={onRejectDelete}
          onLoadMore={onLoadMore}
          extendedDays={extendedDays[bucketKey] || 3}
          isLoading={loadingBuckets.has(bucketKey)}
          scrollRef={(el) => {
            if (el) {
              scrollRefs.current.set(bucketKey, el);
            } else {
              scrollRefs.current.delete(bucketKey);
            }
          }}
          isFilterExpanded={isFilterExpanded}
          showDateOnCards={showDateOnCards}
          dateField={BUCKETS[bucketKey].defaultSortField as DateFieldKey}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          detailView={detailView}
        />
      ))}
    </div>
  );
}

/**
 * Bucket column with scroll synchronization support
 * Fixed height with internal scrolling
 * Matches the styling of BucketColumn with color-coded type sections
 */
function BucketColumnWithSync({
  bucketKey,
  config,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onLoadMore,
  extendedDays = 3,
  isLoading = false,
  scrollRef,
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  bucketKey: string;
  config: any;
  queries: Query[];
  users: User[];
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onLoadMore?: (bucketKey: string) => void;
  extendedDays?: number;
  isLoading?: boolean;
  scrollRef: (el: HTMLDivElement | null) => void;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}) {
  // Use global modal state from store
  const { expandedModal, openExpandedModal, closeExpandedModal } =
    useQueryStore();
  const isExpanded =
    expandedModal?.type === "bucket" && expandedModal?.id === bucketKey;

  // Color coding for query types - matches BucketColumn
  const typeColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    "SEO Query": {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
    },
    New: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
    },
    Ongoing: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
    },
    "On Hold": {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
    },
    Other: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
  };

  // Always use 90vh height
  const bucketHeight = "h-[90vh]";

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100 ${bucketHeight}`}
    >
      {/* Bucket Header */}
      <div
        className="px-3 py-2 text-white flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: config.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-3xl truncate">
            {config.name.split(") ")[0]})
          </span>
          <span className="font-medium text-base text-white/90 truncate ml-1 pt-2">
            {config.name.split(") ")[1]}
          </span>
        </div>
        {/* Clickable count badge to open expanded view */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openExpandedModal("bucket", bucketKey);
          }}
          className="bg-white/20 px-3 py-1 rounded-full text-base font-bold ml-2 flex-shrink-0 hover:bg-white/40 hover:scale-110 transition-all cursor-pointer"
          title="Click to expand view"
        >
          {queries.length}
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50 flex flex-col scrollbar-thin"
      >
        {queries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-1.5 space-y-2 flex-1">
            {/* Group by Query Type: SEO Query -> New -> Ongoing -> On Hold */}
            {QUERY_TYPE_ORDER.map((groupName) => {
              const typeQueries = queries.filter((q) => {
                const qType = (q["Query Type"] || "").trim();
                return qType === groupName;
              });
              if (typeQueries.length === 0) return null;

              const colors = typeColors[groupName];

              return (
                <div
                  key={`${bucketKey}-${groupName}`}
                  className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}
                >
                  {/* Type Header */}
                  <div
                    className={`flex items-center justify-between px-2 py-1 ${colors.bg}`}
                  >
                    <h4
                      className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}
                    >
                      {groupName}
                    </h4>
                    <span
                      className={`${colors.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                    >
                      {typeQueries.length}
                    </span>
                  </div>

                  {/* Type Content */}
                  <div className="p-1 space-y-0.5 bg-white">
                    {typeQueries.map((query, idx) => (
                      <QueryCardCompact
                        key={`${bucketKey}-${groupName}-${query["Query ID"]}-${idx}`}
                        query={query}
                        users={users}
                        bucketColor={config.color}
                        onClick={() => onSelectQuery(query)}
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        onApproveDelete={onApproveDelete}
                        onRejectDelete={onRejectDelete}
                        showDate={showDateOnCards}
                        dateField={config.defaultSortField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={detailView}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Other types (fallback for any unknown types) */}
            {queries.filter((q) => {
              const qType = (q["Query Type"] || "").trim();
              return !QUERY_TYPE_ORDER.includes(qType);
            }).length > 0 && (
              <div
                className={`rounded-lg border ${typeColors.Other.border} ${typeColors.Other.bg} overflow-hidden`}
              >
                {/* Type Header */}
                <div
                  className={`flex items-center justify-between px-2 py-1 ${typeColors.Other.bg}`}
                >
                  <h4
                    className={`text-xs font-bold ${typeColors.Other.text} uppercase tracking-wider`}
                  >
                    Other
                  </h4>
                  <span
                    className={`${typeColors.Other.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                  >
                    {
                      queries.filter((q) => {
                        const qType = (q["Query Type"] || "").trim();
                        return !QUERY_TYPE_ORDER.includes(qType);
                      }).length
                    }
                  </span>
                </div>

                {/* Type Content */}
                <div className="p-2 space-y-1 bg-white">
                  {queries
                    .filter((q) => {
                      const qType = (q["Query Type"] || "").trim();
                      return !QUERY_TYPE_ORDER.includes(qType);
                    })
                    .map((query, idx) => (
                      <QueryCardCompact
                        key={`${bucketKey}-other-${query["Query ID"]}-${idx}`}
                        query={query}
                        users={users}
                        bucketColor={config.color}
                        onClick={() => onSelectQuery(query)}
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        onApproveDelete={onApproveDelete}
                        onRejectDelete={onRejectDelete}
                        showDate={showDateOnCards}
                        dateField={config.defaultSortField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={detailView}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Load +7 Days Button for F, G, H buckets */}
        {config.evaporateAfterDays && onLoadMore && (
          <div className="p-2 border-t border-gray-200 flex-shrink-0">
            {extendedDays >= 30 ? (
              <div className="w-full py-2 px-3 text-xs font-medium text-gray-400 text-center">
                No more results found
              </div>
            ) : (
              <button
                onClick={() => onLoadMore(bucketKey)}
                disabled={isLoading}
                className="w-full py-2 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Load +7 Days"
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expanded Bucket Modal */}
      <ExpandedBucketModal
        isOpen={isExpanded}
        onClose={closeExpandedModal}
        bucketKey={bucketKey}
        config={config}
        queries={queries}
        users={users}
        onSelectQuery={(q) => {
          closeExpandedModal();
          onSelectQuery(q);
        }}
        onAssignQuery={onAssignQuery}
        onEditQuery={onEditQuery}
        onApproveDelete={onApproveDelete}
        onRejectDelete={onRejectDelete}
        currentUserRole={currentUserRole}
        currentUserEmail={currentUserEmail}
        detailView={detailView}
      />
    </div>
  );
}
