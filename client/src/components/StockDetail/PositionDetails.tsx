import { formatCurrency } from '../../utils/formatters';

interface PositionDetailsProps {
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  lastUpdated?: string;
}

/**
 * Displays detailed information about a stock position including purchase
 * information, current value, and performance metrics.
 *
 * @param shares - Number of shares owned
 * @param purchasePrice - Price per share at purchase
 * @param purchaseDate - Date of purchase
 * @param currentPrice - Current price per share
 * @param profitLoss - Total profit or loss in dollars
 * @param profitLossPercent - Profit or loss as a percentage
 * @param lastUpdated - Timestamp of last price update
 *
 * @example
 * ```tsx
 * <PositionDetails
 *   shares={100}
 *   purchasePrice={150.00}
 *   purchaseDate="2024-01-01"
 *   currentPrice={175.50}
 *   profitLoss={2550.00}
 *   profitLossPercent={17.0}
 *   lastUpdated="2024-01-15T10:30:00Z"
 * />
 * ```
 */
export function PositionDetails({
  shares,
  purchasePrice,
  purchaseDate,
  currentPrice,
  profitLoss,
  profitLossPercent,
  lastUpdated,
}: PositionDetailsProps) {
  const totalValue = currentPrice !== undefined ? currentPrice * shares : 0;
  const totalCost = purchasePrice * shares;
  const isProfitable = profitLoss !== undefined && profitLoss >= 0;

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <h2>Your Position</h2>
      <div className="detail-grid">
        <div className="detail-card">
          <div className="detail-label">Purchase Information</div>
          <div className="detail-row">
            <span className="detail-key">Shares:</span>
            <span className="detail-value">{shares}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Purchase Price:</span>
            <span className="detail-value">{formatCurrency(purchasePrice)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Purchase Date:</span>
            <span className="detail-value">{new Date(purchaseDate).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Total Cost:</span>
            <span className="detail-value">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-label">Current Value</div>
          <div className="detail-row">
            <span className="detail-key">Current Price:</span>
            <span className="detail-value">{formatCurrency(currentPrice)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Total Value:</span>
            <span className="detail-value">{formatCurrency(totalValue)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Last Updated:</span>
            <span className="detail-value">{formatDate(lastUpdated)}</span>
          </div>
        </div>

        <div className="detail-card">
          <div className="detail-label">Performance</div>
          <div className="detail-row">
            <span className="detail-key">Profit/Loss:</span>
            <span className={`detail-value ${isProfitable ? 'profit' : 'loss'}`}>
              {formatCurrency(profitLoss)}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-key">Profit/Loss %:</span>
            <span className={`detail-value ${isProfitable ? 'profit' : 'loss'}`}>
              {formatPercent(profitLossPercent)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
