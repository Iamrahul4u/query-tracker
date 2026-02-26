"use client";

import { useState } from "react";
import { Query, User } from "../utils/sheets";
import {
  groupQueriesByPrimaryAndSecondary,
  getEffectiveQueryType,
  DateFieldKey,
} from "../utils/queryFilters";
import {
  BUCKETS,
  BUCKET_ORDER,
  QUERY_TYPE_ORDER,
} from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { UserViewDefault } from "./UserViewDefault";
import { UserViewLinear } from "./UserViewLinear";

interface UserViewProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  currentUser: User | null;
  columnCount: 2 | 3 | 4;
  viewMode: "default" | "linear";
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
  hiddenUsers?: string[];
}

export function UserView({
  groupedQueries,
  users,
  currentUser,
  columnCount,
  viewMode,
  onSelectQuery,
  onAssignQuery,
  onAssignCallQuery,
  onEditQuery,
  onApproveDelete,
  onRejectDelete,
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
  detailView = false,
  groupBy = "bucket",
  hiddenUsers = [],
}: UserViewProps) {
  const currentEmail = currentUser?.Email?.toLowerCase();
  const [activeTab, setActiveTab] = useState<string>("");

  // Get all unique assignees from groupedQueries (these are email addresses)
  const allAssignees = Object.keys(groupedQueries);

  // Create a list of users to display
  const displayUsers: Array<{ email: string; name: string; isKnown: boolean }> =
    [];

  // First, add Bucket A if it exists and is not hidden
  if (
    groupedQueries["__BUCKET_A__"]?.length > 0 &&
    !hiddenUsers.includes("__BUCKET_A__")
  ) {
    displayUsers.push({
      email: "__BUCKET_A__",
      name: "A) Pending (Unassigned)",
      isKnown: false,
    });
  }

  // Then, add all known users that have assigned queries
  users.forEach((user) => {
    if (!user.Email) return;

    const matchingKey = allAssignees.find(
      (k) => k.toLowerCase() === user.Email.toLowerCase(),
    );
    if (matchingKey && groupedQueries[matchingKey]?.length > 0) {
      displayUsers.push({
        email: matchingKey,
        name: user.Name || user.Email,
        isKnown: true,
      });
    }
  });

  // Then, add any assignees that don't match a known user
  allAssignees.forEach((assignee) => {
    if (assignee === "Unassigned" || assignee === "__BUCKET_A__") return;
    const isKnown = displayUsers.some(
      (u) => u.email.toLowerCase() === assignee.toLowerCase(),
    );
    if (!isKnown && groupedQueries[assignee]?.length > 0) {
      displayUsers.push({
        email: assignee,
        name: assignee,
        isKnown: false,
      });
    }
  });

  // Add "Unassigned" at the end if there are unassigned queries
  if (groupedQueries["Unassigned"]?.length > 0) {
    displayUsers.push({
      email: "Unassigned",
      name: "Unassigned",
      isKnown: false,
    });
  }

  // Sort: Bucket A first, then Current user, then known users alphabetically, then unknown
  const sortedUsers = [...displayUsers].sort((a, b) => {
    if (a.email === "__BUCKET_A__") return -1;
    if (b.email === "__BUCKET_A__") return 1;
    if (a.email.toLowerCase() === currentEmail) return -1;
    if (b.email.toLowerCase() === currentEmail) return 1;
    if (a.isKnown && !b.isKnown) return -1;
    if (!a.isKnown && b.isKnown) return 1;
    if (a.email === "Unassigned") return 1;
    if (b.email === "Unassigned") return -1;
    return a.name.localeCompare(b.name);
  });

  // Filter out hidden users from sortedUsers
  const visibleUsers = sortedUsers.filter(
    (u) => !hiddenUsers.includes(u.email),
  );

  // Set default active tab for mobile (from visible users)
  if (!activeTab && visibleUsers.length > 0) {
    setActiveTab(visibleUsers[0].email);
  }

  // If no users to display, show a message
  if (visibleUsers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No assigned queries to display</p>
        <p className="text-sm mt-1">
          Switch to Bucket View or add some queries
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Tab Navigation */}
      <div className="md:hidden overflow-x-auto pb-2 mb-2 -mx-4 px-4 flex gap-1.5 scrollbar-hide">
        {visibleUsers.map((displayUser) => (
          <button
            key={displayUser.email}
            onClick={() => setActiveTab(displayUser.email)}
            className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === displayUser.email
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {displayUser.name} ({groupedQueries[displayUser.email]?.length || 0}
            )
          </button>
        ))}
      </div>

      {/* Desktop View - Default or Linear */}
      <div className="hidden md:block">
        {viewMode === "default" ? (
          <UserViewDefault
            sortedUsers={visibleUsers}
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
            detailView={detailView}
            groupBy={groupBy}
          />
        ) : (
          <UserViewLinear
            sortedUsers={visibleUsers}
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            onApproveDelete={onApproveDelete}
            onRejectDelete={onRejectDelete}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
            detailView={detailView}
            groupBy={groupBy}
          />
        )}
      </div>

      {/* Mobile Single Column View */}
      <div className="md:hidden space-y-4">
        {activeTab && visibleUsers.find((u) => u.email === activeTab) && (
          <MobileUserColumn
            displayUser={visibleUsers.find((u) => u.email === activeTab)!}
            queries={groupedQueries[activeTab] || []}
            users={users}
            currentUser={currentUser}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onAssignCallQuery={onAssignCallQuery}
            onEditQuery={onEditQuery}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            detailView={detailView}
            groupBy={groupBy}
          />
        )}
      </div>
    </>
  );
}

/**
 * Mobile view for a single user's queries
 */
function MobileUserColumn({
  displayUser,
  queries,
  users,
  currentUser,
  onSelectQuery,
  onAssignQuery,
  onAssignCallQuery,
  onEditQuery,
  showDateOnCards = false,
  dateField = "Added Date Time",
  detailView = false,
  groupBy = "bucket",
}: {
  displayUser: { email: string; name: string; isKnown: boolean };
  queries: Query[];
  users: User[];
  currentUser: User | null;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onAssignCallQuery?: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
  detailView?: boolean;
  groupBy?: "type" | "bucket";
}) {
  // Use the same nested grouping as the desktop view
  const nestedGroups = groupQueriesByPrimaryAndSecondary(
    queries,
    groupBy === "bucket" ? "bucket" : "type",
    groupBy === "bucket" ? "type" : "bucket",
  );

  // Compact type color map
  const typeColors: Record<string, { bg: string; text: string }> = {
    "SEO Query": { bg: "bg-purple-50", text: "text-purple-700" },
    New: { bg: "bg-green-50", text: "text-green-700" },
    Ongoing: { bg: "bg-blue-50", text: "text-blue-700" },
    "On Hold": { bg: "bg-red-50", text: "text-red-700" },
    "Already Allocated": { bg: "bg-orange-50", text: "text-orange-700" },
    Other: { bg: "bg-gray-50", text: "text-gray-700" },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* User Header */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
        <span className="font-bold text-base text-blue-900 truncate">
          {displayUser.name}
          {!displayUser.isKnown && displayUser.email !== "Unassigned" && (
            <span className="text-[10px] text-gray-500 ml-1">(unknown)</span>
          )}
        </span>
        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {queries.length}
        </span>
      </div>

      {/* Grouped Content */}
      <div className="p-1.5 space-y-1.5">
        {queries.length === 0 ? (
          <p className="p-3 text-gray-400 text-sm text-center">No queries</p>
        ) : groupBy === "bucket" ? (
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

              const totalQueries = Object.values(typeGroups).reduce(
                (sum, qs) => sum + qs.length,
                0,
              );

              return (
                <div
                  key={bucketKey}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    borderColor: bucketConfig.color,
                    backgroundColor: `${bucketConfig.color}08`,
                  }}
                >
                  {/* Compact Bucket Header */}
                  <div
                    className="flex items-center justify-between px-2 py-1"
                    style={{ backgroundColor: bucketConfig.color }}
                  >
                    <span className="text-[10px] font-bold text-white uppercase tracking-wide">
                      {bucketConfig.name}
                    </span>
                    <span className="text-white text-[10px] font-bold px-1.5 rounded-full bg-white/25">
                      {totalQueries}
                    </span>
                  </div>

                  {/* Type Sub-groups */}
                  <div className="p-1 space-y-0.5 bg-white">
                    {QUERY_TYPE_ORDER.map((typeName) => {
                      const typeQueries = typeGroups[typeName];
                      if (!typeQueries || typeQueries.length === 0) return null;
                      const colors = typeColors[typeName] || typeColors.Other;

                      return (
                        <div key={`${bucketKey}-${typeName}`}>
                          <div className={`flex items-center justify-between px-1.5 py-0.5 ${colors.bg} rounded`}>
                            <span className={`text-[9px] font-semibold ${colors.text} uppercase`}>
                              {typeName}
                            </span>
                            <span className={`${colors.text} text-[8px] font-bold px-1 rounded bg-white/50`}>
                              {typeQueries.length}
                            </span>
                          </div>
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
                                showDate={showDateOnCards}
                                dateField={dateField}
                                currentUserRole={currentUser?.Role || ""}
                                currentUserEmail={currentUser?.Email || ""}
                                detailView={detailView}
                                isUserView={true}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Other types not in QUERY_TYPE_ORDER */}
                    {Object.entries(typeGroups)
                      .filter(([typeName]) => !QUERY_TYPE_ORDER.includes(typeName))
                      .map(([typeName, typeQueries]) => {
                        const colors = typeColors.Other;
                        return (
                          <div key={`${bucketKey}-${typeName}`}>
                            <div className={`flex items-center justify-between px-1.5 py-0.5 ${colors.bg} rounded`}>
                              <span className={`text-[9px] font-semibold ${colors.text} uppercase`}>{typeName}</span>
                              <span className={`${colors.text} text-[8px] font-bold px-1 rounded bg-white/50`}>{typeQueries.length}</span>
                            </div>
                            <div className="space-y-0.5 mt-0.5">
                              {typeQueries.map((query, idx) => (
                                <QueryCardCompact
                                  key={`${displayUser.email}-${bucketKey}-${typeName}-${query["Query ID"]}-${idx}`}
                                  query={query}
                                  users={users}
                                  bucketColor={BUCKETS[query.Status]?.color || "#gray"}
                                  onClick={() => onSelectQuery(query)}
                                  onAssign={onAssignQuery}
                                  onAssignCall={onAssignCallQuery}
                                  onEdit={onEditQuery}
                                  showDate={showDateOnCards}
                                  dateField={dateField}
                                  currentUserRole={currentUser?.Role || ""}
                                  currentUserEmail={currentUser?.Email || ""}
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
              const totalQueries = Object.values(bucketGroups).reduce(
                (sum, qs) => sum + qs.length,
                0,
              );

              return (
                <div key={typeName} className={`rounded-lg border ${colors.bg} overflow-hidden`} style={{ borderColor: `${colors.text.replace('text-', '')}` }}>
                  {/* Type Header */}
                  <div className={`flex items-center justify-between px-2 py-1 ${colors.bg}`}>
                    <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-wide`}>{typeName}</span>
                    <span className={`${colors.text} text-[10px] font-bold px-1.5 rounded-full bg-white/50`}>{totalQueries}</span>
                  </div>

                  {/* Bucket Sub-groups */}
                  <div className="p-1 space-y-0.5 bg-white">
                    {(displayUser.email === "__BUCKET_A__"
                      ? BUCKET_ORDER
                      : BUCKET_ORDER.filter((key) => key !== "A")
                    ).map((bucketKey) => {
                      const bucketQueries = bucketGroups[bucketKey];
                      if (!bucketQueries || bucketQueries.length === 0) return null;
                      const bucketConfig = BUCKETS[bucketKey];
                      if (!bucketConfig) return null;

                      return (
                        <div key={`${typeName}-${bucketKey}`}>
                          <div className="flex items-center justify-between px-1.5 py-0.5 rounded" style={{ backgroundColor: `${bucketConfig.color}20` }}>
                            <span className="text-[9px] font-semibold uppercase" style={{ color: bucketConfig.color }}>
                              {bucketConfig.name}
                            </span>
                            <span className="text-[8px] font-bold px-1 rounded bg-white/50" style={{ color: bucketConfig.color }}>
                              {bucketQueries.length}
                            </span>
                          </div>
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
                                showDate={showDateOnCards}
                                dateField={dateField}
                                currentUserRole={currentUser?.Role || ""}
                                currentUserEmail={currentUser?.Email || ""}
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

            {/* Other types not in QUERY_TYPE_ORDER */}
            {Object.entries(nestedGroups)
              .filter(([typeName]) => !QUERY_TYPE_ORDER.includes(typeName))
              .map(([typeName, bucketGroups]) => {
                const colors = typeColors.Other;
                const totalQueries = Object.values(bucketGroups).reduce(
                  (sum, qs) => sum + qs.length,
                  0,
                );

                return (
                  <div key={typeName} className={`rounded-lg border ${colors.bg} overflow-hidden`}>
                    <div className={`flex items-center justify-between px-2 py-1 ${colors.bg}`}>
                      <span className={`text-[10px] font-bold ${colors.text} uppercase tracking-wide`}>{typeName}</span>
                      <span className={`${colors.text} text-[10px] font-bold px-1.5 rounded-full bg-white/50`}>{totalQueries}</span>
                    </div>
                    <div className="p-1 space-y-0.5 bg-white">
                      {(displayUser.email === "__BUCKET_A__"
                        ? BUCKET_ORDER
                        : BUCKET_ORDER.filter((key) => key !== "A")
                      ).map((bucketKey) => {
                        const bucketQueries = bucketGroups[bucketKey];
                        if (!bucketQueries || bucketQueries.length === 0) return null;
                        const bucketConfig = BUCKETS[bucketKey];
                        if (!bucketConfig) return null;

                        return (
                          <div key={`${typeName}-${bucketKey}`}>
                            <div className="flex items-center justify-between px-1.5 py-0.5 rounded" style={{ backgroundColor: `${bucketConfig.color}20` }}>
                              <span className="text-[9px] font-semibold uppercase" style={{ color: bucketConfig.color }}>{bucketConfig.name}</span>
                              <span className="text-[8px] font-bold px-1 rounded bg-white/50" style={{ color: bucketConfig.color }}>{bucketQueries.length}</span>
                            </div>
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
                                  showDate={showDateOnCards}
                                  dateField={dateField}
                                  currentUserRole={currentUser?.Role || ""}
                                  currentUserEmail={currentUser?.Email || ""}
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
    </div>
  );
}
