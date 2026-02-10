import { Query, User } from "../utils/sheets";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { BucketColumn } from "./BucketColumn";
import { DateFieldKey, splitAlreadyAllocated } from "../utils/queryFilters";

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
  segregatedBuckets?: string[];
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
  segregatedBuckets = [],
}: BucketViewDefaultProps) {
  // Filter visible buckets
  const visibleBuckets = BUCKET_ORDER.filter((b) => !hiddenBuckets.includes(b));

  // Expand segregated buckets into sub-buckets by type
  const expandedBuckets: Array<{
    key: string;
    bucketKey: string;
    typeName?: string;
  }> = [];

  visibleBuckets.forEach((bucketKey) => {
    if (segregatedBuckets.includes(bucketKey)) {
      // Segregate this bucket by query type
      const bucketQueries = groupedQueries[bucketKey] || [];
      const { alreadyAllocated, regular } = splitAlreadyAllocated(
        bucketQueries,
        bucketKey,
      );

      // Group regular queries by type
      const typeGroups: Record<string, Query[]> = {};
      regular.forEach((q) => {
        const qType = (q["Query Type"] || "").trim() || "Other";
        if (!typeGroups[qType]) typeGroups[qType] = [];
        typeGroups[qType].push(q);
      });

      // Add sub-buckets in QUERY_TYPE_ORDER
      QUERY_TYPE_ORDER.forEach((typeName) => {
        if (typeName === "Already Allocated") return; // Handle separately
        if (typeGroups[typeName] && typeGroups[typeName].length > 0) {
          expandedBuckets.push({
            key: `${bucketKey}-${typeName}`,
            bucketKey,
            typeName,
          });
        }
      });

      // Add "Other" types not in QUERY_TYPE_ORDER
      Object.keys(typeGroups).forEach((typeName) => {
        if (
          !QUERY_TYPE_ORDER.includes(typeName) &&
          typeGroups[typeName].length > 0
        ) {
          expandedBuckets.push({
            key: `${bucketKey}-${typeName}`,
            bucketKey,
            typeName,
          });
        }
      });

      // Add "Already Allocated" at the end (Bucket B only)
      if (alreadyAllocated.length > 0) {
        expandedBuckets.push({
          key: `${bucketKey}-Already Allocated`,
          bucketKey,
          typeName: "Already Allocated",
        });
      }
    } else {
      // Not segregated - show as single bucket
      expandedBuckets.push({
        key: bucketKey,
        bucketKey,
      });
    }
  });

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
      {expandedBuckets.map((bucket) => {
        const { key, bucketKey, typeName } = bucket;
        const config = BUCKETS[bucketKey];

        // Get queries for this bucket/sub-bucket
        let queries = groupedQueries[bucketKey] || [];

        // If segregated (has typeName), filter to only that type
        if (typeName) {
          if (typeName === "Already Allocated") {
            const { alreadyAllocated } = splitAlreadyAllocated(
              queries,
              bucketKey,
            );
            queries = alreadyAllocated;
          } else {
            queries = queries.filter((q) => {
              const qType = (q["Query Type"] || "").trim() || "Other";
              return qType === typeName;
            });
          }
        }

        // Sub-bucket name for segregated buckets
        const displayName = typeName
          ? `${config.name.split(") ")[0]}) ${config.name.split(") ")[1]} - ${typeName}`
          : config.name;

        return (
          <BucketColumn
            key={key}
            bucketKey={key}
            config={{ ...config, name: displayName }}
            queries={queries}
            users={users}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onLoadMore={typeName ? undefined : onLoadMore} // Only show Load More for non-segregated buckets
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
        );
      })}
    </div>
  );
}
