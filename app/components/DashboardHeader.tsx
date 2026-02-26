import Image from "next/image";
import { SyncStatus } from "./SyncStatus";
import { DashboardStats } from "./DashboardStats";
import { UserMenu } from "./UserMenu";
import { User } from "../utils/sheets";

interface DashboardHeaderProps {
  currentUser: User | null;
  stats: Record<string, number>;
  onAddQuery: () => void;
  onLogout: () => void;
  onTotalClick?: () => void;
  onBucketClick?: (bucket: string) => void;
  currentViewMode?: "bucket" | "user";
}

export function DashboardHeader({
  currentUser,
  stats,
  onAddQuery,
  onLogout,
  onTotalClick,
  onBucketClick,
  currentViewMode = "bucket",
}: DashboardHeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky    top-0 z-50 border-b border-gray-200">
      <div className="w-full px-2 py-0.5 sm:px-3 sm:py-1">
        <div className="flex items-center justify-between min-h-[32px] sm:min-h-[60px] gap-1.5 sm:gap-2 overflow-visible w-full">
          {/* Logo & Title - Left Column */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
            <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src="/Black Hat - Logo jpg.jpg"
                alt="Query Tracker Logo"
                width={32}
                height={32}
                className="object-contain max-w-full max-h-full"
                priority
              />
            </div>
            <h1 className="text-[10px] sm:text-sm font-semibold text-gray-800 hidden sm:block truncate">
              Query Tracker
            </h1>
          </div>

          {/* Stats - Center Column */}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide px-1 sm:px-0">
            <DashboardStats
              stats={stats}
              onTotalClick={onTotalClick}
              onBucketClick={onBucketClick}
              currentViewMode={currentViewMode}
            />
          </div>

          {/* Actions - Right Column */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0 shrink-0">
            <button
              onClick={onAddQuery}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1 sm:py-1.5 px-2 sm:px-3 rounded-md shadow-sm flex items-center gap-1 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden sm:inline">Add</span>
            </button>

            <UserMenu currentUser={currentUser} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
