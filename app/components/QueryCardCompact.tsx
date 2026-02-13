import { useState, useRef, memo } from "react";
import {
  UserPlus,
  UserCheck,
  Pencil,
  Mail,
  Calendar,
  Check,
  X,
  MessageSquare,
  Quote,
  Phone,
} from "lucide-react";
import { Query, User } from "../utils/sheets";
import { DateFieldKey } from "../utils/queryFilters";
import { AssignDropdown } from "./AssignDropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const QueryCardCompact = memo(function QueryCardCompact({
  query,
  users,
  bucketColor,
  onClick,
  onAssign,
  onAssignCall,
  onEdit,
  onApproveDelete,
  onRejectDelete,
  showDate = false,
  dateField = "Added Date Time",
  currentUserRole = "",
  currentUserEmail = "",
  detailView = false,
  isUserView = false,
}: {
  query: Query;
  users: User[];
  bucketColor: string;
  onClick: () => void;
  onAssign?: (query: Query, assignee: string) => void;
  onAssignCall?: (query: Query, assignee: string) => void;
  onEdit?: (query: Query) => void;
  onApproveDelete?: (query: Query) => void;
  onRejectDelete?: (query: Query) => void;
  showDate?: boolean;
  dateField?: DateFieldKey;
  currentUserRole?: string;
  currentUserEmail?: string;
  detailView?: boolean;
  isUserView?: boolean;
}) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showCallDropdown, setShowCallDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // Search filter for assign dropdown
  const [callSearchQuery, setCallSearchQuery] = useState(""); // Search filter for call assign dropdown
  const cardRef = useRef<HTMLDivElement>(null);

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

    // Senior/Admin: Show dropdown, reset search when opening
    if (!showAssignDropdown) {
      setSearchQuery("");
    }
    setShowAssignDropdown(!showAssignDropdown);
  };

  const handleAssign = (e: React.MouseEvent, user: string) => {
    e.stopPropagation();
    if (onAssign) onAssign(query, user);
    setShowAssignDropdown(false);
    setSearchQuery("");
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Close assign dropdown if open
    setShowAssignDropdown(false);
    if (onEdit) {
      onEdit(query);
    } else {
      onClick(); // Fallback
    }
  };

  // Check pending/deleted state (optimistic UI flags)
  const isPending = (query as any)._isPending;
  const isDeleted = (query as any)._isDeleted;
  // Ghost query: pending deletion shown in original bucket (grayed out, no actions)
  const isGhost = !!(query as any)._isGhostInOriginalBucket;
  // Bucket H: Pending Approval status
  const isInBucketH = query.Status === "H";
  const isDeletePending = isInBucketH || !!query["Delete Requested By"];
  // Del-Rej: Query was previously rejected from deletion
  const wasDeleteRejected = query["Delete Rejected"] === "true";
  // Can this user approve/reject? Only Admin/Pseudo Admin in Bucket H (NOT Senior)
  // AND query is not yet approved or rejected
  const canApproveDelete =
    isInBucketH &&
    ["admin", "pseudo admin"].includes(roleLC) &&
    !query["Delete Approved By"] &&
    !query["Delete Rejected"];

  // Parse and format date for display
  const formatDateDisplay = (dateValue: string | undefined): string | null => {
    if (!dateValue) return null;

    // Parse date - handle both "DD/MM/YYYY HH:MM:SS" and "DD/MM/YYYY, HH:MM:SS" formats
    let date: Date | null = null;
    try {
      // Normalize: remove comma if present
      const normalized = dateValue.replace(", ", " ");
      const parts = normalized.split(" ");

      if (parts.length >= 1) {
        const datePart = parts[0];
        const timePart = parts[1] || "00:00:00";

        const [day, month, year] = datePart
          .split("/")
          .map((p: string) => parseInt(p, 10));
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

  // Get date value for display (single date mode) - always show in compact mode
  const getDateDisplay = () => {
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
      const dateValue = formatDateDisplay(query[field] as string | undefined);
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

  // Get call-assigned user info (Bucket A only)
  const callAssignedEmail = (query["Assigned To Call"] || "") as string;
  const callAssignedUser = callAssignedEmail
    ? users.find((u) => u.Email === callAssignedEmail)
    : null;
  const isCallAssigned = !!callAssignedEmail;
  const callAssignedDisplayName = callAssignedUser
    ? callAssignedUser["Display Name"] ||
      callAssignedUser.Name ||
      callAssignedUser.Email.split("@")[0]
    : callAssignedEmail
      ? callAssignedEmail.split("@")[0]
      : "";

  // Role-based assign button visibility
  const userEmailLC = currentUserEmail.toLowerCase();
  const assignedToLC = (query["Assigned To"] || "").toLowerCase().trim();
  const isOwnQuery = assignedToLC && assignedToLC === userEmailLC;
  const isTrulyUnassigned = !assignedToLC; // No one assigned (handles dirty data)

  // Junior Assign button logic:
  // - Bucket A: Only show if truly unassigned (empty "Assigned To" - handles dirty data)
  // - Bucket B-G: Hidden (Junior can't reassign)
  // Senior/Admin: Can assign/reassign anywhere
  // Ghost queries: NO actions allowed
  const showAssignButton =
    !isGhost && (!isJunior || (bucketStatus === "A" && isTrulyUnassigned));

  // Edit button logic (from role-based-access-control.md):
  // - Bucket A: ALL users can edit (no restrictions)
  // - Senior/Admin/Pseudo Admin: Can edit ANY query in any bucket
  // - Junior: Can edit their own queries EXCEPT in G/H buckets
  // Ghost queries: NO actions allowed
  const isAdminOrSenior = ["admin", "pseudo admin", "senior"].includes(roleLC);

  // Call assign button: Bucket A only, Admin/Senior/Pseudo Admin only (not Junior)
  const showCallAssignButton =
    !isGhost && bucketStatus === "A" && isAdminOrSenior && !!onAssignCall;
  // Reuse already-defined variables: userEmailLC, assignedToLC, isOwnQuery

  const showEditButton =
    !isGhost &&
    (bucketStatus === "A" || // ALL users can edit Bucket A
      isAdminOrSenior || // Admin/Senior can edit all buckets
      (isOwnQuery && bucketStatus !== "G" && bucketStatus !== "H")); // Junior can edit own except G/H

  // Dropdown content for AssignDropdown - search box stays close to trigger
  const renderDropdownContent = (
    includeAssignToMe: boolean,
    placement?: string,
  ) => {
    const opensUp = placement?.startsWith("top");

    // Search box component
    const SearchBox = () => (
      <div
        className={`p-2 ${opensUp ? "border-t" : "border-b"} border-gray-100`}
      >
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        />
      </div>
    );

    // User list content
    const UserList = () => (
      <div
        className="p-1 max-h-48 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Assign to Me button - conditionally visible at top */}
        {includeAssignToMe &&
          currentUserEmail &&
          (() => {
            const currentUser = users.find(
              (u) => u.Email.toLowerCase() === currentUserEmail.toLowerCase(),
            );
            const isCurrentlyAssigned =
              query["Assigned To"]?.toLowerCase() ===
              currentUserEmail.toLowerCase();
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
        {users
          .filter(
            (user) =>
              user.Email.toLowerCase() !== currentUserEmail?.toLowerCase(),
          )
          .filter((user) => {
            if (!searchQuery.trim()) return true;
            const search = searchQuery.toLowerCase();

            // Extract first name from Display Name
            const displayName = user["Display Name"] || "";
            const displayFirstName = displayName.split(" ")[0].toLowerCase();

            // Extract first name from Name
            const name = user.Name || "";
            const nameFirstName = name.split(" ")[0].toLowerCase();

            // Match if EITHER Display Name OR Name first name starts with search
            return (
              displayFirstName.startsWith(search) ||
              nameFirstName.startsWith(search)
            );
          })
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
                  {user["Display Name"] ||
                    user.Name ||
                    user.Email.split("@")[0]}
                </span>
                {isCurrentlyAssigned && (
                  <span className="text-blue-600 ml-2 flex-shrink-0">✓</span>
                )}
              </button>
            );
          })}
        {users
          .filter(
            (user) =>
              user.Email.toLowerCase() !== currentUserEmail?.toLowerCase(),
          )
          .filter((user) => {
            if (!searchQuery.trim()) return true;
            const search = searchQuery.toLowerCase();

            // Extract first name from Display Name
            const displayName = user["Display Name"] || "";
            const displayFirstName = displayName.split(" ")[0].toLowerCase();

            // Extract first name from Name
            const name = user.Name || "";
            const nameFirstName = name.split(" ")[0].toLowerCase();

            // Match if EITHER Display Name OR Name first name starts with search
            return (
              displayFirstName.startsWith(search) ||
              nameFirstName.startsWith(search)
            );
          }).length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400 text-center">
            No users found
          </div>
        )}
      </div>
    );

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px]">
        {/* Search at TOP when opening DOWN (close to trigger) */}
        {!opensUp && <SearchBox />}

        <UserList />

        {/* Search at BOTTOM when opening UP (close to trigger) */}
        {opensUp && <SearchBox />}
      </div>
    );
  };

  // Call assign dropdown content (reuses similar pattern)
  const renderCallDropdownContent = (placement?: string) => {
    const opensUp = placement?.startsWith("top");

    const SearchBox = () => (
      <div
        className={`p-2 ${opensUp ? "border-t" : "border-b"} border-gray-100`}
      >
        <input
          type="text"
          placeholder="Search users..."
          value={callSearchQuery}
          onChange={(e) => setCallSearchQuery(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          autoFocus
        />
      </div>
    );

    const UserList = () => (
      <div
        className="p-1 max-h-48 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        {/* Clear call assignment option */}
        {isCallAssigned && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onAssignCall) onAssignCall(query, "");
                setShowCallDropdown(false);
                setCallSearchQuery("");
              }}
              className="flex items-center gap-1.5 w-full text-left px-3 py-2 text-xs hover:bg-red-50 rounded text-red-600 font-medium"
            >
              <X className="w-3 h-3" />
              Remove call assignment
            </button>
            <div className="border-t border-gray-200 my-1" />
          </>
        )}
        {users
          .filter((user) => {
            if (!callSearchQuery.trim()) return true;
            const search = callSearchQuery.toLowerCase();
            const displayName = user["Display Name"] || "";
            const displayFirstName = displayName.split(" ")[0].toLowerCase();
            const name = user.Name || "";
            const nameFirstName = name.split(" ")[0].toLowerCase();
            return (
              displayFirstName.startsWith(search) ||
              nameFirstName.startsWith(search)
            );
          })
          .map((user) => {
            const isCurrentlyCallAssigned = callAssignedEmail === user.Email;
            return (
              <button
                key={user.Email}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAssignCall) onAssignCall(query, user.Email);
                  setShowCallDropdown(false);
                  setCallSearchQuery("");
                }}
                className={`
                  flex items-center justify-between w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded
                  ${isCurrentlyCallAssigned ? "bg-teal-50" : ""}
                `}
              >
                <span className="truncate">
                  {user["Display Name"] ||
                    user.Name ||
                    user.Email.split("@")[0]}
                </span>
                {isCurrentlyCallAssigned && (
                  <span className="text-teal-600 ml-2 flex-shrink-0">✓</span>
                )}
              </button>
            );
          })}
        {users.filter((user) => {
          if (!callSearchQuery.trim()) return true;
          const search = callSearchQuery.toLowerCase();
          const displayName = user["Display Name"] || "";
          const displayFirstName = displayName.split(" ")[0].toLowerCase();
          const name = user.Name || "";
          const nameFirstName = name.split(" ")[0].toLowerCase();
          return (
            displayFirstName.startsWith(search) ||
            nameFirstName.startsWith(search)
          );
        }).length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400 text-center">
            No users found
          </div>
        )}
      </div>
    );

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px]">
        {!opensUp && <SearchBox />}
        <UserList />
        {opensUp && <SearchBox />}
      </div>
    );
  };

  return (
    <div
      ref={cardRef}
      data-query-id={query["Query ID"]}
      className={`
        group relative px-1.5 py-px bg-white border-l-4 cursor-pointer transition-all
        ${isPending ? "opacity-70 border-dashed" : "border-solid shadow-sm"}
        ${isDeleted ? "opacity-50 line-through" : ""}
        ${isGhost ? "opacity-60 bg-gray-100" : ""}
            ${isDeletePending && !isGhost ? "bg-red-50" : ""}
            ${!isDeletePending && !isGhost ? "hover:bg-blue-50" : ""}
            ${isGhost ? "hover:bg-gray-200" : ""}
          `}
      style={{ borderLeftColor: bucketColor, minHeight: "26px" }}
      onClick={onClick}
    >
      {/* Container for single line or two-row layout */}
      <div
        className={`flex ${detailView ? "flex-col" : "items-center justify-between"} gap-1`}
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

            {/* P.A. indicator for Bucket H or ghost queries - only if pending (not yet approved) */}
            {(isInBucketH || isGhost) &&
              query["Delete Requested By"] &&
              !query["Delete Approved By"] && (
                <span
                  className="px-1.5 py-0.5 text-[8px] font-semibold bg-amber-100 text-amber-700 rounded flex-shrink-0"
                  title={`Pending Approval - Delete requested by ${query["Delete Requested By"]}${isGhost ? " (shown in original bucket)" : ""}`}
                >
                  P.A.
                </span>
              )}

            {/* Del-Rej indicator */}
            {wasDeleteRejected && (
              <span
                className="px-1.5 py-0.5 text-[8px] font-semibold bg-orange-100 text-orange-700 rounded flex-shrink-0"
                title="Delete request was rejected"
              >
                Del-Rej
              </span>
            )}

            {/* Remark indicator - Red quote icon with Tooltip */}
            {query.Remarks && query.Remarks.trim() && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Quote className="w-3 h-3 text-red-500 fill-red-500 flex-shrink-0 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">{query.Remarks}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Call Assigned Badge - Bucket A only, inline with description */}
            {bucketStatus === "A" && isCallAssigned && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-medium flex-shrink-0 cursor-help">
                    <Phone className="w-2.5 h-2.5" />
                    {callAssignedDisplayName}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    Call assigned to:{" "}
                    {callAssignedUser?.["Display Name"] ||
                      callAssignedUser?.Name ||
                      callAssignedEmail}
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Compact mode: Display Name inline with description (hidden in User View) */}
            {!detailView && !isUserView && assignedUser && (
              <span className="text-[10px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                <UserCheck className="w-3 h-3" />
                <span>
                  {assignedUser["Display Name"] ||
                    assignedUser.Name?.substring(0, 6) ||
                    assignedUser.Email.split("@")[0]}
                </span>
              </span>
            )}

            {/* Detail mode: Display Name inline (hidden in User View) */}
            {detailView && !isUserView && assignedUser && (
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

          {/* Right: Date (always visible) + Actions (overlay on hover) */}
          <div className="relative flex items-center flex-shrink-0">
            {/* Date - Always visible in compact mode, hidden on hover when actions show */}
            {!detailView &&
              (() => {
                const applicableDates = getApplicableDates();
                const dateDisplay = getDateDisplay() || "—";

                // If no dates, just show the date without tooltip
                if (applicableDates.length === 0) {
                  return (
                    <span className="text-[12px] text-blue-600 flex-shrink-0 group-hover:opacity-0 transition-opacity px-1">
                      {dateDisplay}
                    </span>
                  );
                }

                // Show tooltip with all dates
                return (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <span className="text-[12px] text-blue-600 flex-shrink-0 group-hover:opacity-0 transition-opacity px-1">
                        {dateDisplay}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <p className="font-semibold border-b pb-1 mb-1">
                          All Dates
                        </p>
                        {applicableDates.map((dateInfo, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: dateInfo.color }}
                            />
                            <span className="font-medium">
                              {dateInfo.label}:
                            </span>
                            <span>{dateInfo.value}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })()}

            {/* Actions - Overlay on hover with matching blue background */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-blue-50 pl-1 pr-0.5 opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {/* Assign/Reassign Button */}
              {showAssignButton && (
                <AssignDropdown
                  isOpen={showAssignDropdown}
                  onOpenChange={setShowAssignDropdown}
                  trigger={
                    <button
                      onClick={handleAssignClick}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
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
                        <UserCheck className="w-3 h-3" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                    </button>
                  }
                >
                  {(placement) => renderDropdownContent(true, placement)}
                </AssignDropdown>
              )}

              {/* Assign to Call Button - Bucket A only, Admin/Senior only */}
              {showCallAssignButton && (
                <AssignDropdown
                  isOpen={showCallDropdown}
                  onOpenChange={setShowCallDropdown}
                  trigger={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!showCallDropdown) {
                          setCallSearchQuery("");
                        }
                        setShowCallDropdown(!showCallDropdown);
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isCallAssigned
                          ? "bg-teal-100 hover:bg-teal-200 text-teal-700"
                          : "bg-teal-50 hover:bg-teal-100 text-teal-600"
                      }`}
                      title={
                        isCallAssigned
                          ? `Call assigned to: ${callAssignedUser?.["Display Name"] || callAssignedEmail}`
                          : "Assign to call"
                      }
                    >
                      <Phone className="w-3 h-3" />
                    </button>
                  }
                >
                  {(placement) => renderCallDropdownContent(placement)}
                </AssignDropdown>
              )}

              {/* Approve/Reject buttons for Bucket H */}
              {canApproveDelete && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onApproveDelete) onApproveDelete(query);
                    }}
                    className="w-6 h-6 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center text-green-700 transition-colors"
                    title="Approve Deletion"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onRejectDelete) onRejectDelete(query);
                    }}
                    className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-700 transition-colors"
                    title="Reject Deletion (Return to Previous Status)"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}

              {/* Edit Button */}
              {showEditButton && (
                <button
                  onClick={handleEditClick}
                  className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors"
                  title="Edit"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Remarks (Detail View) + All Applicable Dates (Detail View Only) - Compact format */}
        {detailView && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Remarks - Truncated to ~25 chars with full text on hover */}
            {query.Remarks && query.Remarks.trim() && (
              <>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-gray-600 italic truncate max-w-[200px] cursor-help">
                      "{query.Remarks.substring(0, 25)}
                      {query.Remarks.length > 25 ? "..." : ""}"
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">"{query.Remarks}"</p>
                  </TooltipContent>
                </Tooltip>
                {/* Hyphen separator between remarks and dates */}
                {getApplicableDates().length > 0 && (
                  <span className="text-[10px] text-gray-400">-</span>
                )}
              </>
            )}

            {/* All Applicable Dates */}
            {getApplicableDates().map((dateInfo, idx) => (
              <span
                key={idx}
                className="px-1 py-0.5 rounded text-[8px] font-medium"
                style={{
                  backgroundColor: `${dateInfo.color}15`,
                  color: dateInfo.color,
                }}
                title={`${dateInfo.label}: ${dateInfo.value}`}
              >
                {dateInfo.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export function QueryTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    New: "bg-green-100 text-green-700 border border-green-200",
    Ongoing: "bg-blue-100 text-blue-700 border border-blue-200",
    "SEO Query": "bg-purple-100 text-purple-700 border border-purple-200",
    "On Hold": "bg-red-100 text-red-700 border border-red-200",
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
