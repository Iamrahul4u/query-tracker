import { useRef, useEffect, useState } from "react";
import { Query, User } from "../utils/sheets";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import {
  DateFieldKey,
  groupQueriesByPrimaryAndSecondary,
  getEffectiveQueryType,
} from "../utils/queryFilters";
import { UserExpandModal } from "./UserExpandModal";
import { useQueryStore } from "../stores/queryStore";

interface UserViewLinearProps {
  sortedUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
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
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  groupBy = "bucket",
}: UserViewLinearProps) {
  // Use global modal state from store
  const { expandedModal, openExpandedModal, closeExpandedModal } =
    useQueryStore();
  const expandedUser =
    expandedModal?.type === "user"
      ? {
          email: expandedModal.id,
          name:
            sortedUsers.find((u) => u.email === expandedModal.id)?.name ||
            expandedModal.id,
        }
      : null;

  // Split users into rows based on column count
  const rows: Array<Array<{ email: string; name: string; isKnown: boolean }>> =
    [];
  for (let i = 0; i < sortedUsers.length; i += columnCount) {
    rows.push(sortedUsers.slice(i, i + columnCount));
  }

  return (
    <>
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
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            onExpandUser={(user) => openExpandedModal("user", user.email)}
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
          onClose={closeExpandedModal}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onAssignCallQuery={onAssignCallQuery}
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
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onExpandUser,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  groupBy = "bucket",
}: {
  rowUsers: Array<{ email: string; name: string; isKnown: boolean }>;
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: number;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onExpandUser?: (user: { email: string; name: string }) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
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
    gridClass = "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
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
          onAssignCallQuery={onAssignCallQuery}
          onEditQuery={onEditQuery}
          onApproveDelete={onApproveDelete}
          onRejectDelete={onRejectDelete}
          onExpandUser={() =>
            onExpandUser?.({ email: displayUser.email, name: displayUser.name })
          }
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
          groupBy={groupBy}
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
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onExpandUser,
  scrollRef,
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
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onExpandUser?: () => void;
  scrollRef: (el: HTMLDivElement | null) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
}) {
  // Create nested grouping based on groupBy mode
  const nestedGroups = groupQueriesByPrimaryAndSecondary(
    queries,
    groupBy === "bucket" ? "bucket" : "type",
    groupBy === "bucket" ? "type" : "bucket",
  );

  // Color coding for query types
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
    "Already Allocated": {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
    },
    Other: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
  };

  return (
    <div
      className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100"
      style={{ height: "var(--bucket-height-expanded)" }}
    >
      {/* User Header */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-lg text-blue-900 truncate">
          {displayUser.name}
          {!displayUser.isKnown &&
            displayUser.email !== "Unassigned" &&
            displayUser.email !== "__BUCKET_A__" && (
              <span className="text-xs text-gray-500 ml-2">(unknown)</span>
            )}
        </span>
        <button
          onClick={onExpandUser}
          className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 hover:bg-blue-300 transition-colors cursor-pointer"
          title="Click to expand user's queries"
        >
          {queries.length}
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-gray-50 scrollbar-thin"
      >
        {queries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-1.5 space-y-2">
            {/* Nested grouping based on groupBy mode */}
            {groupBy === "bucket" ? (
              /* Primary: Bucket → Secondary: Type */
              <>
                {(displayUser.email === "__BUCKET_A__"
                  ? BUCKET_ORDER
                  : BUCKET_ORDER.filter((key) => key !== "A")
                ).map((bucketKey) => {
                  const typeGroups = nestedGroups[bucketKey];
                  if (!typeGroups || Object.keys(typeGroups).length === 0)
                    return null;

                  const bucketConfig = BUCKETS[bucketKey];
                  if (!bucketConfig) return null;

                  // Calculate total queries in this bucket
                  const totalQueries = Object.values(typeGroups).reduce(
                    (sum, queries) => sum + queries.length,
                    0,
                  );

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
                          {totalQueries}
                        </span>
                      </div>

                      {/* Type Sub-groups */}
                      <div className="p-1 space-y-1 bg-white">
                        {QUERY_TYPE_ORDER.map((typeName) => {
                          const typeQueries = typeGroups[typeName];
                          if (!typeQueries || typeQueries.length === 0)
                            return null;

                          const colors =
                            typeColors[typeName] || typeColors.Other;

                          return (
                            <div key={`${bucketKey}-${typeName}`}>
                              {/* Type Sub-header */}
                              <div
                                className={`flex items-center justify-between px-1.5 py-0.5 ${colors.bg} rounded`}
                              >
                                <span
                                  className={`text-[10px] font-semibold ${colors.text} uppercase`}
                                >
                                  {typeName}
                                </span>
                                <span
                                  className={`${colors.text} text-[9px] font-bold px-1 py-0.5 rounded bg-white/50`}
                                >
                                  {typeQueries.length}
                                </span>
                              </div>

                              {/* Queries */}
                              <div className="space-y-0.5 mt-0.5">
                                {typeQueries.map((query, idx) => (
                                  <QueryCardCompact
                                    key={`${displayUser.email}-${bucketKey}-${typeName}-${query["Query ID"]}-${idx}`}
                                    query={query}
                                    users={users}
                                    bucketColor={bucketConfig.color}
                                    onClick={() => onSelectQuery(query)}
                                    onAssign={onAssignQuery}
                                    onAssignCall={onAssignCallQuery}
                                    onEdit={onEditQuery}
                                    onApproveDelete={onApproveDelete}
                                    onRejectDelete={onRejectDelete}
                                    showDate={showDateOnCards}
                                    dateField={dateField}
                                    currentUserRole={currentUserRole}
                                    currentUserEmail={currentUserEmail}
                                    detailView={detailView}
                                    isUserView={true}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Other types (not in QUERY_TYPE_ORDER) */}
                        {Object.entries(typeGroups)
                          .filter(
                            ([typeName]) =>
                              !QUERY_TYPE_ORDER.includes(typeName),
                          )
                          .map(([typeName, typeQueries]) => {
                            const colors = typeColors.Other;

                            return (
                              <div key={`${bucketKey}-${typeName}`}>
                                {/* Type Sub-header */}
                                <div
                                  className={`flex items-center justify-between px-1.5 py-0.5 ${colors.bg} rounded`}
                                >
                                  <span
                                    className={`text-[10px] font-semibold ${colors.text} uppercase`}
                                  >
                                    {typeName}
                                  </span>
                                  <span
                                    className={`${colors.text} text-[9px] font-bold px-1 py-0.5 rounded bg-white/50`}
                                  >
                                    {typeQueries.length}
                                  </span>
                                </div>

                                {/* Queries */}
                                <div className="space-y-0.5 mt-0.5">
                                  {typeQueries.map((query, idx) => (
                                    <QueryCardCompact
                                      key={`${displayUser.email}-${bucketKey}-${typeName}-${query["Query ID"]}-${idx}`}
                                      query={query}
                                      users={users}
                                      bucketColor={bucketConfig.color}
                                      onClick={() => onSelectQuery(query)}
                                      onAssign={onAssignQuery}
                                      onAssignCall={onAssignCallQuery}
                                      onEdit={onEditQuery}
                                      onApproveDelete={onApproveDelete}
                                      onRejectDelete={onRejectDelete}
                                      showDate={showDateOnCards}
                                      dateField={dateField}
                                      currentUserRole={currentUserRole}
                                      currentUserEmail={currentUserEmail}
                                      detailView={detailView}
                                      isUserView={true}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              /* Primary: Type → Secondary: Bucket */
              <>
                {QUERY_TYPE_ORDER.map((typeName) => {
                  const bucketGroups = nestedGroups[typeName];
                  if (!bucketGroups || Object.keys(bucketGroups).length === 0)
                    return null;

                  const colors = typeColors[typeName] || typeColors.Other;

                  // Calculate total queries in this type
                  const totalQueries = Object.values(bucketGroups).reduce(
                    (sum, queries) => sum + queries.length,
                    0,
                  );

                  return (
                    <div
                      key={`${displayUser.email}-${typeName}`}
                      className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}
                    >
                      {/* Type Header */}
                      <div
                        className={`flex items-center justify-between px-2 py-1 ${colors.bg}`}
                      >
                        <h4
                          className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}
                        >
                          {typeName}
                        </h4>
                        <span
                          className={`${colors.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                        >
                          {totalQueries}
                        </span>
                      </div>

                      {/* Bucket Sub-groups */}
                      <div className="p-1 space-y-1 bg-white">
                        {(displayUser.email === "__BUCKET_A__"
                          ? BUCKET_ORDER
                          : BUCKET_ORDER.filter((key) => key !== "A")
                        ).map((bucketKey) => {
                          const bucketQueries = bucketGroups[bucketKey];
                          if (!bucketQueries || bucketQueries.length === 0)
                            return null;

                          const bucketConfig = BUCKETS[bucketKey];
                          if (!bucketConfig) return null;

                          return (
                            <div key={`${typeName}-${bucketKey}`}>
                              {/* Bucket Sub-header */}
                              <div
                                className="flex items-center justify-between px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${bucketConfig.color}20`,
                                }}
                              >
                                <span
                                  className="text-[10px] font-semibold uppercase"
                                  style={{ color: bucketConfig.color }}
                                >
                                  {bucketConfig.name}
                                </span>
                                <span
                                  className="text-[9px] font-bold px-1 py-0.5 rounded bg-white/50"
                                  style={{ color: bucketConfig.color }}
                                >
                                  {bucketQueries.length}
                                </span>
                              </div>

                              {/* Queries */}
                              <div className="space-y-0.5 mt-0.5">
                                {bucketQueries.map((query, idx) => (
                                  <QueryCardCompact
                                    key={`${displayUser.email}-${typeName}-${bucketKey}-${query["Query ID"]}-${idx}`}
                                    query={query}
                                    users={users}
                                    bucketColor={bucketConfig.color}
                                    onClick={() => onSelectQuery(query)}
                                    onAssign={onAssignQuery}
                                    onAssignCall={onAssignCallQuery}
                                    onEdit={onEditQuery}
                                    onApproveDelete={onApproveDelete}
                                    onRejectDelete={onRejectDelete}
                                    showDate={showDateOnCards}
                                    dateField={dateField}
                                    currentUserRole={currentUserRole}
                                    currentUserEmail={currentUserEmail}
                                    detailView={detailView}
                                    isUserView={true}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Other types (not in QUERY_TYPE_ORDER) */}
                {Object.entries(nestedGroups)
                  .filter(([typeName]) => !QUERY_TYPE_ORDER.includes(typeName))
                  .map(([typeName, bucketGroups]) => {
                    const colors = typeColors.Other;

                    // Calculate total queries in this type
                    const totalQueries = Object.values(bucketGroups).reduce(
                      (sum, queries) => sum + queries.length,
                      0,
                    );

                    return (
                      <div
                        key={`${displayUser.email}-${typeName}`}
                        className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}
                      >
                        {/* Type Header */}
                        <div
                          className={`flex items-center justify-between px-2 py-1 ${colors.bg}`}
                        >
                          <h4
                            className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}
                          >
                            {typeName}
                          </h4>
                          <span
                            className={`${colors.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                          >
                            {totalQueries}
                          </span>
                        </div>

                        {/* Bucket Sub-groups */}
                        <div className="p-1 space-y-1 bg-white">
                          {(displayUser.email === "__BUCKET_A__"
                            ? BUCKET_ORDER
                            : BUCKET_ORDER.filter((key) => key !== "A")
                          ).map((bucketKey) => {
                            const bucketQueries = bucketGroups[bucketKey];
                            if (!bucketQueries || bucketQueries.length === 0)
                              return null;

                            const bucketConfig = BUCKETS[bucketKey];
                            if (!bucketConfig) return null;

                            return (
                              <div key={`${typeName}-${bucketKey}`}>
                                {/* Bucket Sub-header */}
                                <div
                                  className="flex items-center justify-between px-1.5 py-0.5 rounded"
                                  style={{
                                    backgroundColor: `${bucketConfig.color}20`,
                                  }}
                                >
                                  <span
                                    className="text-[10px] font-semibold uppercase"
                                    style={{ color: bucketConfig.color }}
                                  >
                                    {bucketConfig.name}
                                  </span>
                                  <span
                                    className="text-[9px] font-bold px-1 py-0.5 rounded bg-white/50"
                                    style={{ color: bucketConfig.color }}
                                  >
                                    {bucketQueries.length}
                                  </span>
                                </div>

                                {/* Queries */}
                                <div className="space-y-0.5 mt-0.5">
                                  {bucketQueries.map((query, idx) => (
                                    <QueryCardCompact
                                      key={`${displayUser.email}-${typeName}-${bucketKey}-${query["Query ID"]}-${idx}`}
                                      query={query}
                                      users={users}
                                      bucketColor={bucketConfig.color}
                                      onClick={() => onSelectQuery(query)}
                                      onAssign={onAssignQuery}
                                      onAssignCall={onAssignCallQuery}
                                      onEdit={onEditQuery}
                                      onApproveDelete={onApproveDelete}
                                      onRejectDelete={onRejectDelete}
                                      showDate={showDateOnCards}
                                      dateField={dateField}
                                      currentUserRole={currentUserRole}
                                      currentUserEmail={currentUserEmail}
                                      detailView={detailView}
                                      isUserView={true}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
