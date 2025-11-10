# Quick Reference: Refactoring Checklist

## Critical Findings Summary

### By Numbers
- **9,560** total lines of code
- **4** components over 250 lines (need refactoring)
- **7** instances of implicit `any` types
- **5** missing index files
- **3** duplicate patterns (~150 lines of duplicate code)
- **30+** type interfaces without documentation

### Component Size Issues

| Component | Current | Target | Lines to Remove |
|-----------|---------|--------|-----------------|
| StockDetail.tsx | 596 | 150 | 446 |
| CANSLIMScore.tsx | 322 | 150 | 172 |
| RSIndicator.tsx | 263 | 120 | 143 |
| Portfolio.tsx | 319 | 150 | 169 |
| **Total** | | | **930** |

## Quick Wins (Can do this week)

1. **Create Index Files** (2 hours)
   - [ ] `/client/src/components/index.ts`
   - [ ] `/client/src/hooks/index.ts`
   - [ ] `/client/src/utils/index.ts`
   - [ ] `/server/src/services/index.ts`

2. **Remove Implicit Any Types** (4 hours)
   - [ ] enrichment.service.ts: BaseStockData interface
   - [ ] portfolio.routes.ts: updateFields
   - [ ] CANSLIMScore.tsx: score state
   - [ ] RSIndicator.tsx: rsData state
   - [ ] 3 more in error handling

3. **Document Critical Types** (4 hours)
   - [ ] CANSLIMMetrics interface
   - [ ] RSRating interface
   - [ ] EnrichedStockData interface
   - [ ] PortfolioStock interface

4. **Extract Common Hooks** (8 hours)
   - [ ] useAsyncDataWithRefresh.ts (combine CANSLIMScore + RSIndicator logic)
   - [ ] useFormValidation.ts (for AddStockForm + AddWatchlistForm)

**Total Quick Wins:** 18 hours → ~30-40% improvement in AI code generation quality

## Medium Priority (Next 2-3 weeks)

- [ ] Split StockDetail.tsx into 7 smaller components
- [ ] Break down Portfolio.tsx into 3 components
- [ ] Extract InsiderTransactionsTable.tsx from InsiderLookup
- [ ] Add JSDoc to all services (canslim, rs, price, enrichment)
- [ ] Document all API endpoints in route files
- [ ] Add usage examples to complex functions

## Naming Issues to Fix

```
BEFORE                  →  AFTER
stockData.ts           →  stockDataService.ts
calculations.ts        →  profitLossCalculations.ts
formatters.ts          →  numberFormatters.ts
InsiderLookup.tsx      →  InsiderLookupPage.tsx
[unclear types]        →  [clear, documented types]
```

## Files Needing Documentation

### High Priority
- [ ] `/server/src/services/enrichment.service.ts` - add examples
- [ ] `/server/src/services/gemini.ts` - document CANSLIM methodology
- [ ] `/client/src/types.ts` - JSDoc all interfaces
- [ ] `/server/src/routes/canslim.routes.ts` - document endpoints

### Medium Priority
- [ ] `/server/src/services/priceHistory.ts` - add moving average examples
- [ ] `/server/src/services/rsCalculator.ts` - document RS methodology
- [ ] `/client/src/components/AddStockForm.tsx` - document props
- [ ] `/client/src/components/CANSLIMScore.tsx` - document props

### Components Needing Props Documentation
- PriceLineChart.tsx
- PortfolioTable.tsx
- InsiderActivity.tsx
- RefreshButton.tsx
- StockCard.tsx
- CANSLIMScore.tsx
- RSIndicator.tsx

## Validation Checklist

After refactoring, ensure:

- [ ] All imports use new index files (no direct path imports)
- [ ] No `any` types remain (except in error boundaries)
- [ ] All public functions have JSDoc with @example
- [ ] All interfaces have field descriptions
- [ ] No component exceeds 200 lines
- [ ] No function exceeds 40 lines (except rare cases)
- [ ] API endpoints documented in route files
- [ ] Duplicate logic extracted to shared utils/hooks

## Testing After Refactoring

```bash
# Verify all components still work
npm test

# Check TypeScript compilation
npx tsc --noEmit

# Verify no console errors in browser
# Check all pages load correctly:
- /portfolio
- /watchlist  
- /insiders
- /stock/:ticker
```

