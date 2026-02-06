"use client";

import { Query, User } from "../utils/sheets";
import { QueryCardCompact } from "./QueryCardCompact";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
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
}: UserExpandModalProps) {
  // Group queries by bucket
  const groupedByBucket: Record<string, Query[]> = {};
  BUCKET_ORDER.forEach((bucket) => {
    groupedByBucket[bucket] = queries.filter((q) => q.Status === bucket);
  });

  // Count non-empty buckets
  const nonEmptyBuckets = BUCKET_ORDER.filter(
    (bucket) => groupedByBucket[bucket].length > 0
  );

  // Build flow items for newspaper layout
  const flowItems: FlowItem[] = [];
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
              {queries.length} queries • {nonEmptyBuckets.length} buckets
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
                  return (
                    <div
                      key={`bucket-${index}`}
                      className="flex items-center justify-between px-1.5 py-0.5 mb-0.5 rounded border"
                      style={{
                        backgroundColor: `${item.bucketColor}15`,
                        borderColor: `${item.bucketColor}40`,
                        breakInside: "avoid",
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="w-4 h-4 rounded flex items-center justify-center text-white text-[8px] font-bold"
                          style={{ backgroundColor: item.bucketColor }}
                        >
                          {item.bucketKey}
                        </span>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide"
                          style={{ color: item.bucketColor }}
                        >
                          {item.bucketName
                            .replace(`${item.bucketKey}) `, "")
                            .split(" - ")[0]}
                        </span>
                      </div>
                      <span
                        className="text-[8px] px-1 py-0.5 rounded-full font-bold text-white"
                        style={{ backgroundColor: item.bucketColor }}
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
