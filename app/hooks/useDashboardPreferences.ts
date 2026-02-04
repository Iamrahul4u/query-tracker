import { useEffect, useState } from "react";
import { useQueryStore } from "../stores/queryStore";
import { DateFieldKey } from "../utils/queryFilters";

type ViewMode = "bucket" | "user" | "list";
type BucketViewMode = "default" | "linear";
type ColumnCount = 2 | 3 | 4;
type HistoryDays = 3 | 7;

/**
 * Custom hook to manage dashboard preferences
 * - Syncs with store preferences
 * - Persists changes to backend
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

  // Sync from store preferences
  useEffect(() => {
    if (preferences) {
      if (preferences.ViewType) setViewMode(preferences.ViewType as ViewMode);
      if (preferences.BucketViewMode)
        setBucketViewMode(preferences.BucketViewMode as BucketViewMode);

      // Validate and clamp column count to 2-4 range
      if (preferences.ColumnCount) {
        const count = preferences.ColumnCount;
        // If saved value is 5, 6, or 7, default to 4
        if (count >= 5) {
          setColumnCount(4);
          // Save the corrected value
          savePreferences({ ColumnCount: 4 });
        } else if (count >= 2 && count <= 4) {
          setColumnCount(count as ColumnCount);
        }
      }

      if (preferences.HistoryDays)
        setHistoryDays(preferences.HistoryDays as HistoryDays);

      if (preferences.DetailView !== undefined)
        setDetailView(preferences.DetailView);

      if (preferences.SortField !== undefined)
        setSortField(preferences.SortField as DateFieldKey);

      if (preferences.SortAscending !== undefined)
        setSortAscending(preferences.SortAscending);

      if (preferences.SortBuckets !== undefined)
        setSortBuckets(preferences.SortBuckets);
    }
  }, [preferences]);

  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    savePreferences({ ViewType: mode });
  };

  const updateBucketViewMode = (mode: BucketViewMode) => {
    setBucketViewMode(mode);
    savePreferences({ BucketViewMode: mode });
  };

  const updateColumnCount = (count: ColumnCount) => {
    console.log("Updating column count to:", count);
    setColumnCount(count);
    savePreferences({ ColumnCount: count });
  };

  const updateHistoryDays = (days: HistoryDays) => {
    setHistoryDays(days);
    savePreferences({ HistoryDays: days });
  };

  const updateDetailView = (detail: boolean) => {
    setDetailView(detail);
    savePreferences({ DetailView: detail });
  };

  const updateSortField = (field: DateFieldKey | undefined) => {
    setSortField(field);
    savePreferences({ SortField: field || "" });
  };

  const updateSortAscending = (ascending: boolean) => {
    setSortAscending(ascending);
    savePreferences({ SortAscending: ascending });
  };

  const updateSortBuckets = (buckets: string[]) => {
    setSortBuckets(buckets);
    // Save as comma-separated string or "ALL"
    const value =
      buckets.includes("ALL") || buckets.length === 0
        ? "ALL"
        : buckets.join(",");
    savePreferences({ SortBuckets: [value] });
  };

  const clearSort = () => {
    setSortField(undefined);
    setSortAscending(true);
    setSortBuckets(["ALL"]);
    savePreferences({
      SortField: "",
      SortAscending: true,
      SortBuckets: ["ALL"],
    });
  };

  return {
    viewMode,
    bucketViewMode,
    columnCount,
    historyDays,
    detailView,
    sortField,
    sortAscending,
    sortBuckets,
    updateViewMode,
    updateBucketViewMode,
    updateColumnCount,
    updateHistoryDays,
    updateDetailView,
    updateSortField,
    updateSortAscending,
    updateSortBuckets,
    clearSort,
  };
}
