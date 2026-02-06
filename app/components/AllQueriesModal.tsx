"use client";

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
}

// Represents an item in the flowing grid (bucket header, type header, or query)
type FlowItem =
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
}: AllQueriesModalProps) {
  // Group queries by bucket
  const groupedByBucket: Record<string, Query[]> = {};
  BUCKET_ORDER.forEach((bucket) => {
    groupedByBucket[bucket] = queries.filter((q) => q.Status === bucket);
  });

  // Flatten into flow items (headers + queries) for newspaper layout
  // Now grouped by Query Type within each bucket
  const flowItems: FlowItem[] = [];
  BUCKET_ORDER.forEach((bucket) => {
    const bucketQueries = groupedByBucket[bucket] || [];
    if (bucketQueries.length === 0) return;

    const config = BUCKETS[bucket];

    // Add bucket header
    flowItems.push({
      type: "header",
      bucket,
      config,
      count: bucketQueries.length,
    });

    // Group by Query Type within this bucket
    const typeGroups: Record<string, Query[]> = {};
    bucketQueries.forEach((query) => {
      const type = query["Query Type"] || "Other";
      if (!typeGroups[type]) {
        typeGroups[type] = [];
      }
      typeGroups[type].push(query);
    });

    // Define type order (SEO Query, New, Ongoing, Other)
    const typeOrder = ["SEO Query", "New", "Ongoing", "Other"];
    const sortedTypes = Object.keys(typeGroups).sort((a, b) => {
      const indexA = typeOrder.indexOf(a);
      const indexB = typeOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Add type headers and queries
    sortedTypes.forEach((type) => {
      const typeQueries = typeGroups[type];

      // Add type subheader
      flowItems.push({
        type: "typeHeader",
        typeName: type,
        count: typeQueries.length,
        bucketColor: config.color,
      });

      // Add queries for this type
      typeQueries.forEach((query) => {
        flowItems.push({
          type: "query",
          query,
          bucketColor: config.color,
        });
      });
    });
  });

  return (
    <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
      {/* Modal Content - Full width with natural column flow */}
      <div
        className="relative mx-4 mt-[60px] mb-2 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 flex justify-between items-center rounded-t-xl flex-shrink-0">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            All Queries
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {queries.length} total
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Newspaper column layout */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 bg-gray-50">
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
              if (item.type === "header") {
                return (
                  <div
                    key={`header-${item.bucket}`}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded mb-1"
                    style={{
                      backgroundColor: `${item.config.color}20`,
                      breakInside: "avoid",
                    }}
                  >
                    <span
                      className="font-semibold"
                      style={{ color: item.config.color, fontSize: "12px" }}
                    >
                      {item.config.name}
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full font-semibold"
                      style={{
                        backgroundColor: item.config.color,
                        color: "white",
                        fontSize: "9px",
                      }}
                    >
                      {item.count}
                    </span>
                  </div>
                );
              } else if (item.type === "typeHeader") {
                // Define type colors matching QueryTypeBadge
                const typeColors: Record<
                  string,
                  { bg: string; text: string; border: string }
                > = {
                  "SEO Query": {
                    bg: "#f3e8ff",
                    text: "#7c3aed",
                    border: "#c4b5fd",
                  },
                  New: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
                  Ongoing: {
                    bg: "#dbeafe",
                    text: "#1d4ed8",
                    border: "#bfdbfe",
                  },
                };
                const typeColor = typeColors[item.typeName] || {
                  bg: "#f3f4f6",
                  text: "#4b5563",
                  border: "#e5e7eb",
                };

                return (
                  <div
                    key={`type-${index}`}
                    className="flex items-center justify-between px-1.5 py-0.5 mb-0.5 rounded border"
                    style={{
                      backgroundColor: typeColor.bg,
                      borderColor: typeColor.border,
                      breakInside: "avoid",
                    }}
                  >
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide"
                      style={{ color: typeColor.text }}
                    >
                      {item.typeName}
                    </span>
                    <span
                      className="text-[8px] px-1 py-0.5 rounded-full font-bold"
                      style={{
                        backgroundColor: typeColor.text,
                        color: "white",
                      }}
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
