/**
 * Individual performance card displaying price performance for a specific time period.
 *
 * @param period - Time period label (e.g., "3 Months", "6 Months")
 * @param value - Performance percentage value
 *
 * @example
 * ```tsx
 * <PerformanceCard
 *   period="3 Months"
 *   value={15.5}
 * />
 * ```
 */

interface PerformanceCardProps {
  period: string;
  value: number;
}

export function PerformanceCard({ period, value }: PerformanceCardProps) {
  const formatPerformance = (val: number): string => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  const getPerformanceColor = (val: number): string => {
    return val >= 0 ? '#22c55e' : '#ef4444';
  };

  return (
    <div className="performance-card">
      <div className="performance-period">{period}</div>
      <div className="performance-value" style={{ color: getPerformanceColor(value) }}>
        {formatPerformance(value)}
      </div>
    </div>
  );
}
