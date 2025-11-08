import { PortfolioSummary as PortfolioSummaryType } from '../types';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const isProfit = summary.totalGainLoss >= 0;

  return (
    <div className="portfolio-summary">
      <h2>Portfolio Summary</h2>
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Value</div>
          <div className="summary-value">{formatCurrency(summary.totalValue)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Cost</div>
          <div className="summary-value">{formatCurrency(summary.totalCost)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Gain/Loss</div>
          <div className={`summary-value ${isProfit ? 'profit' : 'loss'}`}>
            {formatCurrency(summary.totalGainLoss)}
          </div>
          <div className={`summary-percent ${isProfit ? 'profit' : 'loss'}`}>
            {formatPercent(summary.totalGainLossPercent)}
          </div>
        </div>
      </div>
    </div>
  );
}
