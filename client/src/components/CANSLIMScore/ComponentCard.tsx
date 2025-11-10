/**
 * Individual component card displaying one CANSLIM factor (C, A, N, or S)
 * with score, progress bar, metric value, and explanation.
 *
 * @param letter - CANSLIM component letter (C, A, N, or S)
 * @param title - Full name of the component (e.g., "Current Earnings")
 * @param tooltip - Explanatory tooltip text
 * @param score - Component score value
 * @param maxScore - Maximum possible score for this component
 * @param explanation - Detailed explanation of the score
 * @param metric - Metric value to display (e.g., "25% YoY Growth")
 *
 * @example
 * ```tsx
 * <ComponentCard
 *   letter="C"
 *   title="Current Earnings"
 *   tooltip="Quarterly EPS growth year-over-year"
 *   score={20}
 *   maxScore={25}
 *   explanation="Strong quarterly earnings growth of 25%"
 *   metric="25% YoY Growth"
 * />
 * ```
 */

interface ComponentCardProps {
  letter: string;
  title: string;
  tooltip: string;
  score: number;
  maxScore: number;
  explanation: string;
  metric: string;
}

export function ComponentCard({
  letter,
  title,
  tooltip,
  score,
  maxScore,
  explanation,
  metric,
}: ComponentCardProps) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="component-card">
      <div className="component-header">
        <div className="component-letter">{letter}</div>
        <div className="component-title">
          {title}
          <span className="tooltip-icon" title={tooltip}>
            ℹ️
          </span>
        </div>
      </div>

      <div className="component-score">
        <span className="score-number">
          {score}/{maxScore}
        </span>
      </div>

      <div className="score-bar">
        <div
          className="score-bar-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: score >= 20 ? '#22c55e' : score >= 15 ? '#eab308' : '#ef4444',
          }}
        />
      </div>

      <div className="component-metric">{metric}</div>
      <div className="component-explanation">{explanation}</div>
    </div>
  );
}
