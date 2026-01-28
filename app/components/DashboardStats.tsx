interface DashboardStatsProps {
  pending: number;
  inProgress: number;
  sent: number;
}

export function DashboardStats({
  pending,
  inProgress,
  sent,
}: DashboardStatsProps) {
  return (
    <div className="hidden md:flex items-center gap-6">
      <div className="text-center">
        <div className="text-2xl font-bold text-red-500">{pending}</div>
        <div className="text-xs text-gray-500">Pending</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-500">{inProgress}</div>
        <div className="text-xs text-gray-500">In Progress</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-500">{sent}</div>
        <div className="text-xs text-gray-500">Proposal Sent</div>
      </div>
    </div>
  );
}
