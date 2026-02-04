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
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
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
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: BucketViewDefaultProps) {
  // Dynamic grid classes - simplified for better responsiveness
  let gridClass = "";
  if (columnCount === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2";
  } else if (columnCount === 3) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (columnCount === 4) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }

  // Dynamic max height based on filter bar state
  const maxHeight = isFilterExpanded
    ? "calc(100vh - 220px)"
    : "calc(100vh - 160px)";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {BUCKET_ORDER.map((bucketKey) => (
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
          disableScroll={false}
          maxHeight={maxHeight}
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

