import { useState } from 'react';
import { InsiderSummary } from '../types';
import '../styles/InsiderActivity.css';

interface InsiderActivityProps {
  summary: InsiderSummary | null | undefined;
}

export function InsiderActivity({ summary }: InsiderActivityProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!summary || summary.netShares === 0) {
    return <span className="insider-none">-</span>;
  }

  const isBuying = summary.netShares > 0;
  const buyCount = summary.totalBuyShares > 0 ? 1 : 0;
  const sellCount = summary.totalSellShares > 0 ? 1 : 0;

  // Determine sentiment and color
  const sentiment = isBuying ? 'buying' : 'selling';
  const icon = isBuying ? '📈' : '📉';

  const tooltipContent = (
    <div className="insider-tooltip-content">
      <div className="insider-tooltip-title">Insider Activity</div>
      <div className="insider-tooltip-row">
        <span>Buy Shares:</span>
        <span className="insider-buy">{summary.totalBuyShares.toLocaleString()}</span>
      </div>
      <div className="insider-tooltip-row">
        <span>Sell Shares:</span>
        <span className="insider-sell">{summary.totalSellShares.toLocaleString()}</span>
      </div>
      <div className="insider-tooltip-row insider-tooltip-net">
        <span>Net Shares:</span>
        <span className={isBuying ? 'insider-buy' : 'insider-sell'}>
          {summary.netShares > 0 ? '+' : ''}{summary.netShares.toLocaleString()}
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="insider-activity-container"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`insider-indicator ${sentiment}`}>
        <span className="insider-icon">{icon}</span>
        <span className="insider-text">
          {buyCount > 0 && `${buyCount} buy${buyCount > 1 ? 's' : ''}`}
          {buyCount > 0 && sellCount > 0 && ', '}
          {sellCount > 0 && `${sellCount} sell${sellCount > 1 ? 's' : ''}`}
        </span>
      </div>
      {showTooltip && (
        <div className="insider-tooltip">
          {tooltipContent}
        </div>
      )}
    </div>
  );
}
