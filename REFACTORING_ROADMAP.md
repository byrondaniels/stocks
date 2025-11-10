# Refactoring Roadmap - Quick Reference

## Overview
This document provides a quick actionable guide for refactoring the Stock Portfolio application. See `CODEBASE_ANALYSIS.md` for detailed analysis.

---

## Quick Stats
- **Codebase Size:** ~7,351 lines
- **Duplication Rate:** ~5-8% (mostly validation and data enrichment)
- **Estimated Refactoring Time:** 2-3 weeks (comprehensive) / 3-4 days (high-priority items)
- **Expected Quality Gain:** 20-30% improvement in maintainability

---

## Priority 1: CRITICAL (Start Here!)

### Task 1.1: Extract Shared Validation Logic
**Status:** Not Started  
**Effort:** 1-2 days  
**Impact:** CRITICAL

**Files Affected:**
- `client/src/utils/validation.ts` (delete)
- `server/src/utils/validation.ts` (keep as source of truth)
- All files importing from client validation (update imports)

**Action Items:**
1. [ ] Move `server/src/utils/validation.ts` to a shared location:
   - Option A: Create `shared/validation.ts` in project root
   - Option B: Keep in server, client imports from server
2. [ ] Update client imports from `../utils/validation` to import from server or shared
3. [ ] Remove client validation file
4. [ ] Run tests to verify no breaking changes

**Current Duplication:**
- `TICKER_REGEX` (identical)
- `normalizeTicker()` (identical)
- `isValidTicker()` (identical)
- `isPositiveNumber()` (identical)
- `validateAndNormalizeTicker()` (identical)

**Payoff:** Single source of truth, easier maintenance, reduced file duplication

---

### Task 1.2: Extract Data Enrichment Service
**Status:** Not Started  
**Effort:** 2-3 days  
**Impact:** HIGH

**Files Affected:**
- `server/src/routes/portfolio.routes.ts` (lines 38-90) - REFACTOR
- `server/src/routes/watchlist.routes.ts` (lines 36-80) - REFACTOR
- NEW: `server/src/services/enrichment.service.ts` - CREATE

**Action Items:**
1. [ ] Create new service: `server/src/services/enrichment.service.ts`
2. [ ] Extract function `enrichStockData(stocks: any[])` that:
   - Fetches current price
   - Calculates 50DMA stats
   - Fetches insider transactions
   - Handles errors gracefully
   - Returns enriched array
3. [ ] Replace enrichment logic in both route files with service call
4. [ ] Add unit tests for enrichment service
5. [ ] Test both endpoints return same data structure

**Code To Extract:**
```typescript
// Current: portfolio.routes.ts lines 43-73
const enrichedPortfolio = await Promise.all(
  portfolioStocks.map(async (stock: any) => {
    try {
      const priceData = await getCurrentPrice(stock.ticker);
      const currentPrice = priceData.price;
      const [dmaStats, insiderData] = await Promise.all([
        calculate50DMA(stock.ticker),
        getInsiderTransactions(stock.ticker).catch(() => null),
      ]);
      return { ...stock, currentPrice, ...dmaStats, insiderActivity };
    } catch (error) { ... }
  })
);

// Replace with:
const enrichedPortfolio = await enrichStockData(portfolioStocks);
```

**Payoff:** 40+ lines of code eliminated, easier to maintain, testable

---

## Priority 2: HIGH (Week 1-2)

### Task 2.1: Create Ticker Validation Middleware
**Status:** Not Started  
**Effort:** 1 day  
**Impact:** HIGH

**Files Affected:**
- ALL route files in `server/src/routes/`
- NEW: `server/src/middleware/tickerValidation.ts` - CREATE

**Action Items:**
1. [ ] Create middleware file `server/src/middleware/tickerValidation.ts`
2. [ ] Implement `validateTickerQuery` middleware:
   - Takes ticker from query params
   - Normalizes and validates
   - Attaches to `req.normalizedTicker`
3. [ ] Implement `validateTickerParam` middleware (for path params)
4. [ ] Update all route files to use middleware:
   - Remove manual ticker validation code (saves ~5 lines per route)
   - Apply middleware to routes
   - Clean up handler bodies
5. [ ] Test all routes still work

**Files to Update:**
- `server/src/routes/stock-data.routes.ts` - 4 endpoints use query param
- `server/src/routes/insider.routes.ts` - 1 endpoint uses query param
- `server/src/routes/watchlist.routes.ts` - Query + param endpoints
- `server/src/routes/portfolio.routes.ts` - Query + param endpoints
- `server/src/routes/canslim.routes.ts` - Query + param endpoints
- `server/src/routes/rs.routes.ts` - Query + param endpoints

**Before:**
```typescript
router.get("/price", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = normalizeTicker(rawTicker);
  if (!ticker || !isValidTicker(ticker)) {
    sendBadRequest(res, ERROR_MESSAGES.INVALID_TICKER);
    return;
  }
  const price = await getCurrentPrice(ticker);
  res.json(price);
});
```

**After:**
```typescript
router.get("/price", validateTickerQuery, async (req: Request, res: ExpressResponse) => {
  const price = await getCurrentPrice(req.normalizedTicker);
  res.json(price);
});
```

**Payoff:** Cleaner routes, ~30-40 lines of boilerplate removed, consistency

---

### Task 2.2: Custom Hook for Form Validation
**Status:** Not Started  
**Effort:** 1 day  
**Impact:** MEDIUM

**Files Affected:**
- `client/src/components/AddStockForm.tsx` (REFACTOR)
- `client/src/components/AddWatchlistForm.tsx` (REFACTOR)
- NEW: `client/src/hooks/useTickerValidation.ts` - CREATE

**Action Items:**
1. [ ] Create hook: `client/src/hooks/useTickerValidation.ts`
2. [ ] Extract ticker validation logic to custom hook
3. [ ] Update both form components to use hook
4. [ ] Consider extracting other common form patterns to hooks
5. [ ] Test form validation still works in both components

**Hook Implementation:**
```typescript
// hooks/useTickerValidation.ts
export function useTickerValidation() {
  const validateTicker = (ticker: string): string | undefined => {
    const trimmed = normalizeTicker(ticker);
    if (!trimmed) return 'Ticker is required';
    if (!TICKER_REGEX.test(trimmed)) {
      return 'Invalid ticker format (e.g., AAPL or BRK.B)';
    }
    return undefined;
  };
  
  return { validateTicker };
}

// Usage in components:
const { validateTicker } = useTickerValidation();
const error = validateTicker(formData.ticker);
if (error) {
  newErrors.ticker = error;
}
```

**Payoff:** DRY principle, reusable validation, easier to test

---

## Priority 3: MEDIUM (Weeks 2-3)

### Task 3.1: Expand Test Coverage
**Status:** Not Started  
**Effort:** 2-3 days  
**Impact:** HIGH (for reliability)

**Current State:**
- Only 2 test files: `portfolio.test.ts`, `ownership-parser.test.ts`
- Estimated coverage: ~2%
- Missing: service tests, utility tests, component tests

**Action Items:**
1. [ ] Create unit tests for validation utilities:
   - `server/src/utils/__tests__/validation.test.ts`
   - Test normalizeTicker, isValidTicker, isPositiveNumber
2. [ ] Create unit tests for calculations:
   - `server/src/utils/__tests__/calculations.test.ts`
   - Test profit/loss calculations, moving averages
3. [ ] Create integration tests for key services:
   - `server/src/services/__tests__/stockData.test.ts`
   - `server/src/services/__tests__/priceHistory.test.ts`
4. [ ] Add component tests (optional):
   - Use React Testing Library for critical components
5. [ ] Aim for 70%+ coverage on critical paths

**Test Template:**
```typescript
describe('Validation Utils', () => {
  describe('normalizeTicker', () => {
    it('should trim and uppercase', () => {
      expect(normalizeTicker('  aapl  ')).toBe('AAPL');
    });
  });

  describe('isValidTicker', () => {
    it('should accept valid tickers', () => {
      expect(isValidTicker('AAPL')).toBe(true);
      expect(isValidTicker('BRK.B')).toBe(true);
    });

    it('should reject invalid tickers', () => {
      expect(isValidTicker('AAPLX')).toBe(false);
      expect(isValidTicker('AAPL.BB')).toBe(false);
    });
  });
});
```

**Payoff:** Catch bugs early, confidence in refactoring, document behavior

---

### Task 3.2: Constants Alignment
**Status:** Not Started  
**Effort:** 0.5 days  
**Impact:** LOW

**Files Affected:**
- `client/src/constants.ts` (REVIEW)
- `server/src/constants.ts` (REVIEW)

**Action Items:**
1. [ ] Document which constants are shared between client/server:
   - HISTORICAL_DAYS_DEFAULT (50 in both)
   - TICKER_MAX_LENGTH (9 in both)
   - Some ERROR_MESSAGES
2. [ ] Create comment in both files linking to shared values
3. [ ] Consider extracting truly shared constants to shared location
4. [ ] Document differences and reasons

**Payoff:** Reduced maintenance burden, clearer intent

---

## Priority 4: OPTIONAL (Month 2+)

### Task 4.1: Monorepo Structure
**Status:** Not Started  
**Effort:** 2-3 days  
**Impact:** MEDIUM

Consider if project grows or team expands. Enables true shared packages.

**Structure:**
```
stocks/
├── packages/
│   ├── validation/          - Shared validation logic
│   ├── constants/           - Shared constants
│   └── types/               - Shared type definitions
├── client/
└── server/
```

---

### Task 4.2: Error Handling Middleware
**Status:** Not Started  
**Effort:** 1-2 days  
**Impact:** MEDIUM

Create centralized error handling middleware to replace `handleApiError` calls.

---

### Task 4.3: Request Logging Middleware
**Status:** Not Started  
**Effort:** 1 day  
**Impact:** LOW

Add structured logging for all API requests for debugging.

---

## Implementation Checklist

### Phase 1: Critical Fixes (Week 1)
- [ ] Task 1.1: Extract shared validation logic (1-2 days)
- [ ] Task 1.2: Extract data enrichment service (2-3 days)
- [ ] Task 2.1: Create ticker validation middleware (1 day)

**Estimated Time:** 4-6 days (roughly 1 week, part-time)  
**Payoff:** ~100 lines of code eliminated, significant duplication reduction

### Phase 2: High Priority (Weeks 2-3)
- [ ] Task 2.2: Custom form validation hook (1 day)
- [ ] Task 3.1: Expand test coverage (2-3 days)
- [ ] Task 3.2: Constants alignment (0.5 days)

**Estimated Time:** 3-4 days  
**Payoff:** Better tested code, reusable components

### Phase 3: Nice to Have (Month 2+)
- [ ] Task 4.1: Monorepo structure (if needed)
- [ ] Task 4.2-4.3: Additional middleware

---

## Testing Refactoring

After each refactoring task:

1. **Run Tests:**
   ```bash
   make test
   make test-coverage
   ```

2. **Manual Testing:**
   - Test portfolio page (list and detail)
   - Test watchlist page (list and detail)
   - Test insider lookup
   - Test form validation
   - Test stock data endpoints

3. **Code Review:**
   - Check for lint errors: `npm run lint` (if configured)
   - Verify TypeScript types: `npx tsc --noEmit`

---

## Git Workflow

For each major refactoring task:

```bash
# Create feature branch
git checkout -b refactor/TASK_NUMBER-description

# Make changes
# Run tests
# Commit changes
git add .
git commit -m "refactor: TASK_NUMBER - Description"

# Create PR for code review
# Merge after approval
```

---

## Estimated Timeline

| Phase | Tasks | Duration | Lines Saved | Priority |
|-------|-------|----------|-------------|----------|
| Phase 1 | 1.1, 1.2, 2.1 | 4-6 days | ~100 | CRITICAL |
| Phase 2 | 2.2, 3.1, 3.2 | 3-4 days | ~30 | HIGH |
| Phase 3 | 4.1-4.3 | 3-5 days | ~50 | MEDIUM |
| **TOTAL** | **All** | **2-3 weeks** | **~180 lines** | — |

---

## Success Metrics

After completing Phase 1:
- [ ] No duplicate validation code between client and server
- [ ] Data enrichment used in 2+ places (DRY)
- [ ] All route handlers using validation middleware
- [ ] Tests pass (100% existing + new)
- [ ] No functionality broken

After completing Phase 2:
- [ ] Form components using shared validation hook
- [ ] 70%+ test coverage on critical services
- [ ] Constants documented and aligned
- [ ] Code quality improved measurably

---

## Questions?

Refer to `CODEBASE_ANALYSIS.md` for:
- Detailed code examples
- Architecture observations
- Full duplication findings
- Specific line numbers and context
