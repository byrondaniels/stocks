import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Portfolio } from './pages/Portfolio';
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
