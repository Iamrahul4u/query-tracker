import { Query, User } from "../utils/sheets";
import { useTooltipStore } from "../hooks/useTooltip";

interface AuditTooltipProps {
  query: Query;
  users: User[];
}

/**
 * Get display name from email using users list
 */
function getDisplayName(email: string | undefined, users: User[]): string {
  if (!email) return "-";

  // Defensive check: ensure users is an array
  if (!Array.isArray(users)) {
    const namePart = email.split("@")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }

  // Find user by email
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
    // Parse date - handle both "DD/MM/YYYY HH:MM:SS" and "DD/MM/YYYY, HH:MM:SS" formats
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

export function AuditTooltip({ query, users }: AuditTooltipProps) {
  const { placement } = useTooltipStore();

  const auditItems = [
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
      label: "Last Edited By",
      value: query["Last Edited By"],
      time: query["Last Edited Date Time"],
    },
  ];

  return (
    <div className="relative w-64 bg-gray-800 text-white text-xs p-3 rounded shadow-xl border border-gray-700 pointer-events-none">
      <div className="space-y-2">
        {auditItems.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-gray-400 font-semibold">{item.label}:</span>
            <span>
              {item.value ? getDisplayName(item.value, users) : "-"}
              {item.time ? ` @ ${formatDate(item.time)}` : ""}
            </span>
          </div>
        ))}
        {query["Delete Requested By"] && (
          <div className="flex flex-col text-red-300 border-t border-gray-600 pt-1 mt-1">
            <span className="font-semibold">Deletion Requested:</span>
            <span>
              {getDisplayName(query["Delete Requested By"], users)} @{" "}
              {formatDate(query["Delete Requested Date Time"])}
            </span>
          </div>
        )}
      </div>
      {/* Dynamic Arrow */}
      {placement === "top" ? (
        // Tooltip is ABOVE item -> Arrow points DOWN (at bottom of tooltip)
        <div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-gray-800 rotate-45 border-r border-b border-gray-700"></div>
      ) : (
        // Tooltip is BELOW item -> Arrow points UP (at top of tooltip)
        <div className="absolute top-[-4px] left-4 w-2 h-2 bg-gray-800 rotate-45 border-l border-t border-gray-700"></div>
      )}
    </div>
  );
}
