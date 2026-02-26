import { useState } from "react";
import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { BucketColumn } from "./BucketColumn";
import { BucketViewDefault } from "./BucketViewDefault";
import { BucketViewLinear } from "./BucketViewLinear";
import { DateFieldKey } from "../utils/queryFilters";

interface BucketViewProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  viewMode: "default" | "linear";
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onLoadMore?: (bucketKey: string) => void;
  onAddQuery?: () => void;
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

export function BucketView({
  groupedQueries,
  users,
  columnCount,
  viewMode,
  onSelectQuery,
  onAssignQuery,
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onLoadMore,
  onAddQuery,
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
}: BucketViewProps) {
  // Filter visible buckets
  const visibleBuckets = BUCKET_ORDER.filter((b) => !hiddenBuckets.includes(b));
  const [activeTab, setActiveTab] = useState<string>(visibleBuckets[0] || "A");

  return (
    <>
      {/* Mobile Tab Navigation */}
      <div className="md:hidden overflow-x-auto pb-2 mb-2 px-2 flex gap-1.5 scrollbar-hide">
        {visibleBuckets.map((bucketKey) => (
          <button
            key={bucketKey}
            onClick={() => setActiveTab(bucketKey)}
            className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === bucketKey
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {BUCKETS[bucketKey].name.split(") ")[0]}){" "}
            {BUCKETS[bucketKey].name.split(") ")[1]} (
            {groupedQueries[bucketKey]?.length || 0})
          </button>
        ))}
      </div>

      {/* Desktop View - Default or Linear */}
      <div className="hidden md:block">
        {viewMode === "default" ? (
          <BucketViewDefault
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onLoadMore={onLoadMore}
            onAddQuery={onAddQuery}
            extendedDays={extendedDays}
            loadingBuckets={loadingBuckets}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            detailView={detailView}
            hiddenBuckets={hiddenBuckets}
            segregatedBuckets={segregatedBuckets}
          />
        ) : (
          <BucketViewLinear
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onLoadMore={onLoadMore}
            onAddQuery={onAddQuery}
            extendedDays={extendedDays}
            loadingBuckets={loadingBuckets}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            detailView={detailView}
            hiddenBuckets={hiddenBuckets}
            segregatedBuckets={segregatedBuckets}
          />
        )}
      </div>

      {/* Mobile Single Column View */}
      <div className="md:hidden space-y-4">
        {activeTab && (
          <BucketColumn
            key={activeTab}
            bucketKey={activeTab}
            config={BUCKETS[activeTab]}
            queries={groupedQueries[activeTab] || []}
            users={users}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onLoadMore={onLoadMore}
            onAddQuery={onAddQuery}
            extendedDays={extendedDays[activeTab] || 3}
            disableScroll={false}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            detailView={detailView}
          />
        )}
      </div>
    </>
  );
}
