# API Side Refactoring Plan

**Date**: 2025-11-13
**Scope**: Server-side codebase organization, duplication removal, and best practices implementation

---

## Executive Summary

This document outlines a comprehensive refactoring plan for the API side of the stock portfolio application. The analysis identified several areas for improvement:

1. **Scattered Gemini AI prompts** across multiple service files
2. **Duplicate Gemini client initialization** in 3 locations
3. **Fragmented SEC services** split between `services/sec/` and `services/ownership/`
4. **Opportunities for better organization** of external API integrations

**Goal**: Consolidate external services into single, well-defined entry points while maintaining best practices for separation of concerns.

---

## Current State Analysis

### 1. External API Services

#### ✅ **Well-Organized: Stock Data APIs**
Location: `server/src/services/stock-data/`

**Structure:**
```
stock-data/
├── index.ts              # Main API with abstraction layer
├── alpha-vantage.ts      # Alpha Vantage integration
├── fmp.ts                # Financial Modeling Prep integration
├── yahoo-finance.ts      # Yahoo Finance integration
├── cache.ts              # Centralized caching
├── rate-limiter.ts       # Rate limiting logic
├── config.ts             # API configuration
├── types.ts              # Type definitions
└── utils.ts              # Shared utilities
```

**Strengths:**
- Single entry point through `index.ts`
- Centralized caching and rate limiting
- Clear separation by provider
- Good error handling and fallback logic

---

#### ⚠️ **Needs Improvement: SEC EDGAR Services**
Current locations: `server/src/services/sec/` AND `server/src/services/ownership/`

**Problem**: SEC-related functionality is split across two directories:

**`services/sec/` (7 files):**
- `edgar-api.ts` - Company facts API
- `financial-calculator.ts` - Financial calculations
- `financial-metrics-service.ts` - Metrics extraction
- `insider-service.ts` - Insider trading data
- `ownership-parser.ts` - Ownership data parsing
- `submissions.ts` - SEC submissions
- `ticker-map.ts` - CIK to ticker mapping
- `utils.ts` - SEC utilities (politeFetch, rate limiting)

**`services/ownership/` (5 files):**
- `detailed-ownership-service.ts` - Main ownership service
- `beneficial-ownership-parser.ts` - Form 4 parsing
- `institutional-parser.ts` - 13F parsing
- `ownership-submissions.ts` - Ownership submissions
- `types.ts` - Ownership types

**Issues:**
- Duplication: `ownership-parser.ts` in both locations
- Unclear separation: Both directories handle ownership data
- SEC utilities spread across multiple files
- Potential for circular dependencies

---

#### ⚠️ **Needs Improvement: Gemini AI Services**
Current locations: `services/gemini.ts`, `services/spinoffAnalyzer.ts`, `services/spinoffLookup.service.ts`

**Problem**: Gemini client initialization and prompts are duplicated

**Duplication Found:**

1. **Client Initialization (3 locations):**
```typescript
// services/gemini.ts
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// services/spinoffAnalyzer.ts
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

// services/spinoffLookup.service.ts
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});
```

2. **Response Parsing (similar patterns in 3 files):**
- `parseGeminiResponse()` in `gemini.ts`
- `parseSpinoffResponse()` in `spinoffAnalyzer.ts`
- `parseSpinoffLookupResponse()` in `spinoffLookup.service.ts`

3. **Prompts Scattered Across Files:**
- `buildCANSLIMPrompt()` in `gemini.ts` (146 lines)
- `buildSectorIndustryPrompt()` in `gemini.ts` (82 lines)
- `buildSpinoffAnalysisPrompt()` in `spinoffAnalyzer.ts` (94 lines, includes 90-line SYSTEM_PROMPT)
- `buildSpinoffLookupPrompt()` in `spinoffLookup.service.ts` (23 lines)

**Total Prompt Lines**: ~345 lines scattered across 3 files

---

### 2. Code Organization Issues

#### Issue #1: No Centralized Prompts Directory
- Prompts are embedded in service files
- Difficult to review/edit prompts without touching business logic
- No single source of truth for AI prompts

#### Issue #2: Multiple Gemini Client Instances
- 3 separate client initializations
- No shared configuration
- Potential for inconsistent settings

#### Issue #3: SEC Services Split
- Ownership functionality duplicated
- Unclear which service to use for SEC data
- Potential import confusion

---

## Proposed Refactoring

### Phase 1: Consolidate Gemini Services ✅ HIGH PRIORITY

#### 1.1 Create Centralized Gemini Client
**New file**: `server/src/services/ai/gemini-client.ts`

```typescript
/**
 * Centralized Gemini AI Client
 * Single source of truth for Gemini API integration
 */

import { GoogleGenAI } from '@google/genai';

// Singleton pattern
let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  return geminiClient;
}

// Default generation config for consistency
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
};

// Model constants
export const GEMINI_MODELS = {
  FLASH: 'gemini-2.0-flash',
  PRO: 'gemini-1.5-pro-latest',
} as const;
```

**Benefits:**
- Single client initialization
- Centralized API key validation
- Consistent configuration
- Easy to add telemetry/logging in one place

---

#### 1.2 Create Prompts Directory
**New directory**: `server/src/prompts/`

```
prompts/
├── index.ts                    # Barrel export
├── canslim-analysis.ts         # CANSLIM scoring prompt
├── sector-industry.ts          # Sector/industry classification prompt
├── spinoff-analysis.ts         # Spinoff investment analysis prompt
├── spinoff-lookup.ts           # Spinoff lookup prompt
└── utils.ts                    # Shared prompt utilities
```

**Example**: `prompts/canslim-analysis.ts`
```typescript
/**
 * CANSLIM Analysis Prompt
 * Analyzes stock metrics according to William O'Neil's CANSLIM methodology
 */

import type { CANSLIMMetrics } from '../services/gemini';

export function buildCANSLIMPrompt(metrics: CANSLIMMetrics): string {
  return `You are a stock analysis expert specializing in the CANSLIM investment methodology...

  [FULL PROMPT HERE]
  `;
}
```

**Benefits:**
- Prompts are versioned and reviewable
- Easy to A/B test prompts
- Clear documentation of what each prompt does
- Separation of concerns (prompts vs business logic)

---

#### 1.3 Create Shared Gemini Utilities
**New file**: `server/src/services/ai/gemini-utils.ts`

```typescript
/**
 * Shared Gemini Utilities
 * Common functions for working with Gemini API responses
 */

/**
 * Removes markdown code blocks from JSON responses
 */
export function cleanJSONResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*\n?/i, '');
  cleaned = cleaned.replace(/\n?```\s*$/i, '');
  return cleaned.trim();
}

/**
 * Parses Gemini JSON response with error handling
 */
export function parseGeminiJSON<T>(responseText: string, fallback: T): T {
  try {
    const cleaned = cleanJSONResponse(responseText);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText);
    console.error('Parse error:', error);
    return fallback;
  }
}
```

**Benefits:**
- DRY (Don't Repeat Yourself)
- Consistent error handling
- Single place to improve parsing logic

---

#### 1.4 Refactor Existing Gemini Services

**Update `services/gemini.ts`:**
```typescript
import { getGeminiClient, GEMINI_MODELS } from './ai/gemini-client';
import { buildCANSLIMPrompt, buildSectorIndustryPrompt } from '../prompts';
import { parseGeminiJSON } from './ai/gemini-utils';

export async function analyzeCANSLIMWithGemini(
  metrics: CANSLIMMetrics
): Promise<CANSLIMAnalysis> {
  const client = getGeminiClient();
  const prompt = buildCANSLIMPrompt(metrics);

  const response = await client.models.generateContent({
    model: GEMINI_MODELS.FLASH,
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  const fallback = { /* default analysis */ };
  return parseGeminiJSON<CANSLIMAnalysis>(response.text, fallback);
}
```

**Update `services/spinoffAnalyzer.ts`:**
```typescript
import { getGeminiClient, GEMINI_MODELS } from './ai/gemini-client';
import { buildSpinoffAnalysisPrompt } from '../prompts';
import { parseGeminiJSON } from './ai/gemini-utils';

// Remove duplicate client initialization
// Use centralized client and prompts
```

**Update `services/spinoffLookup.service.ts`:**
```typescript
import { getGeminiClient, GEMINI_MODELS } from './ai/gemini-client';
import { buildSpinoffLookupPrompt } from '../prompts';
import { parseGeminiJSON } from './ai/gemini-utils';

// Remove duplicate client initialization
// Use centralized client and prompts
```

---

### Phase 2: Consolidate SEC Services ✅ MEDIUM PRIORITY

#### 2.1 Merge Ownership Services into SEC
**Goal**: All SEC EDGAR functionality in one directory

**Proposed structure**:
```
services/sec/
├── index.ts                           # Main barrel export
├── client/
│   ├── edgar-api.ts                   # EDGAR API client
│   ├── config.ts                      # SEC configuration
│   └── utils.ts                       # politeFetch, rate limiting
├── parsers/
│   ├── beneficial-ownership.ts        # Form 4 parsing
│   ├── institutional-ownership.ts     # 13F parsing
│   └── financial-data.ts              # Financial statement parsing
├── services/
│   ├── company-facts.ts               # Company facts retrieval
│   ├── financial-metrics.ts           # Financial metrics calculation
│   ├── insider-trading.ts             # Insider transaction service
│   ├── ownership.ts                   # Comprehensive ownership service
│   └── submissions.ts                 # SEC submissions handling
├── utilities/
│   ├── financial-calculator.ts        # Financial calculations
│   └── ticker-map.ts                  # CIK/ticker mapping
└── types.ts                           # All SEC-related types
```

**Migration steps**:
1. Move `services/ownership/*` → `services/sec/parsers/` and `services/sec/services/`
2. Update imports across codebase
3. Consolidate duplicate functionality
4. Update `services/sec/index.ts` barrel export

**Benefits:**
- Single entry point for all SEC data
- Clear organization by function (client, parsers, services, utilities)
- No duplication
- Easier to maintain

---

### Phase 3: Improve External API Organization ✅ LOW PRIORITY

#### 3.1 Create Unified External Services Directory
**Optional**: Further consolidate if beneficial

```
services/external/
├── sec/                    # SEC EDGAR (from Phase 2)
├── stock-data/             # Already well organized
├── ai/                     # Gemini and future AI services
└── index.ts                # Unified external API interface
```

**Benefits:**
- Clear separation: external APIs vs business logic
- Easier to add new external services
- Better for testing (mock entire external directory)

---

## Implementation Plan

### Step 1: Create New Structure (Non-Breaking)
1. ✅ Create `services/ai/` directory
2. ✅ Create `gemini-client.ts` with singleton
3. ✅ Create `gemini-utils.ts` with shared functions
4. ✅ Create `prompts/` directory
5. ✅ Extract all prompts to dedicated files

### Step 2: Refactor Gemini Services
1. ✅ Update `services/gemini.ts` to use new client
2. ✅ Update `services/spinoffAnalyzer.ts` to use new client
3. ✅ Update `services/spinoffLookup.service.ts` to use new client
4. ✅ Update all imports in routes and services
5. ✅ Test all Gemini-dependent features

### Step 3: Consolidate SEC Services
1. ✅ Create new `services/sec/` structure
2. ✅ Move ownership parsers to `services/sec/parsers/`
3. ✅ Move ownership services to `services/sec/services/`
4. ✅ Remove `services/ownership/` directory
5. ✅ Update all imports
6. ✅ Update barrel exports
7. ✅ Test all SEC-dependent features

### Step 4: Documentation & Cleanup
1. ✅ Update CLAUDE.md with new structure
2. ✅ Update README.md if needed
3. ✅ Add JSDoc to all new files
4. ✅ Remove deprecated code
5. ✅ Run linter and fix issues

---

## Files to Create

### New Files (Phase 1 - Gemini)
```
server/src/services/ai/gemini-client.ts
server/src/services/ai/gemini-utils.ts
server/src/services/ai/index.ts
server/src/prompts/canslim-analysis.ts
server/src/prompts/sector-industry.ts
server/src/prompts/spinoff-analysis.ts
server/src/prompts/spinoff-lookup.ts
server/src/prompts/utils.ts
server/src/prompts/index.ts
```

### New Files (Phase 2 - SEC)
```
server/src/services/sec/client/edgar-api.ts
server/src/services/sec/client/config.ts
server/src/services/sec/client/utils.ts
server/src/services/sec/parsers/beneficial-ownership.ts
server/src/services/sec/parsers/institutional-ownership.ts
server/src/services/sec/parsers/financial-data.ts
server/src/services/sec/services/ownership.ts
```

### Files to Update (Phase 1 - Gemini)
```
server/src/services/gemini.ts
server/src/services/spinoffAnalyzer.ts
server/src/services/spinoffLookup.service.ts
server/src/services/canslimCalculator.ts
server/src/services/rsCalculator.ts
server/src/routes/canslim.routes.ts
server/src/routes/rs.routes.ts
server/src/routes/spinoff.routes.ts
```

### Files to Move/Merge (Phase 2 - SEC)
```
server/src/services/ownership/* → server/src/services/sec/
```

### Files to Delete (After migration)
```
server/src/services/ownership/ (entire directory)
```

---

## Testing Strategy

### Unit Tests
- Test Gemini client initialization
- Test prompt building functions
- Test JSON parsing utilities
- Test SEC service consolidation

### Integration Tests
- Test CANSLIM calculation end-to-end
- Test spinoff analysis end-to-end
- Test ownership data retrieval
- Test all route handlers

### Regression Tests
- Ensure all existing API endpoints work
- Verify response formats unchanged
- Check error handling still works
- Validate caching still functions

---

## Risk Mitigation

### Risks
1. **Breaking imports**: Refactoring will change many import paths
2. **Runtime errors**: Missed import updates could cause failures
3. **Cache invalidation**: Moving services might affect caching

### Mitigation
1. ✅ Use TypeScript compiler to find import errors
2. ✅ Run full test suite after each phase
3. ✅ Deploy to staging first
4. ✅ Keep old code until verification complete
5. ✅ Update in small, testable increments

---

## Success Criteria

### Phase 1 Success (Gemini Consolidation)
- ✅ Single Gemini client initialization
- ✅ All prompts in dedicated directory
- ✅ No duplicate parsing logic
- ✅ All Gemini features working
- ✅ Tests passing

### Phase 2 Success (SEC Consolidation)
- ✅ All SEC services in `services/sec/`
- ✅ No `services/ownership/` directory
- ✅ Clear separation by function
- ✅ All SEC features working
- ✅ Tests passing

### Overall Success
- ✅ Code is more maintainable
- ✅ External API calls have single entry points
- ✅ No duplication
- ✅ Clear organization
- ✅ Good documentation
- ✅ All tests passing

---

## Timeline Estimate

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Gemini Consolidation | 2-3 hours | Medium |
| Phase 2: SEC Consolidation | 3-4 hours | High |
| Phase 3: Optional Further Org | 1-2 hours | Low |
| Testing & Documentation | 2 hours | Medium |
| **Total** | **8-11 hours** | - |

---

## Recommendations

### Immediate Actions (High Value, Low Risk)
1. ✅ **Create prompts directory** - Easy win, high value for maintainability
2. ✅ **Centralize Gemini client** - Removes duplication, improves consistency
3. ✅ **Extract shared utilities** - DRY principle, easier testing

### Medium-Term Actions (High Value, Medium Risk)
1. ✅ **Consolidate SEC services** - Better organization, but requires careful migration
2. ✅ **Update documentation** - Ensure team understands new structure

### Long-Term Actions (Nice to Have)
1. ⏸️ **Create external services directory** - Further consolidation if beneficial
2. ⏸️ **Add prompt versioning** - Track prompt changes over time
3. ⏸️ **Add telemetry to AI calls** - Monitor usage and costs

---

## Questions for Review

1. **Should we proceed with Phase 1 (Gemini) first?** (Recommended: Yes)
2. **Should we proceed with Phase 2 (SEC) afterward?** (Recommended: Yes)
3. **Should we create a separate `external/` directory?** (Recommended: Not yet)
4. **Should prompts be in separate files or one file per service?** (Recommended: Separate files)
5. **Should we version prompts?** (Recommended: Consider for v2)

---

## Conclusion

This refactoring plan addresses the main organizational issues in the API side:
- **Scattered prompts** → Centralized in `prompts/` directory
- **Duplicate Gemini clients** → Single client in `services/ai/gemini-client.ts`
- **Split SEC services** → Consolidated in `services/sec/` with clear structure
- **Shared utilities** → Extracted to reduce duplication

**Next Steps:**
1. Review this plan with the team
2. Get approval for Phase 1
3. Implement Phase 1 incrementally
4. Test thoroughly
5. Proceed with Phase 2 if Phase 1 successful

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Author**: Claude Code (API Review)
