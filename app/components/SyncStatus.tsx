import { useQueryStore } from '../stores/queryStore';

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

export function SyncStatus() {
  const { syncStatus, pendingActions, lastSyncedAt, syncError } =
    useQueryStore();

  return (
    <div className="flex items-center gap-2 text-xs">
      {syncStatus === "syncing" && (
        <span className="flex items-center gap-1 text-blue-600">
          <RefreshIcon className="w-3 h-3 animate-spin" />
          Syncing ({pendingActions.length})...
        </span>
      )}

      {syncStatus === "idle" && pendingActions.length === 0 && (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircleIcon className="w-3 h-3" />
          All changes saved
        </span>
      )}

      {syncStatus === "error" && (
        <span className="flex items-center gap-1 text-red-600">
          <ExclamationIcon className="w-3 h-3" />
          {pendingActions.length} pending
          <button
            onClick={() => useQueryStore.getState().syncPendingActions()}
            className="underline ml-1"
          >
            Retry
          </button>
        </span>
      )}

      {lastSyncedAt && (
        <span className="text-gray-400">
          Last synced: {lastSyncedAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
