/**
 * Main Application Component
 * Handles routing and navigation
 */

import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Portfolio } from './pages/Portfolio';
import { Watchlist } from './pages/Watchlist';
import { StockDetail } from './pages/StockDetail';
import { Explore } from './pages/Explore';
import { MarketHealth } from './pages/MarketHealth';
import { SpinoffAnalysisPage } from './pages/SpinoffAnalysisPage';
import { HeaderStockSearch } from './components/HeaderStockSearch';
import './App.css';

function Navigation() {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="main-nav">
      <div className="nav-container">
        <div className="nav-brand">Stock Portfolio</div>

        <div className="nav-center">
          <HeaderStockSearch />
        </div>

        <div className="nav-links">
          <Link
            to="/portfolio"
            className={location.pathname === '/portfolio' || location.pathname === '/' ? 'active' : ''}
          >
            Portfolio
          </Link>
          <Link
            to="/watchlist"
            className={location.pathname === '/watchlist' ? 'active' : ''}
          >
            Watchlist
          </Link>
          <Link
            to="/market-health"
            className={location.pathname === '/market-health' ? 'active' : ''}
          >
            Market Health
          </Link>
          <div className="nav-dropdown">
            <button
              className="nav-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              📚 Joel Greenblatt
              <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
            </button>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <Link
                  to="/spinoff-analysis"
                  className="dropdown-item"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  🔄 Spinoff Analysis
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
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
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/stock/:ticker" element={<StockDetail />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/explore/:ticker" element={<Explore />} />
            <Route path="/market-health" element={<MarketHealth />} />
            <Route path="/spinoff-analysis" element={<SpinoffAnalysisPage />} />
          </Routes>
        </main>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
