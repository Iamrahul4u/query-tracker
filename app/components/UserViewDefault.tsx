import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";

interface UserViewDefaultProps {
  sortedUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}

/**
 * Default View for User View (Kanban-style)
 * - Each user column has fixed height with independent scroll
 * - Scrolling in one column doesn't affect others
 */
export function UserViewDefault({
  sortedUsers,
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: UserViewDefaultProps) {
  // Dynamic grid classes
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
      {sortedUsers.map((displayUser) => (
        <UserColumn
          key={displayUser.email}
          displayUser={displayUser}
          queries={groupedQueries[displayUser.email] || []}
          users={users}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
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

/**
 * Individual user column with fixed height and independent scroll
 */
function UserColumn({
  displayUser,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  maxHeight,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  displayUser: { email: string; name: string; isKnown: boolean };
  queries: Query[];
  users: User[];
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  maxHeight: string;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}) {
  // Sort queries by Status (Bucket): A -> B -> C -> D -> E -> F -> G -> H
  const sortedQueries = [...queries].sort((a, b) => {
    const statusA = a.Status || "";
    const statusB = b.Status || "";
    const indexA = BUCKET_ORDER.indexOf(statusA);
    const indexB = BUCKET_ORDER.indexOf(statusB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
      style={{ maxHeight }}
    >
      {/* User Header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center flex-shrink-0">
        <span className="font-bold text-lg text-blue-900 truncate">
          {displayUser.name}
          {!displayUser.isKnown && displayUser.email !== "Unassigned" && (
            <span className="text-xs text-gray-500 ml-2">(unknown)</span>
          )}
        </span>
        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {sortedQueries.length}
        </span>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {sortedQueries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-2 space-y-3">
            {/* Group by Bucket/Status */}
            {BUCKET_ORDER.map((bucketKey) => {
              const bucketQueries = sortedQueries.filter((q) => {
                const status = (q.Status || "").trim();
                return status === bucketKey;
              });
              if (bucketQueries.length === 0) return null;

              const bucketConfig = BUCKETS[bucketKey];
              if (!bucketConfig) return null;

              return (
                <div
                  key={`${displayUser.email}-${bucketKey}`}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    borderColor: bucketConfig.color,
                    backgroundColor: `${bucketConfig.color}10`,
                  }}
                >
                  {/* Bucket Header */}
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    style={{ backgroundColor: bucketConfig.color }}
                  >
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      {bucketConfig.name}
                    </h4>
                    <span className="text-white text-xs font-bold px-2 py-0.5 rounded-full bg-white/30">
                      {bucketQueries.length}
                    </span>
                  </div>

                  {/* Bucket Content */}
                  <div className="p-2 space-y-1 bg-white">
                    {bucketQueries.map((query, idx) => (
                      <QueryCardCompact
                        key={`${displayUser.email}-${bucketKey}-${query["Query ID"]}-${idx}`}
                        query={query}
                        users={users}
                        bucketColor={bucketConfig.color}
                        onClick={() => onSelectQuery(query)}
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        showDate={showDateOnCards}
                        dateField={dateField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={detailView}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
