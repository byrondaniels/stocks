import { FormEvent, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { InsiderLookup } from './pages/InsiderLookup';
import { StockDetail } from './pages/StockDetail';
import './App.css';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">Stock Portfolio</div>
        <div className="nav-links">
          <Link
            to="/portfolio"
            className={location.pathname === '/portfolio' || location.pathname === '/' ? 'active' : ''}
          >
            Portfolio
          </Link>
          <Link
            to="/insiders"
            className={location.pathname === '/insiders' ? 'active' : ''}
          >
            Insider Lookup
          </Link>
        </div>
      </div>
    </nav>
  );
}

type PortfolioStock = {
  _id: string;
  ticker: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice: number | null;
  movingAverage50: number | null;
  percentageDifference: number | null;
  priceCount: number;
  latestDate: Date | null;
};

type PortfolioResponse = {
  success: boolean;
  count: number;
  portfolio: PortfolioStock[];
};

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/;

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "always",
});

function formatShares(value: number) {
  return numberFormatter.format(value);
}

function formatCurrency(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return currencyFormatter.format(value);
}

function formatPercent(value?: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }
  return percentFormatter.format(value / 100);
}

function formatDate(value: string | Date | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString();
}

function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioStock[]>([]);
  const [selectedStock, setSelectedStock] = useState<PortfolioStock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add stock form state
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  // Load portfolio on mount
  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/portfolio");
      if (!response.ok) {
        throw new Error(`Failed to load portfolio: ${response.status}`);
      }
      const data: PortfolioResponse = await response.json();
      setPortfolio(data.portfolio);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedTicker = ticker.trim().toUpperCase();
    if (!trimmedTicker || !TICKER_REGEX.test(trimmedTicker)) {
      setError("Please enter a valid U.S. ticker (e.g. AAPL, BRK.B).");
      return;
    }

    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(purchasePrice);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      setError("Please enter a valid number of shares.");
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setError("Please enter a valid purchase price.");
      return;
    }

    if (!purchaseDate) {
      setError("Please enter a purchase date.");
      return;
    }

    setAddingStock(true);
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: trimmedTicker,
          shares: sharesNum,
          purchasePrice: priceNum,
          purchaseDate: purchaseDate,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to add stock: ${response.status}`);
      }

      // Clear form
      setTicker("");
      setShares("");
      setPurchasePrice("");
      setPurchaseDate("");

      // Reload portfolio
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stock");
    } finally {
      setAddingStock(false);
    }
  };

  const handleRefreshStock = async (ticker: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/portfolio/${ticker}/refresh`, {
        method: "POST",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to refresh: ${response.status}`);
      }

      // Reload portfolio
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh stock");
    }
  };

  const handleDeleteStock = async (ticker: string) => {
    if (!confirm(`Are you sure you want to remove ${ticker} from your portfolio?`)) {
      return;
    }

    setError(null);
    try {
      const response = await fetch(`/api/portfolio/${ticker}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Failed to delete: ${response.status}`);
      }

      // Clear selected stock if it was deleted
      if (selectedStock?.ticker === ticker) {
        setSelectedStock(null);
      }

      // Reload portfolio
      await loadPortfolio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stock");
    }
  };

  const calculateProfitLoss = (stock: PortfolioStock) => {
    if (!stock.currentPrice) return null;
    return (stock.currentPrice - stock.purchasePrice) * stock.shares;
  };

  const calculateProfitLossPercent = (stock: PortfolioStock) => {
    if (!stock.currentPrice) return null;
    return ((stock.currentPrice - stock.purchasePrice) / stock.purchasePrice) * 100;
  };

  const getDMAStatusClass = (percentDiff: number | null) => {
    if (percentDiff === null) return "";
    return percentDiff >= 0 ? "above-dma" : "below-dma";
  };

  const getDMAStatusText = (percentDiff: number | null) => {
    if (percentDiff === null) return "Insufficient data";
    return percentDiff >= 0 ? "Above 50DMA" : "Below 50DMA";
  };

  return (
    <div className="app">
      <header>
        <h1>Stock Portfolio Tracker</h1>
        <p>Track your stock holdings with 50-day moving average indicators</p>
      </header>

      {error && <div className="alert error">{error}</div>}

      {/* Add Stock Form */}
      <section className="add-stock-section">
        <h2>Add Stock to Portfolio</h2>
        <form className="add-stock-form" onSubmit={handleAddStock}>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="ticker">Ticker</label>
              <input
                id="ticker"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                maxLength={9}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="shares">Shares</label>
              <input
                id="shares"
                type="number"
                step="0.01"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="purchasePrice">Purchase Price</label>
              <input
                id="purchasePrice"
                type="number"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="150.00"
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="purchaseDate">Purchase Date</label>
              <input
                id="purchaseDate"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <button type="submit" disabled={addingStock}>
                {addingStock ? "Adding..." : "Add Stock"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Portfolio Table */}
      <section className="portfolio-section">
        <h2>My Portfolio</h2>
        {loading && <p>Loading portfolio...</p>}
        {!loading && portfolio.length === 0 && (
          <div className="alert neutral">No stocks in portfolio. Add a stock to get started!</div>
        )}
        {!loading && portfolio.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Purchase Price</th>
                  <th>Current Price</th>
                  <th>50DMA</th>
                  <th>
                    % vs 50DMA
                    <span className="tooltip-trigger" title="Percentage difference from 50-day moving average. Positive (green) means price is above the 50DMA, negative (red) means below.">
                      ⓘ
                    </span>
                  </th>
                  <th>Profit/Loss</th>
                  <th>P/L %</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((stock) => {
                  const profitLoss = calculateProfitLoss(stock);
                  const profitLossPercent = calculateProfitLossPercent(stock);
                  return (
                    <tr key={stock._id}>
                      <td>
                        <button
                          className="link-button"
                          onClick={() => setSelectedStock(stock)}
                        >
                          {stock.ticker}
                        </button>
                      </td>
                      <td>{formatShares(stock.shares)}</td>
                      <td>{formatCurrency(stock.purchasePrice)}</td>
                      <td>{formatCurrency(stock.currentPrice)}</td>
                      <td>{formatCurrency(stock.movingAverage50)}</td>
                      <td className={getDMAStatusClass(stock.percentageDifference)}>
                        {formatPercent(stock.percentageDifference)}
                      </td>
                      <td className={profitLoss && profitLoss >= 0 ? "positive" : "negative"}>
                        {formatCurrency(profitLoss)}
                      </td>
                      <td className={profitLossPercent && profitLossPercent >= 0 ? "positive" : "negative"}>
                        {formatPercent(profitLossPercent)}
                      </td>
                      <td>
                        <button
                          className="action-button"
                          onClick={() => handleRefreshStock(stock.ticker)}
                          title="Refresh price data"
                        >
                          ↻
                        </button>
                        <button
                          className="action-button delete"
                          onClick={() => handleDeleteStock(stock.ticker)}
                          title="Remove from portfolio"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Stock Detail View */}
      {selectedStock && (
        <div className="modal-overlay" onClick={() => setSelectedStock(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedStock.ticker} - Stock Detail</h2>
              <button className="close-button" onClick={() => setSelectedStock(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Shares Owned</label>
                  <div className="detail-value">{formatShares(selectedStock.shares)}</div>
                </div>
                <div className="detail-item">
                  <label>Purchase Price</label>
                  <div className="detail-value">{formatCurrency(selectedStock.purchasePrice)}</div>
                </div>
                <div className="detail-item">
                  <label>Purchase Date</label>
                  <div className="detail-value">{formatDate(selectedStock.purchaseDate)}</div>
                </div>
                <div className="detail-item">
                  <label>Current Price</label>
                  <div className="detail-value">{formatCurrency(selectedStock.currentPrice)}</div>
                </div>
                <div className="detail-item">
                  <label>50-Day Moving Average</label>
                  <div className="detail-value">{formatCurrency(selectedStock.movingAverage50)}</div>
                </div>
                <div className="detail-item">
                  <label>
                    Position vs 50DMA
                    <span className="tooltip-trigger" title="Shows whether the current price is above or below the 50-day moving average. A positive percentage (green) indicates bullish momentum, while negative (red) suggests bearish pressure.">
                      ⓘ
                    </span>
                  </label>
                  <div className={`detail-value ${getDMAStatusClass(selectedStock.percentageDifference)}`}>
                    {formatPercent(selectedStock.percentageDifference)}
                    <span className="status-badge">{getDMAStatusText(selectedStock.percentageDifference)}</span>
                  </div>
                </div>
                <div className="detail-item">
                  <label>Total Profit/Loss</label>
                  <div className={`detail-value ${calculateProfitLoss(selectedStock) && calculateProfitLoss(selectedStock)! >= 0 ? "positive" : "negative"}`}>
                    {formatCurrency(calculateProfitLoss(selectedStock))}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Profit/Loss %</label>
                  <div className={`detail-value ${calculateProfitLossPercent(selectedStock) && calculateProfitLossPercent(selectedStock)! >= 0 ? "positive" : "negative"}`}>
                    {formatPercent(calculateProfitLossPercent(selectedStock))}
                  </div>
                </div>
                <div className="detail-item">
                  <label>Price Data Points</label>
                  <div className="detail-value">{selectedStock.priceCount} days</div>
                </div>
                <div className="detail-item">
                  <label>Last Updated</label>
                  <div className="detail-value">{formatDate(selectedStock.latestDate)}</div>
                </div>
              </div>

              <div className="dma-explanation">
                <h3>What is the 50-Day Moving Average?</h3>
                <p>
                  The 50-day moving average (50DMA) is the average closing price over the last 50 trading days.
                  It's a widely-used technical indicator that helps identify trends:
                </p>
                <ul>
                  <li><strong>Price above 50DMA (green):</strong> Often indicates bullish momentum and upward trend</li>
                  <li><strong>Price below 50DMA (red):</strong> Often indicates bearish pressure and downward trend</li>
                  <li><strong>Price crossing 50DMA:</strong> Can signal potential trend reversals</li>
                </ul>
                <p>
                  <em>Note: The 50DMA is a lagging indicator and should be used alongside other analysis methods.</em>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/insiders" element={<InsiderLookup />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;