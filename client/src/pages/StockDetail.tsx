import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InsiderData, OwnershipData, MovingAverageData, PriceHistoryPoint } from '../types';
import { HISTORICAL_DAYS_DEFAULT } from '../constants';
import {
  StockHeader,
  StockActionsBar,
  StockEditForm,
  DeleteConfirmation,
  PositionDetails,
} from '../components/StockDetail';
import { StockDataSections } from '../components/StockDataSections';
import { JoelGreenblatMenu } from '../components/JoelGreenblatMenu';
import './StockDetail.css';

interface StockDetailData {
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  profitLoss?: number;
  profitLossPercent?: number;
  lastUpdated?: string;
}

interface EditFormData {
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
}

export function StockDetail() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [stock, setStock] = useState<StockDetailData | null>(null);
  const [insiderData, setInsiderData] = useState<InsiderData | null>(null);
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInsiders, setLoadingInsiders] = useState(true);
  const [loadingOwnership, setLoadingOwnership] = useState(true);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(true);
  const [movingAverageData, setMovingAverageData] = useState<MovingAverageData | null>(null);
  const [loadingMA, setLoadingMA] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    shares: 0,
    purchasePrice: 0,
    purchaseDate: '',
  });

  const fetchStockDetail = async () => {
    if (!ticker) return;

    try {
      setError(null);
      const response = await fetch(`/api/portfolio/${encodeURIComponent(ticker)}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to fetch stock details: ${response.status}`);
      }
      const data = await response.json();
      setStock(data);
      setEditForm({
        shares: data.shares,
        purchasePrice: data.purchasePrice,
        purchaseDate: data.purchaseDate.split('T')[0],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock details');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsiderData = async () => {
    if (!ticker) return;

    try {
      setLoadingInsiders(true);
      const response = await fetch(`/api/insiders?ticker=${encodeURIComponent(ticker)}`);
      if (response.ok) {
        const data = await response.json();
        setInsiderData(data);
      }
    } catch (err) {
      console.error('Failed to fetch insider data:', err);
    } finally {
      setLoadingInsiders(false);
    }
  };

  const fetchOwnershipData = async () => {
    if (!ticker) return;

    try {
      setLoadingOwnership(true);
      const response = await fetch(`/api/ownership/detailed?ticker=${encodeURIComponent(ticker)}`);
      if (response.ok) {
        const data = await response.json();
        setOwnershipData(data);
      }
    } catch (err) {
      console.error('Failed to fetch ownership data:', err);
    } finally {
      setLoadingOwnership(false);
    }
  };

  const fetchMovingAverageData = async () => {
    if (!ticker) return;

    try {
      setLoadingMA(true);
      const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(ticker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
      if (response.ok) {
        const data = await response.json();
        // Calculate 50DMA from historical data
        if (data.prices && data.prices.length > 0) {
          const prices = data.prices.map((p: any) => p.close);
          const sum = prices.reduce((a: number, b: number) => a + b, 0);
          const avg = sum / prices.length;
          const currentPrice = prices[0];
          const percentDiff = ((currentPrice - avg) / avg) * 100;

          setMovingAverageData({
            currentPrice,
            movingAverage50: avg,
            percentageDifference: percentDiff,
            priceCount: prices.length,
            latestDate: data.prices[0].date,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch moving average data:', err);
    } finally {
      setLoadingMA(false);
    }
  };

  useEffect(() => {
    if (!ticker) {
      navigate('/portfolio');
      return;
    }

    // Set page title
    document.title = `${ticker} - Stock Portfolio`;

    fetchStockDetail();
    fetchInsiderData();
    fetchOwnershipData();
    fetchMovingAverageData();
  }, [ticker, navigate]);

  const handleRefresh = async () => {
    if (!ticker) return;

    setRefreshing(true);
    try {
      // Refresh portfolio data
      await fetch(`/api/portfolio/${ticker}/refresh`, { method: 'POST' });

      // Refetch all data
      await Promise.all([
        fetchStockDetail(),
        fetchInsiderData(),
        fetchOwnershipData(),
        fetchMovingAverageData(),
      ]);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEdit = async () => {
    if (!ticker) return;

    try {
      const response = await fetch(`/api/portfolio/${ticker}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setShowEditForm(false);
        await fetchStockDetail();
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
    }
  };

  const handleDelete = async () => {
    if (!ticker) return;

    try {
      const response = await fetch(`/api/portfolio/${ticker}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        navigate('/portfolio');
      }
    } catch (err) {
      console.error('Failed to delete stock:', err);
    }
  };

  useEffect(() => {
    if (!ticker) return;

    const fetchPriceHistory = async () => {
      try {
        setLoadingPriceHistory(true);
        const response = await fetch(`/api/stock/historical?ticker=${encodeURIComponent(ticker)}&days=${HISTORICAL_DAYS_DEFAULT}`);
        if (response.ok) {
          const data = await response.json();
          setPriceHistory(data.prices || []);
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err);
      } finally {
        setLoadingPriceHistory(false);
      }
    };

    fetchPriceHistory();
  }, [ticker]);

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">Loading stock details...</div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="app">
        <div className="alert error">{error || 'Stock not found'}</div>
        <button onClick={() => navigate('/portfolio')} className="btn-back">
          Back to Portfolio
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <button onClick={() => navigate('/portfolio')} className="breadcrumb-link">
              Portfolio
            </button>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item breadcrumb-current" aria-current="page">
            {stock.ticker}
          </li>
        </ol>
      </nav>

      {/* Joel Greenblatt Menu - Spinoff Analysis */}
      <JoelGreenblatMenu />

      <StockHeader
        ticker={stock.ticker}
        currentPrice={stock.currentPrice}
        profitLoss={stock.profitLoss}
        profitLossPercent={stock.profitLossPercent}
      />

      <StockActionsBar
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEdit={() => setShowEditForm(!showEditForm)}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      {showEditForm && (
        <StockEditForm
          formData={editForm}
          onChange={setEditForm}
          onSave={handleEdit}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmation
          ticker={stock.ticker}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* Portfolio-specific position details */}
      <div className="portfolio-sections">
        <PositionDetails
          shares={stock.shares}
          purchasePrice={stock.purchasePrice}
          purchaseDate={stock.purchaseDate}
          currentPrice={stock.currentPrice}
          profitLoss={stock.profitLoss}
          profitLossPercent={stock.profitLossPercent}
          lastUpdated={stock.lastUpdated}
        />
      </div>

      {/* Shared stock data sections */}
      <StockDataSections
        ticker={stock.ticker}
        priceHistory={priceHistory}
        loadingPriceHistory={loadingPriceHistory}
        ownershipData={ownershipData}
        loadingOwnership={loadingOwnership}
        movingAverageData={movingAverageData}
        loadingMA={loadingMA}
        insiderData={insiderData}
        loadingInsiders={loadingInsiders}
      />
    </div>
  );
}
