import { User } from "../utils/sheets";

interface UserMenuProps {
  currentUser: User | null;
  onLogout: () => void;
}

export function UserMenu({ currentUser, onLogout }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-white">
          {currentUser?.Name?.charAt(0).toUpperCase() || "?"}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-gray-800 max-w-[150px] truncate">
          {currentUser?.Name || "User"}
        </p>
        <p className="text-xs text-gray-500">
          {currentUser?.Role || "Viewing as Guest"}
        </p>
      </div>
      <button
        onClick={onLogout}
        className="text-gray-400 hover:text-gray-600 p-1"
        title="Sign out"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  );
}
