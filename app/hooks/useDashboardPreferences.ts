import { useEffect, useState, useCallback } from "react";
import { useQueryStore } from "../stores/queryStore";
import { DateFieldKey } from "../utils/queryFilters";
import { Preferences, ViewPreferences } from "../utils/sheets";

type ViewMode = "bucket" | "user" | "list";
type BucketViewMode = "default" | "linear";
type ColumnCount = 2 | 3 | 4;
type HistoryDays = 3 | 7;

const LOCALSTORAGE_KEY_PREFIX = "dashboard_prefs_";

/**
 * Custom hook to manage dashboard preferences
 * - Syncs with store preferences
 * - Saves to localStorage first (instant)
 * - Then persists to backend (async)
 * - Separate preferences for Bucket View and User View
 */
export function useDashboardPreferences() {
  const { preferences, savePreferences } = useQueryStore();

  const [viewMode, setViewMode] = useState<ViewMode>("bucket");
  const [bucketViewMode, setBucketViewMode] =
    useState<BucketViewMode>("default");
  const [columnCount, setColumnCount] = useState<ColumnCount>(4);
  const [historyDays, setHistoryDays] = useState<HistoryDays>(3);
  const [detailView, setDetailView] = useState<boolean>(false);
  const [sortField, setSortField] = useState<DateFieldKey | undefined>(
    undefined,
  );
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [sortBuckets, setSortBuckets] = useState<string[]>(["ALL"]);
  const [groupBy, setGroupBy] = useState<"type" | "bucket">("bucket");

  // Track if there are unsaved changes
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Get current user email for localStorage key
  const userEmail = localStorage.getItem("user_email") || "default";
  const localStorageKey = `${LOCALSTORAGE_KEY_PREFIX}${userEmail}`;

  // Load preferences from localStorage ONLY (ignore backend until save)
  useEffect(() => {
    // Always start with defaults
    const defaultPrefs: Preferences = {
      preferredView: "bucket",
      bucketViewPrefs: {
        layout: "default",
        columns: 4,
        detailView: false,
        sortField: "",
        sortAscending: true,
        sortBuckets: "ALL",
        groupBy: "bucket",
      },
      userViewPrefs: {
        layout: "default",
        columns: 4,
        detailView: false,
        sortField: "",
        sortAscending: true,
        sortBuckets: "ALL",
        groupBy: "bucket",
      },
    };

    let prefs = { ...defaultPrefs };

    // ONLY check localStorage (instant, most recent, source of truth)
    const cached = localStorage.getItem(localStorageKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        prefs = {
          preferredView: parsed.preferredView || defaultPrefs.preferredView,
          bucketViewPrefs: {
            ...defaultPrefs.bucketViewPrefs,
            ...parsed.bucketViewPrefs,
          },
          userViewPrefs: {
            ...defaultPrefs.userViewPrefs,
            ...parsed.userViewPrefs,
          },
        };
      } catch (e) {
        // Use defaults on error
      }
    }

    // Apply preferences to state
    setViewMode(prefs.preferredView as ViewMode);

    // Load view-specific preferences
    const viewPrefs =
      prefs.preferredView === "bucket"
        ? prefs.bucketViewPrefs
        : prefs.userViewPrefs;

    setBucketViewMode((viewPrefs.layout || "default") as BucketViewMode);
    setColumnCount((viewPrefs.columns || 4) as ColumnCount);
    setDetailView(viewPrefs.detailView || false);
    setSortField(viewPrefs.sortField || undefined);
    setSortAscending(viewPrefs.sortAscending !== false);
    setGroupBy((viewPrefs.groupBy || "bucket") as "type" | "bucket");

    // Parse sortBuckets
    if (viewPrefs.sortBuckets === "ALL" || !viewPrefs.sortBuckets) {
      setSortBuckets(["ALL"]);
    } else {
      setSortBuckets(viewPrefs.sortBuckets.split(",").map((b) => b.trim()));
    }
  }, [localStorageKey]); // ONLY depend on localStorageKey, NOT backend preferences

  // Switch view and load its preferences
  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);

    // Load preferences for the new view from localStorage
    const cached = localStorage.getItem(localStorageKey);
    if (cached) {
      try {
        const prefs: Preferences = JSON.parse(cached);
        const viewPrefs =
          mode === "bucket" ? prefs.bucketViewPrefs : prefs.userViewPrefs;

        if (viewPrefs) {
          setBucketViewMode((viewPrefs.layout || "default") as BucketViewMode);
          setColumnCount((viewPrefs.columns || 4) as ColumnCount);
          setDetailView(viewPrefs.detailView || false);
          setSortField(viewPrefs.sortField || undefined);
          setSortAscending(viewPrefs.sortAscending !== false);
          setGroupBy((viewPrefs.groupBy || "bucket") as "type" | "bucket");

          if (viewPrefs.sortBuckets === "ALL" || !viewPrefs.sortBuckets) {
            setSortBuckets(["ALL"]);
          } else {
            setSortBuckets(
              viewPrefs.sortBuckets.split(",").map((b) => b.trim()),
            );
          }
        }
      } catch (e) {
        // Use defaults on error
        setBucketViewMode("default");
        setColumnCount(4);
        setDetailView(false);
        setSortField(undefined);
        setSortAscending(true);
        setSortBuckets(["ALL"]);
        setGroupBy("bucket");
      }
    }

    // Mark as changed to save preferred view
    setHasPendingChanges(true);
  };

  // Update functions - mark as pending
  const updateBucketViewMode = (mode: BucketViewMode) => {
    setBucketViewMode(mode);
    setHasPendingChanges(true);
  };

  const updateColumnCount = (count: ColumnCount) => {
    setColumnCount(count);
    setHasPendingChanges(true);
  };

  const updateHistoryDays = (days: HistoryDays) => {
    setHistoryDays(days);
    // Don't mark as pending - historyDays is not saved
  };

  const updateDetailView = (detail: boolean) => {
    setDetailView(detail);
    setHasPendingChanges(true);
  };

  const updateSortField = (field: DateFieldKey | undefined) => {
    setSortField(field);
    setHasPendingChanges(true);
  };

  const updateSortAscending = (ascending: boolean) => {
    setSortAscending(ascending);
    setHasPendingChanges(true);
  };

  const updateSortBuckets = (buckets: string[]) => {
    setSortBuckets(buckets);
    setHasPendingChanges(true);
  };

  const updateGroupBy = (mode: "type" | "bucket") => {
    setGroupBy(mode);
    setHasPendingChanges(true);
  };

  const clearSort = () => {
    setSortField(undefined);
    setSortAscending(true);
    setSortBuckets(["ALL"]);
    setHasPendingChanges(true);
  };

  // Save function - localStorage first, then backend
  const saveView = useCallback(async () => {
    // Build view preferences object
    const viewPrefs: ViewPreferences = {
      layout: bucketViewMode,
      columns: columnCount,
      detailView,
      sortField: sortField || "",
      sortAscending,
      sortBuckets:
        sortBuckets.includes("ALL") || sortBuckets.length === 0
          ? "ALL"
          : sortBuckets.join(","),
      groupBy, // Include groupBy in saved preferences
    };

    // Load existing preferences from localStorage
    let existingPrefs: Preferences | null = null;
    const cached = localStorage.getItem(localStorageKey);
    if (cached) {
      try {
        existingPrefs = JSON.parse(cached);
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Build complete preferences object
    const prefsToSave: Preferences = {
      preferredView: viewMode as "bucket" | "user",
      bucketViewPrefs:
        viewMode === "bucket"
          ? viewPrefs
          : existingPrefs?.bucketViewPrefs || viewPrefs,
      userViewPrefs:
        viewMode === "user"
          ? viewPrefs
          : existingPrefs?.userViewPrefs || viewPrefs,
    };

    // 1. Save to localStorage FIRST (instant)
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(prefsToSave));
    } catch (e) {
      // Ignore storage errors
    }

    // 2. Save to backend (async)
    await savePreferences(prefsToSave);
    setHasPendingChanges(false);
  }, [
    viewMode,
    bucketViewMode,
    columnCount,
    detailView,
    sortField,
    sortAscending,
    sortBuckets,
    groupBy,
    savePreferences,
    localStorageKey,
  ]);

  return {
    viewMode,
    bucketViewMode,
    columnCount,
    historyDays,
    detailView,
    sortField,
    sortAscending,
    sortBuckets,
    groupBy,
    hasPendingChanges,
    updateViewMode,
    updateBucketViewMode,
    updateColumnCount,
    updateHistoryDays,
    updateDetailView,
    updateSortField,
    updateSortAscending,
    updateSortBuckets,
    updateGroupBy,
    clearSort,
    saveView,
  };
}
