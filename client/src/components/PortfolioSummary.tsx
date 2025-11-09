import { PortfolioSummary as PortfolioSummaryType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
  stockCount: number;
}

export function PortfolioSummary({ summary, stockCount }: PortfolioSummaryProps) {
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const isProfit = summary.totalGainLoss >= 0;

  return (
    <div className="portfolio-summary">
      <h2>Portfolio Overview</h2>
      <div className="summary-cards">
        <div className="summary-card highlight">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">Total Portfolio Value</div>
            <div className="summary-value primary">{formatCurrency(summary.totalValue)}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Total P&L</div>
            <div className={`summary-value ${isProfit ? 'profit' : 'loss'}`}>
              {formatCurrency(summary.totalGainLoss)}
            </div>
            <div className={`summary-percent ${isProfit ? 'profit' : 'loss'}`}>
              {formatPercent(summary.totalGainLossPercent)}
            </div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🏢</div>
          <div className="summary-content">
            <div className="summary-label">Number of Stocks</div>
            <div className="summary-value">{stockCount}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💵</div>
          <div className="summary-content">
            <div className="summary-label">Total Investment</div>
            <div className="summary-value">{formatCurrency(summary.totalCost)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
