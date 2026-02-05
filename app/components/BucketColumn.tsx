import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BucketConfig, QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { Query, User } from "../utils/sheets";
import { QueryCardCompact } from "./QueryCardCompact";
import { DateFieldKey } from "../utils/queryFilters";

export function BucketColumn({
  bucketKey,
  config,
  queries,
  users,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  onLoadMore,
  extendedDays = 3,
  isLoading = false,
  disableScroll = false,
  maxHeight,
  showDateOnCards = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  bucketKey: string;
  config: BucketConfig;
  queries: Query[];
  users: User[];
  onSelectQuery: (q: Query) => void;
  onAssignQuery?: (query: Query, assignee: string) => void;
  onEditQuery?: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  onLoadMore?: (bucketKey: string) => void;
  extendedDays?: number;
  isLoading?: boolean;
  disableScroll?: boolean;
  maxHeight?: string;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  const toggleTypeCollapse = (typeName: string) => {
    setCollapsedTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(typeName)) {
        newSet.delete(typeName);
      } else {
        newSet.add(typeName);
      }
      return newSet;
    });
  };

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
    Other: {
      bg: "bg-gray-50",
      text: "text-gray-700",
      border: "border-gray-200",
    },
  };

  const heightClass = disableScroll
    ? ""
    : maxHeight
      ? `h-full`
      : "h-full max-h-[calc(100vh-140px)]";

  const heightStyle = maxHeight && !disableScroll ? { maxHeight } : {};

  return (
    <div
      className={`bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100 ${heightClass}`}
      style={heightStyle}
    >
      {/* Bucket Header */}
      <div
        className="px-4 py-3 text-white flex items-center justify-between cursor-pointer hover:brightness-95 transition select-none flex-shrink-0"
        style={{ backgroundColor: config.color }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          )}
          {/* Bold 2xl Typography as requested */}
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

      {/* Content Area */}
      <div
        className={`flex-1 transition-all duration-200 bg-gray-50 flex flex-col ${isCollapsed ? "max-h-0 overflow-hidden" : ""} ${!disableScroll ? "overflow-y-auto" : ""}`}
      >
        {queries.length === 0 ? (
          <p className="p-4 text-gray-400 text-sm text-center">No queries</p>
        ) : (
          <div className="p-2 space-y-3">
            {/* Group by Query Type: SEO Query -> New -> Ongoing (per FRD) */}
            {["SEO Query", "New", "Ongoing"].map((groupName) => {
              const typeQueries = queries.filter((q) => {
                const qType = (q["Query Type"] || "").trim();
                return qType === groupName;
              });
              if (typeQueries.length === 0) return null;

              const isTypeCollapsed = collapsedTypes.has(groupName);
              const colors = typeColors[groupName];

              return (
                <div
                  key={`${bucketKey}-${groupName}`}
                  className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}
                >
                  {/* Type Header - Collapsible */}
                  <div
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:brightness-95 transition ${colors.bg}`}
                    onClick={() => toggleTypeCollapse(groupName)}
                  >
                    <div className="flex items-center gap-2">
                      {isTypeCollapsed ? (
                        <ChevronRight className={`w-3 h-3 ${colors.text}`} />
                      ) : (
                        <ChevronDown className={`w-3 h-3 ${colors.text}`} />
                      )}
                      <h4
                        className={`text-xs font-bold ${colors.text} uppercase tracking-wider`}
                      >
                        {groupName}
                      </h4>
                    </div>
                    <span
                      className={`${colors.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                    >
                      {typeQueries.length}
                    </span>
                  </div>

                  {/* Type Content */}
                  {!isTypeCollapsed && (
                    <div className="p-2 space-y-1 bg-white">
                      {typeQueries.map((query, idx) => (
                        <QueryCardCompact
                          key={`${bucketKey}-${groupName}-${query["Query ID"]}-${idx}`}
                          query={query}
                          users={users}
                          bucketColor={config.color}
                          onClick={() => onSelectQuery(query)}
                          onAssign={onAssignQuery}
                          onEdit={onEditQuery}
                          onApproveDelete={onApproveDelete}
                          onRejectDelete={onRejectDelete}
                          showDate={showDateOnCards}
                          dateField={config.defaultSortField}
                          currentUserRole={currentUserRole}
                          currentUserEmail={currentUserEmail}
                          detailView={detailView}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Other types (fallback for any unknown types) */}
            {queries.filter((q) => {
              const qType = (q["Query Type"] || "").trim();
              return !["SEO Query", "New", "Ongoing"].includes(qType);
            }).length > 0 && (
              <div
                className={`rounded-lg border ${typeColors.Other.border} ${typeColors.Other.bg} overflow-hidden`}
              >
                {/* Type Header - Collapsible */}
                <div
                  className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:brightness-95 transition ${typeColors.Other.bg}`}
                  onClick={() => toggleTypeCollapse("Other")}
                >
                  <div className="flex items-center gap-2">
                    {collapsedTypes.has("Other") ? (
                      <ChevronRight
                        className={`w-3 h-3 ${typeColors.Other.text}`}
                      />
                    ) : (
                      <ChevronDown
                        className={`w-3 h-3 ${typeColors.Other.text}`}
                      />
                    )}
                    <h4
                      className={`text-xs font-bold ${typeColors.Other.text} uppercase tracking-wider`}
                    >
                      Other
                    </h4>
                  </div>
                  <span
                    className={`${typeColors.Other.text} text-xs font-bold px-2 py-0.5 rounded-full bg-white/50`}
                  >
                    {
                      queries.filter((q) => {
                        const qType = (q["Query Type"] || "").trim();
                        return !["SEO Query", "New", "Ongoing"].includes(qType);
                      }).length
                    }
                  </span>
                </div>

                {/* Type Content */}
                {!collapsedTypes.has("Other") && (
                  <div className="p-2 space-y-1 bg-white">
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
                          onApproveDelete={onApproveDelete}
                          onRejectDelete={onRejectDelete}
                          showDate={showDateOnCards}
                          dateField={config.defaultSortField}
                          currentUserRole={currentUserRole}
                          currentUserEmail={currentUserEmail}
                          detailView={detailView}
                        />
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Load +7 Days Button for F, G, H buckets */}
        {config.evaporateAfterDays && onLoadMore && (
          <div className="p-2 border-t border-gray-200">
            {extendedDays >= 30 ? (
              <div className="w-full py-2 px-3 text-xs font-medium text-gray-400 text-center">
                No more results found
              </div>
            ) : (
              <button
                onClick={() => onLoadMore(bucketKey)}
                disabled={isLoading}
                className="w-full py-2 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-3 w-3 text-gray-700"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : (
                  "Load +7 Days"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
