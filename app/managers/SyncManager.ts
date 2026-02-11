/**
 * SyncManager - Centralized data synchronization and optimistic updates
 *
 * Features:
 * - Background refresh every 60 seconds
 * - Optimistic updates (instant UI, background API calls)
 * - Automatic rollback on failure
 * - Cache integration for instant load
 * - Event-based notifications for store updates
 */

import { LocalStorageCache } from "../utils/localStorageCache";
import { Query, User, Preferences } from "../utils/sheets";
import { refreshAccessToken, clearAllAuth } from "../utils/tokenRefresh";

interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Get current date/time in IST (Indian Standard Time, UTC+5:30)
 * Returns format: "DD/MM/YYYY HH:MM:SS"
 */
function getISTDateTime(): string {
  const date = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const istDate = new Date(date.getTime() + istOffset);

  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const year = istDate.getUTCFullYear();
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(istDate.getUTCSeconds()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

export class SyncManager {
  private static instance: SyncManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private constructor() {}

  static getInstance(): SyncManager {
    if (!this.instance) {
      this.instance = new SyncManager();
    }
    return this.instance;
  }

  /**
   * Start automatic background refresh every 60 seconds
   */
  startBackgroundRefresh(): void {
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Start new interval
    this.refreshInterval = setInterval(() => {
      this.refreshInBackground();
    }, 60 * 1000); // 60 seconds
  }

  /**
   * Stop background refresh (call on logout)
   */
  stopBackgroundRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Load data: Try cache first for instant UI, then fetch fresh data
   */
  async loadAllData(): Promise<{
    queries: Query[];
    users: User[];
    preferences: Preferences;
  }> {
    // Try cache first for instant UI
    const cached = LocalStorageCache.loadAll();

    if (cached) {
      // Return cached data immediately
      // Fetch fresh data in background
      this.refreshInBackground();

      return cached;
    }

    // No cache, fetch immediately with loading state
    return await this.fetchAndUpdateCache();
  }

  /**
   * Fetch from API and update cache
   */
  private async fetchAndUpdateCache(): Promise<{
    queries: Query[];
    users: User[];
    preferences: Preferences;
  }> {
    try {
      // Always get fresh token from localStorage (it may have been refreshed)
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        headers: { Authorization: `Bearer ${currentToken}` },
      });

      // Handle unauthorized - token expired, try to refresh
      if (response.status === 401) {
        console.log("🔄 [SYNC] Got 401, attempting token refresh...");
        const refreshResult = await refreshAccessToken();

        if (refreshResult.token) {
          // Retry with new token
          console.log("🔄 [SYNC] Retrying request with refreshed token...");
          const retryResponse = await fetch("/api/queries", {
            headers: { Authorization: `Bearer ${refreshResult.token}` },
          });

          if (retryResponse.ok) {
            const data = await retryResponse.json();
            LocalStorageCache.saveAll({
              queries: data.queries,
              users: data.users,
              preferences: data.preferences,
            });
            return {
              queries: data.queries,
              users: data.users,
              preferences: data.preferences,
            };
          }
        }

        // Only logout if token was actually revoked, not on network error
        if (refreshResult.wasRevoked) {
          console.error("❌ [SYNC] Token revoked, logging out");
          clearAllAuth();
          this.stopBackgroundRefresh();
          this.clearCache();
          window.location.href = "/";
          throw new Error("Unauthorized - token revoked");
        } else {
          // Network error during refresh - let the error propagate, don't logout
          console.warn(
            "⚠️ [SYNC] Token refresh failed (network), will retry later",
          );
          throw new Error("Token refresh failed - network error");
        }
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Update cache
      LocalStorageCache.saveAll({
        queries: data.queries,
        users: data.users,
        preferences: data.preferences,
      });

      return {
        queries: data.queries,
        users: data.users,
        preferences: data.preferences,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper method for POST requests with automatic token refresh on 401
   * Returns the response object or throws an error
   */
  private async fetchWithRetry(url: string, body: object): Promise<Response> {
    const currentToken = localStorage.getItem("auth_token");
    if (!currentToken) {
      throw new Error("No auth token available");
    }

    const makeRequest = async (token: string): Promise<Response> => {
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    };

    let response = await makeRequest(currentToken);

    // If 401, try to refresh token and retry once
    if (response.status === 401) {
      console.log("🔄 [SYNC] POST got 401, attempting token refresh...");
      const refreshResult = await refreshAccessToken();

      if (refreshResult.token) {
        console.log("🔄 [SYNC] Retrying POST with refreshed token...");
        response = await makeRequest(refreshResult.token);
      }

      // If still 401 after refresh attempt, check why
      if (response.status === 401) {
        if (refreshResult.wasRevoked) {
          console.error("❌ [SYNC] Token revoked, logging out");
          clearAllAuth();
          this.stopBackgroundRefresh();
          this.clearCache();
          window.location.href = "/";
          throw new Error("Unauthorized - token revoked");
        } else {
          // Network error during refresh - don't logout, let error propagate
          console.warn(
            "⚠️ [SYNC] Token refresh failed (network), will retry later",
          );
          throw new Error("Token refresh failed - network error");
        }
      }
    }

    return response;
  }

  /**
   * Background refresh (silent, no loading state)
   * Fetches fresh data and notifies store via CustomEvent
   */
  private async refreshInBackground(): Promise<void> {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    try {
      const data = await this.fetchAndUpdateCache();

      // Notify store to update with fresh data
      // Store will listen for this event and update state
      window.dispatchEvent(
        new CustomEvent("data-refreshed", {
          detail: data,
        }),
      );
    } catch (error) {
      // Silent failure - don't interrupt user
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Manual refresh (with loading state)
   */
  async refreshManually(): Promise<SyncResult> {
    try {
      const data = await this.fetchAndUpdateCache();

      window.dispatchEvent(
        new CustomEvent("data-refreshed", {
          detail: data,
        }),
      );

      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Refresh failed",
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OPTIMISTIC UPDATE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Optimistic add query
   */
  async addQueryOptimistic(
    queryData: Partial<Query>,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<{ success: boolean; error?: string; tempId?: string }> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = getISTDateTime();

    // Create optimistic query with all required fields
    const newQuery: any = {
      "Query ID": tempId,
      "Query Description": queryData["Query Description"] || "",
      "Query Type": queryData["Query Type"] || "New",
      Status: queryData.Status || "A", // Use provided status (e.g., "B" if allocated) or default to "A"
      "Added By": currentUserEmail,
      "Added Date Time": now,
      "Assigned To": queryData["Assigned To"] || "",
      "Assigned By": queryData["Assigned By"] || "",
      "Assignment Date Time": queryData["Assignment Date Time"] || "",
      Remarks: "",
      "Proposal Sent Date Time": "",
      "Whats Pending": "",
      "Entered In SF Date Time": "",
      "Event ID in SF": "",
      "Event Title in SF": "",
      "Discarded Date Time": "",
      GmIndicator: queryData.GmIndicator || "", // Include GM Indicator from input
      "Delete Requested Date Time": "",
      "Delete Requested By": "",
      "Last Edited Date Time": now,
      "Last Edited By": currentUserEmail,
      "Last Activity Date Time": now,
      // Deletion workflow fields (Bucket H)
      "Previous Status": "",
      "Delete Approved By": "",
      "Delete Approved Date Time": "",
      "Delete Rejected": "",
      _isPending: true,
      _tempId: tempId,
    };

    // Optimistic update
    const optimisticQueries = [newQuery, ...currentQueries];
    updateStore(optimisticQueries);

    try {
      // Create a clean query object without internal flags for API
      const queryForApi = { ...newQuery };
      delete queryForApi._isPending;
      delete queryForApi._tempId;

      const response = await this.fetchWithRetry("/api/queries", {
        action: "add",
        data: queryForApi,
      });

      if (!response.ok) {
        throw new Error("Failed to add query");
      }

      const result = await response.json();

      // Update with real ID from server
      const finalQueries = optimisticQueries.map((q: any) => {
        if (q._tempId === tempId) {
          const updated = { ...q };
          updated["Query ID"] = result.queryId || tempId;
          delete updated._tempId;
          delete updated._isPending;
          return updated;
        }
        return q;
      });

      updateStore(finalQueries);
      LocalStorageCache.saveQueries(finalQueries);

      return { success: true, tempId };
    } catch (error: any) {
      // Rollback - remove the optimistic query
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to add query",
      };
    }
  }

  /**
   * Batch add multiple queries in a single atomic operation.
   * If the batch fails, all queries stay in drafts (rolled back).
   * If the batch succeeds, all queries are added and drafts can be cleared.
   */
  async batchAddQueriesOptimistic(
    queriesData: Partial<Query>[],
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<{ success: boolean; error?: string; queryIds?: string[] }> {
    if (!queriesData || queriesData.length === 0) {
      return { success: false, error: "No queries to add" };
    }

    console.log(`[SyncManager] Batch adding ${queriesData.length} queries`);
    const now = getISTDateTime();

    // Create optimistic queries with temp IDs
    const optimisticQueries: any[] = queriesData.map((queryData, index) => {
      const tempId = `temp_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

      // If query is assigned, set assignment audit trail optimistically
      const isAssigned = !!queryData["Assigned To"];

      return {
        "Query ID": tempId,
        "Query Description": queryData["Query Description"] || "",
        "Query Type": queryData["Query Type"] || "New",
        Status: queryData.Status || "A",
        "Added By": currentUserEmail,
        "Added Date Time": now,
        "Assigned To": queryData["Assigned To"] || "",
        "Assigned By": isAssigned ? queryData["Assigned To"] : "", // Self-assignment
        "Assignment Date Time": isAssigned ? now : "",
        Remarks: "",
        "Proposal Sent Date Time": "",
        "Whats Pending": "",
        "Entered In SF Date Time": "",
        "Event ID in SF": "",
        "Event Title in SF": "",
        "Discarded Date Time": "",
        GmIndicator: queryData.GmIndicator || "",
        "Delete Requested Date Time": "",
        "Delete Requested By": "",
        "Last Edited Date Time": now,
        "Last Edited By": currentUserEmail,
        "Last Activity Date Time": now,
        "Previous Status": "",
        "Delete Approved By": "",
        "Delete Approved Date Time": "",
        "Delete Rejected": "",
        _isPending: true,
        _tempId: tempId,
      };
    });

    // Optimistic update - add all at once
    const optimisticStore = [...optimisticQueries, ...currentQueries];
    updateStore(optimisticStore);

    try {
      // Prepare queries for API (remove internal flags)
      const queriesForApi = optimisticQueries.map((q) => {
        const clean = { ...q };
        delete clean._isPending;
        delete clean._tempId;
        return clean;
      });

      const response = await this.fetchWithRetry("/api/queries", {
        action: "batchAdd",
        data: { queries: queriesForApi },
      });

      if (!response.ok) {
        throw new Error("Failed to batch add queries");
      }

      const result = await response.json();
      const realIds = result.queryIds || [];

      // Update with real IDs from server
      const finalQueries = optimisticStore.map((q: any, index: number) => {
        if (q._isPending && index < realIds.length) {
          const updated = { ...q };
          updated["Query ID"] = realIds[index];
          delete updated._tempId;
          delete updated._isPending;
          return updated;
        }
        return q;
      });

      updateStore(finalQueries);
      LocalStorageCache.saveQueries(finalQueries);

      console.log(
        `[SyncManager] Successfully batch added ${queriesData.length} queries`,
      );
      return { success: true, queryIds: realIds };
    } catch (error: any) {
      // Rollback ALL - keep in drafts
      console.error(
        `[SyncManager] Batch add failed, rolling back:`,
        error.message,
      );
      updateStore(currentQueries);

      return {
        success: false,
        error:
          error.message ||
          "Failed to batch add queries. They remain in drafts.",
      };
    }
  }

  /**
   * Optimistic assign query

   * 1. Update UI immediately (optimistic)
   * 2. Send API request in background
   * 3. On success: Update cache
   * 4. On failure: Rollback UI, show error
   */
  async assignQueryOptimistic(
    queryId: string,
    assignee: string,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find current query to get its status
    const currentQuery = currentQueries.find((q) => q["Query ID"] === queryId);
    const currentStatus = currentQuery?.Status || "";

    // Step 1: Optimistic update (immediate UI change)
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        return {
          ...q,
          "Assigned To": assignee,
          "Assigned By": currentUserEmail,
          "Assignment Date Time": now,
          "Last Activity Date Time": now,
          // Move from A to B if unassigned
          Status: q.Status === "A" ? "B" : q.Status,
        };
      }
      return q;
    });

    updateStore(optimisticQueries); // UI updates instantly

    // Step 2: API call in background
    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "assign",
        queryId,
        data: {
          assignee,
          assignedBy: currentUserEmail,
          // HYBRID APPROACH: Send current status to avoid extra API call
          _currentStatus: currentStatus,
        },
      });

      if (!response.ok) {
        throw new Error("Assignment failed");
      }

      // Step 3: Success - Update cache
      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Query assigned successfully" },
      };
    } catch (error: any) {
      // Step 4: Failure - Rollback
      updateStore(currentQueries); // Restore original state

      return {
        success: false,
        error: error.message || "Failed to assign query",
      };
    }
  }

  /**
   * Optimistic assign to call (Bucket A only, no status change)
   * Updates "Assigned To Call", "Assigned To Call By", "Assigned To Call Time" - query stays in current bucket
   */
  async assignCallOptimistic(
    queryId: string,
    assignee: string,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Step 1: Optimistic update (immediate UI change)
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        return {
          ...q,
          "Assigned To Call": assignee,
          "Assigned To Call By": assignee ? currentUserEmail : "",
          "Assigned To Call Time": assignee ? now : "",
          "Last Activity Date Time": now,
          // NO status change - stays in current bucket
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    // Step 2: API call in background
    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "assignCall",
        queryId,
        data: { assignee, assignedBy: currentUserEmail },
      });

      if (!response.ok) {
        throw new Error("Call assignment failed");
      }

      // Step 3: Success - Update cache
      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Call assigned successfully" },
      };
    } catch (error: any) {
      // Step 4: Failure - Rollback
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to assign call",
      };
    }
  }

  /**
   * Optimistic update query
   */
  async updateQueryOptimistic(
    queryId: string,
    updates: Partial<Query>,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find the current query to get its Remarks value
    const currentQuery = currentQueries.find((q) => q["Query ID"] === queryId);
    const currentRemarks = currentQuery?.Remarks || "";

    // Optimistic update
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        const updatedQuery = {
          ...q,
          ...updates,
          "Last Edited Date Time": now,
          "Last Edited By": currentUserEmail,
          "Last Activity Date Time": now,
        };

        // If remarks are being updated, also update remark audit trail optimistically
        if (updates.Remarks !== undefined && updates.Remarks !== q.Remarks) {
          updatedQuery["Remark Added By"] = currentUserEmail;
          updatedQuery["Remark Added Date Time"] = now;
        }

        return updatedQuery;
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "edit",
        queryId,
        data: {
          ...updates,
          "Last Edited By": currentUserEmail,
          // HYBRID APPROACH: Send current Remarks to avoid extra API call
          _currentRemarks: currentRemarks,
        },
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Query updated successfully" },
      };
    } catch (error: any) {
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to update query",
      };
    }
  }

  /**
   * Optimistic delete query
   */
  async deleteQueryOptimistic(
    queryId: string,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    requestedBy: string,
    isAdmin: boolean = false,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Both Admin and Non-admin: Move to Bucket H (soft delete)
    // Admin: Auto-approved (won't show in Pending Deletions header)
    // Junior: Pending approval (shows in Pending Deletions for admin to approve)
    const queryToMove = currentQueries.find((q) => q["Query ID"] === queryId);
    if (!queryToMove) {
      return { success: false, error: "Query not found" };
    }

    const previousStatus = queryToMove.Status;

    // Build updated query based on admin status
    const baseUpdates = {
      Status: "H",
      "Previous Status": previousStatus,
      "Delete Requested Date Time": now,
      "Delete Requested By": requestedBy,
      "Last Activity Date Time": now,
      // Clear any previous rejection fields (in case this was rejected before)
      "Delete Rejected": "",
      "Delete Rejected By": "",
      "Delete Rejected Date Time": "",
    };

    const updatedQuery: Query = isAdmin
      ? {
          ...queryToMove,
          ...baseUpdates,
          // Admin: Auto-approve (won't show in Pending Deletions)
          "Delete Approved By": requestedBy,
          "Delete Approved Date Time": now,
        }
      : {
          ...queryToMove,
          ...baseUpdates,
          // Junior: Pending approval (shows in Pending Deletions)
          // Don't set Delete Approved fields - leave them empty
        };

    const optimisticQueries = currentQueries.map((q) =>
      q["Query ID"] === queryId ? updatedQuery : q,
    );
    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "delete",
        queryId,
        data: {
          requestedBy,
          isAdmin,
          // HYBRID APPROACH: Send current status to avoid extra API call
          _currentStatus: queryToMove.Status,
        },
      });

      if (!response.ok) {
        throw new Error("Delete request failed");
      }

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: {
          message: isAdmin
            ? "Query moved to Deleted bucket"
            : "Delete request submitted for approval",
          status: "H",
        },
      };
    } catch (error: any) {
      updateStore(currentQueries);
      return {
        success: false,
        error: error.message || "Failed to submit delete request",
      };
    }
  }

  /**
   * Approve a pending deletion (Admin only) - keeps query in H bucket with approval info
   */
  async approveDeleteOptimistic(
    queryId: string,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    approvedBy?: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Optimistically update the query to show approval (stays in H bucket)
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        return {
          ...q,
          Status: "H" as const,
          "Delete Approved By": approvedBy || "",
          "Delete Approved Date Time": now,
          // Keep "Delete Requested By" and "Delete Requested Date Time" for audit trail
          "Last Activity Date Time": now,
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "approveDelete",
        queryId,
        data: { approvedBy },
      });

      if (!response.ok) {
        throw new Error("Approve delete failed");
      }

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Deletion approved - query moved to Deleted bucket" },
      };
    } catch (error: any) {
      // Rollback - restore the query to pending state
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to approve deletion",
      };
    }
  }

  /**
   * Reject a pending deletion (Admin only) - restores query to previous status
   */
  async rejectDeleteOptimistic(
    queryId: string,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    rejectedBy?: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find the query and get its previous status
    const queryToRestore = currentQueries.find(
      (q) => q["Query ID"] === queryId,
    );
    if (!queryToRestore) {
      return { success: false, error: "Query not found" };
    }

    const previousStatus = queryToRestore["Previous Status"] || "A";

    // Restore to previous status with Del-Rej flag
    const optimisticQueries = currentQueries.map((q) =>
      q["Query ID"] === queryId
        ? {
            ...q,
            Status: previousStatus,
            "Previous Status": "",
            // KEEP "Delete Requested By" and "Delete Requested Date Time" for audit trail
            "Delete Rejected": "true", // Shows "Del-Rej" indicator
            "Delete Rejected By": rejectedBy || "", // For audit trail
            "Delete Rejected Date Time": now, // For audit trail
            "Last Activity Date Time": now,
          }
        : q,
    );

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "rejectDelete",
        queryId,
        data: { rejectedBy },
      });

      if (!response.ok) {
        throw new Error("Reject delete failed");
      }

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: {
          message: "Deletion rejected, query restored",
          restoredStatus: previousStatus,
        },
      };
    } catch (error: any) {
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to reject deletion",
      };
    }
  }

  /**
   * Approve ALL pending deletions (Admin/Pseudo Admin only)
   * Batch operation with optimistic updates
   */
  async approveAllDeletesOptimistic(
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find all pending deletions
    const pendingDeletions = currentQueries.filter(
      (q) =>
        q["Delete Requested By"] &&
        !q["Delete Approved By"] &&
        !q["Delete Rejected"],
    );

    if (pendingDeletions.length === 0) {
      return {
        success: true,
        data: { message: "No pending deletions to approve", approved: 0 },
      };
    }

    // Optimistic update: approve all pending deletions
    const optimisticQueries = currentQueries.map((q) => {
      const isPending = pendingDeletions.some(
        (pd) => pd["Query ID"] === q["Query ID"],
      );
      if (isPending) {
        return {
          ...q,
          Status: "H",
          "Delete Approved By": currentUserEmail,
          "Delete Approved Date Time": now,
          "Last Activity Date Time": now,
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "approveAllDeletes",
        data: { approvedBy: currentUserEmail },
      });

      if (!response.ok) {
        throw new Error("Approve all deletions failed");
      }

      const result = await response.json();

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: {
          message: `Approved ${result.approved} deletion(s)`,
          approved: result.approved,
          failed: result.failed,
          total: result.total,
        },
      };
    } catch (error: any) {
      // Rollback on failure
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to approve all deletions",
      };
    }
  }

  /**
   * Reject ALL pending deletions (Admin/Pseudo Admin only)
   * Batch operation with optimistic updates
   */
  async rejectAllDeletesOptimistic(
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find all pending deletions
    const pendingDeletions = currentQueries.filter(
      (q) =>
        q["Delete Requested By"] &&
        !q["Delete Approved By"] &&
        !q["Delete Rejected"],
    );

    if (pendingDeletions.length === 0) {
      return {
        success: true,
        data: { message: "No pending deletions to reject", rejected: 0 },
      };
    }

    // Optimistic update: reject all pending deletions
    const optimisticQueries = currentQueries.map((q) => {
      const pendingQuery = pendingDeletions.find(
        (pd) => pd["Query ID"] === q["Query ID"],
      );
      if (pendingQuery) {
        const previousStatus = q["Previous Status"] || "A";
        return {
          ...q,
          Status: previousStatus,
          "Previous Status": "",
          "Delete Rejected": "true",
          "Delete Rejected By": currentUserEmail,
          "Delete Rejected Date Time": now,
          "Last Activity Date Time": now,
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "rejectAllDeletes",
        data: { rejectedBy: currentUserEmail },
      });

      if (!response.ok) {
        throw new Error("Reject all deletions failed");
      }

      const result = await response.json();

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: {
          message: `Rejected ${result.rejected} deletion(s)`,
          rejected: result.rejected,
          failed: result.failed,
          total: result.total,
        },
      };
    } catch (error: any) {
      // Rollback on failure
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to reject all deletions",
      };
    }
  }

  /**
   * Optimistic status update
   */
  async updateStatusOptimistic(
    queryId: string,
    newStatus: string,
    fields: Partial<Query>,
    currentQueries: Query[],
    updateStore: (queries: Query[]) => void,
    currentUserEmail: string,
  ): Promise<SyncResult> {
    const now = getISTDateTime();

    // Find the query to update
    const targetQuery = currentQueries.find((q) => q["Query ID"] === queryId);
    if (!targetQuery) {
      return {
        success: false,
        error: "Query not found",
      };
    }

    // Optimistic update
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        const updated: any = {
          ...q,
          Status: newStatus,
          ...fields,
          "Last Activity Date Time": now,
        };

        // If remarks are being updated, also update remark audit trail optimistically
        if (fields.Remarks !== undefined && fields.Remarks !== q.Remarks) {
          updated["Remark Added By"] = currentUserEmail;
          updated["Remark Added Date Time"] = now;
        }

        // CRITICAL: If "Assigned To" is being set/changed, update assignment audit trail optimistically
        if (
          fields["Assigned To"] !== undefined &&
          fields["Assigned To"] !== q["Assigned To"]
        ) {
          updated["Assigned By"] = currentUserEmail;
          updated["Assignment Date Time"] = now;
        }

        // Auto-fill date fields based on status
        if (
          ["C", "D"].includes(newStatus) &&
          !updated["Proposal Sent Date Time"]
        ) {
          updated["Proposal Sent Date Time"] = now;
        }
        if (
          ["E", "F"].includes(newStatus) &&
          !updated["Entered In SF Date Time"]
        ) {
          updated["Entered In SF Date Time"] = now;
        }
        if (newStatus === "G") {
          updated["Discarded Date Time"] = now;
        }

        // Clear fields when moving BACKWARDS to earlier buckets
        // Define bucket order: A < B < C < D < E < F < G < H
        const bucketOrder = ["A", "B", "C", "D", "E", "F", "G", "H"];
        const oldIndex = bucketOrder.indexOf(q.Status);
        const newIndex = bucketOrder.indexOf(newStatus);

        if (newIndex >= 0 && oldIndex >= 0 && newIndex < oldIndex) {
          // Moving backwards - clear fields that don't belong in the target bucket

          // Moving to A: Clear ALL fields except Query Description, Type, Added By/Date
          if (newStatus === "A") {
            updated["Assigned To"] = "";
            updated["Assigned By"] = "";
            updated["Assignment Date Time"] = "";

            updated["Proposal Sent Date Time"] = "";
            updated["Whats Pending"] = "";
            updated["Entered In SF Date Time"] = "";
            updated["Event ID in SF"] = "";
            updated["Event Title in SF"] = "";
            updated["GmIndicator"] = "";
            updated["Discarded Date Time"] = "";
            updated["Delete Requested By"] = "";
            updated["Delete Requested Date Time"] = "";
            updated["Previous Status"] = "";
            updated["Delete Rejected"] = "";
          }
          // Moving to B: Clear proposal, SF, discard, and deletion fields
          else if (newStatus === "B") {
            updated["Proposal Sent Date Time"] = "";
            updated["Whats Pending"] = "";
            updated["Entered In SF Date Time"] = "";
            updated["Event ID in SF"] = "";
            updated["Event Title in SF"] = "";
            updated["GmIndicator"] = "";
            updated["Discarded Date Time"] = "";
            updated["Delete Requested By"] = "";
            updated["Delete Requested Date Time"] = "";
            updated["Previous Status"] = "";
            updated["Delete Rejected"] = "";
          }
          // Moving to C or D: Clear SF, discard, and deletion fields
          else if (["C", "D"].includes(newStatus)) {
            updated["Entered In SF Date Time"] = "";
            updated["Event ID in SF"] = "";
            updated["Event Title in SF"] = "";
            updated["GmIndicator"] = "";
            updated["Discarded Date Time"] = "";
            updated["Delete Requested By"] = "";
            updated["Delete Requested Date Time"] = "";
            updated["Previous Status"] = "";
            updated["Delete Rejected"] = "";
          }
          // Moving to E or F: Clear discard and deletion fields
          else if (["E", "F"].includes(newStatus)) {
            updated["Discarded Date Time"] = "";
            updated["Delete Requested By"] = "";
            updated["Delete Requested Date Time"] = "";
            updated["Previous Status"] = "";
            updated["Delete Rejected"] = "";
          }
          // Moving to G: Clear deletion fields only
          else if (newStatus === "G") {
            updated["Delete Requested By"] = "";
            updated["Delete Requested Date Time"] = "";
            updated["Previous Status"] = "";
            updated["Delete Rejected"] = "";
          }
        }

        return updated;
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      const response = await this.fetchWithRetry("/api/queries", {
        action: "updateStatus",
        queryId,
        data: {
          newStatus,
          fields,
          // HYBRID APPROACH: Send current values to avoid extra API calls
          _currentStatus: targetQuery.Status,
          _previousStatus: targetQuery["Previous Status"],
          _currentRemarks: targetQuery.Remarks || "",
          _lastEditedBy: currentUserEmail,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Status update failed: ${response.status} ${errorText}`,
        );
      }

      const responseData = await response.json();

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Status updated successfully" },
      };
    } catch (error: any) {
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to update status",
      };
    }
  }

  /**
   * Clear cache (call on logout)
   */
  clearCache(): void {
    LocalStorageCache.clear();
  }
}
