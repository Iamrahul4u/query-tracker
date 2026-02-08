import { useEffect } from "react";
import { useQueryStore } from "../stores/queryStore";

export function useAutoRefresh(intervalMs = 60000, enabled = true) {
  const refreshFromServer = useQueryStore((state) => state.refreshFromServer);
  const pendingActions = useQueryStore((state) => state.pendingActions);

  useEffect(() => {
    // Don't start until enabled (auth checked)
    if (!enabled) return;

    // Set up polling (no initial fetch - queryStore.initialize() handles that)
    const interval = setInterval(() => {
      // Only refresh if no pending actions (avoid conflicts)
      if (pendingActions.length === 0) {
        refreshFromServer();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [refreshFromServer, pendingActions.length, intervalMs, enabled]);
}
