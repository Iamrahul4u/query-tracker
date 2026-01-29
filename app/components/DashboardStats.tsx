import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";

interface DashboardStatsProps {
  stats: Record<string, number>;
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
};

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="flex items-center gap-1.5 lg:gap-3">
      {BUCKET_ORDER.map((bucket) => {
        const config = BUCKETS[bucket];
        const count = stats[bucket] || 0;
        const shortName = BUCKET_SHORT_NAMES[bucket] || config.name;

        return (
          <div
            key={bucket}
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
        );
      })}
    </div>
  );
}
