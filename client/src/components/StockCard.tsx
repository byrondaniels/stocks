import { useState, useEffect } from 'react';
import { PortfolioStock, PriceHistoryPoint } from '../types';
import { PriceLineChart } from './PriceLineChart';
import { InsiderActivity } from './InsiderActivity';
import { RefreshButton } from './RefreshButton';
import { formatDate, formatCurrency } from '../utils/formatters';
import { HISTORICAL_DAYS_DEFAULT } from '../constants';
import './StockCard.css';

interface StockCardProps {
  stock: PortfolioStock;
  onRemove: (ticker: string) => void;
  onDetail: (ticker: string) => void;
  onRefresh?: (ticker: string) => Promise<void>;
  refreshing?: boolean;
  cooldownSeconds?: number;
  isWatchlist?: boolean;
}

export function StockCard({ stock, onRemove, onDetail, onRefresh, refreshing, cooldownSeconds, isWatchlist = false }: StockCardProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(stock.ticker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
        if (response.ok) {
          const data = await response.json();
          setPriceHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchPriceHistory();
  }, [stock.ticker]);

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalValue = !isWatchlist && stock.currentPrice !== undefined
    ? stock.currentPrice * (stock as any).shares
    : undefined;
  const isProfitable = stock.profitLoss !== undefined && stock.profitLoss >= 0;

  return (
    <div className="stock-card">
      <div className="stock-card-header">
        <div className="stock-info">
          <button
            className="stock-ticker"
            onClick={() => onDetail(stock.ticker)}
            title="View details"
          >
            {stock.ticker}
          </button>
          {!isWatchlist && <div className="stock-shares">{(stock as any).shares} shares</div>}
        </div>
        <div className="stock-actions">
          {onRefresh && (
            <RefreshButton
              onClick={() => onRefresh(stock.ticker)}
              loading={refreshing}
              disabled={refreshing || (cooldownSeconds !== undefined && cooldownSeconds > 0)}
              size="small"
            />
          )}
          <button
            className="btn-card-detail"
            onClick={() => onDetail(stock.ticker)}
            title="View details"
          >
            📊
          </button>
          <button
            className="btn-card-remove"
            onClick={() => onRemove(stock.ticker)}
            title="Remove stock"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="stock-card-chart">
        {loadingHistory ? (
          <div className="chart-loading">Loading chart...</div>
        ) : priceHistory.length > 0 ? (
          <PriceLineChart
            data={priceHistory.map(p => ({ date: p.date, close: p.close }))}
            ticker={stock.ticker}
            compact={true}
            height={80}
          />
        ) : (
          <div className="chart-placeholder">No chart data</div>
        )}
      </div>

      <div className="stock-card-metrics">
        <div className="metric-row">
          <span className="metric-label">Current Price</span>
          <span className="metric-value">{formatCurrency(stock.currentPrice)}</span>
        </div>
        {!isWatchlist && (
          <>
            <div className="metric-row">
              <span className="metric-label">Total Value</span>
              <span className="metric-value">{formatCurrency(totalValue)}</span>
            </div>
            <div className="metric-row highlight">
              <span className="metric-label">P/L</span>
              <span className={`metric-value ${isProfitable ? 'profit' : 'loss'}`}>
                {formatCurrency(stock.profitLoss)} ({formatPercent(stock.profitLossPercent)})
              </span>
            </div>
          </>
        )}
        {isWatchlist && (stock as any).movingAverage50 && (
          <div className="metric-row">
            <span className="metric-label">50-Day MA</span>
            <span className="metric-value">{formatCurrency((stock as any).movingAverage50)}</span>
          </div>
        )}
        {isWatchlist && (stock as any).percentageDifference !== undefined && (stock as any).percentageDifference !== null && (
          <div className="metric-row">
            <span className="metric-label">vs 50-Day MA</span>
            <span className={`metric-value ${(stock as any).percentageDifference >= 0 ? 'profit' : 'loss'}`}>
              {formatPercent((stock as any).percentageDifference)}
            </span>
          </div>
        )}
      </div>

      {stock.insiderActivity && (
        <div className="stock-card-footer">
          <span className="footer-label">Insider Activity:</span>
          <InsiderActivity summary={stock.insiderActivity} />
        </div>
      )}

      {!isWatchlist && stock.lastUpdated && (
        <div className="stock-card-updated">
          <span className="updated-label">Last Updated:</span>
          <span className="updated-time">{formatDate(stock.lastUpdated)}</span>
        </div>
      )}
      {isWatchlist && (stock as any).addedDate && (
        <div className="stock-card-updated">
          <span className="updated-label">Added:</span>
          <span className="updated-time">{formatDate((stock as any).addedDate)}</span>
        </div>
      )}
      {isWatchlist && (stock as any).notes && (
        <div className="stock-card-notes">
          <span className="notes-label">Notes:</span>
          <span className="notes-text">{(stock as any).notes}</span>
        </div>
      )}
    </div>
  );
}
