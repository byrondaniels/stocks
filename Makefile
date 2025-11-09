# Stocks Portfolio & Analysis - Build Automation
# ================================================

# Default SEC User-Agent (can be overridden)
SEC_USER_AGENT ?= stocks-app/1.0 (user@example.com)

# ANSI color codes for pretty output
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
RED := \033[0;31m
NC := \033[0m # No Color

# Phony targets (not actual files)
.PHONY: help setup install clean clean-server clean-client
.PHONY: server-install server-build server-dev server-test
.PHONY: client-install client-build client-dev
.PHONY: build dev test test-watch test-coverage
.PHONY: mongo-start mongo-stop mongo-status
.PHONY: logs check-env

# Default target - show help
.DEFAULT_GOAL := help

# ================================================
# Help / Documentation
# ================================================

help: ## Show this help message
	@echo "$(BLUE)Stocks Portfolio & Analysis - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)First-Time Setup:$(NC)"
	@echo "  make setup              Complete first-time setup (env files + dependencies)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev                Start both client and server in parallel"
	@echo "  make server-dev         Start backend API only"
	@echo "  make client-dev         Start frontend only"
	@echo ""
	@echo "$(GREEN)Building:$(NC)"
	@echo "  make build              Build both client and server"
	@echo "  make server-build       Build server only"
	@echo "  make client-build       Build client only"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  make test               Run server tests"
	@echo "  make test-watch         Run tests in watch mode"
	@echo "  make test-coverage      Run tests with coverage report"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  make mongo-start        Start MongoDB (macOS/Linux)"
	@echo "  make mongo-stop         Stop MongoDB (macOS/Linux)"
	@echo "  make mongo-status       Check MongoDB status"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  make install            Install dependencies for both projects"
	@echo "  make clean              Remove node_modules from both projects"
	@echo "  make clean-server       Remove server node_modules"
	@echo "  make clean-client       Remove client node_modules"
	@echo "  make check-env          Verify environment configuration"
	@echo "  make logs               View application logs (if available)"
	@echo ""

# ================================================
# First-Time Setup
# ================================================

setup: ## Complete first-time setup
	@echo "$(BLUE)Starting first-time setup...$(NC)"
	@echo ""
	@echo "$(YELLOW)Step 1/3: Creating environment file...$(NC)"
	@if [ ! -f server/.env ]; then \
		cp server/.env.example server/.env && \
		echo "$(GREEN)✓ Created server/.env from template$(NC)" && \
		echo "$(YELLOW)⚠ IMPORTANT: Edit server/.env and add your API keys!$(NC)"; \
	else \
		echo "$(YELLOW)⚠ server/.env already exists, skipping...$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Step 2/3: Installing dependencies...$(NC)"
	@$(MAKE) install
	@echo ""
	@echo "$(YELLOW)Step 3/3: Checking MongoDB...$(NC)"
	@if command -v mongod >/dev/null 2>&1; then \
		echo "$(GREEN)✓ MongoDB is installed$(NC)"; \
		$(MAKE) mongo-status; \
	else \
		echo "$(RED)✗ MongoDB is not installed$(NC)"; \
		echo "$(YELLOW)Install MongoDB: https://docs.mongodb.com/manual/installation/$(NC)"; \
	fi
	@echo ""
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  1. Edit server/.env and add your API keys"
	@echo "  2. Start MongoDB: make mongo-start"
	@echo "  3. Start the application: make dev"
	@echo ""

# ================================================
# Installation
# ================================================

install: server-install client-install ## Install dependencies for both projects
	@echo "$(GREEN)✓ All dependencies installed$(NC)"

server-install: ## Install server dependencies
	@echo "$(BLUE)Installing server dependencies...$(NC)"
	@cd server && npm install
	@echo "$(GREEN)✓ Server dependencies installed$(NC)"

client-install: ## Install client dependencies
	@echo "$(BLUE)Installing client dependencies...$(NC)"
	@cd client && npm install
	@echo "$(GREEN)✓ Client dependencies installed$(NC)"

# ================================================
# Building
# ================================================

build: server-build client-build ## Build both client and server
	@echo "$(GREEN)✓ Build complete$(NC)"

server-build: ## Build server
	@echo "$(BLUE)Building server...$(NC)"
	@cd server && npm run build
	@echo "$(GREEN)✓ Server built successfully$(NC)"

client-build: ## Build client
	@echo "$(BLUE)Building client...$(NC)"
	@cd client && npm run build
	@echo "$(GREEN)✓ Client built successfully$(NC)"

# ================================================
# Development
# ================================================

dev: ## Start both client and server in parallel (requires tmux or use separate terminals)
	@echo "$(BLUE)Starting development servers...$(NC)"
	@echo ""
	@echo "$(YELLOW)This will start:$(NC)"
	@echo "  • Backend API:  http://localhost:3001"
	@echo "  • Frontend:     http://localhost:5173"
	@echo ""
	@if command -v tmux >/dev/null 2>&1; then \
		echo "$(GREEN)Using tmux for parallel execution$(NC)"; \
		tmux new-session -d -s stocks-dev 'cd server && npm run dev'; \
		tmux split-window -h -t stocks-dev 'cd client && npm run dev'; \
		tmux attach -t stocks-dev; \
	else \
		echo "$(YELLOW)⚠ tmux not found. Please run in separate terminals:$(NC)"; \
		echo ""; \
		echo "  Terminal 1: make server-dev"; \
		echo "  Terminal 2: make client-dev"; \
		echo ""; \
		echo "$(YELLOW)Or install tmux: brew install tmux (macOS) / apt-get install tmux (Linux)$(NC)"; \
	fi

server-dev: ## Start backend API in development mode
	@echo "$(BLUE)Starting backend API on http://localhost:3001$(NC)"
	@cd server && SEC_USER_AGENT="$(SEC_USER_AGENT)" npm run dev

client-dev: ## Start frontend in development mode
	@echo "$(BLUE)Starting frontend on http://localhost:5173$(NC)"
	@cd client && npm run dev

# ================================================
# Testing
# ================================================

test: ## Run server tests
	@echo "$(BLUE)Running tests...$(NC)"
	@cd server && npm test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	@cd server && npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@cd server && npm run test:coverage

# ================================================
# MongoDB Management
# ================================================

mongo-start: ## Start MongoDB (macOS/Linux)
	@echo "$(BLUE)Starting MongoDB...$(NC)"
	@if command -v brew >/dev/null 2>&1; then \
		brew services start mongodb-community && \
		echo "$(GREEN)✓ MongoDB started (via Homebrew)$(NC)"; \
	elif command -v systemctl >/dev/null 2>&1; then \
		sudo systemctl start mongod && \
		echo "$(GREEN)✓ MongoDB started (via systemctl)$(NC)"; \
	elif command -v service >/dev/null 2>&1; then \
		sudo service mongod start && \
		echo "$(GREEN)✓ MongoDB started (via service)$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Could not detect service manager. Try running manually:$(NC)"; \
		echo "  mongod --dbpath ~/data/db"; \
	fi

mongo-stop: ## Stop MongoDB (macOS/Linux)
	@echo "$(BLUE)Stopping MongoDB...$(NC)"
	@if command -v brew >/dev/null 2>&1; then \
		brew services stop mongodb-community && \
		echo "$(GREEN)✓ MongoDB stopped (via Homebrew)$(NC)"; \
	elif command -v systemctl >/dev/null 2>&1; then \
		sudo systemctl stop mongod && \
		echo "$(GREEN)✓ MongoDB stopped (via systemctl)$(NC)"; \
	elif command -v service >/dev/null 2>&1; then \
		sudo service mongod stop && \
		echo "$(GREEN)✓ MongoDB stopped (via service)$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Could not detect service manager$(NC)"; \
	fi

mongo-status: ## Check MongoDB status
	@echo "$(BLUE)Checking MongoDB status...$(NC)"
	@if command -v mongosh >/dev/null 2>&1; then \
		if mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; then \
			echo "$(GREEN)✓ MongoDB is running$(NC)"; \
		else \
			echo "$(RED)✗ MongoDB is not running$(NC)"; \
			echo "$(YELLOW)Start it with: make mongo-start$(NC)"; \
		fi; \
	else \
		echo "$(YELLOW)⚠ mongosh not found. Install MongoDB Shell to check status.$(NC)"; \
	fi

# ================================================
# Cleanup
# ================================================

clean: clean-server clean-client ## Remove node_modules from both projects
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-server: ## Remove server node_modules
	@echo "$(BLUE)Cleaning server...$(NC)"
	@rm -rf server/node_modules server/dist
	@echo "$(GREEN)✓ Server cleaned$(NC)"

clean-client: ## Remove client node_modules
	@echo "$(BLUE)Cleaning client...$(NC)"
	@rm -rf client/node_modules client/dist
	@echo "$(GREEN)✓ Client cleaned$(NC)"

# ================================================
# Utilities
# ================================================

check-env: ## Verify environment configuration
	@echo "$(BLUE)Checking environment configuration...$(NC)"
	@echo ""
	@if [ -f server/.env ]; then \
		echo "$(GREEN)✓ server/.env exists$(NC)"; \
		echo ""; \
		echo "$(YELLOW)Checking required variables...$(NC)"; \
		@grep -q "^ALPHA_VANTAGE_API_KEY=.\+" server/.env && \
			echo "  $(GREEN)✓$(NC) ALPHA_VANTAGE_API_KEY" || \
			echo "  $(RED)✗$(NC) ALPHA_VANTAGE_API_KEY (missing)"; \
		@grep -q "^FMP_API_KEY=.\+" server/.env && \
			echo "  $(GREEN)✓$(NC) FMP_API_KEY" || \
			echo "  $(RED)✗$(NC) FMP_API_KEY (missing)"; \
		@grep -q "^GEMINI_API_KEY=.\+" server/.env && \
			echo "  $(GREEN)✓$(NC) GEMINI_API_KEY" || \
			echo "  $(RED)✗$(NC) GEMINI_API_KEY (missing)"; \
		@grep -q "^SEC_USER_AGENT=.\+" server/.env && \
			echo "  $(GREEN)✓$(NC) SEC_USER_AGENT" || \
			echo "  $(RED)✗$(NC) SEC_USER_AGENT (missing)"; \
		@grep -q "^MONGODB_URI=.\+" server/.env && \
			echo "  $(GREEN)✓$(NC) MONGODB_URI" || \
			echo "  $(RED)✗$(NC) MONGODB_URI (missing)"; \
	else \
		echo "$(RED)✗ server/.env does not exist$(NC)"; \
		echo "$(YELLOW)Run: make setup$(NC)"; \
	fi
	@echo ""

logs: ## View application logs
	@echo "$(BLUE)Application logs:$(NC)"
	@echo "$(YELLOW)Note: This is a basic implementation. For production, use a proper logging solution.$(NC)"
	@if [ -f server/logs/app.log ]; then \
		tail -f server/logs/app.log; \
	else \
		echo "$(YELLOW)No log file found. Logs are printed to console during development.$(NC)"; \
		echo "Run 'make server-dev' or 'make client-dev' to see logs."; \
	fi

# ================================================
# Additional Helpful Commands
# ================================================

.PHONY: start-all stop-all restart

start-all: mongo-start dev ## Start MongoDB and development servers

stop-all: mongo-stop ## Stop all services
	@echo "$(YELLOW)Stopping development servers...$(NC)"
	@pkill -f "npm run dev" || true
	@echo "$(GREEN)✓ All services stopped$(NC)"

restart: stop-all start-all ## Restart all services
