import { Fragment } from "react";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";

interface DashboardStatsProps {
  stats: Record<string, number>;
  onTotalClick?: () => void;
}

// Short names for compact display
const BUCKET_SHORT_NAMES: Record<string, string> = {
  A: "Unassigned",
  B: "Pending",
  C: "Sent Full",
  D: "Sent Partial",
  E: "Partial+SF",
  F: "Full+SF",
  G: "Discarded",
  H: "Deleted",
};

export function DashboardStats({ stats, onTotalClick }: DashboardStatsProps) {
  // Calculate total (A+B+C+D+E+F, excluding G and H)
  const total =
    (stats.A || 0) +
    (stats.B || 0) +
    (stats.C || 0) +
    (stats.D || 0) +
    (stats.E || 0) +
    (stats.F || 0);

  return (
    <div className="flex items-center gap-1.5 lg:gap-3">
      {BUCKET_ORDER.map((bucket) => {
        const config = BUCKETS[bucket];
        const count = stats[bucket] || 0;
        const shortName = BUCKET_SHORT_NAMES[bucket] || config.name;

        return (
          <Fragment key={bucket}>
            <div
              className="text-center px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${config.color}15` }}
            >
              <div
                className="text-lg lg:text-xl font-bold"
                style={{ color: config.color }}
              >
                {count}
              </div>
              <div
                className="text-[10px] lg:text-xs font-medium truncate max-w-[60px] lg:max-w-[80px]"
                style={{ color: config.color }}
              >
                {shortName}
              </div>
            </div>

            {/* Add Total after bucket F - Clickable */}
            {bucket === "F" && (
              <div
                className={`text-center px-2 py-1 rounded-lg bg-gray-100 border-2 border-gray-300 ${
                  onTotalClick ? "cursor-pointer hover:bg-gray-200 hover:border-blue-400 transition-colors" : ""
                }`}
                onClick={onTotalClick}
                title={onTotalClick ? "Click to view all queries" : undefined}
              >
                <div className="text-lg lg:text-xl font-bold text-gray-900">
                  {total}
                </div>
                <div className="text-[10px] lg:text-xs font-bold text-gray-700 uppercase max-w-[60px] lg:max-w-[80px]">
                  Total
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
