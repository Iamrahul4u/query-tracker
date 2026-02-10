"use client";

import { Query, User } from "../utils/sheets";
import { QueryCardCompact } from "./QueryCardCompact";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import {
  groupQueriesByPrimaryAndSecondary,
  getEffectiveQueryType,
} from "../utils/queryFilters";
import { X } from "lucide-react";

interface UserExpandModalProps {
  user: { email: string; name: string };
  queries: Query[];
  users: User[];
  onClose: () => void;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  currentUserRole?: string;
  currentUserEmail?: string;
  groupBy?: "bucket" | "type"; // NEW: controls grouping order
}

// Flow items for newspaper layout with nested grouping
type FlowItem =
  | {
      type: "bucketHeader";
      bucketKey: string;
      bucketName: string;
      bucketColor: string;
      count: number;
      isMainCategory: boolean; // true if primary grouping, false if sub-header
    }
  | {
      type: "typeHeader";
      typeName: string;
      count: number;
      isMainCategory: boolean; // true if primary grouping, false if sub-header
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
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  currentUserRole = "",
  currentUserEmail = "",
  groupBy = "bucket", // Default: bucket-first grouping
}: UserExpandModalProps) {
  // Type colors for type headers
  const typeColors: Record<string, string> = {
    "SEO Query": "#9333ea",
    New: "#22c55e",
    Ongoing: "#3b82f6",
    "On Hold": "#dc2626",
    "Already Allocated": "#f97316", // Orange for Already Allocated
    Other: "#6b7280",
  };

  // Build flow items for newspaper layout with nested grouping
  const flowItems: FlowItem[] = [];

  // Create nested grouping based on groupBy mode
  const nestedGroups = groupQueriesByPrimaryAndSecondary(
    queries,
    groupBy === "bucket" ? "bucket" : "type",
    groupBy === "bucket" ? "type" : "bucket",
  );

  if (groupBy === "bucket") {
    // PRIMARY: Bucket → SECONDARY: Type
    BUCKET_ORDER.forEach((bucketKey) => {
      const typeGroups = nestedGroups[bucketKey];
      if (!typeGroups || Object.keys(typeGroups).length === 0) return;

      const bucketConfig = BUCKETS[bucketKey];
      if (!bucketConfig) return;

      // Calculate total queries in this bucket
      const totalQueries = Object.values(typeGroups).reduce(
        (sum, queries) => sum + queries.length,
        0,
      );

      // Add bucket header (main category)
      flowItems.push({
        type: "bucketHeader",
        bucketKey,
        bucketName: bucketConfig.name,
        bucketColor: bucketConfig.color,
        count: totalQueries,
        isMainCategory: true,
      });

      // Add type sub-headers and queries
      QUERY_TYPE_ORDER.forEach((typeName) => {
        const typeQueries = typeGroups[typeName];
        if (!typeQueries || typeQueries.length === 0) return;

        // Add type sub-header
        flowItems.push({
          type: "typeHeader",
          typeName,
          count: typeQueries.length,
          isMainCategory: false, // Sub-header
        });

        // Add queries
        typeQueries.forEach((query) => {
          flowItems.push({
            type: "query",
            query,
            bucketColor: bucketConfig.color,
          });
        });
      });

      // Add "Other" types (not in QUERY_TYPE_ORDER)
      Object.entries(typeGroups)
        .filter(([typeName]) => !QUERY_TYPE_ORDER.includes(typeName))
        .forEach(([typeName, typeQueries]) => {
          // Add type sub-header
          flowItems.push({
            type: "typeHeader",
            typeName,
            count: typeQueries.length,
            isMainCategory: false, // Sub-header
          });

          // Add queries
          typeQueries.forEach((query) => {
            flowItems.push({
              type: "query",
              query,
              bucketColor: bucketConfig.color,
            });
          });
        });
    });
  } else {
    // PRIMARY: Type → SECONDARY: Bucket
    QUERY_TYPE_ORDER.forEach((typeName) => {
      const bucketGroups = nestedGroups[typeName];
      if (!bucketGroups || Object.keys(bucketGroups).length === 0) return;

      // Calculate total queries in this type
      const totalQueries = Object.values(bucketGroups).reduce(
        (sum, queries) => sum + queries.length,
        0,
      );

      // Add type header (main category)
      flowItems.push({
        type: "typeHeader",
        typeName,
        count: totalQueries,
        isMainCategory: true,
      });

      // Add bucket sub-headers and queries
      BUCKET_ORDER.forEach((bucketKey) => {
        const bucketQueries = bucketGroups[bucketKey];
        if (!bucketQueries || bucketQueries.length === 0) return;

        const bucketConfig = BUCKETS[bucketKey];
        if (!bucketConfig) return;

        // Add bucket sub-header
        flowItems.push({
          type: "bucketHeader",
          bucketKey,
          bucketName: bucketConfig.name,
          bucketColor: bucketConfig.color,
          count: bucketQueries.length,
          isMainCategory: false, // Sub-header
        });

        // Add queries
        bucketQueries.forEach((query) => {
          flowItems.push({
            type: "query",
            query,
            bucketColor: bucketConfig.color,
          });
        });
      });
    });

    // Add "Other" types (not in QUERY_TYPE_ORDER)
    Object.entries(nestedGroups)
      .filter(([typeName]) => !QUERY_TYPE_ORDER.includes(typeName))
      .forEach(([typeName, bucketGroups]) => {
        // Calculate total queries in this type
        const totalQueries = Object.values(bucketGroups).reduce(
          (sum, queries) => sum + queries.length,
          0,
        );

        // Add type header (main category)
        flowItems.push({
          type: "typeHeader",
          typeName,
          count: totalQueries,
          isMainCategory: true,
        });

        // Add bucket sub-headers and queries
        BUCKET_ORDER.forEach((bucketKey) => {
          const bucketQueries = bucketGroups[bucketKey];
          if (!bucketQueries || bucketQueries.length === 0) return;

          const bucketConfig = BUCKETS[bucketKey];
          if (!bucketConfig) return;

          // Add bucket sub-header
          flowItems.push({
            type: "bucketHeader",
            bucketKey,
            bucketName: bucketConfig.name,
            bucketColor: bucketConfig.color,
            count: bucketQueries.length,
            isMainCategory: false, // Sub-header
          });

          // Add queries
          bucketQueries.forEach((query) => {
            flowItems.push({
              type: "query",
              query,
              bucketColor: bucketConfig.color,
            });
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
                  // Bucket header size depends on whether it's main category or sub-header
                  const isMainCategory = item.isMainCategory;
                  return (
                    <div
                      key={`bucket-${index}`}
                      className={`flex items-center justify-between mb-0.5 rounded-lg ${isMainCategory ? "px-3 py-2" : "px-2 py-1"}`}
                      style={{
                        backgroundColor: item.bucketColor,
                        breakInside: "avoid",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded bg-white/20 flex items-center justify-center text-white font-bold ${isMainCategory ? "w-6 h-6 text-sm" : "w-4 h-4 text-[10px]"}`}
                        >
                          {item.bucketKey}
                        </span>
                        <span
                          className={`font-bold uppercase tracking-wide text-white ${isMainCategory ? "text-sm" : "text-[10px]"}`}
                        >
                          {
                            item.bucketName
                              .replace(`${item.bucketKey}) `, "")
                              .split(" - ")[0]
                          }
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full font-bold bg-white/20 text-white ${isMainCategory ? "text-xs" : "text-[9px]"}`}
                      >
                        {item.count}
                      </span>
                    </div>
                  );
                } else if (item.type === "typeHeader") {
                  // Type header size depends on whether it's main category or sub-header
                  const isMainCategory = item.isMainCategory;
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
                        onAssignCall={onAssignCallQuery}
                        onEdit={onEditQuery}
                        onApproveDelete={onApproveDelete}
                        onRejectDelete={onRejectDelete}
                        showDate={true}
                        dateField="Added Date Time"
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={false}
                        isUserView={true}
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
