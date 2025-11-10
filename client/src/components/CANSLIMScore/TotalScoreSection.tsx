/**
 * Displays the overall CANSLIM score in a circular badge with color-coded
 * indicators based on score value.
 *
 * @param score - Overall CANSLIM score (0-100)
 * @param calculatedAt - Timestamp when the score was calculated
 *
 * @example
 * ```tsx
 * <TotalScoreSection
 *   score={75}
 *   calculatedAt="2024-01-15T10:30:00Z"
 * />
 * ```
 */

interface TotalScoreSectionProps {
  score: number;
  calculatedAt: string;
}

export function TotalScoreSection({ score, calculatedAt }: TotalScoreSectionProps) {
  const getScoreColor = (scoreValue: number): string => {
    if (scoreValue >= 75) return '#22c55e'; // green
    if (scoreValue >= 50) return '#eab308'; // yellow
    if (scoreValue >= 25) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="total-score-section">
      <div className="total-score-circle" style={{ borderColor: getScoreColor(score) }}>
        <div className="score-value" style={{ color: getScoreColor(score) }}>
          {score}
        </div>
        <div className="score-label">out of 100</div>
      </div>
      <div className="score-info">
        <p className="calculated-at">
          Calculated: {formatDate(calculatedAt)}
        </p>
      </div>
    </div>
  );
}
