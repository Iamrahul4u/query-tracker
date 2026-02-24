import { Fragment, useState } from "react";
import { BUCKETS, BUCKET_ORDER } from "../config/sheet-constants";
import { ChevronUp, ChevronDown } from "lucide-react";

interface DashboardStatsProps {
  stats: Record<string, number>;
  onTotalClick?: () => void;
  onBucketClick?: (bucket: string) => void;
  currentViewMode?: "bucket" | "user";
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

export function DashboardStats({
  stats,
  onTotalClick,
  onBucketClick,
  currentViewMode = "bucket",
}: DashboardStatsProps) {
  // Collapsible state for mobile
  const [isVisible, setIsVisible] = useState(true);

  // Calculate total (A+B+C+D+E+F, excluding G and H)
  const total =
    (stats.A || 0) +
    (stats.B || 0) +
    (stats.C || 0) +
    (stats.D || 0) +
    (stats.E || 0) +
    (stats.F || 0);

  return (
    <>
      {/* Desktop View - Original horizontal layout */}
      <div className="hidden lg:flex items-center justify-center w-full gap-1.5 lg:gap-3">
        {BUCKET_ORDER.map((bucket) => {
          const config = BUCKETS[bucket];
          const count = stats[bucket] || 0;
          const shortName = BUCKET_SHORT_NAMES[bucket] || config.name;

          return (
            <Fragment key={bucket}>
              <div
                className={`text-center px-2 py-1 rounded-lg ${
                  onBucketClick
                    ? "cursor-pointer hover:opacity-80 hover:scale-105 transition-all"
                    : ""
                }`}
                style={{ backgroundColor: `${config.color}15` }}
                onClick={() => onBucketClick?.(bucket)}
                title={
                  onBucketClick
                    ? `Click to view ${shortName} queries`
                    : undefined
                }
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
                    onTotalClick
                      ? "cursor-pointer hover:bg-gray-200 hover:border-blue-400 hover:scale-105 transition-all"
                      : ""
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

      {/* Mobile View - Inline badges that scroll within header's flex container */}
      <div className="lg:hidden flex items-center">
        {isVisible && (
          <div className="flex items-center gap-1 py-0.5">
            {BUCKET_ORDER.map((bucket) => {
              const config = BUCKETS[bucket];
              const count = stats[bucket] || 0;

              return (
                <div
                  key={bucket}
                  className={`flex flex-col items-center px-1.5 py-0.5 min-w-[36px] shrink-0 rounded border ${
                    onBucketClick
                      ? "cursor-pointer active:scale-95 transition-transform"
                      : ""
                  }`}
                  onClick={() => onBucketClick?.(bucket)}
                  style={{
                    borderColor: `${config.color}40`,
                    backgroundColor: `${config.color}10`,
                  }}
                >
                  <span
                    className="text-[10px] font-bold leading-tight"
                    style={{ color: config.color }}
                  >
                    {count}
                  </span>
                  <span
                    className="text-[7px] uppercase font-medium leading-tight"
                    style={{ color: config.color }}
                  >
                    {bucket}
                  </span>
                </div>
              );
            })}

            {/* Total card */}
            <div
              className={`flex flex-col items-center px-1.5 py-0.5 min-w-[36px] shrink-0 bg-blue-50 rounded border border-blue-300 ${
                onTotalClick
                  ? "cursor-pointer active:scale-95 transition-transform"
                  : ""
              }`}
              onClick={onTotalClick}
            >
              <span className="text-[10px] font-bold text-blue-700 leading-tight">{total}</span>
              <span className="text-[7px] uppercase font-bold text-blue-700 leading-tight">
                Tot
              </span>
            </div>
          </div>
        )}

        {/* Toggle — always in-flow */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="shrink-0 flex items-center justify-center px-1 py-0.5 text-gray-400 hover:text-gray-600 transition-colors"
          title={isVisible ? "Hide Stats" : "Show Stats"}
        >
          {isVisible ? (
            <ChevronUp size={10} />
          ) : (
            <ChevronDown size={10} />
          )}
        </button>
      </div>
    </>
  );
}
