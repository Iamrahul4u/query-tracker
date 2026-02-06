"use client";

import { X } from "lucide-react";
import { BucketConfig } from "../config/sheet-constants";
import { Query, User } from "../utils/sheets";
import { QueryCardCompact } from "./QueryCardCompact";

interface ExpandedBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucketKey: string;
  config: BucketConfig;
  queries: Query[];
  users: User[];
  onSelectQuery: (q: Query) => void;
  onAssignQuery?: (query: Query, assignee: string) => void;
  onEditQuery?: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}

// Flow items for newspaper layout
type FlowItem =
  | {
      type: "typeHeader";
      typeName: string;
      count: number;
      bucketColor: string;
    }
  | { type: "query"; query: Query; bucketColor: string };

export function ExpandedBucketModal({
  isOpen,
  onClose,
  bucketKey,
  config,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: ExpandedBucketModalProps) {
  if (!isOpen) return null;

  // Group by Query Type within this bucket
  const typeGroups: Record<string, Query[]> = {};
  queries.forEach((query) => {
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

  // Build flow items
  const flowItems: FlowItem[] = [];
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

  return (
    <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none">
      {/* Modal Content - Same as AllQueriesModal */}
      <div
        className="relative mx-4 mt-[60px] mb-2 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
        style={{ height: "90vh" }}
      >
        {/* Header - Compact */}
        <div
          className="px-3 py-2 text-white flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: config.color }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {config.name.split(") ")[0]})
            </span>
            <span className="font-medium text-sm text-white/90">
              {config.name.split(") ")[1]}
            </span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
              {queries.length} queries
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
              <p className="text-gray-400 text-lg">No queries in this bucket</p>
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
                if (item.type === "typeHeader") {
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
                        onAssign={onAssignQuery}
                        onEdit={onEditQuery}
                        onApproveDelete={onApproveDelete}
                        onRejectDelete={onRejectDelete}
                        showDate={true}
                        dateField={config.defaultSortField}
                        currentUserRole={currentUserRole}
                        currentUserEmail={currentUserEmail}
                        detailView={detailView}
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
