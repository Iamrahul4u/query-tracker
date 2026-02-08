import { useState } from "react";
import { Query, User } from "../utils/sheets";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";
import { UserExpandModal } from "./UserExpandModal";

interface UserViewDefaultProps {
  sortedUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
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
  onApproveDelete,
  onRejectDelete,
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  groupBy = "bucket",
}: UserViewDefaultProps) {
  // State for expanded user modal
  const [expandedUser, setExpandedUser] = useState<{
    email: string;
    name: string;
  } | null>(null);

  // Dynamic grid classes
  // Changed 4-column to use lg breakpoint (1024px) instead of xl (1280px) for 100% zoom
  let gridClass = "";
  if (columnCount === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2";
  } else if (columnCount === 3) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (columnCount === 4) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
  }

  // Always use 90vh height for all views
  const maxHeight = "90vh";

  return (
    <>
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
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onExpandUser={() =>
              setExpandedUser({
                email: displayUser.email,
                name: displayUser.name,
              })
            }
            maxHeight={maxHeight}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUserRole}
            currentUserEmail={currentUserEmail}
            detailView={detailView}
            groupBy={groupBy}
          />
        ))}
      </div>

      {/* User Expand Modal */}
      {expandedUser && (
        <UserExpandModal
          user={expandedUser}
          queries={groupedQueries[expandedUser.email] || []}
          users={users}
          onClose={() => setExpandedUser(null)}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
          onApproveDelete={onApproveDelete}
          onRejectDelete={onRejectDelete}
          currentUserRole={currentUserRole}
          currentUserEmail={currentUserEmail}
          groupBy={groupBy}
        />
      )}
    </>
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
  onApproveDelete,
  onRejectDelete,
  onExpandUser,
  maxHeight,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  groupBy = "bucket",
}: {
  displayUser: { email: string; name: string; isKnown: boolean };
  queries: Query[];
  users: User[];
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onExpandUser?: () => void;
  maxHeight: string;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
}) {
  // Sort queries by Status (Bucket): A -> B -> C -> D -> E -> F -> G -> H
  const sortedQueries = [...queries].sort((a, b) => {
    const statusA = a.Status || "";
    const statusB = b.Status || "";
    const indexA = BUCKET_ORDER.indexOf(statusA);
    const indexB = BUCKET_ORDER.indexOf(statusB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  // Color coding for query types (used when groupBy === "type")
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
        <button
          onClick={onExpandUser}
          className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full hover:bg-blue-300 transition-colors cursor-pointer"
          title="Click to expand user's queries"
        >
          {sortedQueries.length}
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin">
        {sortedQueries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-1.5 space-y-2">
            {/* Conditional rendering based on groupBy */}
            {groupBy === "bucket" ? (
              /* Group by Bucket/Status - Skip Bucket A (Pending/Unassigned) */
              <>
                {BUCKET_ORDER.filter((key) => key !== "A").map((bucketKey) => {
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
                        className="flex items-center justify-between px-2 py-1"
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
                      <div className="p-1 space-y-0.5 bg-white">
                        {bucketQueries.map((query, idx) => (
                          <QueryCardCompact
                            key={`${displayUser.email}-${bucketKey}-${query["Query ID"]}-${idx}`}
                            query={query}
                            users={users}
                            bucketColor={bucketConfig.color}
                            onClick={() => onSelectQuery(query)}
                            onAssign={onAssignQuery}
                            onEdit={onEditQuery}
                            onApproveDelete={onApproveDelete}
                            onRejectDelete={onRejectDelete}
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
              </>
            ) : (
              /* Group by Query Type */
              <>
                {QUERY_TYPE_ORDER.map((groupName) => {
                  const typeQueries = sortedQueries.filter((q) => {
                    const qType = (q["Query Type"] || "").trim();
                    return qType === groupName;
                  });
                  if (typeQueries.length === 0) return null;

                  const colors = typeColors[groupName] || typeColors.Other;

                  return (
                    <div
                      key={`${displayUser.email}-${groupName}`}
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
                            key={`${displayUser.email}-${groupName}-${query["Query ID"]}-${idx}`}
                            query={query}
                            users={users}
                            bucketColor={
                              BUCKETS[query.Status]?.color || "#gray"
                            }
                            onClick={() => onSelectQuery(query)}
                            onAssign={onAssignQuery}
                            onEdit={onEditQuery}
                            onApproveDelete={onApproveDelete}
                            onRejectDelete={onRejectDelete}
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

                {/* Other types (fallback for any unknown types) */}
                {sortedQueries.filter((q) => {
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
                          sortedQueries.filter((q) => {
                            const qType = (q["Query Type"] || "").trim();
                            return !QUERY_TYPE_ORDER.includes(qType);
                          }).length
                        }
                      </span>
                    </div>

                    {/* Type Content */}
                    <div className="p-2 space-y-1 bg-white">
                      {sortedQueries
                        .filter((q) => {
                          const qType = (q["Query Type"] || "").trim();
                          return !QUERY_TYPE_ORDER.includes(qType);
                        })
                        .map((query, idx) => (
                          <QueryCardCompact
                            key={`${displayUser.email}-other-${query["Query ID"]}-${idx}`}
                            query={query}
                            users={users}
                            bucketColor={
                              BUCKETS[query.Status]?.color || "#gray"
                            }
                            onClick={() => onSelectQuery(query)}
                            onAssign={onAssignQuery}
                            onEdit={onEditQuery}
                            onApproveDelete={onApproveDelete}
                            onRejectDelete={onRejectDelete}
                            showDate={showDateOnCards}
                            dateField={dateField}
                            currentUserRole={currentUserRole}
                            currentUserEmail={currentUserEmail}
                            detailView={detailView}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
