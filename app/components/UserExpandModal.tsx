"use client";

import { Query, User } from "../utils/sheets";
import { QueryCardCompact } from "./QueryCardCompact";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { X } from "lucide-react";

interface UserExpandModalProps {
  user: { email: string; name: string };
  queries: Query[];
  users: User[];
  onClose: () => void;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  currentUserRole?: string;
  currentUserEmail?: string;
  groupBy?: "bucket" | "type"; // NEW: controls grouping order
}

// Flow items for newspaper layout
type FlowItem =
  | {
      type: "bucketHeader";
      bucketKey: string;
      bucketName: string;
      bucketColor: string;
      count: number;
    }
  | {
      type: "typeHeader";
      typeName: string;
      count: number;
    }
  | {
      type: "query";
      query: Query;
      bucketColor: string;
    };

export function UserExpandModal({
  user,
  queries,
  users,
  onClose,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  currentUserRole = "",
  currentUserEmail = "",
  groupBy = "bucket", // Default: bucket-first grouping
}: UserExpandModalProps) {
  // Type colors for type-first grouping
  const typeColors: Record<string, string> = {
    "SEO Query": "#9333ea",
    New: "#22c55e",
    Ongoing: "#3b82f6",
    "On Hold": "#dc2626",
    Other: "#6b7280",
  };

  // Build flow items for newspaper layout based on groupBy mode
  const flowItems: FlowItem[] = [];

  if (groupBy === "type") {
    // TYPE-FIRST GROUPING
    const typeGroups: Record<string, Query[]> = {};
    queries.forEach((query) => {
      const type = query["Query Type"] || "Other";
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(query);
    });

    // Sort types
    const typeOrder = ["SEO Query", "New", "Ongoing", "Other"];
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

      // Add type header
      flowItems.push({
        type: "typeHeader",
        typeName: type,
        count: typeQueries.length,
      });

      // Add queries for this type (with their bucket color)
      typeQueries.forEach((query) => {
        const bucketConfig = BUCKETS[query.Status] || { color: "#6b7280" };
        flowItems.push({
          type: "query",
          query,
          bucketColor: bucketConfig.color,
        });
      });
    });
  } else {
    // BUCKET-FIRST GROUPING (default)
    const groupedByBucket: Record<string, Query[]> = {};
    BUCKET_ORDER.forEach((bucket) => {
      groupedByBucket[bucket] = queries.filter((q) => q.Status === bucket);
    });

    const nonEmptyBuckets = BUCKET_ORDER.filter(
      (bucket) => groupedByBucket[bucket].length > 0,
    );

    nonEmptyBuckets.forEach((bucket) => {
      const bucketQueries = groupedByBucket[bucket];
      const bucketConfig = BUCKETS[bucket] || {
        name: `Bucket ${bucket}`,
        color: "#6b7280",
      };

      // Add bucket header
      flowItems.push({
        type: "bucketHeader",
        bucketKey: bucket,
        bucketName: bucketConfig.name,
        bucketColor: bucketConfig.color,
        count: bucketQueries.length,
      });

      // Add queries for this bucket
      bucketQueries.forEach((query) => {
        flowItems.push({
          type: "query",
          query,
          bucketColor: bucketConfig.color,
        });
      });
    });
  }

  // Count non-empty buckets for header display
  const nonEmptyBucketCount = BUCKET_ORDER.filter((bucket) =>
    queries.some((q) => q.Status === bucket),
  ).length;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
      {/* Modal Content - Newspaper layout like ExpandedBucketModal */}
      <div
        className="relative mx-4 mt-[60px] mb-2 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
        style={{ height: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Blue theme for users */}
        <div className="px-3 py-2 bg-blue-600 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-base">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-lg">{user.name}</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {queries.length} queries • {nonEmptyBucketCount} buckets
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area - Newspaper column layout */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 bg-gray-50">
          {queries.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400 text-lg">
                No queries assigned to this user
              </p>
            </div>
          ) : (
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
                if (item.type === "bucketHeader") {
                  // Bucket header size depends on groupBy mode
                  const isSubHeader = groupBy === "type";
                  return (
                    <div
                      key={`bucket-${index}`}
                      className={`flex items-center justify-between mb-0.5 rounded-lg ${isSubHeader ? "px-2 py-1" : "px-3 py-2"}`}
                      style={{
                        backgroundColor: item.bucketColor,
                        breakInside: "avoid",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded bg-white/20 flex items-center justify-center text-white font-bold ${isSubHeader ? "w-4 h-4 text-[10px]" : "w-6 h-6 text-sm"}`}
                        >
                          {item.bucketKey}
                        </span>
                        <span
                          className={`font-bold uppercase tracking-wide text-white ${isSubHeader ? "text-[10px]" : "text-sm"}`}
                        >
                          {
                            item.bucketName
                              .replace(`${item.bucketKey}) `, "")
                              .split(" - ")[0]
                          }
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-bold bg-white/20 text-white ${isSubHeader ? "text-[9px]" : "text-xs"}`}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                } else if (item.type === "typeHeader") {
                  // Type header size depends on groupBy mode
                  // BIG when main category (groupBy="type"), SMALL when sub-header (groupBy="bucket")
                  const isMainCategory = groupBy === "type";
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
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        onApproveDelete={onApproveDelete}
                        onRejectDelete={onRejectDelete}
                        showDate={true}
                        dateField="Added Date Time"
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={false}
                      />
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Footer - Minimal */}
        <div className="px-3 py-1.5 bg-white border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <p className="text-[10px] text-gray-500">
            Click on a query to view details
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
