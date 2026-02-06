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
  // Order: Added → Assigned → Proposal Sent → SF Entry → Discarded → Last Edited
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
  ];

  // Filter to only show items with data (either value or time)
  const auditItems = allAuditItems.filter((item) => item.value || item.time);

  return (
    <div className="space-y-2 text-xs">
      {auditItems.map((item, idx) => (
        <div key={idx} className="flex flex-col">
          <span className="text-muted-foreground font-semibold">
            {item.label}:
          </span>
          <span>
            {"isDateOnly" in item && item.isDateOnly ? (
              formatDate(item.time)
            ) : (
              <>
                {item.value ? getDisplayName(item.value, users) : "-"}
                {item.time ? ` @ ${formatDate(item.time)}` : ""}
              </>
            )}
          </span>
        </div>
      ))}
      {query["Delete Requested By"] && (
        <div className="flex flex-col text-red-400 border-t border-border pt-2 mt-2">
          <span className="font-semibold">Deletion Requested:</span>
          <span>
            {getDisplayName(query["Delete Requested By"], users)} @{" "}
            {formatDate(query["Delete Requested Date Time"])}
          </span>
        </div>
      )}
    </div>
  );
}
