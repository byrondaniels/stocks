import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortfolioStock, AddStockFormData, PortfolioSummary as PortfolioSummaryType } from '../types';
import { AddStockForm } from '../components/AddStockForm';
import { PortfolioTable } from '../components/PortfolioTable';
import { StockCard } from '../components/StockCard';
import { PortfolioSummary } from '../components/PortfolioSummary';
import { EmptyState } from '../components/EmptyState';
import { DeleteConfirmation } from '../components/DeleteConfirmation';

export function Portfolio() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState<PortfolioStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Fetch portfolio data
  const fetchPortfolio = async () => {
    try {
      setError(null);
      const response = await fetch('/api/portfolio');
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch portfolio: ${response.status}`);
      }
      const data = await response.json();
      setStocks(data.portfolio || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // Calculate portfolio summary
  const calculateSummary = (): PortfolioSummaryType => {
    const totalCost = stocks.reduce((sum, stock) => sum + stock.purchasePrice * stock.shares, 0);
    const totalValue = stocks.reduce((sum, stock) => {
      const value = stock.currentPrice !== undefined ? stock.currentPrice * stock.shares : 0;
      return sum + value;
    }, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
    };
  };

  // Add stock to portfolio
  const handleAddStock = async (formData: AddStockFormData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: formData.ticker,
          shares: parseFloat(formData.shares),
          purchasePrice: parseFloat(formData.purchasePrice),
          purchaseDate: formData.purchaseDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to add stock: ${response.status}`);
      }

      // Refresh portfolio after adding
      await fetchPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add stock');
      throw err; // Re-throw to prevent form reset
    } finally {
      setLoading(false);
    }
  };

  // Remove stock from portfolio
  const handleRemoveStock = async (ticker: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to remove stock: ${response.status}`);
      }

      // Refresh portfolio after removing
      await fetchPortfolio();
      setDeleteConfirmation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove stock');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to stock detail
  const handleStockDetail = (ticker: string) => {
    navigate(`/stock/${ticker}`);
  };

  // Show delete confirmation
  const handleRemoveClick = (ticker: string) => {
    setDeleteConfirmation(ticker);
  };

  if (initialLoading) {
    return (
      <div className="portfolio-page">
        <div className="loading-state">Loading portfolio...</div>
      </div>
    );
  }

  const summary = calculateSummary();

  return (
    <div className="portfolio-page">
      <header className="portfolio-header">
        <h1>My Portfolio</h1>
      </header>

      {error && (
        <div className="alert error">
          <strong>Error:</strong> {error}
        </div>
      )}

      <AddStockForm onAdd={handleAddStock} loading={loading} />

      {stocks.length > 0 && <PortfolioSummary summary={summary} stockCount={stocks.length} />}

      {stocks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="portfolio-content">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
            >
              📊 Card View
            </button>
            <button
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              📋 Table View
            </button>
          </div>

          {viewMode === 'cards' ? (
            <div className="stock-grid">
              {stocks.map((stock) => (
                <StockCard
                  key={stock.ticker}
                  stock={stock}
                  onRemove={handleRemoveClick}
                  onDetail={handleStockDetail}
                />
              ))}
            </div>
          ) : (
            <PortfolioTable
              stocks={stocks}
              onRemove={handleRemoveClick}
              onDetail={handleStockDetail}
            />
          )}
        </div>
      )}

      {deleteConfirmation && (
        <DeleteConfirmation
          ticker={deleteConfirmation}
          onConfirm={() => handleRemoveStock(deleteConfirmation)}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </div>
  );
}
