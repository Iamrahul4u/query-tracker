import { useState, useRef, useEffect } from "react";
import { UserPlus, UserCheck, Pencil, Mail, Calendar, Check, X } from "lucide-react";
import { Query, User } from "../utils/sheets";
import { AuditTooltip } from "./AuditTooltip";
import { useTooltipStore } from "../hooks/useTooltip";
import { DateFieldKey } from "../utils/queryFilters";

export function QueryCardCompact({
  query,
  users,
  bucketColor,
  onClick,
  onAssign,
  onEdit,
  onApproveDelete,
  onRejectDelete,
  showDate = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
}: {
  query: Query;
  users: User[];
  bucketColor: string;
  onClick: () => void;
  onAssign?: (query: Query, assignee: string) => void;
  onEdit?: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  showDate?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
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
        showTooltip(instanceId, query, users, { top, left }, placement);
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
    
    // Role-based behavior
    const roleLC = currentUserRole.toLowerCase();
    const isJunior = roleLC === "junior";
    const bucketStatus = query.Status;
    
    // Junior in Bucket A: Direct self-assign (no dropdown)
    if (isJunior && bucketStatus === "A") {
      if (onAssign && currentUserEmail) {
        onAssign(query, currentUserEmail);
      }
      return;
    }
    
    // Senior/Admin: Show dropdown
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

  // Check pending/deleted state (optimistic UI flags)
  const isPending = (query as any)._isPending;
  const isDeleted = (query as any)._isDeleted;
  // Bucket H: Pending Approval status
  const isInBucketH = query.Status === "H";
  const isDeletePending = isInBucketH || !!query["Delete Requested By"];
  // Del-Rej: Query was previously rejected from deletion
  const wasDeleteRejected = query["Delete Rejected"] === "true";
  // Can this user approve/reject? Only Admin/Pseudo Admin/Senior in Bucket H
  const canApproveDelete = isInBucketH && ["admin", "pseudo admin", "senior"].includes(roleLC);

  // Get date value for display
  const getDateDisplay = () => {
    if (!showDate) return null;
    const dateValue = query[dateField];
    if (!dateValue) return null;
    
    // Parse DD/MM/YYYY, HH:MM:SS format from Google Sheets
    let date: Date | null = null;
    try {
      const parts = dateValue.split(",")[0].split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts.map((p: string) => parseInt(p, 10));
        const timePart = dateValue.split(",")[1]?.trim() || "00:00:00";
        const [hours, minutes] = timePart.split(":").map((t: string) => parseInt(t, 10));
        date = new Date(year, month - 1, day, hours || 0, minutes || 0);
      }
    } catch {
      return null;
    }
    
    if (!date || isNaN(date.getTime())) return null;
    
    // Format relative or absolute
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    // For older dates, show absolute date
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined
    });
  };

  // Get assigned user name
  const assignedUser = query["Assigned To"]
    ? users.find((u) => u.Email === query["Assigned To"])
    : null;
  const isAssigned = !!query["Assigned To"];
  
  // Role-based assign button visibility
  const roleLC = currentUserRole.toLowerCase();
  const isJunior = roleLC === "junior";
  const bucketStatus = query.Status;
  const userEmailLC = currentUserEmail.toLowerCase();
  const assignedToLC = (query["Assigned To"] || "").toLowerCase().trim();
  const isOwnQuery = assignedToLC && assignedToLC === userEmailLC;
  const isTrulyUnassigned = !assignedToLC; // No one assigned (handles dirty data)
  
  // Junior Assign button logic:
  // - Bucket A: Only show if truly unassigned (empty "Assigned To" - handles dirty data)
  // - Bucket B-G: Hidden (Junior can't reassign)
  // Senior/Admin: Can assign/reassign anywhere
  const showAssignButton = !isJunior || (bucketStatus === "A" && isTrulyUnassigned);
  
  // Junior Edit button logic:
  // - Bucket A: NEVER show (Junior can only self-assign from A, not edit)
  // - Bucket B-G: Only show if it's their own query
  // Senior/Admin: Can edit any query
  const showEditButton = !isJunior || (bucketStatus !== "A" && isOwnQuery);

  return (
    <>
      <div
        ref={cardRef}
        data-query-id={query["Query ID"]}
        className={`
          group relative px-2 py-1 bg-white border-l-4 cursor-pointer transition-all
          ${isPending ? "opacity-70 border-dashed" : "border-solid shadow-sm"}
          ${isDeleted ? "opacity-50 line-through" : ""}
          ${isDeletePending ? "bg-red-50" : ""}
          ${isThisCardActive ? "bg-blue-50" : !isDeletePending ? "hover:bg-blue-50" : "hover:bg-red-100"}
        `}
        style={{ borderLeftColor: bucketColor, minHeight: "40px" }} // Min height for flexibility
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Container for single line layout */}
        <div className={`flex ${detailView ? 'flex-col' : 'items-center justify-between h-full'} gap-2`}>
          {/* Row 1: Description + Assigned User + Actions */}
          <div className="flex items-center justify-between gap-2 w-full">
            {/* Left: Description + Badges */}
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
                {/* P.A. indicator for Bucket H */}
                {isInBucketH && (
                  <span
                    className="px-1.5 py-0.5 text-[8px] font-semibold bg-amber-100 text-amber-700 rounded flex-shrink-0"
                    title={`Pending Approval - Delete requested by ${query["Delete Requested By"]}`}
                  >
                    P.A.
                  </span>
                )}
                {/* Del-Rej indicator for previously rejected deletions */}
                {wasDeleteRejected && !isInBucketH && (
                  <span
                    className="px-1.5 py-0.5 text-[8px] font-semibold bg-orange-100 text-orange-700 rounded flex-shrink-0"
                    title="Delete request was rejected"
                  >
                    Del-Rej
                  </span>
                )}
              </div>

              {/* Assigned User - Compact mode: inline with date; Detail mode: may be separate */}
              {!detailView && (assignedUser || (showDate && getDateDisplay())) && (
                <p className="text-[10px] text-gray-500 truncate mt-0.5 flex items-center gap-2">
                  {assignedUser && (
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 flex-shrink-0" />
                      <span>{assignedUser["Display Name"] || assignedUser.Name?.substring(0, 6) || assignedUser.Email.split("@")[0]}</span>
                    </span>
                  )}
                  {showDate && getDateDisplay() && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{getDateDisplay()}</span>
                    </span>
                  )}
                </p>
              )}
              
              {/* Detail mode: Show assigned user in Row 1 */}
              {detailView && assignedUser && (
                <p className="text-[10px] text-gray-500 truncate mt-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 flex-shrink-0" />
                  <span>{assignedUser["Display Name"] || assignedUser.Name?.substring(0, 6) || assignedUser.Email.split("@")[0]}</span>
                </p>
              )}
            </div>

          {/* Right: Actions (Assign/Edit Icons) + ID */}
          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {/* Assign/Reassign Button (Icon) - Hidden for Junior on B-G buckets */}
            {showAssignButton && (
              <div className="relative">
                <button
                  onClick={handleAssignClick}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    isAssigned
                      ? "bg-green-100 hover:bg-green-200 text-green-700"
                      : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                  }`}
                  title={isJunior && bucketStatus === "A" ? "Self-assign" : (isAssigned ? "Reassign" : "Assign")}
                >
                  {isAssigned ? (
                    <UserCheck className="w-3.5 h-3.5" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                </button>

                {showAssignDropdown && (() => {
                  // Use fixed positioning to escape stacking context
                  const buttonRect = cardRef.current?.querySelector('[title*="ssign"]')?.getBoundingClientRect();
                  const dropdownStyle = buttonRect ? {
                    position: 'fixed' as const,
                    top: buttonRect.bottom + 4,
                    right: window.innerWidth - buttonRect.right,
                  } : {};
                  
                  return (
                  <div 
                    className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]"
                    style={{ ...dropdownStyle, zIndex: 99999 }}
                  >
                    <div className="p-1 max-h-48 overflow-y-auto">
                      {/* Self-assign option at top for quick access */}
                      {currentUserEmail && (() => {
                        const currentUser = users.find(u => u.Email.toLowerCase() === currentUserEmail.toLowerCase());
                        const isCurrentlyAssigned = query["Assigned To"]?.toLowerCase() === currentUserEmail.toLowerCase();
                        return currentUser ? (
                          <>
                            <button
                              onClick={(e) => handleAssign(e, currentUserEmail)}
                              className={`
                                flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-blue-100 rounded font-medium
                                ${isCurrentlyAssigned ? "bg-blue-50 text-blue-700" : "text-blue-600"}
                              `}
                            >
                              <span className="flex items-center gap-1.5">
                                <UserCheck className="w-3 h-3" />
                                Assign to Me
                              </span>
                              {isCurrentlyAssigned && (
                                <span className="text-blue-600 ml-2 flex-shrink-0">✓</span>
                              )}
                            </button>
                            <div className="border-t border-gray-200 my-1" />
                          </>
                        ) : null;
                      })()}
                      {/* Other users */}
                      {users
                        .filter(user => user.Email.toLowerCase() !== currentUserEmail?.toLowerCase())
                        .map((user) => {
                          const isCurrentlyAssigned = query["Assigned To"] === user.Email;
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
                                {user["Display Name"] || user.Name || user.Email.split("@")[0]}
                              </span>
                              {isCurrentlyAssigned && (
                                <span className="text-blue-600 ml-2 flex-shrink-0">✓</span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                );})()}
              </div>
            )}

            {/* Approve/Reject buttons for Bucket H (Admin/Senior only) */}
            {canApproveDelete && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onApproveDelete) onApproveDelete(query);
                  }}
                  className="w-7 h-7 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                  title="Approve Deletion"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRejectDelete) onRejectDelete(query);
                  }}
                  className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 transition-colors"
                  title="Reject Deletion (Return to Previous Status)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {/* Edit Button (Icon) - Hidden for Junior on unassigned queries */}
            {showEditButton && !isInBucketH && (
              <button
                onClick={handleEditClick}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
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
