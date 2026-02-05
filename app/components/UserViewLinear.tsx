import { useRef, useEffect } from "react";
import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";

interface UserViewLinearProps {
  sortedUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}

/**
 * Linear View for User View (Synchronized Row Scrolling)
 * - Users arranged in rows based on column count
 * - Scrolling in any user column in a row scrolls all columns in that row
 * - Each row scrolls independently
 */
export function UserViewLinear({
  sortedUsers,
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: UserViewLinearProps) {
  // Split users into rows based on column count
  const rows: Array<Array<{ email: string; name: string; isKnown: boolean }>> =
    [];
  for (let i = 0; i < sortedUsers.length; i += columnCount) {
    rows.push(sortedUsers.slice(i, i + columnCount));
  }

  return (
    <div className="space-y-4">
      {rows.map((rowUsers, rowIndex) => (
        <SynchronizedUserRow
          key={`row-${rowIndex}`}
          rowUsers={rowUsers}
          groupedQueries={groupedQueries}
          users={users}
          columnCount={columnCount}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
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
 * A row of user columns with synchronized scrolling
 * All user columns in this row scroll together
 */
function SynchronizedUserRow({
  rowUsers,
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  rowUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: number;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
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

  // Smooth scroll animation with easing
  const animateScroll = () => {
    const diff = targetScrollRef.current - currentScrollRef.current;

    // If close enough, snap to target
    if (Math.abs(diff) < 0.5) {
      currentScrollRef.current = targetScrollRef.current;
      scrollRefs.current.forEach((element) => {
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll > 0) {
          element.scrollTop = Math.max(
            0,
            Math.min(maxScroll, currentScrollRef.current),
          );
        }
      });
      isSyncingRef.current = false;
      rafRef.current = null;
      return;
    }

    // Smooth interpolation (ease-out effect)
    currentScrollRef.current += diff * 0.15;

    scrollRefs.current.forEach((element) => {
      const maxScroll = element.scrollHeight - element.clientHeight;
      if (maxScroll > 0) {
        element.scrollTop = Math.max(
          0,
          Math.min(maxScroll, currentScrollRef.current),
        );
      }
    });

    rafRef.current = requestAnimationFrame(animateScroll);
  };

  /*
   * Synchronize scroll by adding same delta to all columns
   * Note: We use a lock here because we're handling 'wheel' events, which don't trigger recursively
   * (unlike 'scroll' events). Using a lock avoids main-thread jank and ensures smooth animation.
   */
  const syncScroll = (deltaY: number) => {
    // Get current scroll position from first element
    const firstElement = scrollRefs.current.values().next().value;
    if (firstElement && currentScrollRef.current === 0) {
      currentScrollRef.current = firstElement.scrollTop;
      targetScrollRef.current = firstElement.scrollTop;
    }

    // Update target scroll position
    targetScrollRef.current += deltaY;

    // Calculate max scroll across ALL columns (not just the first one)
    let maxScroll = 0;
    scrollRefs.current.forEach((element) => {
      const elementMax = element.scrollHeight - element.clientHeight;
      if (elementMax > maxScroll) maxScroll = elementMax;
    });

    // Clamp target to valid range
    targetScrollRef.current = Math.max(
      0,
      Math.min(maxScroll, targetScrollRef.current),
    );

    // Start animation if not already running
    if (!isSyncingRef.current) {
      isSyncingRef.current = true;
      rafRef.current = requestAnimationFrame(animateScroll);
    }
  };

  // Handle wheel events for synchronized scrolling
  useEffect(() => {
    const rowElement = rowRef.current;
    if (!rowElement) return;

    const handleWheel = (e: WheelEvent) => {
      let canScrollDown = false;
      let canScrollUp = false;

      scrollRefs.current.forEach((element) => {
        const maxScroll = element.scrollHeight - element.clientHeight;
        const currentScroll = element.scrollTop;

        if (currentScroll < maxScroll - 1) {
          canScrollDown = true;
        }
        if (currentScroll > 1) {
          canScrollUp = true;
        }
      });

      const shouldPreventDefault =
        (e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp);

      if (shouldPreventDefault) {
        e.preventDefault();
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
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
  }

  return (
    <div ref={rowRef} className={`grid gap-4 ${gridClass}`}>
      {rowUsers.map((displayUser) => (
        <UserColumnWithSync
          key={displayUser.email}
          displayUser={displayUser}
          queries={groupedQueries[displayUser.email] || []}
          users={users}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
          scrollRef={(el) => {
            if (el) {
              scrollRefs.current.set(displayUser.email, el);
            } else {
              scrollRefs.current.delete(displayUser.email);
            }
          }}
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
 * User column with scroll synchronization support
 * Matches the styling of UserViewDefault with color-coded type sections
 */
function UserColumnWithSync({
  displayUser,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  scrollRef,
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
  scrollRef: (el: HTMLDivElement | null) => void;
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
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100 h-[calc(100vh-220px)]">
      {/* User Header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-lg text-blue-900 truncate">
          {displayUser.name}
          {!displayUser.isKnown && displayUser.email !== "Unassigned" && (
            <span className="text-xs text-gray-500 ml-2">(unknown)</span>
          )}
        </span>
        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
          {sortedQueries.length}
        </span>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50">
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
