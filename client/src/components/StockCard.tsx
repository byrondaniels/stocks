import { useState, useEffect } from 'react';
import { PortfolioStock, PriceHistoryPoint } from '../types';
import { PriceLineChart } from './PriceLineChart';
import { InsiderActivity } from './InsiderActivity';
import './StockCard.css';

interface StockCardProps {
  stock: PortfolioStock;
  onRemove: (ticker: string) => void;
  onDetail: (ticker: string) => void;
}

export function StockCard({ stock, onRemove, onDetail }: StockCardProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(stock.ticker)}&days=50`);
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

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const totalValue = stock.currentPrice !== undefined
    ? stock.currentPrice * stock.shares
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
          <div className="stock-shares">{stock.shares} shares</div>
        </div>
        <div className="stock-actions">
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
      </div>

      {stock.insiderActivity && (
        <div className="stock-card-footer">
          <span className="footer-label">Insider Activity:</span>
          <InsiderActivity summary={stock.insiderActivity} />
        </div>
      )}
    </div>
  );
}
