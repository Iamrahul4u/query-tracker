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
      <div className="w-full px-2 py-1 sm:px-3">
        <div className="flex items-center justify-between h-8 sm:h-10">
          {/* Logo & Title - Compact for Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-[82px] h-[82px] relative flex-shrink-0">
              <Image
                src="/Black Hat - Logo jpg.jpg"
                alt="Query Tracker Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-xs sm:text-base font-semibold text-gray-800">
              Query Tracker
            </h1>
          </div>

          {/* Stats - Hidden on mobile, shows all 7 buckets */}
          <div className="hidden lg:block">
            <DashboardStats
              stats={stats}
              onTotalClick={onTotalClick}
              onBucketClick={onBucketClick}
              currentViewMode={currentViewMode}
            />
          </div>

          {/* Actions - Compact */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onAddQuery}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2 sm:px-3 rounded-md shadow-sm flex items-center gap-1 transition-colors"
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
