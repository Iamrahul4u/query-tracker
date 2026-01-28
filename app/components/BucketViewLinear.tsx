import { useRef, useEffect } from "react";
import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";

interface BucketViewLinearProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: 2 | 3 | 4;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
}

/**
 * Linear View (Synchronized Row Scrolling)
 * - Buckets arranged in rows based on column count
 * - Scrolling in any bucket in a row scrolls all buckets in that row
 * - Each row scrolls independently
 * - Fixed height buckets with synchronized scroll behavior
 * - Page scroll prevented until all buckets in row reach scroll end
 */
export function BucketViewLinear({
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
}: BucketViewLinearProps) {
  // Split buckets into rows based on column count
  const rows: string[][] = [];
  for (let i = 0; i < BUCKET_ORDER.length; i += columnCount) {
    rows.push(BUCKET_ORDER.slice(i, i + columnCount));
  }

  return (
    <div className="space-y-4">
      {rows.map((rowBuckets, rowIndex) => (
        <SynchronizedRow
          key={`row-${rowIndex}`}
          buckets={rowBuckets}
          groupedQueries={groupedQueries}
          users={users}
          columnCount={columnCount}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
        />
      ))}
    </div>
  );
}

/**
 * A row of buckets with synchronized scrolling
 * All buckets in this row scroll together
 * Prevents page scroll until all buckets reach their scroll limits
 */
function SynchronizedRow({
  buckets,
  groupedQueries,
  users,
  columnCount,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
}: {
  buckets: string[];
  groupedQueries: Record<string, Query[]>;
  users: User[];
  columnCount: number;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
}) {
  const scrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSyncingRef = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Synchronize scroll by adding same delta to all buckets
  const syncScroll = (deltaY: number) => {
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;

    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      scrollRefs.current.forEach((element) => {
        const maxScroll = element.scrollHeight - element.clientHeight;
        if (maxScroll > 0) {
          // Add the same delta to each bucket, but clamp to their individual limits
          const newScroll = Math.max(
            0,
            Math.min(maxScroll, element.scrollTop + deltaY),
          );
          element.scrollTop = newScroll;
        }
      });

      isSyncingRef.current = false;
      rafRef.current = null;
    });
  };

  // Handle wheel events for synchronized scrolling
  useEffect(() => {
    const rowElement = rowRef.current;
    if (!rowElement) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if ANY bucket can still scroll in the requested direction
      let canScrollDown = false;
      let canScrollUp = false;

      scrollRefs.current.forEach((element) => {
        const maxScroll = element.scrollHeight - element.clientHeight;
        const currentScroll = element.scrollTop;

        // Can scroll down if not at bottom (with 1px tolerance)
        if (currentScroll < maxScroll - 1) {
          canScrollDown = true;
        }
        // Can scroll up if not at top (with 1px tolerance)
        if (currentScroll > 1) {
          canScrollUp = true;
        }
      });

      // Check if we're trying to scroll in a direction where at least one bucket can scroll
      const shouldPreventDefault =
        (e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp);

      if (shouldPreventDefault) {
        e.preventDefault();
        // Apply the same scroll delta to all buckets
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
      {buckets.map((bucketKey) => (
        <BucketColumnWithSync
          key={bucketKey}
          bucketKey={bucketKey}
          config={BUCKETS[bucketKey]}
          queries={groupedQueries[bucketKey] || []}
          users={users}
          onSelectQuery={onSelectQuery}
          onAssignQuery={onAssignQuery}
          onEditQuery={onEditQuery}
          scrollRef={(el) => {
            if (el) {
              scrollRefs.current.set(bucketKey, el);
            } else {
              scrollRefs.current.delete(bucketKey);
            }
          }}
        />
      ))}
    </div>
  );
}

/**
 * Bucket column with scroll synchronization support
 * Fixed height with internal scrolling
 */
function BucketColumnWithSync({
  bucketKey,
  config,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  scrollRef,
}: {
  bucketKey: string;
  config: any;
  queries: Query[];
  users: User[];
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  scrollRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100 h-[calc(100vh-220px)]">
      {/* Bucket Header */}
      <div
        className="px-4 py-3 text-white flex items-center justify-between flex-shrink-0"
        style={{ backgroundColor: config.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-2xl truncate">
            {config.name.split(") ")[0]})
          </span>
          <span className="font-medium text-sm text-white/90 truncate ml-1 pt-1.5">
            {config.name.split(") ")[1]}
          </span>
        </div>
        <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-sm font-bold ml-2 flex-shrink-0">
          {queries.length}
        </span>
      </div>

      {/* Scrollable Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-gray-50">
        {queries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-2 space-y-3">
            {/* Group by Query Type: SEO Query -> New -> Ongoing */}
            {["SEO Query", "New", "Ongoing"].map((groupName) => {
              const typeQueries = queries.filter((q) => {
                const qType = (q["Query Type"] || "").trim();
                return qType === groupName;
              });
              if (typeQueries.length === 0) return null;

              return (
                <div key={`${bucketKey}-${groupName}`} className="space-y-1">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                    {groupName}
                  </h4>
                  {typeQueries.map((query, idx) => (
                    <QueryCardCompact
                      key={`${bucketKey}-${groupName}-${query["Query ID"]}-${idx}`}
                      query={query}
                      users={users}
                      bucketColor={config.color}
                      onClick={() => onSelectQuery(query)}
                      onAssign={onAssignQuery}
                      onEdit={onEditQuery}
                    />
                  ))}
                </div>
              );
            })}

            {/* Other types (fallback for any unknown types) */}
            {queries.filter((q) => {
              const qType = (q["Query Type"] || "").trim();
              return !["SEO Query", "New", "Ongoing"].includes(qType);
            }).length > 0 && (
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">
                  Other
                </h4>
                {queries
                  .filter((q) => {
                    const qType = (q["Query Type"] || "").trim();
                    return !["SEO Query", "New", "Ongoing"].includes(qType);
                  })
                  .map((query, idx) => (
                    <QueryCardCompact
                      key={`${bucketKey}-other-${query["Query ID"]}-${idx}`}
                      query={query}
                      users={users}
                      bucketColor={config.color}
                      onClick={() => onSelectQuery(query)}
                      onAssign={onAssignQuery}
                      onEdit={onEditQuery}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
