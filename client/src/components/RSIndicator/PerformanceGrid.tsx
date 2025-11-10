import { PerformanceCard } from './PerformanceCard';

/**
 * Grid layout displaying price performance across multiple time periods
 * (3, 6, 9, and 12 months).
 *
 * @param pricePerformance - Object containing performance data for each period
 *
 * @example
 * ```tsx
 * <PerformanceGrid
 *   pricePerformance={{
 *     month3: 15.5,
 *     month6: 22.3,
 *     month9: 18.7,
 *     month12: 25.4
 *   }}
 * />
 * ```
 */

interface RSPricePerformance {
  month3: number;
  month6: number;
  month9: number;
  month12: number;
  weightedScore: number;
}

interface PerformanceGridProps {
  pricePerformance: RSPricePerformance;
}

export function PerformanceGrid({ pricePerformance }: PerformanceGridProps) {
  return (
    <div className="performance-section">
      <h3>Price Performance</h3>
      <div className="performance-grid">
        <PerformanceCard period="3 Months" value={pricePerformance.month3} />
        <PerformanceCard period="6 Months" value={pricePerformance.month6} />
        <PerformanceCard period="9 Months" value={pricePerformance.month9} />
        <PerformanceCard period="12 Months" value={pricePerformance.month12} />
      </div>
    </div>
  );
}
