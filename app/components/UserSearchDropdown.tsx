"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "../utils/sheets";
import { ChevronDown } from "lucide-react";

interface UserSearchDropdownProps {
  users: User[];
  value: string;
  onChange: (email: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export function UserSearchDropdown({
  users,
  value,
  onChange,
  placeholder = "-- Select User --",
  className = "",
  label,
  disabled = false,
}: UserSearchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected user display name
  const selectedUser = users.find((u) => u.Email === value);
  const displayValue = selectedUser
    ? selectedUser["Display Name"] ||
      selectedUser.Name ||
      selectedUser.Email.split("@")[0]
    : placeholder;

  // Filter users based on search query (first name from Display Name OR Name)
  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    if (!searchLower) return true;

    // Extract first name from Display Name
    const displayName = user["Display Name"] || "";
    const displayFirstName = displayName.split(" ")[0].toLowerCase();

    // Extract first name from Name
    const name = user.Name || "";
    const nameFirstName = name.split(" ")[0].toLowerCase();

    // Match if EITHER Display Name OR Name first name starts with search
    return (
      displayFirstName.startsWith(searchLower) ||
      nameFirstName.startsWith(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (email: string) => {
    onChange(email);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between ${
          disabled
            ? "bg-gray-100 cursor-not-allowed text-gray-500"
            : "bg-white cursor-pointer"
        }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {displayValue}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* User List */}
          <div className="p-1 max-h-48 overflow-y-auto">
            {/* Clear Selection Option */}
            <button
              type="button"
              onClick={() => handleSelect("")}
              className="flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded text-gray-500"
            >
              <span>{placeholder}</span>
              {!value && <span className="text-blue-600 ml-2">✓</span>}
            </button>

            {/* Filtered Users */}
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const displayName =
                  user["Display Name"] || user.Name || user.Email.split("@")[0];
                const isSelected = user.Email === value;

                return (
                  <button
                    key={user.Email}
                    type="button"
                    onClick={() => handleSelect(user.Email)}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-blue-50 rounded ${
                      isSelected ? "bg-blue-50 text-blue-700 font-medium" : ""
                    }`}
                  >
                    <span>{displayName}</span>
                    {isSelected && (
                      <span className="text-blue-600 ml-2">✓</span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">
                No users found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
