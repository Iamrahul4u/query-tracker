import { Query, User } from "../utils/sheets";

interface AuditTooltipContentProps {
  query: Query;
  users: User[];
}

/**
 * Get display name from email using users list
 */
function getDisplayName(email: string | undefined, users: User[]): string {
  if (!email) return "-";

  const user = users.find(
    (u) => u.Email?.toLowerCase() === email.toLowerCase(),
  );
  if (user?.Name) return user.Name;

  // Fallback: extract name from email (before @)
  const namePart = email.split("@")[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

/**
 * Format date to user-friendly format
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";

  try {
    // Parse DD/MM/YYYY, HH:MM:SS format
    // Handle both "DD/MM/YYYY, HH:MM:SS" and "DD/MM/YYYY HH:MM:SS"
    const normalized = dateStr.replace(", ", " ");
    const parts = normalized.split(" ");

    if (parts.length < 1) return dateStr;

    const datePart = parts[0];
    const timePart = parts[1] || "00:00:00";

    const [day, month, year] = datePart.split("/").map((p) => parseInt(p, 10));
    const [hours, minutes] = timePart.split(":").map((t) => parseInt(t, 10));
    const date = new Date(year, month - 1, day, hours || 0, minutes || 0);

    if (isNaN(date.getTime())) return dateStr;

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dateFormatted = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return `${timeStr}, ${dateFormatted}`;
  } catch {
    return dateStr;
  }
}

export function AuditTooltipContent({
  query,
  users,
}: AuditTooltipContentProps) {
  // Build audit items in chronological order per 5th Feb meeting requirements
  // Order: Added → Assigned → Proposal Sent → SF Entry → Discarded → Last Edited → Remark Added
  const allAuditItems = [
    {
      label: "Added By",
      value: query["Added By"],
      time: query["Added Date Time"],
    },
    {
      label: "Assigned By",
      value: query["Assigned By"],
      time: query["Assignment Date Time"],
    },
    {
      label: "Proposal Sent",
      value: null, // No user for this action
      time: query["Proposal Sent Date Time"],
      isDateOnly: true,
    },
    {
      label: "Entered in SF",
      value: null,
      time: query["Entered In SF Date Time"],
      isDateOnly: true,
    },
    {
      label: "Discarded",
      value: null,
      time: query["Discarded Date Time"],
      isDateOnly: true,
    },
    {
      label: "Last Edited By",
      value: query["Last Edited By"],
      time: query["Last Edited Date Time"],
    },
    {
      label: "Remark Added By",
      value: query["Remark Added By"],
      time: query["Remark Added Date Time"],
      highlight: true, // Highlight remark audit trail
      remarkText: query["Remarks"], // Include the actual remark text
    },
  ];

  // Filter to only show items with data (either value or time)
  const auditItems = allAuditItems.filter((item) => item.value || item.time);

  return (
    <div className="space-y-2 text-xs">
      {auditItems.map((item, idx) => (
        <div
          key={idx}
          className={`flex flex-col ${item.highlight ? "text-blue-600 font-semibold" : ""}`}
        >
          <span className="text-muted-foreground font-semibold">
            {item.label}:
          </span>
          <span>
            {"isDateOnly" in item && item.isDateOnly ? (
              formatDate(item.time)
            ) : (
              <>
                {/* Show remark text if available */}
                {"remarkText" in item && item.remarkText ? (
                  <>
                    <span className="italic">"{item.remarkText}"</span>
                    <span> - </span>
                  </>
                ) : null}
                {item.value ? getDisplayName(item.value, users) : "-"}
                {item.time ? ` @ ${formatDate(item.time)}` : ""}
              </>
            )}
          </span>
        </div>
      ))}
      {query["Delete Requested By"] && (
        <div className="flex flex-col text-red-600 border-t border-border pt-2 mt-2">
          <span className="font-semibold">Delete requested</span>
          <span>
            by {getDisplayName(query["Delete Requested By"], users)}
            {query["Delete Requested Date Time"] &&
              ` @ ${formatDate(query["Delete Requested Date Time"])}`}
          </span>
        </div>
      )}
      {query["Delete Approved By"] && (
        <div className="flex flex-col text-gray-600 border-t border-border pt-2 mt-2">
          <span className="font-semibold">Delete approved</span>
          <span>
            by {getDisplayName(query["Delete Approved By"], users)}
            {query["Delete Approved Date Time"] &&
              ` @ ${formatDate(query["Delete Approved Date Time"])}`}
          </span>
        </div>
      )}
      {query["Delete Rejected By"] && (
        <div className="flex flex-col text-orange-600 border-t border-border pt-2 mt-2">
          <span className="font-semibold">Delete rejected</span>
          <span>
            by {getDisplayName(query["Delete Rejected By"], users)}
            {query["Delete Rejected Date Time"] &&
              ` @ ${formatDate(query["Delete Rejected Date Time"])}`}
          </span>
        </div>
      )}
    </div>
  );
}
