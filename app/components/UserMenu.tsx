"use client";

import { Shield, UserCog, User as UserIcon } from "lucide-react";
import { User } from "../utils/sheets";

interface UserMenuProps {
  currentUser: User | null;
  onLogout: () => void;
}

const ROLES = [
  { value: "Admin", label: "Admin", icon: Shield, color: "text-purple-600" },
  {
    value: "Pseudo Admin",
    label: "Pseudo Admin",
    icon: Shield,
    color: "text-purple-500",
  },
  { value: "Senior", label: "Senior", icon: UserCog, color: "text-blue-600" },
  { value: "Junior", label: "Junior", icon: UserIcon, color: "text-green-600" },
];

export function UserMenu({ currentUser, onLogout }: UserMenuProps) {
  const currentRoleInfo =
    ROLES.find((r) => r.value === currentUser?.Role) || ROLES[2];
  const RoleIcon = currentRoleInfo.icon;

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 bg-blue-600 rounded-full flex items-center justify-center">
        <span className="text-sm sm:text-base font-medium text-white">
          {currentUser?.Name?.charAt(0).toUpperCase() || "?"}
        </span>
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-gray-800 max-w-[150px] truncate">
          {currentUser?.Name || "User"}
        </p>
        {/* Role display - static in production */}
        <div
          className={`text-xs flex items-center gap-1 ${currentRoleInfo.color}`}
        >
          <RoleIcon className="w-3 h-3" />
          <span>{currentUser?.Role || "Guest"}</span>
        </div>
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
