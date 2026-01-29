"use client";

import { useState } from "react";
import { Query, User } from "../utils/sheets";
import { BUCKETS, BUCKET_ORDER, QUERY_TYPE_ORDER } from "../config/sheet-constants";
import { QueryCardCompact } from "./QueryCardCompact";
import { UserViewDefault } from "./UserViewDefault";
import { UserViewLinear } from "./UserViewLinear";
import { DateFieldKey } from "../utils/queryFilters";

interface UserViewProps {
  groupedQueries: Record<string, Query[]>;
  users: User[];
  currentUser: User | null;
  columnCount: 2 | 3 | 4;
  viewMode: "default" | "linear";
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  isFilterExpanded?: boolean;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
}

export function UserView({
  groupedQueries,
  users,
  currentUser,
  columnCount,
  viewMode,
  onSelectQuery,
  onAssignQuery,
  onEditQuery,
  isFilterExpanded = true,
  showDateOnCards = false,
  dateField = "Added Date Time",
}: UserViewProps) {
  const currentEmail = currentUser?.Email?.toLowerCase();
  const [activeTab, setActiveTab] = useState<string>("");

  // Get all unique assignees from groupedQueries (these are email addresses)
  const allAssignees = Object.keys(groupedQueries);

  // Create a list of users to display
  const displayUsers: Array<{ email: string; name: string; isKnown: boolean }> = [];

  // First, add all known users that have assigned queries
  users.forEach((user) => {
    if (!user.Email) return;
    
    const matchingKey = allAssignees.find(
      (k) => k.toLowerCase() === user.Email.toLowerCase()
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
    if (assignee === "Unassigned") return;
    const isKnown = displayUsers.some(
      (u) => u.email.toLowerCase() === assignee.toLowerCase()
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

  // Sort: Current user first, then known users alphabetically, then unknown
  const sortedUsers = [...displayUsers].sort((a, b) => {
    if (a.email.toLowerCase() === currentEmail) return -1;
    if (b.email.toLowerCase() === currentEmail) return 1;
    if (a.isKnown && !b.isKnown) return -1;
    if (!a.isKnown && b.isKnown) return 1;
    if (a.email === "Unassigned") return 1;
    if (b.email === "Unassigned") return -1;
    return a.name.localeCompare(b.name);
  });

  // Set default active tab for mobile
  if (!activeTab && sortedUsers.length > 0) {
    setActiveTab(sortedUsers[0].email);
  }

  // If no users to display, show a message
  if (sortedUsers.length === 0) {
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
      <div className="md:hidden overflow-x-auto pb-2 mb-2 -mx-4 px-4 flex gap-1.5 no-scrollbar">
        {sortedUsers.map((displayUser) => (
          <button
            key={displayUser.email}
            onClick={() => setActiveTab(displayUser.email)}
            className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
              activeTab === displayUser.email
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {displayUser.name} ({groupedQueries[displayUser.email]?.length || 0})
          </button>
        ))}
      </div>

      {/* Desktop View - Default or Linear */}
      <div className="hidden md:block">
        {viewMode === "default" ? (
          <UserViewDefault
            sortedUsers={sortedUsers}
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onEditQuery={onEditQuery}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
          />
        ) : (
          <UserViewLinear
            sortedUsers={sortedUsers}
            groupedQueries={groupedQueries}
            users={users}
            columnCount={columnCount}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onEditQuery={onEditQuery}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
          />
        )}
      </div>

      {/* Mobile Single Column View */}
      <div className="md:hidden space-y-4">
        {activeTab && sortedUsers.find((u) => u.email === activeTab) && (
          <MobileUserColumn
            displayUser={sortedUsers.find((u) => u.email === activeTab)!}
            queries={groupedQueries[activeTab] || []}
            users={users}
            currentUser={currentUser}
            onSelectQuery={onSelectQuery}
            onAssignQuery={onAssignQuery}
            onEditQuery={onEditQuery}
            showDateOnCards={showDateOnCards}
            dateField={dateField}
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
  onEditQuery,
  showDateOnCards = false,
  dateField = "Added Date Time",
}: {
  displayUser: { email: string; name: string; isKnown: boolean };
  queries: Query[];
  users: User[];
  currentUser: User | null;
  onSelectQuery: (query: Query) => void;
  onAssignQuery: (query: Query, assignee: string) => void;
  onEditQuery: (query: Query) => void;
  showDateOnCards?: boolean;
  dateField?: DateFieldKey;
}) {
  const sortedQueries = [...queries].sort((a, b) => {
    const typeA = (a["Query Type"] || "").trim();
    const typeB = (b["Query Type"] || "").trim();
    const indexA = QUERY_TYPE_ORDER.indexOf(typeA);
    const indexB = QUERY_TYPE_ORDER.indexOf(typeB);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
        <span className="font-bold text-lg text-blue-900 truncate">
          {displayUser.name}
          {!displayUser.isKnown && displayUser.email !== "Unassigned" && (
            <span className="text-xs text-gray-500 ml-2">(unknown)</span>
          )}
        </span>
        <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
          {sortedQueries.length}
        </span>
      </div>
      <div className="p-2 space-y-2">
        {sortedQueries.map((q, idx) => (
          <QueryCardCompact
            key={`${displayUser.email}-${q["Query ID"]}-${idx}`}
            query={q}
            users={users}
            bucketColor={BUCKETS[q.Status]?.color || "#gray"}
            onClick={() => onSelectQuery(q)}
            onAssign={onAssignQuery}
            onEdit={onEditQuery}
            showDate={showDateOnCards}
            dateField={dateField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
          />
        ))}
      </div>
    </div>
  );
}
