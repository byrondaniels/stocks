import { formatCurrency } from '../../utils/formatters';

interface StockHeaderProps {
  ticker: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  companyName?: string;
}

/**
 * Displays the stock ticker, current price, and profit/loss information
 * in the header of the stock detail page.
 *
 * @param ticker - Stock ticker symbol
 * @param currentPrice - Current stock price
 * @param profitLoss - Profit or loss in dollars
 * @param profitLossPercent - Profit or loss as a percentage
 *
 * @example
 * ```tsx
 * <StockHeader
 *   ticker="AAPL"
 *   currentPrice={175.50}
 *   profitLoss={25.50}
 *   profitLossPercent={17.5}
 * />
 * ```
 */
export function StockHeader({ ticker, currentPrice, profitLoss, profitLossPercent, companyName }: StockHeaderProps) {
  const isProfitable = profitLoss !== undefined && profitLoss >= 0;
  const hasPortfolioData = profitLoss !== undefined || profitLossPercent !== undefined;

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="stock-header">
      <div className="header-main">
        <h1 className="ticker-symbol">{ticker}</h1>
        {companyName && <div className="company-name">{companyName}</div>}
        <div className="current-price">
          {formatCurrency(currentPrice)}
        </div>
      </div>
      {hasPortfolioData && (
        <div className="header-secondary">
          <span className={`price-change ${isProfitable ? 'profit' : 'loss'}`}>
            {formatCurrency(profitLoss)} ({formatPercent(profitLossPercent)})
          </span>
        </div>
      )}
    </div>
  );
}
