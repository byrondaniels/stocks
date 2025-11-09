# Stocks Portfolio & Analysis Application

A comprehensive TypeScript full-stack application for stock portfolio management and analysis, featuring:
- Portfolio tracking with profit/loss calculations
- Real-time stock prices and 50-day moving averages
- Insider transactions (SEC Forms 3/4/5)
- Ownership breakdown (insider/institutional/public)
- AI-powered CANSLIM score analysis
- Interactive charts and data visualizations

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite (build tool & dev server)
- React Router v7
- Recharts (data visualization)
- React Hot Toast (notifications)

**Backend:**
- Node.js 18+ + TypeScript
- Express.js REST API
- MongoDB (via Mongoose)
- Google Gemini AI
- Multi-source data aggregation with caching

## Project Structure

```
stocks/
├── client/          # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages (Portfolio, StockDetail, InsiderLookup)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── utils/       # Utilities (formatters, validation)
│   │   └── constants.ts # Client-side constants
│   └── package.json
├── server/          # Express backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic & external API integrations
│   │   ├── db/          # MongoDB models and schemas
│   │   ├── utils/       # Shared utilities (validation, error handling)
│   │   └── constants.ts # Server-side constants
│   └── package.json
└── Makefile         # Build automation
```

---

## 🚀 Getting Started (First-Time Setup)

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker** - [Installation guide](https://docs.docker.com/get-docker/)
  - **macOS**: [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
  - **Ubuntu**: [Docker Engine for Linux](https://docs.docker.com/engine/install/ubuntu/)
  - **Windows**: [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

Verify installations:
```bash
node --version   # Should be 18.x or higher
npm --version    # Should be 8.x or higher
docker --version # Should be 20.x or higher
docker compose version # Should be v2.x or higher
```

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd stocks
```

### Step 2: Get Required API Keys

This application integrates with multiple data sources. Sign up for free API keys:

#### 1. **Alpha Vantage** (Stock prices & historical data)
- **Sign up**: https://www.alphavantage.co/support/#api-key
- **Free tier**: 25 requests/day
- **Used for**: Current stock prices, historical OHLCV data

#### 2. **Financial Modeling Prep** (Ownership & financial metrics)
- **Sign up**: https://site.financialmodelingprep.com/developer/docs
- **Free tier**: 250 requests/day
- **Used for**: Institutional ownership, insider ownership, financial ratios

#### 3. **Google Gemini AI** (AI-powered analysis)
- **Sign up**: https://aistudio.google.com/app/apikey
- **Free tier**: Generous limits
- **Used for**: AI-powered CANSLIM score analysis and insights

#### 4. **SEC Edgar API** (Insider transactions)
- **No API key required**
- **Requirement**: User-Agent header with your contact email
- **Used for**: SEC insider transaction data (Forms 3/4/5)

### Step 3: Configure Environment Variables

**Option A: Using the automated setup (recommended)**
```bash
make setup
```

**Option B: Manual setup**

1. **Copy the environment template:**
   ```bash
   cp server/.env.example server/.env
   ```

2. **Edit `server/.env` and add your API keys:**
   ```bash
   # SEC Edgar API Configuration (replace with your email)
   SEC_USER_AGENT=stocks-app/1.0 (yourname@example.com)

   # Alpha Vantage API Key
   ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

   # Financial Modeling Prep API Key
   FMP_API_KEY=your_fmp_key_here

   # Google Gemini API Key
   GEMINI_API_KEY=your_gemini_key_here

   # Server Configuration
   PORT=3001

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/stocks
   ```

### Step 4: Start MongoDB (Docker)

Start MongoDB in a Docker container:

```bash
make docker-up
```

This will:
- Pull the MongoDB 7.0 Docker image (if not already downloaded)
- Create and start a MongoDB container named `stocks-mongodb`
- Expose MongoDB on port `27017`
- Create persistent volumes for data storage

**Verify MongoDB is running:**
```bash
make docker-status
```

**View MongoDB logs:**
```bash
make docker-logs
```

**Access MongoDB shell:**
```bash
make mongo-shell
```

### Step 5: Install Dependencies

Install dependencies for both client and server:

```bash
make install
```

Or manually:
```bash
# Server dependencies
cd server && npm install

# Client dependencies
cd ../client && npm install
```

### Step 6: Start the Application

**Option A: Start both services simultaneously (recommended)**
```bash
make dev
```

This will start:
- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173

**Option B: Start services in separate terminals**

Terminal 1 (Backend):
```bash
make server-dev
# Or: cd server && npm run dev
```

Terminal 2 (Frontend):
```bash
make client-dev
# Or: cd client && npm run dev
```

### Step 7: Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:3001/api

---

## 📚 API Documentation

### Portfolio Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio` | Get all portfolio stocks with current data |
| GET | `/api/portfolio/:ticker` | Get detailed view for one stock |
| POST | `/api/portfolio` | Add a new stock to portfolio |
| PUT | `/api/portfolio/:ticker` | Update stock details |
| DELETE | `/api/portfolio/:ticker` | Remove stock from portfolio |
| POST | `/api/portfolio/refresh-all` | Refresh all stock prices |
| POST | `/api/portfolio/:ticker/refresh` | Refresh single stock price |

### Stock Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock/price?ticker=AAPL` | Get current stock price |
| GET | `/api/stock/ownership?ticker=AAPL` | Get ownership breakdown |
| GET | `/api/stock/financials?ticker=AAPL` | Get financial metrics |
| GET | `/api/stock/historical?ticker=AAPL&days=50` | Get historical prices |
| GET | `/api/stock/rate-limits` | Check API rate limit status |
| POST | `/api/stock/clear-cache` | Clear all cached data |

### CANSLIM Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canslim?ticker=AAPL` | Get CANSLIM score (cached) |
| POST | `/api/canslim/refresh?ticker=AAPL` | Force recalculate CANSLIM score |

### Insider Trading Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insiders?ticker=AAPL` | Get recent insider transactions |

---

## 🛠️ Development

### Available Make Commands

```bash
# First-time setup
make setup              # Complete first-time setup (env files, dependencies)

# Development
make dev                # Start both client and server in parallel
make server-dev         # Start backend API only
make client-dev         # Start frontend only

# Building
make build              # Build both client and server
make server-build       # Build server only
make client-build       # Build client only

# Testing
make test               # Run server tests
make test-watch         # Run tests in watch mode
make test-coverage      # Run tests with coverage report

# Database (Docker)
make docker-up          # Start MongoDB in Docker container
make docker-down        # Stop and remove MongoDB container
make docker-restart     # Restart MongoDB container
make docker-logs        # View MongoDB container logs
make docker-status      # Check MongoDB container status
make docker-clean       # Remove container and volumes (deletes data!)
make mongo-shell        # Open MongoDB shell

# Utilities
make clean              # Remove node_modules from both projects
make clean-server       # Remove server node_modules
make clean-client       # Remove client node_modules
make install            # Install dependencies for both projects
make logs               # View application logs
```

### Running Tests

```bash
# Run all tests
make test

# Run tests in watch mode (auto-rerun on changes)
make test-watch

# Run tests with coverage report
make test-coverage

# Or manually
cd server && npm test
```

### Project Architecture

**Caching Strategy:**
- Stock prices: 1 hour TTL
- Ownership data: 24 hours TTL
- Financial metrics: 24 hours TTL
- Historical prices: 1 hour TTL
- Insider transactions: 5 minutes (in-memory), 24 hours (MongoDB)
- CANSLIM scores: 24 hours TTL

**Rate Limiting:**
- Alpha Vantage: 25 requests/day, 12-second intervals
- FMP: 250 requests/day, 12-second intervals
- SEC: 250ms politeness delay between requests

**Error Handling:**
- Centralized error handlers in `server/src/utils/errorHandler.ts`
- Consistent HTTP status codes from `server/src/constants.ts`
- API-specific error codes (RATE_LIMIT, NOT_FOUND, etc.)

**Validation:**
- Shared validation utilities in both client and server
- Ticker format: 1-5 uppercase letters with optional .suffix (e.g., BRK.A)
- Centralized validation in `utils/validation.ts`

---

## 🔧 Configuration

### Environment Variables

All environment variables are defined in `server/.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SEC_USER_AGENT` | Yes | - | User-Agent for SEC API (format: `app-name/version (email)`) |
| `ALPHA_VANTAGE_API_KEY` | Yes | - | Alpha Vantage API key |
| `FMP_API_KEY` | Yes | - | Financial Modeling Prep API key |
| `GEMINI_API_KEY` | Yes | - | Google Gemini AI API key |
| `PORT` | No | 3001 | Server port |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/stocks` | MongoDB connection string |

### Constants

Constants are centralized in:
- **Server**: `server/src/constants.ts` (HTTP status codes, error messages, cache TTLs, etc.)
- **Client**: `client/src/constants.ts` (UI constants, chart colors, etc.)

### Docker Configuration

MongoDB runs in a Docker container using Docker Compose. The configuration is defined in `docker-compose.yml`:

**Container Details:**
- **Image**: `mongo:7.0`
- **Container Name**: `stocks-mongodb`
- **Port**: `27017:27017` (host:container)
- **Network**: `stocks-network`
- **Volumes**:
  - `mongodb_data` - Persistent data storage
  - `mongodb_config` - MongoDB configuration
- **Health Check**: Automatic health monitoring with retry logic

**Volume Management:**
- Data persists across container restarts
- Located in Docker's volume directory
- Can be reset with `make docker-clean` (WARNING: deletes all data)

**Connection from Application:**
- The app connects to `localhost:27017` (mapped from container)
- No code changes needed when switching between Docker and local MongoDB
- Connection string in `.env`: `MONGODB_URI=mongodb://localhost:27017/stocks`

---

## 📦 Deployment

### Production Build

```bash
# Build both client and server
make build

# Or separately
cd server && npm run build
cd client && npm run build
```

### Environment Variables for Production

Set `VITE_API_BASE_URL` in the client if deploying separately:

```bash
# client/.env.production
VITE_API_BASE_URL=https://your-api-domain.com
```

### MongoDB Setup for Production

For production deployment, you have two options:

**Option 1: Managed MongoDB Service (Recommended)**
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free tier available)
- [DigitalOcean Managed MongoDB](https://www.digitalocean.com/products/managed-databases-mongodb)
- Update `MONGODB_URI` in production environment variables to the connection string

**Option 2: Self-Hosted Docker MongoDB**
- Deploy the same Docker Compose setup on your production server
- Ensure proper security (authentication, network isolation, firewall rules)
- Set up regular backups using Docker volume backups
- Consider using Docker secrets for sensitive configuration

---

## 🧪 Testing

Tests are located in `server/src/__tests__/`:

```bash
# Run all tests
npm test

# Run specific test file
npm test portfolio.test.ts

# Run with coverage
npm run test:coverage
```

---

## 📝 Notes

- **Docker MongoDB**: MongoDB runs in Docker for easy setup and consistent environment across all platforms
- **Data Persistence**: Portfolio data is stored in MongoDB (persisted in Docker volumes)
- **Insider Data**: Cached in MongoDB for 24 hours to minimize SEC API calls
- **Rate Limits**: The app respects API rate limits and provides retry-after information
- **SEC Compliance**: Includes 250ms politeness delay for SEC requests
- **Free Tier**: All APIs have generous free tiers suitable for personal use
- **No Installation Required**: MongoDB doesn't need to be installed locally - Docker handles everything

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB container is running
make docker-status

# If not running, start it
make docker-up

# View MongoDB logs for errors
make docker-logs

# Restart MongoDB container
make docker-restart

# Access MongoDB shell to verify connection
make mongo-shell
```

**Common Issues:**

- **Container not starting**: Ensure Docker is running (`docker ps`)
- **Port 27017 already in use**: Stop any local MongoDB instance or change the port in `docker-compose.yml`
- **Permission errors**: Make sure Docker has proper permissions on your system
- **Data persistence**: MongoDB data is stored in Docker volumes. Use `make docker-clean` to reset (WARNING: deletes all data)

### Port Already in Use

```bash
# Check what's using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### API Rate Limits Exceeded

Check current rate limit status:
```bash
curl http://localhost:3001/api/stock/rate-limits
```

Clear cache to reset counters:
```bash
curl -X POST http://localhost:3001/api/stock/clear-cache
```

### Environment Variables Not Loading

Ensure:
1. `.env` file is in the `server/` directory (not root)
2. Variables don't have spaces around `=`
3. Restart the server after changing `.env`

---

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
