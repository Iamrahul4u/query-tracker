import { Query, User } from "../utils/sheets";
import { BUCKETS } from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";

interface UserViewProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  currentUser: User | null;
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
}

export function UserView({
  groupedQueries,
  users,
  currentUser,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
}: UserViewProps) {
  const currentEmail = currentUser?.Email?.toLowerCase();

  // Sort users: Current user first, then alphabetical
  const sortedUsers = [...users].sort((a, b) => {
    if (a.Email.toLowerCase() === currentEmail) return -1;
    if (b.Email.toLowerCase() === currentEmail) return 1;
    return a.Name.localeCompare(b.Name);
  });

  // Dynamic grid classes based on column count
  let gridClass = "";
  if (columnCount === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2";
  } else if (columnCount === 3) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  } else if (columnCount === 4) {
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {sortedUsers.map((user) => {
        // Case-insensitive match
        const matchingKey = Object.keys(groupedQueries).find(
          (k) => k.toLowerCase() === user.Email.toLowerCase(),
        );
        const queries = matchingKey ? groupedQueries[matchingKey] : [];

        if (queries.length === 0) return null;

        return (
          <div
            key={user.Email}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col"
          >
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <span className="font-bold text-lg text-blue-900 truncate">
                {user.Name}
              </span>
              <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {queries.length}
              </span>
            </div>
            <div className="p-2 space-y-2">
              {queries.map((q, idx) => (
                <QueryCardCompact
                  key={`${user.Email}-${q["Query ID"]}-${idx}`}
                  query={q}
                  users={users}
                  bucketColor={BUCKETS[q.Status]?.color || "#gray"}
                  onClick={() => onSelectQuery(q)}
                  onAssign={onAssignQuery}
                  onEdit={onEditQuery}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
