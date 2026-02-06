"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Shield, UserCog, User as UserIcon } from "lucide-react";
import { User } from "../utils/sheets";

interface UserMenuProps {
  currentUser: User | null;
  onLogout: () => void;
  onRoleChange?: (newRole: string) => void;
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

export function UserMenu({
  currentUser,
  onLogout,
  onRoleChange,
}: UserMenuProps) {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRoleChange = async (newRole: string) => {
    if (!currentUser?.Email || newRole === currentUser.Role) {
      setShowRoleDropdown(false);
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/users/role", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: currentUser.Email,
          role: newRole,
        }),
      });

      if (response.ok) {
        // Clear cached data so fresh data is fetched with new role
        const { LocalStorageCache } =
          await import("../utils/localStorageCache");
        LocalStorageCache.clear();

        // Call parent callback to update local state
        onRoleChange?.(newRole);
        // Reload to apply new role permissions
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Failed to update role: ${error.error}`);
      }
    } catch (error) {
      alert("Failed to update role. Please try again.");
    } finally {
      setIsUpdating(false);
      setShowRoleDropdown(false);
    }
  };

  const currentRoleInfo =
    ROLES.find((r) => r.value === currentUser?.Role) || ROLES[2];
  const RoleIcon = currentRoleInfo.icon;

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
        {/* Role dropdown for testing */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            disabled={isUpdating}
            className={`text-xs flex items-center gap-1 hover:bg-gray-100 px-1 -mx-1 rounded transition ${currentRoleInfo.color}`}
          >
            <RoleIcon className="w-3 h-3" />
            <span>
              {isUpdating ? "Updating..." : currentUser?.Role || "Guest"}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
              <div className="p-1">
                {ROLES.map((role) => {
                  const Icon = role.icon;
                  const isActive = currentUser?.Role === role.value;
                  return (
                    <button
                      key={role.value}
                      onClick={() => handleRoleChange(role.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-gray-50 transition ${
                        isActive ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${role.color}`} />
                      <span>{role.label}</span>
                      {isActive && (
                        <span className="ml-auto text-blue-600">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 italic">
                  Testing only - reloads page
                </p>
              </div>
            </div>
          )}
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
