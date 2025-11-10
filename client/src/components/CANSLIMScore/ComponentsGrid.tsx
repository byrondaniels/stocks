import { ComponentCard } from './ComponentCard';

/**
 * Grid layout displaying all four CANSLIM components (C, A, N, S) with their
 * scores, metrics, and explanations.
 *
 * @param components - Object containing scores for C, A, N, and S components
 * @param metrics - Object containing numerical metrics for each component
 *
 * @example
 * ```tsx
 * <ComponentsGrid
 *   components={{
 *     C: { score: 20, explanation: "Strong earnings" },
 *     A: { score: 22, explanation: "Excellent annual growth" },
 *     N: { score: 18, explanation: "Near 52-week high" },
 *     S: { score: 15, explanation: "Moderate volume" }
 *   }}
 *   metrics={{
 *     currentEarningsGrowth: 25,
 *     annualEarningsGrowth: 30,
 *     distanceFromHigh: 5,
 *     fiftyTwoWeekHigh: 175.50,
 *     volumeRatio: 1.5
 *   }}
 * />
 * ```
 */

interface CANSLIMComponentScore {
  score: number;
  explanation: string;
}

interface CANSLIMMetrics {
  currentEarningsGrowth: number | null;
  annualEarningsGrowth: number | null;
  distanceFromHigh: number;
  fiftyTwoWeekHigh: number;
  volumeRatio: number | null;
}

interface ComponentsGridProps {
  components: {
    C: CANSLIMComponentScore;
    A: CANSLIMComponentScore;
    N: CANSLIMComponentScore;
    S: CANSLIMComponentScore;
  };
  metrics: CANSLIMMetrics;
}

export function ComponentsGrid({ components, metrics }: ComponentsGridProps) {
  return (
    <div className="components-section">
      <h3>Component Breakdown</h3>
      <div className="components-grid">
        {/* C - Current Earnings */}
        <ComponentCard
          letter="C"
          title="Current Earnings"
          tooltip="Quarterly EPS growth year-over-year. Strong growth indicates robust earnings momentum."
          score={components.C.score}
          maxScore={25}
          explanation={components.C.explanation}
          metric={
            metrics.currentEarningsGrowth !== null
              ? `${metrics.currentEarningsGrowth.toFixed(2)}% YoY Growth`
              : 'N/A'
          }
        />

        {/* A - Annual Earnings */}
        <ComponentCard
          letter="A"
          title="Annual Earnings"
          tooltip="3-year average annual EPS growth. Consistent growth over time is key."
          score={components.A.score}
          maxScore={25}
          explanation={components.A.explanation}
          metric={
            metrics.annualEarningsGrowth !== null
              ? `${metrics.annualEarningsGrowth.toFixed(2)}% Avg Growth`
              : 'N/A'
          }
        />

        {/* N - New Highs */}
        <ComponentCard
          letter="N"
          title="New Highs"
          tooltip="How close the stock is to its 52-week high. Leaders tend to make new highs."
          score={components.N.score}
          maxScore={25}
          explanation={components.N.explanation}
          metric={`${metrics.distanceFromHigh.toFixed(1)}% from high ($${metrics.fiftyTwoWeekHigh.toFixed(2)})`}
        />

        {/* S - Supply & Demand */}
        <ComponentCard
          letter="S"
          title="Supply & Demand"
          tooltip="Volume ratio vs average. Higher volume suggests institutional accumulation."
          score={components.S.score}
          maxScore={25}
          explanation={components.S.explanation}
          metric={
            metrics.volumeRatio !== null
              ? `${metrics.volumeRatio.toFixed(2)}x avg volume`
              : 'N/A'
          }
        />
      </div>
    </div>
  );
}
