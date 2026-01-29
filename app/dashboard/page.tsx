"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useAuth } from "../hooks/useAuth";
import { useDashboardPreferences } from "../hooks/useDashboardPreferences";
import { useToast } from "../hooks/useToast";
import { AuthProvider } from "../components/AuthProvider";
import { DashboardHeader } from "../components/DashboardHeader";
import { CollapsibleFilterBar } from "../components/CollapsibleFilterBar";
import { BucketView } from "../components/BucketView";
import { UserView } from "../components/UserView";
import { QueryDetailModal } from "../components/QueryDetailModal";
import { AddQueryModal } from "../components/AddQueryModal";
import { EditQueryModal } from "../components/EditQueryModal";
import { LoadingScreen } from "../components/LoadingScreen";
import { GlobalTooltip } from "../components/GlobalTooltip";
import { ToastContainer } from "../components/Toast";
import { PendingDeletions } from "../components/PendingDeletions";
import {
  getVisibleQueries,
  groupQueriesByBucket,
  groupQueriesByUser,
  calculateStats,
  filterBySearch,
  filterByHistoryDays,
  sortQueriesByDate,
  DateFieldKey,
} from "../utils/queryFilters";
import { Query } from "../utils/sheets";

function DashboardContent() {
  // Hooks
  const { authChecked, logout } = useAuth();
  const {
    viewMode,
    bucketViewMode,
    columnCount,
    historyDays,
    updateViewMode,
    updateBucketViewMode,
    updateColumnCount,
    updateHistoryDays,
  } = useDashboardPreferences();

  // Store
  const { queries, users, currentUser, isLoading, assignQueryOptimistic } =
    useQueryStore();

  // Toast notifications
  const { toasts, hideToast } = useToast();

  // Auto-refresh (only after auth)
  useAutoRefresh(60000, authChecked);

  // Local state
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [queryToEdit, setQueryToEdit] = useState<Query | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  // Sorting and date display state
  const [sortField, setSortField] = useState<DateFieldKey>("Added Date Time");
  const [sortAscending, setSortAscending] = useState(true);
  const [showDateOnCards, setShowDateOnCards] = useState(false);

  // Computed data
  const visibleQueries = getVisibleQueries(queries, currentUser);
  const filteredQueries = filterBySearch(visibleQueries, searchQuery);
  
  // Apply historyDays filter (for both views)
  const historyFilteredQueries = filterByHistoryDays(filteredQueries, historyDays);
  
  // Group by bucket (already applies history filter internally, but using pre-filtered for consistency)
  const groupedByBucketRaw = groupQueriesByBucket(filteredQueries, historyDays);
  const groupedByBucket = Object.fromEntries(
    Object.entries(groupedByBucketRaw).map(([bucket, queries]) => [
      bucket,
      sortQueriesByDate(queries, sortField, sortAscending),
    ])
  );
  
  // Group by user (now with historyDays filter and sorting applied)
  const groupedByUserRaw = groupQueriesByUser(historyFilteredQueries);
  const groupedByUser = Object.fromEntries(
    Object.entries(groupedByUserRaw).map(([user, queries]) => [
      user,
      sortQueriesByDate(queries, sortField, sortAscending),
    ])
  );
  
  // Stats calculated from visible queries (before search filter) to show total counts
  const stats = calculateStats(visibleQueries);

  // Handlers
  const handleAssignQuery = (query: Query, assignee: string) => {
    assignQueryOptimistic(query["Query ID"], assignee);
  };

  // Loading state - removed authChecked check since AuthProvider handles it
  if (isLoading && queries.length === 0) {
    return <LoadingScreen message="Loading queries..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        currentUser={currentUser}
        stats={stats}
        onAddQuery={() => setIsAddModalOpen(true)}
        onLogout={logout}
      />

      {/* Filter Bar */}
      <CollapsibleFilterBar
        viewMode={viewMode}
        setViewMode={updateViewMode}
        bucketViewMode={bucketViewMode}
        setBucketViewMode={updateBucketViewMode}
        columnCount={columnCount}
        setColumnCount={updateColumnCount}
        historyDays={historyDays}
        setHistoryDays={updateHistoryDays}
        onCollapseChange={setIsFilterExpanded}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortAscending={sortAscending}
        onSortAscendingChange={setSortAscending}
        showDateOnCards={showDateOnCards}
        onShowDateOnCardsChange={setShowDateOnCards}
      />

      {/* Pending Deletions (Admin only) */}
      <div className="px-4">
        <PendingDeletions
          queries={queries}
          users={users}
          currentUserRole={currentUser?.Role || ""}
        />
      </div>

      {/* Main Content */}
      <main className="w-full px-4 py-6">
        {/* Bucket View - Also shown for Junior when viewMode is "user" (they can't access User View) */}
        {(viewMode === "bucket" || (viewMode === "user" && (currentUser?.Role || "").toLowerCase() === "junior")) && (
          <BucketView
            groupedQueries={groupedByBucket}
            users={users}
            columnCount={columnCount}
            viewMode={bucketViewMode}
            onSelectQuery={setSelectedQuery}
            onAssignQuery={handleAssignQuery}
            onEditQuery={setQueryToEdit}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={sortField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
          />
        )}

        {/* User View - Hidden for Junior users (Senior/Admin only) */}
        {viewMode === "user" && !((currentUser?.Role || "").toLowerCase() === "junior") && (
          <UserView
            groupedQueries={groupedByUser}
            users={users}
            currentUser={currentUser}
            columnCount={columnCount}
            viewMode={bucketViewMode}
            onSelectQuery={setSelectedQuery}
            onAssignQuery={handleAssignQuery}
            onEditQuery={setQueryToEdit}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={sortField}
          />
        )}
      </main>

      {/* Modals */}
      {selectedQuery && (
        <QueryDetailModal
          query={selectedQuery}
          users={users}
          currentUser={currentUser}
          onClose={() => setSelectedQuery(null)}
          onEdit={(query) => {
            setSelectedQuery(null);
            setQueryToEdit(query);
          }}
        />
      )}

      {isAddModalOpen && (
        <AddQueryModal onClose={() => setIsAddModalOpen(false)} />
      )}

      {queryToEdit && (
        <EditQueryModal
          query={queryToEdit}
          onClose={() => setQueryToEdit(null)}
        />
      )}

      {/* Global Tooltip - Renders centrally */}
      <GlobalTooltip />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
