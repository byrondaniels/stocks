/**
 * Displays explanatory text about the RS Rating methodology and interpretation.
 *
 * @param sectorRS - Sector RS rating value
 * @param stockRS - Stock RS rating value
 * @param sectorETF - The sector ETF used for comparison
 *
 * @example
 * ```tsx
 * <RSExplanation sectorRS={75} stockRS={85} sectorETF="XLK" />
 * ```
 */

interface RSExplanationProps {
  sectorRS: number;
  stockRS: number;
  sectorETF: string | null;
}

export function RSExplanation({ sectorRS, stockRS, sectorETF }: RSExplanationProps) {
  const getInterpretation = () => {
    if (sectorRS >= 70 && stockRS >= 70) {
      return "This is a true leader: strong stock in a strong sector.";
    } else if (stockRS >= 70 && sectorRS < 50) {
      return "Strong stock in a weak sector - could be a contrarian opportunity.";
    } else if (sectorRS >= 70 && stockRS < 50) {
      return "Strong sector but stock is lagging - consider other stocks in this sector.";
    } else if (sectorRS < 30 && stockRS < 30) {
      return "Both sector and stock are weak - proceed with caution.";
    } else {
      return "Mixed performance - evaluate both sector trends and stock fundamentals.";
    }
  };

  return (
    <div className="rs-explanation">
      <h3>Interpretation</h3>
      <p className="rs-interpretation">
        <strong>{getInterpretation()}</strong>
      </p>
      <h3>About This Analysis</h3>
      <p>
        This Relative Strength analysis calculates two separate scores:
      </p>
      <ul>
        <li>
          <strong>Sector Strength:</strong> Measures how the {sectorETF || "market"} performs relative to SPY
          (the S&P 500 benchmark).
        </li>
        <li>
          <strong>Stock Strength:</strong> Measures how this stock performs relative to its {sectorETF ? `sector ETF (${sectorETF})` : "the S&P 500"}.
        </li>
      </ul>
      <p>
        Both calculations use a weighted approach across multiple timeframes (3, 6, and 12 months),
        with more weight given to recent performance (40% on 3-month, 30% on 6-month, 30% on 12-month).
        Scores are normalized to a 1-99 scale, where 50 represents average performance.
      </p>
    </div>
  );
}
