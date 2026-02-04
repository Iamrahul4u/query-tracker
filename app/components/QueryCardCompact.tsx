import { useState, useRef, useEffect } from "react";
import {
  UserPlus,
  UserCheck,
  Pencil,
  Mail,
  Calendar,
  Check,
  X,
} from "lucide-react";
import { Query, User } from "../utils/sheets";
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
    () => `${query["Query ID"]}_${Math.random().toString(36).substring(2, 11)}`,
  );

  const { activeInstanceId, showTooltip, hideTooltip } = useTooltipStore();
  const isThisCardActive = activeInstanceId === instanceId;

  // Calculate tooltip position relative to the card element
  const updateTooltipPosition = () => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const tooltipHeight = 180;
      const tooltipWidth = 256;

      // Check if there's enough space below
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
        showTooltip(instanceId, query, users, { top, left }, placement);
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

  // Role-based variables (used in multiple places)
  const roleLC = currentUserRole.toLowerCase();
  const isJunior = roleLC === "junior";
  const bucketStatus = query.Status;

  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();

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
  const canApproveDelete =
    isInBucketH && ["admin", "pseudo admin", "senior"].includes(roleLC);

  // Parse and format date for display
  const formatDateDisplay = (dateValue: string | undefined): string | null => {
    if (!dateValue) return null;

    // Parse DD/MM/YYYY, HH:MM:SS format from Google Sheets
    let date: Date | null = null;
    try {
      const parts = dateValue.split(",")[0].split("/");
      if (parts.length === 3) {
        const [day, month, year] = parts.map((p: string) => parseInt(p, 10));
        const timePart = dateValue.split(",")[1]?.trim() || "00:00:00";
        const [hours, minutes] = timePart
          .split(":")
          .map((t: string) => parseInt(t, 10));
        date = new Date(year, month - 1, day, hours || 0, minutes || 0);
      }
    } catch {
      return null;
    }

    if (!date || isNaN(date.getTime())) return null;

    // Format: Today, Tomorrow, or DD/MM/YYYY
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const diffMs = dateOnly.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";

    // Format as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get date value for display (single date mode)
  const getDateDisplay = () => {
    if (!showDate) return null;
    return formatDateDisplay(query[dateField]);
  };

  // Get all applicable dates for this bucket (detail view Row 2)
  const getApplicableDates = () => {
    const bucketStatus = query.Status;
    const dates: Array<{ label: string; value: string | null; color: string }> =
      [];

    // Date configurations per bucket (from requirements)
    const dateConfigs: Record<
      string,
      Array<{ field: keyof Query; label: string; color: string }>
    > = {
      A: [{ field: "Added Date Time", label: "Added", color: "#ea4335" }],
      B: [
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      C: [
        {
          field: "Proposal Sent Date Time",
          label: "Proposal Sent",
          color: "#34a853",
        },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      D: [
        {
          field: "Proposal Sent Date Time",
          label: "Proposal Sent",
          color: "#ff9800",
        },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      E: [
        {
          field: "Entered In SF Date Time",
          label: "SF Entry",
          color: "#673ab7",
        },
        {
          field: "Proposal Sent Date Time",
          label: "Proposal Sent",
          color: "#ff9800",
        },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      F: [
        {
          field: "Entered In SF Date Time",
          label: "SF Entry",
          color: "#673ab7",
        },
        {
          field: "Proposal Sent Date Time",
          label: "Proposal Sent",
          color: "#34a853",
        },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      G: [
        { field: "Discarded Date Time", label: "Discarded", color: "#9e9e9e" },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
      H: [
        {
          field: "Delete Requested Date Time",
          label: "Delete Req",
          color: "#795548",
        },
        { field: "Assignment Date Time", label: "Assigned", color: "#fbbc04" },
        { field: "Added Date Time", label: "Added", color: "#ea4335" },
      ],
    };

    const config = dateConfigs[bucketStatus] || [];

    config.forEach(({ field, label, color }) => {
      const dateValue = formatDateDisplay(query[field]);
      if (dateValue) {
        dates.push({ label, value: dateValue, color });
      }
    });

    return dates;
  };

  // Get assigned user name
  const assignedUser = query["Assigned To"]
    ? users.find((u) => u.Email === query["Assigned To"])
    : null;
  const isAssigned = !!query["Assigned To"];

  // Role-based assign button visibility
  const userEmailLC = currentUserEmail.toLowerCase();
  const assignedToLC = (query["Assigned To"] || "").toLowerCase().trim();
  const isOwnQuery = assignedToLC && assignedToLC === userEmailLC;
  const isTrulyUnassigned = !assignedToLC; // No one assigned (handles dirty data)

  // Junior Assign button logic:
  // - Bucket A: Only show if truly unassigned (empty "Assigned To" - handles dirty data)
  // - Bucket B-G: Hidden (Junior can't reassign)
  // Senior/Admin: Can assign/reassign anywhere
  const showAssignButton =
    !isJunior || (bucketStatus === "A" && isTrulyUnassigned);

  // Junior Edit button logic:
  // - Bucket A: NEVER show (Junior can only self-assign from A, not edit)
  // - Bucket B-G: Only show if it's their own query
  // Senior/Admin: Can edit any query
  const showEditButton = !isJunior || (bucketStatus !== "A" && isOwnQuery);

  return (
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
      style={{ borderLeftColor: bucketColor, minHeight: "40px" }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Container for single line or two-row layout */}
      <div
        className={`flex ${detailView ? "flex-col" : "items-center justify-between"} gap-2`}
      >
        {/* Row 1: Description + Display Name + Date (compact) OR Description + Display Name (detail) */}
        <div className="flex items-center justify-between gap-2 w-full min-w-0">
          {/* Left: Description + Badges + Display Name + Date (all inline in compact mode) */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* GM Indicator Icon */}
            {query.GmIndicator === "TRUE" && (
              <Mail className="w-3 h-3 flex-shrink-0 text-[#ea4335]" />
            )}

            {/* Description */}
            <p
              className="text-sm font-normal text-gray-800 truncate"
              title={query["Query Description"]}
            >
              {query["Query Description"] || "No description"}
            </p>

            {/* Pending indicator */}
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

            {/* Del-Rej indicator */}
            {wasDeleteRejected && !isInBucketH && (
              <span
                className="px-1.5 py-0.5 text-[8px] font-semibold bg-orange-100 text-orange-700 rounded flex-shrink-0"
                title="Delete request was rejected"
              >
                Del-Rej
              </span>
            )}

            {/* Compact mode: Display Name + Date inline with description */}
            {!detailView && (
              <>
                {assignedUser && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                    <UserCheck className="w-3 h-3" />
                    <span>
                      {assignedUser["Display Name"] ||
                        assignedUser.Name?.substring(0, 6) ||
                        assignedUser.Email.split("@")[0]}
                    </span>
                  </span>
                )}
                {showDate && getDateDisplay() && (
                  <span className="text-[10px] text-blue-600 flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{getDateDisplay()}</span>
                  </span>
                )}
              </>
            )}

            {/* Detail mode: Display Name below description */}
            {detailView && assignedUser && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1 flex-shrink-0">
                <UserCheck className="w-3 h-3" />
                <span>
                  {assignedUser["Display Name"] ||
                    assignedUser.Name?.substring(0, 6) ||
                    assignedUser.Email.split("@")[0]}
                </span>
              </span>
            )}
          </div>

          {/* Right: Actions (Assign/Edit Icons) */}
          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {/* Senior/Admin in Bucket A: Show TWO buttons */}
            {showAssignButton &&
              !isJunior &&
              bucketStatus === "A" &&
              !isAssigned && (
                <>
                  {/* Self Assign Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAssign && currentUserEmail) {
                        onAssign(query, currentUserEmail);
                      }
                    }}
                    className="px-2 py-1 text-[10px] font-medium rounded-md bg-green-100 hover:bg-green-200 text-green-700 transition-colors flex items-center gap-1"
                    title="Assign to yourself"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>Self</span>
                  </button>

                  {/* Assign Button (opens dropdown) */}
                  <div className="relative">
                    <button
                      onClick={handleAssignClick}
                      className="px-2 py-1 text-[10px] font-medium rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors flex items-center gap-1"
                      title="Assign to someone"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Assign</span>
                    </button>

                    {showAssignDropdown &&
                      (() => {
                        const buttonRect = cardRef.current
                          ?.querySelector('[title*="Assign"]')
                          ?.getBoundingClientRect();
                        const dropdownStyle = buttonRect
                          ? {
                              position: "fixed" as const,
                              top: buttonRect.bottom + 4,
                              right: window.innerWidth - buttonRect.right,
                            }
                          : {};

                        return (
                          <div
                            className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]"
                            style={{ ...dropdownStyle, zIndex: 99999 }}
                          >
                            <div className="p-1 max-h-48 overflow-y-auto">
                              {users
                                .filter(
                                  (user) =>
                                    user.Email.toLowerCase() !==
                                    currentUserEmail?.toLowerCase(),
                                )
                                .map((user) => {
                                  const isCurrentlyAssigned =
                                    query["Assigned To"] === user.Email;
                                  return (
                                    <button
                                      key={user.Email}
                                      onClick={(e) =>
                                        handleAssign(e, user.Email)
                                      }
                                      className={`
                                flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded
                                ${isCurrentlyAssigned ? "bg-blue-50" : ""}
                              `}
                                    >
                                      <span className="truncate">
                                        {user["Display Name"] ||
                                          user.Name ||
                                          user.Email.split("@")[0]}
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
                        );
                      })()}
                  </div>
                </>
              )}

            {/* Junior in Bucket A OR Already Assigned OR Other buckets: Single button */}
            {showAssignButton &&
              (isJunior || isAssigned || bucketStatus !== "A") && (
                <div className="relative">
                  <button
                    onClick={handleAssignClick}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                      isAssigned
                        ? "bg-green-100 hover:bg-green-200 text-green-700"
                        : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                    }`}
                    title={
                      isJunior && bucketStatus === "A"
                        ? "Self-assign"
                        : isAssigned
                          ? "Reassign"
                          : "Assign"
                    }
                  >
                    {isAssigned ? (
                      <UserCheck className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showAssignDropdown &&
                    (() => {
                      const buttonRect = cardRef.current
                        ?.querySelector('[title*="ssign"]')
                        ?.getBoundingClientRect();
                      const dropdownStyle = buttonRect
                        ? {
                            position: "fixed" as const,
                            top: buttonRect.bottom + 4,
                            right: window.innerWidth - buttonRect.right,
                          }
                        : {};

                      return (
                        <div
                          className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]"
                          style={{ ...dropdownStyle, zIndex: 99999 }}
                        >
                          <div className="p-1 max-h-48 overflow-y-auto">
                            {currentUserEmail &&
                              (() => {
                                const currentUser = users.find(
                                  (u) =>
                                    u.Email.toLowerCase() ===
                                    currentUserEmail.toLowerCase(),
                                );
                                const isCurrentlyAssigned =
                                  query["Assigned To"]?.toLowerCase() ===
                                  currentUserEmail.toLowerCase();
                                return currentUser ? (
                                  <>
                                    <button
                                      onClick={(e) =>
                                        handleAssign(e, currentUserEmail)
                                      }
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
                                        <span className="text-blue-600 ml-2 flex-shrink-0">
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                    <div className="border-t border-gray-200 my-1" />
                                  </>
                                ) : null;
                              })()}
                            {users
                              .filter(
                                (user) =>
                                  user.Email.toLowerCase() !==
                                  currentUserEmail?.toLowerCase(),
                              )
                              .map((user) => {
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
                                      {user["Display Name"] ||
                                        user.Name ||
                                        user.Email.split("@")[0]}
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
                      );
                    })()}
                </div>
              )}

            {/* Approve/Reject buttons for Bucket H */}
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

            {/* Edit Button */}
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

        {/* Row 2: All Applicable Dates (Detail View Only) */}
        {detailView && (
          <div className="flex items-center gap-2 flex-wrap">
            {getApplicableDates().map((dateInfo, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  backgroundColor: `${dateInfo.color}15`,
                  color: dateInfo.color,
                  border: `1px solid ${dateInfo.color}30`,
                }}
                title={`${dateInfo.label}: ${dateInfo.value}`}
              >
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{dateInfo.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
