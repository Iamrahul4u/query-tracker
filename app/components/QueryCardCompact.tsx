import { useState, useRef, useEffect } from "react";
import { UserPlus, UserCheck, Pencil, Mail } from "lucide-react";
import { Query, User } from "../utils/sheets";
import { AuditTooltip } from "./AuditTooltip";
import { useTooltipStore } from "../hooks/useTooltip";

export function QueryCardCompact({
  query,
  users,
  bucketColor,
  onClick,
  onAssign,
  onEdit,
}: {
  query: Query;
  users: User[];
  bucketColor: string;
  onClick: () => void;
  onAssign?: (query: Query, assignee: string) => void;
  onEdit?: (query: Query) => void;
}) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Unique Instance ID for this specific card render
  // Using query ID + random string to ensure Uniqueness even with duplicate data
  const [instanceId] = useState(
    () => `${query["Query ID"]}_${Math.random().toString(36).substr(2, 9)}`,
  );

  const { activeInstanceId, showTooltip, hideTooltip } = useTooltipStore();
  const isThisCardActive = activeInstanceId === instanceId;

  // Calculate tooltip position relative to the card element
  const updateTooltipPosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const tooltipHeight = 180;
      const tooltipWidth = 256;

      // Check if there's enough space above
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      // Calculate left position (ensure it doesn't go off screen)
      let leftPos = rect.left + 40;
      if (leftPos + tooltipWidth > window.innerWidth) {
        leftPos = window.innerWidth - tooltipWidth - 16;
      }

      let top: number;
      let placement: "top" | "bottom";

      // Prefer BOTTOM placement
      // If there is enough space below (180px+), show below.
      // Otherwise, show above.
      if (spaceBelow > tooltipHeight) {
        // Position below the card (Anchor: Bottom edge of card)
        top = rect.bottom + 4;
        placement = "bottom";
      } else {
        // Position above the card (Anchor: Top edge of card)
        top = rect.top - 4;
        placement = "top";
      }

      return {
        top,
        left: Math.max(16, leftPos),
        placement,
      };
    }
    return { top: 0, left: 0, placement: "top" as const };
  };

  // Handle mouse enter with 500ms delay
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // Set new timeout for 500ms delay
    hoverTimeoutRef.current = setTimeout(() => {
      // Only show tooltip if dropdown not open
      if (!showAssignDropdown) {
        const { top, left, placement } = updateTooltipPosition();
        showTooltip(instanceId, query, { top, left }, placement);
      }
    }, 500);
  };

  // Handle mouse leave - cancel tooltip
  const handleMouseLeave = () => {
    // Clear timeout if user leaves before 500ms
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Hide tooltip for this card
    if (isThisCardActive) {
      hideTooltip();
    }
  };

  // Hide tooltip when dropdown opens
  useEffect(() => {
    if (showAssignDropdown && isThisCardActive) {
      hideTooltip();
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    }
  }, [showAssignDropdown, isThisCardActive, hideTooltip]);

  // Update tooltip position when scrolling (only if this card is active)
  useEffect(() => {
    if (!isThisCardActive) return;

    const handleScroll = () => {
      requestAnimationFrame(() => {
        if (!isThisCardActive) return; // Double check inside RAF
        const { top, left, placement } = updateTooltipPosition();
        showTooltip(instanceId, query, { top, left }, placement);
      });
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isThisCardActive, query, showTooltip, instanceId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (isThisCardActive) {
        hideTooltip();
      }
    };
  }, [isThisCardActive, hideTooltip]);

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAssignDropdown(!showAssignDropdown);
  };

  const handleAssign = (e: React.MouseEvent, user: string) => {
    e.stopPropagation();
    if (onAssign) onAssign(query, user);
    setShowAssignDropdown(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(query);
    } else {
      onClick(); // Fallback
    }
  };

  // Check pending/deleted state (optimisitc UI flags)
  const isPending = (query as any)._isPending;
  const isDeleted = (query as any)._isDeleted;

  // Get assigned user name
  const assignedUser = query["Assigned To"]
    ? users.find((u) => u.Email === query["Assigned To"])
    : null;
  const isAssigned = !!query["Assigned To"];

  return (
    <>
      <div
        ref={cardRef}
        data-query-id={query["Query ID"]}
        className={`
          group relative px-2 py-1 bg-white border-l-4 cursor-pointer transition-all
          ${isPending ? "opacity-70 border-dashed" : "border-solid shadow-sm"}
          ${isDeleted ? "opacity-50 line-through" : ""}
          ${isThisCardActive ? "bg-blue-50" : "hover:bg-blue-50"}
        `}
        style={{ borderLeftColor: bucketColor, minHeight: "40px" }} // Min height for flexibility
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Container for single line layout */}
        <div className="flex items-center justify-between h-full gap-2">
          {/* Left: Description + Assigned User */}
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-center gap-2 min-w-0">
              {/* GM Indicator Icon - Show in all buckets if checked */}
              {query.GmIndicator === "TRUE" && (
                <Mail
                  className="w-3 h-3 flex-shrink-0 text-[#ea4335]"
                  title="GM Indicator"
                />
              )}

              <p
                className="text-sm font-normal text-gray-800 truncate"
                title={query["Query Description"]}
              >
                {query["Query Description"] || "No description"}
              </p>
              {isPending && (
                <span
                  className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"
                  title="Syncing..."
                ></span>
              )}
            </div>

            {/* Assigned User - Show below description */}
            {assignedUser && (
              <p className="text-[10px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                <UserCheck className="w-3 h-3 flex-shrink-0" />
                <span>
                  {assignedUser.Name || assignedUser.Email.split("@")[0]}
                </span>
              </p>
            )}
          </div>

          {/* Right: Actions (Assign/Edit Icons) + ID */}
          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {/* Assign/Reassign Button (Icon) */}
            <div className="relative">
              <button
                onClick={handleAssignClick}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  isAssigned
                    ? "bg-green-100 hover:bg-green-200 text-green-700"
                    : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                }`}
                title={isAssigned ? "Reassign" : "Assign"}
              >
                {isAssigned ? (
                  <UserCheck className="w-3.5 h-3.5" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
              </button>

              {showAssignDropdown && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] min-w-[180px]">
                  <div className="p-1 max-h-48 overflow-y-auto">
                    {users.map((user) => {
                      const isCurrentlyAssigned =
                        query["Assigned To"] === user.Email;
                      return (
                        <button
                          key={user.Email}
                          onClick={(e) => handleAssign(e, user.Email)}
                          className={`
                            flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded
                            ${isCurrentlyAssigned ? "bg-blue-50" : ""}
                          `}
                        >
                          <span className="truncate">
                            {user.Name || user.Email.split("@")[0]}
                          </span>
                          {isCurrentlyAssigned && (
                            <span className="text-blue-600 ml-2 flex-shrink-0">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Button (Icon) */}
            <button
              onClick={handleEditClick}
              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function QueryTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    New: "bg-green-100 text-green-700 border border-green-200",
    Ongoing: "bg-blue-100 text-blue-700 border border-blue-200",
    "SEO Query": "bg-purple-100 text-purple-700 border border-purple-200",
  };

  // Clean type string (sometimes might have trailing spaces)
  const safeType = (type || "").trim();

  return (
    <span
      className={`
        px-1.5 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide flex-shrink-0
        ${colors[safeType] || "bg-gray-100 text-gray-600 border border-gray-200"}
      `}
    >
      {safeType || "OTHER"}
    </span>
  );
}
