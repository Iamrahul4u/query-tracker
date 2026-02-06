import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { BucketColumn } from "./BucketColumn";
import { DateFieldKey } from "../utils/queryFilters";

interface BucketViewDefaultProps {
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
 * Default View (Kanban-style)
 * - Each bucket has fixed height with independent scroll
 * - Scrolling in one bucket doesn't affect others
 * - Fixed height ensures buckets don't take full viewport
 */
export function BucketViewDefault({
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
}: BucketViewDefaultProps) {
  // Filter visible buckets
  const visibleBuckets = BUCKET_ORDER.filter((b) => !hiddenBuckets.includes(b));
  
  // Dynamic grid classes - simplified for better responsiveness
  // Changed 4-column to use lg breakpoint (1024px) instead of xl (1280px) for 100% zoom
  let gridClass = "";
  if (columnCount === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2";
  } else if (columnCount === 3) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (columnCount === 4) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  }

  // Dynamic max height based on filter bar state
  // Using CSS variables from globals.css for consistent styling at 100% zoom
  const maxHeight = isFilterExpanded
    ? "var(--bucket-height-expanded)"
    : "var(--bucket-height-collapsed)";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {visibleBuckets.map((bucketKey) => (
        <BucketColumn
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
          disableScroll={false}
          maxHeight={maxHeight}
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
