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

      // Handle unauthorized - token expired
      if (response.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_email");
        this.stopBackgroundRefresh();
        this.clearCache();
        window.location.href = "/";
        throw new Error("Unauthorized - token expired");
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

      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "add",
          data: queryForApi, // Send full query object, not partial
        }),
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
      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "assign",
          queryId,
          data: { assignee, assignedBy: currentUserEmail },
        }),
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

    // Optimistic update
    const optimisticQueries = currentQueries.map((q) => {
      if (q["Query ID"] === queryId) {
        return {
          ...q,
          ...updates,
          "Last Edited Date Time": now,
          "Last Edited By": currentUserEmail,
          "Last Activity Date Time": now,
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "edit",
          queryId,
          data: updates,
        }),
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

    if (isAdmin) {
      // Admin: Move to Bucket H (soft delete, can be permanently removed later)
      // Changed from permanent delete based on Feb 5th meeting - all deletes go to H first
      const queryToMove = currentQueries.find((q) => q["Query ID"] === queryId);
      if (!queryToMove) {
        return { success: false, error: "Query not found" };
      }

      const previousStatus = queryToMove.Status;
      const updatedQuery: Query = {
        ...queryToMove,
        Status: "H",
        "Previous Status": previousStatus,
        "Deleted Date Time": now,
        "Delete Requested By": requestedBy,
        "Delete Rejected": "",
        "Last Activity Date Time": now,
      };

      const optimisticQueries = currentQueries.map((q) =>
        q["Query ID"] === queryId ? updatedQuery : q,
      );
      updateStore(optimisticQueries);

      try {
        const currentToken = localStorage.getItem("auth_token");
        if (!currentToken) {
          throw new Error("No auth token available");
        }

        const response = await fetch("/api/queries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            action: "update",
            queryId,
            data: {
              Status: "H",
              "Previous Status": previousStatus,
              "Deleted Date Time": now,
              "Delete Requested By": requestedBy,
              "Delete Rejected": "",
              "Last Activity Date Time": now,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Delete failed");
        }

        LocalStorageCache.saveQueries(optimisticQueries);

        return {
          success: true,
          data: { message: "Moved to Deleted bucket" },
        };
      } catch (error: any) {
        updateStore(currentQueries);
        return {
          success: false,
          error: error.message || "Failed to delete query",
        };
      }
    } else {
      // Non-admin: Move to Bucket H (Pending Approval)
      const queryToMove = currentQueries.find((q) => q["Query ID"] === queryId);
      if (!queryToMove) {
        return { success: false, error: "Query not found" };
      }

      // Store previous status and move to H
      const previousStatus = queryToMove.Status;
      const updatedQuery: Query = {
        ...queryToMove,
        Status: "H",
        "Previous Status": previousStatus,
        "Delete Requested Date Time": now,
        "Delete Requested By": requestedBy,
        "Delete Rejected": "", // Clear any previous rejection
        "Last Activity Date Time": now,
      };

      const optimisticQueries = currentQueries.map((q) =>
        q["Query ID"] === queryId ? updatedQuery : q,
      );
      updateStore(optimisticQueries);

      try {
        // Always get fresh token from localStorage
        const currentToken = localStorage.getItem("auth_token");
        if (!currentToken) {
          throw new Error("No auth token available");
        }

        const response = await fetch("/api/queries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            action: "delete",
            queryId,
            data: { requestedBy, isAdmin },
          }),
        });

        if (!response.ok) {
          throw new Error("Delete request failed");
        }

        LocalStorageCache.saveQueries(optimisticQueries);

        return {
          success: true,
          data: {
            message: "Delete request submitted for approval",
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
          "Delete Requested By": "", // Clear pending request
          "Delete Requested Date Time": "",
          "Last Activity Date Time": now,
        };
      }
      return q;
    });

    updateStore(optimisticQueries);

    try {
      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "approveDelete",
          queryId,
          data: { approvedBy },
        }),
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
            "Delete Requested By": "",
            "Delete Requested Date Time": "",
            "Delete Rejected": "true", // Shows "Del-Rej" indicator
            "Delete Rejected By": rejectedBy || "", // For audit trail
            "Delete Rejected Date Time": now, // For audit trail
            "Last Activity Date Time": now,
          }
        : q,
    );

    updateStore(optimisticQueries);

    try {
      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "rejectDelete",
          queryId,
          data: { rejectedBy },
        }),
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
            updated["Remarks"] = "";
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
      // Always get fresh token from localStorage
      const currentToken = localStorage.getItem("auth_token");
      if (!currentToken) {
        throw new Error("No auth token available");
      }

      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          action: "updateStatus",
          queryId,
          data: { newStatus, fields },
        }),
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
