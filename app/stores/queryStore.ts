import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { Query, User, Preferences } from "../utils/sheets";
import { SyncManager } from "../managers/SyncManager";
import { useToast } from "../hooks/useToast";

interface PendingAction {
  id: string;
  type: "add" | "assign" | "updateStatus" | "edit" | "delete" | "batch";
  data?: any;
  queryId?: string;
  previousState?: any;
  timestamp: number;
  retries: number;
  changes?: any[];
}

interface QueryState {
  // Data
  queries: Query[];
  users: User[];
  currentUser: User | null;
  preferences: Preferences | null;

  // UI State
  isLoading: boolean;
  lastSyncedAt: Date | null;

  // Sync State
  pendingActions: PendingAction[];
  syncStatus: "idle" | "syncing" | "error";
  syncError: string | null;

  // Actions (Instant)
  initialize: (token: string) => Promise<void>;
  setQueries: (queries: Query[]) => void;
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  addQueryOptimistic: (query: Partial<Query>) => Promise<string>; // Returns temp ID
  assignQueryOptimistic: (
    queryId: string,
    assignee: string,
    remarks?: string,
  ) => Promise<void>;
  updateStatusOptimistic: (
    queryId: string,
    newStatus: string,
    fields?: Partial<Query>,
  ) => Promise<void>;
  editQueryOptimistic: (
    queryId: string,
    updates: Partial<Query>,
  ) => Promise<void>;

  deleteQueryOptimistic: (queryId: string) => Promise<void>;
  savePreferences: (prefs: Partial<Preferences>) => Promise<void>;

  // Sync Actions (Background)
  syncPendingActions: () => Promise<void>;
  refreshFromServer: () => Promise<void>;

  // Rollback
  rollbackAction: (actionId: string) => void;
}

export const useQueryStore = create<QueryState>()(
  immer((set, get) => {
    // Listen for background refresh events from SyncManager
    if (typeof window !== "undefined") {
      window.addEventListener("data-refreshed", ((event: CustomEvent) => {
        const { queries, users, preferences } = event.detail;

        set((state) => {
          // Smart merge: Keep local optimistic changes, update rest
          const pendingQueryIds = new Set(
            state.pendingActions.map((a) => a.queryId || a.id),
          );

          // Update queries, preserving pending ones
          state.queries = queries.map((serverQuery: Query) => {
            if (pendingQueryIds.has(serverQuery["Query ID"])) {
              // Keep local version for pending items
              return (
                state.queries.find(
                  (q) => q["Query ID"] === serverQuery["Query ID"],
                ) || serverQuery
              );
            }
            return serverQuery;
          });

          // Add any local-only queries (temp IDs)
          const localOnlyQueries: any[] = state.queries.filter(
            (q: any) => q._tempId,
          );
          if (localOnlyQueries.length > 0) {
            state.queries = [
              ...localOnlyQueries,
              ...state.queries.filter((q: any) => !q._tempId),
            ];
          }

          state.users = users;
          state.preferences = preferences;
          state.lastSyncedAt = new Date();
        });
      }) as EventListener);
    }

    return {
      queries: [],
      users: [],
      currentUser: null,
      preferences: null,
      isLoading: true,
      lastSyncedAt: null,
      pendingActions: [],
      syncStatus: "idle",
      syncError: null,

      // ═══════════════════════════════════════════════════════════════
      // INITIALIZE - Load from cache or fetch
      // ═══════════════════════════════════════════════════════════════
      initialize: async (token: string) => {
        const syncManager = SyncManager.getInstance();
        syncManager.initialize(token);

        set({ isLoading: true });

        try {
          const data = await syncManager.loadAllData();

          set((state) => {
            state.queries = data.queries;
            state.users = data.users;
            state.preferences = data.preferences;
            state.isLoading = false;
            state.lastSyncedAt = new Date();

            // Set current user
            const userEmail = localStorage.getItem("user_email");
            if (userEmail) {
              const emailLower = userEmail.toLowerCase();
              const foundUser = state.users.find(
                (u: User) => u.Email?.toLowerCase() === emailLower,
              );
              if (foundUser) {
                state.currentUser = foundUser;
              } else {
                // Fallback for unknown users
                state.currentUser = {
                  Email: userEmail,
                  Name: userEmail.split("@")[0],
                  Role: "Junior",
                  "Display Order": "999",
                  "Is Active": "TRUE",
                };
              }
            }
          });
        } catch (error) {
          console.error("Initialize error:", error);
          set({ isLoading: false });
          useToast.getState().showToast("Failed to load data", "error");
        }
      },

      setQueries: (queries) => set({ queries, isLoading: false }),
      setUsers: (users) => set({ users }),
      setCurrentUser: (user) => set({ currentUser: user }),

      // ═══════════════════════════════════════════════════════════════
      // OPTIMISTIC ADD QUERY (Using SyncManager)
      // ═══════════════════════════════════════════════════════════════
      addQueryOptimistic: async (queryData) => {
        const syncManager = SyncManager.getInstance();
        const currentQueries = get().queries;
        const currentUser = get().currentUser;

        const result = await syncManager.addQueryOptimistic(
          queryData,
          currentQueries,
          (queries) => set({ queries }),
          currentUser?.Email || "",
        );

        if (result.success) {
          useToast.getState().showToast("Query added successfully", "success");
          return result.tempId || "";
        } else {
          useToast
            .getState()
            .showToast(result.error || "Failed to add query", "error");
          return "";
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // OPTIMISTIC ASSIGN (Using SyncManager)
      // ═══════════════════════════════════════════════════════════════
      assignQueryOptimistic: async (queryId, assignee, remarks = "") => {
        const syncManager = SyncManager.getInstance();
        const currentQueries = get().queries;
        const currentUser = get().currentUser;

        const result = await syncManager.assignQueryOptimistic(
          queryId,
          assignee,
          currentQueries,
          (queries) => set({ queries }),
          currentUser?.Email || "",
        );

        if (result.success) {
          useToast
            .getState()
            .showToast("Query assigned successfully", "success");
        } else {
          useToast
            .getState()
            .showToast(result.error || "Failed to assign query", "error");
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // OPTIMISTIC STATUS UPDATE (Using SyncManager)
      // ═══════════════════════════════════════════════════════════════
      updateStatusOptimistic: async (queryId, newStatus, fields = {}) => {
        const syncManager = SyncManager.getInstance();
        const currentQueries = get().queries;
        const currentUser = get().currentUser;

        // Add pending action to block background refresh
        const pendingId = `status_${queryId}_${Date.now()}`;
        set((state) => {
          state.pendingActions.push({
            id: pendingId,
            type: "updateStatus",
            queryId,
            data: { newStatus, fields },
            timestamp: Date.now(),
            retries: 0,
          });
        });

        const result = await syncManager.updateStatusOptimistic(
          queryId,
          newStatus,
          fields,
          currentQueries,
          (queries) => set({ queries }),
          currentUser?.Email || "",
        );

        // Remove pending action
        set((state) => {
          state.pendingActions = state.pendingActions.filter(
            (a) => a.id !== pendingId,
          );
        });

        if (result.success) {
          useToast
            .getState()
            .showToast("Status updated successfully", "success");
        } else {
          useToast
            .getState()
            .showToast(result.error || "Failed to update status", "error");
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // OPTIMISTIC EDIT (Using SyncManager)
      // ═══════════════════════════════════════════════════════════════
      editQueryOptimistic: async (queryId, updates) => {
        const syncManager = SyncManager.getInstance();
        const currentQueries = get().queries;
        const currentUser = get().currentUser;

        const result = await syncManager.updateQueryOptimistic(
          queryId,
          updates,
          currentQueries,
          (queries) => set({ queries }),
          currentUser?.Email || "",
        );

        if (result.success) {
          useToast
            .getState()
            .showToast("Query updated successfully", "success");
        } else {
          useToast
            .getState()
            .showToast(result.error || "Failed to update query", "error");
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // OPTIMISTIC DELETE (Using SyncManager)
      // ═══════════════════════════════════════════════════════════════
      deleteQueryOptimistic: async (queryId) => {
        const syncManager = SyncManager.getInstance();
        const currentQueries = get().queries;

        const result = await syncManager.deleteQueryOptimistic(
          queryId,
          currentQueries,
          (queries) => set({ queries }),
        );

        if (result.success) {
          useToast
            .getState()
            .showToast("Query deleted successfully", "success");
        } else {
          useToast
            .getState()
            .showToast(result.error || "Failed to delete query", "error");
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // BACKGROUND REFRESH (Manual trigger)
      // ═══════════════════════════════════════════════════════════════
      refreshFromServer: async () => {
        const syncManager = SyncManager.getInstance();
        const result = await syncManager.refreshManually();

        // Don't show success toast for refresh (silent)
        // Only show error if it fails
        if (!result.success) {
          useToast
            .getState()
            .showToast(result.error || "Refresh failed", "error");
        }
      },

      // ═══════════════════════════════════════════════════════════════
      // PREFERENCES
      // ═══════════════════════════════════════════════════════════════
      savePreferences: async (prefs) => {
        // Optimistic update
        set((state) => {
          if (state.preferences) {
            Object.assign(state.preferences, prefs);
          } else {
            state.preferences = prefs as Preferences;
          }
        });

        const token = localStorage.getItem("auth_token");
        if (!token) return;

        try {
          await fetch("/api/preferences", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(prefs),
          });
        } catch (e) {
          console.error("Failed to save preferences", e);
        }
      },

      // Legacy methods kept for backward compatibility
      syncPendingActions: async () => {
        // No longer used - SyncManager handles this
        console.warn("syncPendingActions is deprecated");
      },

      rollbackAction: (actionId: string) => {
        // No longer used - SyncManager handles this
        console.warn("rollbackAction is deprecated");
      },
    };
  }),
);
