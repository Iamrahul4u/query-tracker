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

export class SyncManager {
  private static instance: SyncManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private token: string = "";

  private constructor() {}

  static getInstance(): SyncManager {
    if (!this.instance) {
      this.instance = new SyncManager();
    }
    return this.instance;
  }

  /**
   * Initialize SyncManager with auth token and start background refresh
   * Can be called multiple times to update token
   */
  initialize(token: string): void {
    this.token = token;

    // Restart background refresh with new token
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.startBackgroundRefresh();
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

    console.log("✓ Background refresh started (60s interval)");
  }

  /**
   * Stop background refresh (call on logout)
   */
  stopBackgroundRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log("✓ Background refresh stopped");
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
      console.log("✓ Loaded from cache (instant)");

      // Return cached data immediately
      // Fetch fresh data in background
      this.refreshInBackground();

      return cached;
    }

    // No cache, fetch immediately with loading state
    console.log("⟳ No cache, fetching from server...");
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
      const response = await fetch("/api/queries", {
        headers: { Authorization: `Bearer ${this.token}` },
      });

      // Handle unauthorized - token expired
      if (response.status === 401) {
        console.warn("Token expired, logging out...");
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

      console.log("✓ Data fetched and cached");

      return {
        queries: data.queries,
        users: data.users,
        preferences: data.preferences,
      };
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }

  /**
   * Background refresh (silent, no loading state)
   * Fetches fresh data and notifies store via CustomEvent
   */
  private async refreshInBackground(): Promise<void> {
    if (this.isSyncing) {
      console.log("⊘ Refresh skipped (already syncing)");
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

      console.log("✓ Background refresh complete");
    } catch (error) {
      console.error("Background refresh failed:", error);
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
    const now = new Date().toLocaleString("en-GB");

    // Create optimistic query
    const newQuery: any = {
      "Query ID": tempId,
      "Query Description": queryData["Query Description"] || "",
      "Query Type": queryData["Query Type"] || "New",
      Status: "A",
      "Added By": currentUserEmail,
      "Added Date Time": now,
      "Assigned To": "",
      "Assigned By": "",
      "Assignment Date Time": "",
      Remarks: "",
      "Proposal Sent Date Time": "",
      "Whats Pending": "",
      "Entered In SF Date Time": "",
      "Event ID": "",
      "Event Title": "",
      "Discarded Date Time": "",
      GmIndicator: "",
      "Delete Requested Date Time": "",
      "Delete Requested By": "",
      "Last Edited Date Time": now,
      "Last Edited By": currentUserEmail,
      "Last Activity Date Time": now,
      _isPending: true,
      _tempId: tempId,
    };

    // Optimistic update
    const optimisticQueries = [newQuery, ...currentQueries];
    updateStore(optimisticQueries);

    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          action: "add",
          data: queryData,
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
    const now = new Date().toLocaleString("en-GB");

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
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          action: "assign",
          queryId,
          data: { assignee },
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
    const now = new Date().toLocaleString("en-GB");

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
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
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
  ): Promise<SyncResult> {
    // Optimistic delete (remove from UI)
    const optimisticQueries = currentQueries.filter(
      (q) => q["Query ID"] !== queryId,
    );

    updateStore(optimisticQueries);

    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          action: "delete",
          queryId,
        }),
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      LocalStorageCache.saveQueries(optimisticQueries);

      return {
        success: true,
        data: { message: "Query deleted successfully" },
      };
    } catch (error: any) {
      updateStore(currentQueries);

      return {
        success: false,
        error: error.message || "Failed to delete query",
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
    console.log("🔄 SyncManager.updateStatusOptimistic called");
    console.log("  Query ID:", queryId);
    console.log("  New Status:", newStatus);
    console.log("  Fields:", JSON.stringify(fields, null, 2));
    console.log("  Current user:", currentUserEmail);

    const now = new Date().toLocaleString("en-GB");

    // Find the query to update
    const targetQuery = currentQueries.find((q) => q["Query ID"] === queryId);
    if (!targetQuery) {
      console.error("❌ Query not found:", queryId);
      return {
        success: false,
        error: "Query not found",
      };
    }

    console.log("  Target query current status:", targetQuery.Status);
    console.log(
      "  Target query description:",
      targetQuery["Query Description"],
    );

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

        console.log("  Optimistic update applied:", {
          oldStatus: q.Status,
          newStatus: updated.Status,
          description: updated["Query Description"],
        });

        return updated;
      }
      return q;
    });

    updateStore(optimisticQueries);
    console.log("  ✅ UI updated optimistically");

    console.log("📤 Sending status update to API...");
    console.log(
      "  Payload:",
      JSON.stringify(
        {
          action: "updateStatus",
          queryId,
          data: { newStatus, fields },
        },
        null,
        2,
      ),
    );

    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          action: "updateStatus",
          queryId,
          data: { newStatus, fields },
        }),
      });

      console.log("📥 API response status:", response.status);
      console.log("📥 API response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API error response:", errorText);
        throw new Error(
          `Status update failed: ${response.status} ${errorText}`,
        );
      }

      const responseData = await response.json();
      console.log("✅ Status update successful, response:", responseData);

      LocalStorageCache.saveQueries(optimisticQueries);
      console.log("✅ Cache updated");

      return {
        success: true,
        data: { message: "Status updated successfully" },
      };
    } catch (error: any) {
      console.error("❌ Status update failed:", error);
      console.error("❌ Error details:", error.message);
      updateStore(currentQueries);
      console.log("↩️ Rolled back to original state");

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
    console.log("✓ Cache cleared");
  }
}
