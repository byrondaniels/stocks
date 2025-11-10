/**
 * Displays the main RS rating gauge with a semi-circular progress indicator
 * and rating information including strength badge and percentile description.
 *
 * @param rating - RS rating value (1-99)
 * @param calculatedAt - Timestamp when the rating was calculated
 *
 * @example
 * ```tsx
 * <RSGaugeSection
 *   rating={85}
 *   calculatedAt="2024-01-15T10:30:00Z"
 * />
 * ```
 */

interface RSGaugeSectionProps {
  rating: number;
  calculatedAt: string;
}

export function RSGaugeSection({ rating, calculatedAt }: RSGaugeSectionProps) {
  const getRatingColor = (ratingValue: number): string => {
    if (ratingValue >= 80) return '#22c55e'; // green - Strong
    if (ratingValue >= 60) return '#84cc16'; // lime - Good
    if (ratingValue >= 40) return '#eab308'; // yellow - Average
    if (ratingValue >= 20) return '#f97316'; // orange - Weak
    return '#ef4444'; // red - Very Weak
  };

  const getRatingLabel = (ratingValue: number): string => {
    if (ratingValue >= 80) return 'Strong';
    if (ratingValue >= 60) return 'Good';
    if (ratingValue >= 40) return 'Average';
    if (ratingValue >= 20) return 'Weak';
    return 'Very Weak';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="rs-gauge-section">
      <div className="rs-gauge">
        <svg viewBox="0 0 200 120" className="gauge-svg">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Colored arc based on rating */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={getRatingColor(rating)}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(rating / 99) * 251.2} 251.2`}
          />
          {/* Rating text */}
          <text
            x="100"
            y="80"
            textAnchor="middle"
            className="gauge-rating"
            fill={getRatingColor(rating)}
          >
            {rating}
          </text>
          <text x="100" y="100" textAnchor="middle" className="gauge-label">
            out of 99
          </text>
        </svg>
      </div>

      <div className="rs-rating-info">
        <div
          className="rating-badge"
          style={{ backgroundColor: getRatingColor(rating) }}
        >
          {getRatingLabel(rating)}
        </div>
        <p className="rating-description">
          Outperforms <strong>{rating}%</strong> of all stocks
        </p>
        <p className="calculated-at">Updated: {formatDate(calculatedAt)}</p>
      </div>
    </div>
  );
}
