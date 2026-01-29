import { Query, User } from "../utils/sheets";
import { BUCKETS, QUERY_TYPE_ORDER } from "../config/sheet-constants";
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
}) {
  // Color coding for query types - matches BucketColumn
  const typeColors: Record<string, { bg: string; text: string; border: string }> = {
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
    Other: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
  };

  // Sort queries by Query Type: SEO Query -> New -> Ongoing
  const sortedQueries = [...queries].sort((a, b) => {
    const typeA = (a["Query Type"] || "").trim();
    const typeB = (b["Query Type"] || "").trim();
    const indexA = QUERY_TYPE_ORDER.indexOf(typeA);
    const indexB = QUERY_TYPE_ORDER.indexOf(typeB);
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
            {/* Group by Query Type */}
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
                    className={`flex items-center justify-between px-3 py-2 ${colors.bg}`}
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
                  <div className="p-2 space-y-1 bg-white">
                    {typeQueries.map((query, idx) => (
                      <QueryCardCompact
                        key={`${displayUser.email}-${groupName}-${query["Query ID"]}-${idx}`}
                        query={query}
                        users={users}
                        bucketColor={BUCKETS[query.Status]?.color || "#gray"}
                        onClick={() => onSelectQuery(query)}
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        showDate={showDateOnCards}
                        dateField={dateField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
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
                  className={`flex items-center justify-between px-3 py-2 ${typeColors.Other.bg}`}
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
                        bucketColor={BUCKETS[query.Status]?.color || "#gray"}
                        onClick={() => onSelectQuery(query)}
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        showDate={showDateOnCards}
                        dateField={dateField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
