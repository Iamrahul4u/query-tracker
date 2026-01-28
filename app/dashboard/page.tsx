"use client";

import { useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useAuth } from "../hooks/useAuth";
import { useDashboardPreferences } from "../hooks/useDashboardPreferences";
import { useToast } from "../hooks/useToast";
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
import {
  getVisibleQueries,
  groupQueriesByBucket,
  groupQueriesByUser,
  calculateStats,
} from "../utils/queryFilters";
import { Query } from "../utils/sheets";

export default function Dashboard() {
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Computed data
  const visibleQueries = getVisibleQueries(queries, currentUser);
  const groupedByBucket = groupQueriesByBucket(visibleQueries, historyDays);
  const groupedByUser = groupQueriesByUser(visibleQueries);
  const stats = calculateStats(visibleQueries);

  // Handlers
  const handleAssignQuery = (query: Query, assignee: string) => {
    assignQueryOptimistic(query["Query ID"], assignee);
  };

  // Loading state
  if (!authChecked || (isLoading && queries.length === 0)) {
    return (
      <LoadingScreen
        message={
          !authChecked ? "Checking authentication..." : "Loading queries..."
        }
      />
    );
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
      />

      {/* Main Content */}
      <main className="w-full px-4 py-6">
        {viewMode === "bucket" && (
          <BucketView
            groupedQueries={groupedByBucket}
            users={users}
            columnCount={columnCount}
            viewMode={bucketViewMode}
            onSelectQuery={setSelectedQuery}
            onAssignQuery={handleAssignQuery}
            onEditQuery={setQueryToEdit}
            isFilterExpanded={isFilterExpanded}
          />
        )}

        {viewMode === "user" && (
          <UserView
            groupedQueries={groupedByUser}
            users={users}
            currentUser={currentUser}
            columnCount={columnCount}
            onSelectQuery={setSelectedQuery}
            onAssignQuery={handleAssignQuery}
            onEditQuery={setQueryToEdit}
          />
        )}
      </main>

      {/* Modals */}
      {selectedQuery && (
        <QueryDetailModal
          query={selectedQuery}
          onClose={() => setSelectedQuery(null)}
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
