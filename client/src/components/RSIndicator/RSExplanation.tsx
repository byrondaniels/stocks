/**
 * Displays explanatory text about the RS Rating methodology and interpretation.
 *
 * @param rating - Current RS rating value to include in the explanation
 *
 * @example
 * ```tsx
 * <RSExplanation rating={85} />
 * ```
 */

interface RSExplanationProps {
  rating: number;
}

export function RSExplanation({ rating }: RSExplanationProps) {
  return (
    <div className="rs-explanation">
      <h3>About RS Rating</h3>
      <p>
        The IBD Relative Strength (RS) Rating compares this stock's price performance
        over the past 12 months against all other stocks in your portfolio. A rating of{' '}
        <strong>{rating}</strong> means this stock has outperformed{' '}
        <strong>{rating}%</strong> of stocks.
      </p>
      <p>
        The rating uses a weighted calculation: 40% weight on the most recent 3 months,
        and 20% weight each on months 4-6, 7-9, and 10-12. Strong stocks typically have
        RS Ratings of 80 or higher.
      </p>
    </div>
  );
}
