import { Query } from "../utils/sheets";
import { useTooltipStore } from "../hooks/useTooltip";

export function AuditTooltip({ query }: { query: Query }) {
  const { placement, position } = useTooltipStore();

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
    // Note: Last Status Change fields might need to be derived or added to Query interface if not present in sheet explicitly.
    // Sheet has "Last Activity" but not specifically "Last Status Change By".
    // Plan mentions "LastStatusChangeBy" in 9.4 but "Query" interface in 8.1 doesn't list it explicitly,
    // it lists "Last Edited By", "Last Activity Date Time".
    // I will use "Last Edited" as proxy or show what we have.
    {
      label: "Last Edited By",
      value: query["Last Edited By"],
      time: query["Last Edited Date Time"],
    },
  ];

  return (
    <div
      className="relative w-64 bg-gray-800 text-white text-xs p-3 rounded shadow-xl border border-gray-700 pointer-events-none"
    >
      <div className="space-y-2">
        {auditItems.map((item, idx) => (
          <div key={idx} className="flex flex-col">
            <span className="text-gray-400 font-semibold">{item.label}:</span>
            <span>
              {item.value ? item.value.split("@")[0] : "-"}
              {item.time ? ` @ ${item.time}` : ""}
            </span>
          </div>
        ))}
        {query["Delete Requested By"] && (
          <div className="flex flex-col text-red-300 border-t border-gray-600 pt-1 mt-1">
            <span className="font-semibold">Deletion Requested:</span>
            <span>
              {query["Delete Requested By"]} @{" "}
              {query["Delete Requested Date Time"]}
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
