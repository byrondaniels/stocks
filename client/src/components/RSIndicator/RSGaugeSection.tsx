/**
 * Displays an RS rating gauge with a semi-circular progress indicator
 * and rating information including strength badge and description.
 *
 * @param rating - RS rating value (1-99)
 * @param calculatedAt - Timestamp when the rating was calculated
 * @param label - Label for the gauge (e.g., "Sector Strength" or "Stock Strength")
 * @param description - Description of what is being compared
 *
 * @example
 * ```tsx
 * <RSGaugeSection
 *   rating={85}
 *   calculatedAt="2024-01-15T10:30:00Z"
 *   label="Sector Strength"
 *   description="XLK vs SPY"
 * />
 * ```
 */

interface RSGaugeSectionProps {
  rating: number;
  calculatedAt: string;
  label: string;
  description: string;
}

export function RSGaugeSection({ rating, label, description }: RSGaugeSectionProps) {
  const getRatingColor = (ratingValue: number): string => {
    if (ratingValue >= 70) return '#22c55e'; // green - Strong
    if (ratingValue >= 60) return '#84cc16'; // lime - Good
    if (ratingValue >= 40) return '#eab308'; // yellow - Average
    if (ratingValue >= 30) return '#f97316'; // orange - Weak
    return '#ef4444'; // red - Very Weak
  };

  const getRatingLabel = (ratingValue: number): string => {
    if (ratingValue >= 70) return 'Strong';
    if (ratingValue >= 60) return 'Good';
    if (ratingValue >= 40) return 'Average';
    if (ratingValue >= 30) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="rs-gauge-section">
      <h3 className="rs-gauge-title">{label}</h3>
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
          {description}
        </p>
      </div>
    </div>
  );
}
