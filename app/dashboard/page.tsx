"use client";

import { useState, useEffect } from "react";
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
  sortQueriesForBucket,
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
    detailView,
    sortField,
    sortAscending,
    sortBuckets,
    hasPendingChanges,
    updateViewMode,
    updateBucketViewMode,
    updateColumnCount,
    updateHistoryDays,
    updateDetailView,
    updateSortField,
    updateSortAscending,
    updateSortBuckets,
    clearSort,
    saveView,
  } = useDashboardPreferences();

  // Store
  const {
    queries,
    users,
    currentUser,
    isLoading,
    assignQueryOptimistic,
    approveDeleteOptimistic,
    rejectDeleteOptimistic,
  } = useQueryStore();

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
  // Date display state (not persisted)
  const [showDateOnCards, setShowDateOnCards] = useState(false);
  // Extended days per bucket (for Load +7 Days feature)
  const [extendedDays, setExtendedDays] = useState<Record<string, number>>({});
  // Loading state for Load +7 Days button
  const [loadingBuckets, setLoadingBuckets] = useState<Set<string>>(new Set());

  // Keep selectedQuery in sync with store updates (for optimistic updates)
  // Use a ref to track the selected query ID to avoid infinite loops
  useEffect(() => {
    if (selectedQuery) {
      const selectedId = selectedQuery["Query ID"];
      const updatedQuery = queries.find((q) => q["Query ID"] === selectedId);
      if (
        updatedQuery &&
        JSON.stringify(updatedQuery) !== JSON.stringify(selectedQuery)
      ) {
        setSelectedQuery(updatedQuery);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queries]); // Only depend on queries, not selectedQuery

  // Computed data
  const visibleQueries = getVisibleQueries(queries, currentUser);
  const filteredQueries = filterBySearch(visibleQueries, searchQuery);

  // Apply historyDays filter (for both views)
  // Use extended days for F/G/H if set, otherwise use global historyDays
  const historyFilteredQueries = filteredQueries.filter((query) => {
    const bucket = query.Status;
    const effectiveDays = extendedDays[bucket] || historyDays;
    return filterByHistoryDays([query], effectiveDays).length > 0;
  });

  // Helper to apply sorting (custom or default per bucket)
  const applySorting = (queries: Query[], bucket?: string): Query[] => {
    if (bucket) {
      // Bucket-specific sorting with custom field if set
      return sortQueriesForBucket(
        queries,
        bucket,
        sortField,
        sortAscending,
        sortBuckets,
      );
    }
    // For user view or general sorting, use custom field or Added Date Time
    const field = sortField || "Added Date Time";
    return sortQueriesByDate(queries, field, sortAscending);
  };

  // Group by bucket - use historyFilteredQueries (already filtered with extendedDays)
  // Pass large number to prevent double-filtering inside groupQueriesByBucket
  const groupedByBucketRaw = groupQueriesByBucket(historyFilteredQueries, 999);
  const groupedByBucket = Object.fromEntries(
    Object.entries(groupedByBucketRaw).map(([bucket, queries]) => [
      bucket,
      applySorting(queries, bucket),
    ]),
  );

  // Group by user (now with historyDays filter and sorting applied)
  const groupedByUserRaw = groupQueriesByUser(historyFilteredQueries);
  const groupedByUser = Object.fromEntries(
    Object.entries(groupedByUserRaw).map(([user, queries]) => [
      user,
      applySorting(queries),
    ]),
  );

  // Stats calculated from visible queries (before search filter) to show total counts
  const stats = calculateStats(visibleQueries);

  // Handlers
  const handleAssignQuery = (query: Query, assignee: string) => {
    assignQueryOptimistic(query["Query ID"], assignee);
  };

  const handleApproveDelete = (query: Query) => {
    approveDeleteOptimistic(query["Query ID"]);
  };

  const handleRejectDelete = (query: Query) => {
    rejectDeleteOptimistic(query["Query ID"]);
  };

  const handleLoadMore = (bucketKey: string) => {
    // Set loading state
    setLoadingBuckets((prev) => new Set(prev).add(bucketKey));

    // Update extended days
    setExtendedDays((prev) => {
      const current = prev[bucketKey] || historyDays;
      // Increment by 7 days: 3 → 10 → 17 → 24...
      return { ...prev, [bucketKey]: current + 7 };
    });

    // Clear loading state after a brief delay (for visual feedback)
    setTimeout(() => {
      setLoadingBuckets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(bucketKey);
        return newSet;
      });
    }, 300);
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
        onSortFieldChange={updateSortField}
        sortAscending={sortAscending}
        onSortAscendingChange={updateSortAscending}
        sortBuckets={sortBuckets}
        onSortBucketsChange={updateSortBuckets}
        onClearSort={clearSort}
        showDateOnCards={showDateOnCards}
        onShowDateOnCardsChange={setShowDateOnCards}
        detailView={detailView}
        onDetailViewChange={updateDetailView}
        hasPendingChanges={hasPendingChanges}
        onSaveView={saveView}
        currentUserRole={currentUser?.Role || ""}
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
        {(viewMode === "bucket" ||
          (viewMode === "user" &&
            (currentUser?.Role || "").toLowerCase() === "junior")) && (
          <BucketView
            groupedQueries={groupedByBucket}
            users={users}
            columnCount={columnCount}
            viewMode={bucketViewMode}
            onSelectQuery={setSelectedQuery}
            onAssignQuery={handleAssignQuery}
            onEditQuery={setQueryToEdit}
            onApproveDelete={handleApproveDelete}
            onRejectDelete={handleRejectDelete}
            onLoadMore={handleLoadMore}
            extendedDays={extendedDays}
            loadingBuckets={loadingBuckets}
            isFilterExpanded={isFilterExpanded}
            showDateOnCards={showDateOnCards}
            dateField={sortField}
            currentUserRole={currentUser?.Role || ""}
            currentUserEmail={currentUser?.Email || ""}
            detailView={detailView}
          />
        )}

        {/* User View - Hidden for Junior users (Senior/Admin only) */}
        {viewMode === "user" &&
          !((currentUser?.Role || "").toLowerCase() === "junior") && (
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
              detailView={detailView}
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
