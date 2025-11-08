# Implementation Stories - Stock Tracking System

## Overview
Converting the insider tracker into a full-fledged stock portfolio tracking system with:
- Portfolio management (add/remove stocks with purchase price)
- Dashboard with key metrics per stock
- Manual refresh for real-time data

---

## Story Breakdown

### PHASE 1: FOUNDATION (Sequential - Must Complete First)

#### Story 1.1: Database Schema Design & Migration
**Priority:** P0 (Blocking)
**Estimated Effort:** 6-8 hours

**Description:**
Migrate from LowDB to MongoDB for better data management and flexible schema.

**Tasks:**
- Set up MongoDB locally (Docker recommended: `docker run -d -p 27017:27017 mongo`)
- Design collections:
  - `portfolio` collection:
    ```javascript
    {
      ticker: String,
      shares: Number,
      purchasePrice: Number,
      purchaseDate: Date,
      createdAt: Date,
      updatedAt: Date
    }
    ```
  - `stockPrices` collection:
    ```javascript
    {
      ticker: String,
      date: Date,
      open: Number,
      high: Number,
      low: Number,
      close: Number,
      volume: Number
    }
    ```
  - `stockMetrics` collection (flexible schema):
    ```javascript
    {
      ticker: String,
      dataType: String, // 'ownership', 'canslim', 'financials'
      data: Object, // flexible JSON
      fetchedAt: Date
    }
    ```
  - `insiderTransactions` collection (migrate existing cache):
    ```javascript
    {
      ticker: String,
      cik: String,
      transactions: Array,
      summary: Object,
      fetchedAt: Date
    }
    ```
- Add MongoDB client (mongoose ODM recommended)
- Create database connection with connection pooling
- Define Mongoose schemas and models
- Create indexes (ticker fields, date fields)
- Update server to use MongoDB instead of LowDB

**Acceptance Criteria:**
- MongoDB running locally
- All collections created with proper indexes
- Mongoose models defined with validation
- Server can connect and perform basic CRUD operations
- Existing insider cache logic migrated to MongoDB

**Dependencies:** None

**Blockers for:** All other stories

---

#### Story 1.2: Free Stock Data API Integration
**Priority:** P0 (Blocking)
**Estimated Effort:** 6-10 hours

**Description:**
Research and integrate free-tier stock data APIs for prices, ownership, and financial metrics.

**Recommended APIs:**
- **Alpha Vantage** (500 requests/day free): Stock prices, technicals
- **Financial Modeling Prep** (250 requests/day free): Ownership data, financials
- **Yahoo Finance** (via unofficial libraries): Backup for prices
- **SEC Edgar API** (unlimited): Already using for insider data

**Tasks:**
- Sign up for API keys (Alpha Vantage, FMP)
- Create API abstraction layer in `/server/src/services/stockData.ts`
- Implement functions:
  - `getCurrentPrice(ticker)` - Latest stock price
  - `getOwnershipData(ticker)` - Insider/institutional/public percentages
  - `getFinancialMetrics(ticker)` - Data for CANSLIM calculation
  - `getHistoricalPrices(ticker, days)` - Daily OHLCV data
- Add error handling and rate limiting
- Implement caching strategy (24hr cache for ownership, 1hr for prices)
- Add API key management via environment variables

**Acceptance Criteria:**
- Can fetch current price for any ticker
- Can retrieve ownership breakdown
- Can get 50 days of historical prices
- Rate limiting prevents API quota exhaustion
- Graceful fallback when API limits hit

**Dependencies:** None (can work parallel with 1.1)

**Blockers for:** Stories 2.x, 3.x (any story needing stock data)

---

#### Story 1.3: Portfolio Management API (Backend)
**Priority:** P0 (Blocking)
**Estimated Effort:** 6-8 hours

**Description:**
Create RESTful API endpoints for portfolio CRUD operations.

**Endpoints:**
```
GET    /api/portfolio              - List all stocks in portfolio
POST   /api/portfolio              - Add stock to portfolio
PUT    /api/portfolio/:ticker      - Update stock (shares, purchase price)
DELETE /api/portfolio/:ticker      - Remove stock from portfolio
GET    /api/portfolio/:ticker      - Get detailed view for one stock
```

**Request/Response Formats:**
```typescript
// POST /api/portfolio
{
  ticker: string,
  shares: number,
  purchasePrice: number,
  purchaseDate: string (ISO date)
}

// GET /api/portfolio response
[{
  ticker: string,
  shares: number,
  purchasePrice: number,
  purchaseDate: string,
  currentPrice?: number,
  profitLoss?: number,
  profitLossPercent?: number
}]
```

**Tasks:**
- Create portfolio controller and routes
- Implement CRUD operations with MongoDB/Mongoose
- Add input validation (ticker format, positive numbers)
- Calculate profit/loss fields in response
- Add error handling (duplicate ticker, not found, etc.)
- Write API tests (optional but recommended)

**Acceptance Criteria:**
- Can add stocks to portfolio
- Can retrieve portfolio list
- Can update and delete stocks
- Validation prevents invalid data
- Returns proper HTTP status codes

**Dependencies:** Story 1.1 (database schema)

**Blockers for:** Story 2.1 (Portfolio UI)

---

### PHASE 2: CORE FEATURES (Can Work in Parallel)

#### Story 2.1: Portfolio Dashboard UI
**Priority:** P1
**Estimated Effort:** 10-14 hours

**Description:**
Create main dashboard view showing user's portfolio with add/remove stock functionality.

**UI Components:**
- Portfolio table with columns:
  - Ticker (clickable to detail view)
  - Shares
  - Purchase Price
  - Current Price
  - Total Value
  - Profit/Loss ($)
  - Profit/Loss (%)
  - Actions (Remove button, Detail button)
- "Add Stock" form (ticker, shares, purchase price, date)
- Portfolio summary card (total value, total gain/loss)
- Empty state when no stocks added

**Tasks:**
- Create new route `/portfolio` (make it the new home page)
- Build PortfolioTable component
- Build AddStockForm component with validation
- Add remove stock confirmation dialog
- Connect to portfolio API endpoints
- Add loading states and error handling
- Style with existing CSS patterns

**Acceptance Criteria:**
- Can view all stocks in portfolio
- Can add new stocks via form
- Can remove stocks with confirmation
- See real-time profit/loss calculations
- Responsive layout

**Dependencies:** Story 1.3 (Portfolio API)

**Blockers for:** None

---

#### Story 2.2: Historical Price Storage System
**Priority:** P1
**Estimated Effort:** 8-10 hours

**Description:**
Automated system to fetch and store daily historical prices for portfolio stocks.

**Features:**
- Fetch last 50 days of price data when stock added to portfolio
- Daily background job to update prices (or manual refresh button for MVP)
- Calculate and store 50DMA alongside daily prices

**Tasks:**
- Create `priceHistory` service in backend
- Implement `fetchAndStoreHistoricalPrices(ticker)` function
- Call historical price fetch when stock added to portfolio
- Create manual refresh endpoint: `POST /api/portfolio/:ticker/refresh`
- Calculate 50-day moving average from stored data
- Add "Last Updated" timestamp to stock records
- Optimize queries with proper indexing

**Acceptance Criteria:**
- Historical prices stored for all portfolio stocks
- 50DMA calculated correctly
- Can trigger manual refresh per stock
- Timestamps track data freshness
- No duplicate price entries for same date

**Dependencies:** Story 1.1 (database), Story 1.2 (stock API)

**Blockers for:** Story 3.3 (50DMA display)

---

#### Story 2.3: Insider Activity Dashboard Integration
**Priority:** P1
**Estimated Effort:** 6-8 hours

**Description:**
Adapt existing insider tracker to work within portfolio dashboard context.

**Features:**
- Show insider activity summary on portfolio table (e.g., "3 buys, 1 sell")
- Detailed insider view on stock detail page
- Reuse existing `/api/insiders` endpoint
- Add insider activity indicator (icon + tooltip)

**Tasks:**
- Enhance portfolio API to include insider summary
- Fetch insider data for all portfolio stocks on dashboard load
- Add "Insider Activity" column to portfolio table
- Show net buying/selling indicator with color coding
- Link to detailed insider transactions
- Optimize: batch fetch insider data or cache aggressively

**Acceptance Criteria:**
- Portfolio shows insider activity at-a-glance
- Can click through to detailed insider transactions
- Color-coded indicators (green=buying, red=selling)
- Performance: doesn't slow down dashboard load significantly

**Dependencies:** Story 2.1 (Portfolio UI), existing insider API

**Blockers for:** None

---

#### Story 2.4: Ownership Breakdown Feature
**Priority:** P1
**Estimated Effort:** 8-12 hours

**Description:**
Display stock ownership distribution (institutional, insider, public) via pie chart.

**Features:**
- Fetch ownership data from Financial Modeling Prep API
- Calculate percentages (institutional, insider, retail/public)
- Display as interactive pie chart
- Show on stock detail page

**Tasks:**
- Add ownership data fetching to stock data service
- Parse and normalize ownership API response
- Store ownership data in `stock_metrics` table
- Choose charting library (Recharts recommended for React)
- Create OwnershipPieChart component
- Add ownership section to stock detail view
- Style chart with clear labels and legend
- Add last updated timestamp

**Acceptance Criteria:**
- Pie chart shows ownership breakdown
- Data refreshed on manual stock refresh
- Chart is responsive and accessible
- Tooltips show exact percentages
- Handles missing data gracefully

**Dependencies:** Story 1.2 (stock API), Story 3.1 (stock detail page)

**Blockers for:** None (can build component independently, integrate later)

---

#### Story 2.5: Simplified CANSLIM Metrics
**Priority:** P1
**Estimated Effort:** 12-16 hours

**Description:**
Calculate and display simplified CANSLIM score based on key metrics obtainable from free APIs.

**Simplified CANSLIM Metrics (4 key components):**
1. **C - Current Earnings:** Quarterly EPS growth % (YoY)
2. **A - Annual Earnings:** Annual EPS growth % (3-year average)
3. **N - New Highs:** Is stock within 15% of 52-week high?
4. **S - Supply & Demand:** Trading volume vs. average (institutional buying indicator)

**Scoring:**
- Use Gemini AI to analyze metrics and provide 0-100 CANSLIM score
- Each component gets 0-25 points
- Show individual component scores + total

**Tasks:**
- Fetch financial data (EPS, revenue) from Alpha Vantage or FMP
- Fetch 52-week high/low from price data
- Calculate volume metrics from historical data
- Create Gemini API integration (`/server/src/services/gemini.ts`)
- Build prompt for Gemini to analyze CANSLIM metrics
- Store CANSLIM score in `stock_metrics` table
- Create CANSLIMScore component for UI
- Display score on stock detail page with breakdown
- Add explanation tooltips for each metric

**Acceptance Criteria:**
- CANSLIM score calculated for each stock
- Score breakdown shows individual components
- Gemini provides qualitative analysis
- Score refreshes with manual data refresh
- UI explains what each metric means

**Dependencies:** Story 1.2 (stock API), Story 2.2 (historical prices)

**Blockers for:** None

---

#### Story 2.6: 50-Day Moving Average Calculator
**Priority:** P1
**Estimated Effort:** 4-6 hours

**Description:**
Calculate and display 50DMA with percentage above/below current price.

**Features:**
- Calculate 50DMA from stored historical prices
- Show percentage difference from current price
- Display on portfolio table and detail view
- Color code: green if above 50DMA, red if below

**Tasks:**
- Create `calculate50DMA(ticker)` utility function
- Fetch last 50 days of closing prices from database
- Calculate simple moving average
- Calculate % difference from current price
- Add 50DMA column to portfolio table
- Add 50DMA indicator to stock detail page
- Add tooltip explaining what 50DMA means
- Handle edge case: less than 50 days of data available

**Acceptance Criteria:**
- 50DMA displayed accurately
- % above/below shown with +/- sign
- Color coding works correctly
- Graceful handling when insufficient data
- Updates when prices refresh

**Dependencies:** Story 2.2 (historical prices)

**Blockers for:** None

---

#### Story 2.7: Profit/Loss Tracker
**Priority:** P1
**Estimated Effort:** 4-6 hours

**Description:**
Calculate and display profit/loss based on purchase price vs current price.

**Features:**
- Calculate total P&L per stock (shares × (current - purchase))
- Calculate P&L percentage ((current - purchase) / purchase × 100)
- Portfolio-level total P&L
- Color coding (green=profit, red=loss)

**Tasks:**
- Implement P&L calculation in portfolio API response
- Add P&L columns to portfolio table
- Create portfolio summary component with total P&L
- Format currency and percentages properly
- Add "Unrealized Gains" label for clarity
- Color code positive (green) and negative (red) values

**Acceptance Criteria:**
- Accurate P&L calculations per stock
- Total portfolio P&L displayed
- Proper currency formatting ($X,XXX.XX)
- Percentage formatted to 2 decimal places
- Visual indicators for gains/losses

**Dependencies:** Story 2.1 (Portfolio UI), Story 1.2 (current price API)

**Blockers for:** None

---

### PHASE 3: POLISH & INTEGRATION (Can Work in Parallel)

#### Story 3.1: Stock Detail Page
**Priority:** P2
**Estimated Effort:** 8-10 hours

**Description:**
Create dedicated page showing all metrics for a single stock.

**Sections:**
1. Stock header (ticker, company name, current price)
2. Your position (shares, purchase price, P&L)
3. Ownership pie chart
4. CANSLIM score breakdown
5. 50DMA indicator with chart
6. Insider activity transactions table
7. Actions (refresh data, edit position, remove stock)

**Tasks:**
- Create new route `/stock/:ticker`
- Build StockDetail component with sections
- Fetch all data for single stock (aggregated API call)
- Display all metrics in organized layout
- Add navigation back to portfolio
- Add refresh button for this stock
- Responsive design for mobile

**Acceptance Criteria:**
- All stock metrics visible on one page
- Clean, organized layout
- Can navigate from portfolio table
- Refresh updates all data for stock
- Loading states for each section

**Dependencies:** Stories 2.2, 2.3, 2.4, 2.5, 2.6 (all data features)

**Blockers for:** None

---

#### Story 3.2: Manual Refresh System
**Priority:** P2
**Estimated Effort:** 4-6 hours

**Description:**
UI controls to manually refresh stock data.

**Features:**
- "Refresh All" button on portfolio dashboard
- Individual refresh button per stock
- Loading indicators during refresh
- Toast notifications on success/error
- Show last updated timestamp

**Tasks:**
- Create refresh API endpoints (already in 2.2)
- Add refresh buttons to UI
- Implement loading states
- Add toast notification system (react-hot-toast)
- Update "Last Updated" display after refresh
- Add refresh icon animation during load
- Rate limit: prevent refresh spam (1 minute cooldown)

**Acceptance Criteria:**
- Can refresh individual stocks
- Can refresh entire portfolio
- Loading indicators show during refresh
- Timestamps update after refresh
- Rate limiting prevents API abuse

**Dependencies:** Story 2.1 (Portfolio UI), Story 2.2 (refresh endpoints)

**Blockers for:** None

---

#### Story 3.3: Dashboard Layout & Chart Integration
**Priority:** P2
**Estimated Effort:** 8-10 hours

**Description:**
Visual polish for dashboard with charts and improved layout.

**Features:**
- Summary cards at top (total value, total P&L, # of stocks)
- Price chart for each stock (50-day trend line)
- Responsive grid layout
- Visual hierarchy and spacing
- Consistent chart styling

**Tasks:**
- Install charting library (Recharts)
- Create reusable chart components:
  - PriceLineChart (50-day trend)
  - OwnershipPieChart (already in 2.4)
- Design dashboard grid layout
- Create summary card components
- Add charts to portfolio table (sparklines) or detail page
- Ensure responsive design (mobile, tablet, desktop)
- Polish CSS with shadows, borders, colors

**Acceptance Criteria:**
- Dashboard looks professional and polished
- Charts are readable and interactive
- Responsive on all screen sizes
- Consistent color scheme
- Performance: charts don't slow down page

**Dependencies:** Story 2.1 (Portfolio UI), Story 2.2 (historical data)

**Blockers for:** None

---

#### Story 3.4: Navigation & Route Updates
**Priority:** P2
**Estimated Effort:** 2-4 hours

**Description:**
Update app navigation to accommodate new portfolio-centric structure.

**Changes:**
- Make `/portfolio` the new home page
- Keep `/insider/:ticker` for legacy insider lookup
- Add navigation menu/header
- Breadcrumbs for stock detail page

**Tasks:**
- Update React Router routes
- Create Navigation component
- Add header with app name and nav links
- Update landing page redirect
- Add breadcrumb navigation
- Update page titles

**Acceptance Criteria:**
- Portfolio is default landing page
- Can navigate between portfolio and stock details
- Clean, intuitive navigation
- Breadcrumbs help orientation

**Dependencies:** Story 2.1 (Portfolio UI), Story 3.1 (Stock Detail)

**Blockers for:** None

---

## Dependency Graph

```
PHASE 1 (Sequential):
1.1 Database Schema ─┐
                      ├─→ 1.3 Portfolio API ─→ 2.1 Portfolio UI
1.2 Stock Data API ──┘                              │
                                                     │
PHASE 2 (Parallel):                                 │
2.1 Portfolio UI ←──────────────────────────────────┘
2.2 Historical Prices ←─ 1.2 Stock API
2.3 Insider Integration ←─ 2.1 Portfolio UI
2.4 Ownership Pie Chart ←─ 1.2 Stock API
2.5 CANSLIM Metrics ←─ 1.2, 2.2
2.6 50DMA Calculator ←─ 2.2
2.7 Profit/Loss ←─ 2.1, 1.2

PHASE 3 (Parallel):
3.1 Stock Detail Page ←─ 2.2, 2.3, 2.4, 2.5, 2.6
3.2 Manual Refresh ←─ 2.1, 2.2
3.3 Dashboard Charts ←─ 2.1, 2.2
3.4 Navigation ←─ 2.1, 3.1
```

---

## Execution Order

### Week 1: Foundation
**Sequential (must complete in order):**
1. Story 1.1: Database Schema (Day 1-2)
2. Story 1.2: Stock Data API (Day 2-3)
3. Story 1.3: Portfolio API (Day 3-4)

**End of Week 1:** Backend foundation complete, ready for parallel work

---

### Week 2-3: Core Features (PARALLEL STREAMS)

**Stream A (Frontend Focus):**
- Story 2.1: Portfolio Dashboard UI
- Story 2.7: Profit/Loss Tracker (integrates with 2.1)
- Story 3.2: Manual Refresh System

**Stream B (Data/Backend Focus):**
- Story 2.2: Historical Price Storage
- Story 2.6: 50DMA Calculator (depends on 2.2)
- Story 2.3: Insider Integration

**Stream C (Advanced Metrics):**
- Story 2.4: Ownership Pie Chart
- Story 2.5: CANSLIM Metrics

---

### Week 4: Polish & Integration

**Parallel:**
- Story 3.1: Stock Detail Page
- Story 3.3: Dashboard Charts
- Story 3.4: Navigation Updates

---

## Technology Stack Summary

**Free-Tier APIs:**
- Alpha Vantage (stock prices, technicals)
- Financial Modeling Prep (ownership, financials)
- SEC Edgar (insider transactions - already implemented)
- Gemini AI (CANSLIM analysis)

**New Dependencies:**
- `mongoose` - MongoDB ODM
- `recharts` - React charting library
- `react-router-dom` - Navigation (if not already added)
- `react-hot-toast` - Toast notifications
- `@google/generative-ai` - Gemini API client

**Infrastructure:**
- MongoDB database (Docker for local dev)
- Existing Express + React stack

---

## Success Criteria

**MVP Complete When:**
- ✅ Can add/remove stocks with purchase price
- ✅ Dashboard shows all portfolio stocks
- ✅ All 7 metrics displayed per stock:
  1. Current price
  2. Profit/Loss
  3. Insider activity summary
  4. Ownership breakdown (pie chart)
  5. 50DMA %
  6. CANSLIM score
  7. Manual refresh works
- ✅ Stock detail page shows comprehensive view
- ✅ Data persists in MongoDB
- ✅ Responsive UI on desktop and mobile

---

## Next Steps

1. Review story breakdown and adjust priorities
2. Set up project board (GitHub Projects) with these stories
3. Begin Phase 1 (Stories 1.1, 1.2, 1.3 in sequence)
4. Once Phase 1 complete, assign parallel streams to work efficiently

**Estimated Total Time:** 4-6 weeks for full implementation

