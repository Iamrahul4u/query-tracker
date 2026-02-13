"use client";

import { useEffect, useRef } from "react";

import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { X } from "lucide-react";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";

interface AllQueriesModalProps {
  queries: Query[];
  users: User[];
  onClose: () => void;
  onSelectQuery: (query: Query) => void;
  onAssign?: (query: Query, assignee: string) => void;
  onEdit?: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  showDate?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  groupBy?: "bucket" | "type"; // Controls sub-grouping order
  filterBucket?: string; // Filter to show only specific bucket
  currentViewMode?: "bucket" | "user"; // NEW: Controls primary grouping (bucket-first vs user-first)
}

// Represents an item in the flowing grid (user header, bucket header, type header, or query)
type FlowItem =
  | {
      type: "userHeader";
      userName: string;
      userEmail: string;
      count: number;
    }
  | {
      type: "header";
      bucket: string;
      config: (typeof BUCKETS)[string];
      count: number;
    }
  | {
      type: "typeHeader";
      typeName: string;
      count: number;
      bucketColor: string;
    }
  | { type: "query"; query: Query; bucketColor: string };

export function AllQueriesModal({
  queries,
  users,
  onClose,
  onSelectQuery,
  onAssign,
  onEdit,
  onApproveDelete,
  onRejectDelete,
  showDate = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  groupBy = "bucket", // Default: bucket-first grouping
  filterBucket, // NEW: filter to specific bucket
  currentViewMode = "bucket", // NEW: bucket-first vs user-first
}: AllQueriesModalProps) {
  // Ref for horizontal scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter queries by bucket if specified
  const filteredQueries = filterBucket
    ? queries.filter((q) => q.Status === filterBucket)
    : queries;

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Convert vertical scroll to horizontal scroll inside modal
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent default vertical scroll
      e.preventDefault();
      // Convert vertical scroll (deltaY) to horizontal scroll
      container.scrollLeft += e.deltaY;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Define type order (SEO Query, New, Ongoing, Other)
  const typeOrder = ["SEO Query", "New", "Ongoing", "Other"];

  // Flatten into flow items based on currentViewMode and groupBy
  const flowItems: FlowItem[] = [];

  if (currentViewMode === "user") {
    // USER-FIRST GROUPING: User headers -> Bucket/Type subheaders based on groupBy

    // Group queries by user (Assigned To)
    const userGroups: Record<string, Query[]> = {};
    filteredQueries.forEach((query) => {
      const assignee = query["Assigned To"] || "Unassigned";
      if (!userGroups[assignee]) {
        userGroups[assignee] = [];
      }
      userGroups[assignee].push(query);
    });

    // Sort users: Unassigned first, then alphabetically
    const sortedUsers = Object.keys(userGroups).sort((a, b) => {
      if (a === "Unassigned") return -1;
      if (b === "Unassigned") return 1;
      return a.localeCompare(b);
    });

    if (groupBy === "type") {
      // Group by type FIRST, then users within each type
      const typeGroups: Record<string, Query[]> = {};
      filteredQueries.forEach((query) => {
        const type = query["Query Type"] || "Other";
        if (!typeGroups[type]) {
          typeGroups[type] = [];
        }
        typeGroups[type].push(query);
      });

      const sortedTypes = Object.keys(typeGroups).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // For each type, show type header once, then users
      sortedTypes.forEach((type) => {
        const typeQueries = typeGroups[type];
        if (typeQueries.length === 0) return;

        const typeColors: Record<string, string> = {
          "SEO Query": "#7c3aed",
          New: "#22c55e",
          Ongoing: "#3b82f6",
          "On Hold": "#dc2626",
        };
        const typeColor = typeColors[type] || "#6b7280";

        // Add type header ONCE
        flowItems.push({
          type: "typeHeader",
          typeName: type,
          count: typeQueries.length,
          bucketColor: typeColor,
        });

        // Group by user within this type
        const userGroupsInType: Record<string, Query[]> = {};
        typeQueries.forEach((query) => {
          const assignee = query["Assigned To"] || "Unassigned";
          if (!userGroupsInType[assignee]) {
            userGroupsInType[assignee] = [];
          }
          userGroupsInType[assignee].push(query);
        });

        const sortedUsersInType = Object.keys(userGroupsInType).sort((a, b) => {
          if (a === "Unassigned") return -1;
          if (b === "Unassigned") return 1;
          return a.localeCompare(b);
        });

        // Add users and their queries
        sortedUsersInType.forEach((userEmail) => {
          const userQueries = userGroupsInType[userEmail];
          const user = users.find((u) => u.Email === userEmail);
          const userName = user?.Name || userEmail;

          flowItems.push({
            type: "userHeader",
            userName,
            userEmail,
            count: userQueries.length,
          });

          userQueries.forEach((query) => {
            const bucket = query.Status || "A";
            const config = BUCKETS[bucket];
            flowItems.push({
              type: "query",
              query,
              bucketColor: config.color,
            });
          });
        });
      });
    } else {
      // Group by bucket FIRST, then users within each bucket
      const bucketGroups: Record<string, Query[]> = {};
      filteredQueries.forEach((query) => {
        const bucket = query.Status || "A";
        if (!bucketGroups[bucket]) {
          bucketGroups[bucket] = [];
        }
        bucketGroups[bucket].push(query);
      });

      // For each bucket, show bucket header once, then users
      BUCKET_ORDER.forEach((bucket) => {
        const bucketQueries = bucketGroups[bucket];
        if (!bucketQueries || bucketQueries.length === 0) return;

        const config = BUCKETS[bucket];

        // Add bucket header ONCE
        flowItems.push({
          type: "header",
          bucket,
          config,
          count: bucketQueries.length,
        });

        // Group by user within this bucket
        const userGroupsInBucket: Record<string, Query[]> = {};
        bucketQueries.forEach((query) => {
          const assignee = query["Assigned To"] || "Unassigned";
          if (!userGroupsInBucket[assignee]) {
            userGroupsInBucket[assignee] = [];
          }
          userGroupsInBucket[assignee].push(query);
        });

        const sortedUsersInBucket = Object.keys(userGroupsInBucket).sort(
          (a, b) => {
            if (a === "Unassigned") return -1;
            if (b === "Unassigned") return 1;
            return a.localeCompare(b);
          },
        );

        // Add users and their queries
        sortedUsersInBucket.forEach((userEmail) => {
          const userQueries = userGroupsInBucket[userEmail];
          const user = users.find((u) => u.Email === userEmail);
          const userName = user?.Name || userEmail;

          flowItems.push({
            type: "userHeader",
            userName,
            userEmail,
            count: userQueries.length,
          });

          userQueries.forEach((query) => {
            flowItems.push({
              type: "query",
              query,
              bucketColor: config.color,
            });
          });
        });
      });
    }
  } else if (groupBy === "type") {
    // BUCKET VIEW + TYPE-FIRST: Type headers -> Bucket subheaders

    const typeGroups: Record<string, Query[]> = {};
    filteredQueries.forEach((query) => {
      const type = query["Query Type"] || "Other";
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(query);
    });

    const sortedTypes = Object.keys(typeGroups).sort((a, b) => {
      const indexA = typeOrder.indexOf(a);
      const indexB = typeOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    sortedTypes.forEach((type) => {
      const typeQueries = typeGroups[type];
      if (typeQueries.length === 0) return;

      flowItems.push({
        type: "typeHeader",
        typeName: type,
        count: typeQueries.length,
        bucketColor: "#6b7280",
      });

      const bucketGroups: Record<string, Query[]> = {};
      typeQueries.forEach((query) => {
        const bucket = query.Status || "A";
        if (!bucketGroups[bucket]) {
          bucketGroups[bucket] = [];
        }
        bucketGroups[bucket].push(query);
      });

      BUCKET_ORDER.forEach((bucket) => {
        const bucketQueries = bucketGroups[bucket];
        if (!bucketQueries || bucketQueries.length === 0) return;

        const config = BUCKETS[bucket];

        flowItems.push({
          type: "header",
          bucket,
          config,
          count: bucketQueries.length,
        });

        bucketQueries.forEach((query) => {
          flowItems.push({
            type: "query",
            query,
            bucketColor: config.color,
          });
        });
      });
    });
  } else {
    // BUCKET VIEW + BUCKET-FIRST (default): Bucket headers -> Type subheaders

    const groupedByBucket: Record<string, Query[]> = {};
    BUCKET_ORDER.forEach((bucket) => {
      groupedByBucket[bucket] = filteredQueries.filter(
        (q) => q.Status === bucket,
      );
    });

    BUCKET_ORDER.forEach((bucket) => {
      const bucketQueries = groupedByBucket[bucket] || [];
      if (bucketQueries.length === 0) return;

      const config = BUCKETS[bucket];

      flowItems.push({
        type: "header",
        bucket,
        config,
        count: bucketQueries.length,
      });

      const typeGroups: Record<string, Query[]> = {};
      bucketQueries.forEach((query) => {
        const type = query["Query Type"] || "Other";
        if (!typeGroups[type]) {
          typeGroups[type] = [];
        }
        typeGroups[type].push(query);
      });

      const sortedTypes = Object.keys(typeGroups).sort((a, b) => {
        const indexA = typeOrder.indexOf(a);
        const indexB = typeOrder.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      sortedTypes.forEach((type) => {
        const typeQueries = typeGroups[type];

        flowItems.push({
          type: "typeHeader",
          typeName: type,
          count: typeQueries.length,
          bucketColor: config.color,
        });

        typeQueries.forEach((query) => {
          flowItems.push({
            type: "query",
            query,
            bucketColor: config.color,
          });
        });
      });
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
      {/* Modal Content - Full width with natural column flow */}
      <div
        className="relative mx-4 mt-[60px] mb-2 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 flex justify-between items-center rounded-t-xl flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {filterBucket ? (
              <>
                Bucket {filterBucket} Queries
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {filteredQueries.length}
                </span>
              </>
            ) : (
              <>
                All Queries
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {queries.length} total
                </span>
              </>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Newspaper column layout */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden p-2 bg-gray-50 scroll-smooth"
        >
          <div
            className="h-full"
            style={{
              columnCount: "auto",
              columnWidth: "280px",
              columnGap: "8px",
              columnFill: "auto",
            }}
          >
            {flowItems.map((item, index) => {
              if (item.type === "userHeader") {
                // User header - subheader in user view
                const isSubHeader = currentViewMode === "user";
                return (
                  <div
                    key={`user-${item.userEmail}-${index}`}
                    className={`flex items-center justify-between rounded-lg ${isSubHeader ? "px-2 py-1.5 mb-0.5 bg-indigo-500" : "px-3 py-2.5 mb-1 bg-gradient-to-r from-indigo-600 to-indigo-700"}`}
                    style={{
                      breakInside: "avoid",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full bg-white/20 flex items-center justify-center ${isSubHeader ? "w-5 h-5" : "w-7 h-7"}`}
                      >
                        <span
                          className={`font-bold text-white ${isSubHeader ? "text-[10px]" : "text-sm"}`}
                        >
                          {item.userName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`font-bold text-white ${isSubHeader ? "text-[11px]" : "text-sm"}`}
                      >
                        {item.userName}
                      </span>
                    </div>
                    <span
                      className={`rounded-full font-bold bg-white/20 text-white ${isSubHeader ? "text-[9px] px-1.5 py-0.5" : "text-xs px-2.5 py-1"}`}
                    >
                      {item.count}
                    </span>
                  </div>
                );
              } else if (item.type === "header") {
                // Bucket header - should be prominent in both views
                return (
                  <div
                    key={`header-${item.bucket}`}
                    className="flex items-center justify-between rounded-lg mb-1 px-3 py-2"
                    style={{
                      backgroundColor: item.config.color,
                      breakInside: "avoid",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-white/20 flex items-center justify-center text-white font-bold w-6 h-6 text-sm">
                        {item.bucket}
                      </span>
                      <span className="font-bold text-white text-sm">
                        {item.config.name.replace(`${item.bucket}) `, "")}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full font-bold bg-white/20 text-white text-xs">
                      {item.count}
                    </span>
                  </div>
                );
              } else if (item.type === "typeHeader") {
                // Type header size depends on context
                const isMainCategory =
                  (currentViewMode === "bucket" && groupBy === "type") ||
                  (currentViewMode === "user" && groupBy === "type");
                const typeColors: Record<string, string> = {
                  "SEO Query": "#7c3aed",
                  New: "#22c55e",
                  Ongoing: "#3b82f6",
                };
                const typeColor = typeColors[item.typeName] || "#6b7280";

                return (
                  <div
                    key={`type-${index}`}
                    className={`flex items-center justify-between rounded-lg ${isMainCategory ? "px-3 py-2.5 mb-1" : "px-2 py-1 mb-0.5"}`}
                    style={{
                      backgroundColor: typeColor,
                      breakInside: "avoid",
                    }}
                  >
                    <span
                      className={`font-bold uppercase tracking-wide text-white ${isMainCategory ? "text-sm" : "text-[10px]"}`}
                    >
                      {item.typeName}
                    </span>
                    <span
                      className={`rounded-full font-bold bg-white/20 text-white ${isMainCategory ? "text-xs px-2.5 py-1" : "text-[9px] px-1.5 py-0.5"}`}
                    >
                      {item.count}
                    </span>
                  </div>
                );
              } else {
                return (
                  <div
                    key={item.query["Query ID"]}
                    className="mb-0.5"
                    style={{ breakInside: "avoid" }}
                  >
                    <QueryCardCompact
                      query={item.query}
                      users={users}
                      bucketColor={item.bucketColor}
                      onClick={() => onSelectQuery(item.query)}
                      onAssign={onAssign}
                      onEdit={onEdit}
                      onApproveDelete={onApproveDelete}
                      onRejectDelete={onRejectDelete}
                      showDate={showDate}
                      dateField={dateField}
                      currentUserRole={currentUserRole}
                      currentUserEmail={currentUserEmail}
                      detailView={detailView}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-3 py-1.5 border-t flex justify-between items-center rounded-b-xl flex-shrink-0">
          <p className="text-[10px] text-gray-500">
            Click on a query to view details
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
