/**
 * Detailed Ownership Service
 * Aggregates ownership data from multiple free SEC sources
 */

import { loadTickerMap, getCompanyName } from "../sec/ticker-map.js";
import { getInsiderTransactions } from "../sec/insider-service.js";
import { getBeneficialOwnershipFilings } from "./ownership-submissions.js";
import { parse13DGDocument } from "./beneficial-ownership-parser.js";
import {
  DetailedOwnership,
  InsiderOwner,
  BeneficialOwner,
  InstitutionalHolder,
  TopHolder,
  OwnershipBreakdown,
} from "./types.js";
import { StockMetrics } from "../../db/index.js";

const detailedOwnershipCache = new Map<
  string,
  { timestamp: number; data: DetailedOwnership }
>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get detailed ownership data for a ticker using free SEC sources
 */
export async function getDetailedOwnership(
  ticker: string
): Promise<DetailedOwnership | null> {
  // Check in-memory cache
  const cached = detailedOwnershipCache.get(ticker);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Check MongoDB cache
  const persisted = await readStoredDetailedOwnership(ticker);
  if (persisted) {
    detailedOwnershipCache.set(ticker, {
      timestamp: Date.now(),
      data: persisted,
    });
    return persisted;
  }

  // Fetch fresh data
  const result = await fetchDetailedOwnershipData(ticker);
  if (result) {
    // Cache the result
    detailedOwnershipCache.set(ticker, {
      timestamp: Date.now(),
      data: result,
    });
    await writeStoredDetailedOwnership(ticker, result);
  }

  return result;
}

/**
 * Fetch fresh detailed ownership data from SEC
 */
async function fetchDetailedOwnershipData(
  ticker: string
): Promise<DetailedOwnership | null> {
  try {
    // Get CIK for the ticker
    const map = await loadTickerMap();
    const cik = map.get(ticker);

    if (!cik) {
      console.warn(`CIK not found for ticker: ${ticker}`);
      return null;
    }

    // Get company name
    const companyName = await getCompanyName(ticker);

    // Fetch insider data (Forms 3, 4, 5)
    const insiderData = await getInsiderTransactions(ticker);

    // Fetch beneficial ownership data (13D/13G)
    const beneficialFilings = await getBeneficialOwnershipFilings(cik, 10);

    // Parse insider data into owners
    const insiders = parseInsiderOwners(insiderData);

    // Parse beneficial ownership filings
    const beneficialOwners: BeneficialOwner[] = [];
    for (const filing of beneficialFilings) {
      const parsed = await parse13DGDocument(
        cik,
        filing.accessionNumber,
        filing.primaryDocument
      );

      if (parsed && parsed.shares > 0) {
        beneficialOwners.push({
          name: parsed.filerName,
          shares: parsed.shares,
          percentOwnership: parsed.percentOwnership,
          filingDate: parsed.filingDate,
          formType: parsed.formType === '13D' ? '13D' : '13G',
          purpose: parsed.purpose,
          source: 'SEC EDGAR',
        });
      }
    }

    // Note: 13F institutional data would require knowing which institutions hold the stock
    // This is complex and would require a separate service or API
    // For now, we'll use an empty array
    const institutionalHolders: InstitutionalHolder[] = [];

    // Calculate ownership breakdown
    const breakdown = calculateOwnershipBreakdown(
      insiders,
      beneficialOwners,
      institutionalHolders
    );

    // Create top holders list
    const topHolders = createTopHoldersList(
      insiders,
      beneficialOwners,
      institutionalHolders,
      breakdown.insiderPercent,
      breakdown.beneficialPercent
    );

    const detailedOwnership: DetailedOwnership = {
      ticker,
      companyName: companyName || undefined,
      sharesOutstanding: breakdown.insiderShares + breakdown.beneficialShares + breakdown.publicShares,
      breakdown,
      insiders,
      beneficialOwners,
      institutionalHolders,
      topHolders,
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        hasInsiderData: insiders.length > 0,
        hasBeneficialOwnerData: beneficialOwners.length > 0,
        hasInstitutionalData: institutionalHolders.length > 0,
        hasSharesOutstanding: breakdown.insiderShares > 0 || breakdown.beneficialShares > 0,
      },
      source: 'SEC EDGAR',
    };

    return detailedOwnership;
  } catch (error) {
    console.error(`Error fetching detailed ownership for ${ticker}:`, error);
    return null;
  }
}

/**
 * Parse insider transactions into owner summaries
 */
function parseInsiderOwners(insiderData: any): InsiderOwner[] {
  if (!insiderData || !insiderData.transactions) {
    return [];
  }

  // Group transactions by insider name
  const insiderMap = new Map<string, {
    shares: number;
    lastDate: string | null;
    formType: string;
  }>();

  for (const tx of insiderData.transactions) {
    if (!tx.insider || tx.shares === 0) continue;

    const existing = insiderMap.get(tx.insider) || {
      shares: 0,
      lastDate: null,
      formType: tx.formType,
    };

    // Add buy transactions, subtract sell transactions
    if (tx.type === 'buy') {
      existing.shares += tx.shares;
    } else if (tx.type === 'sell') {
      existing.shares -= tx.shares;
    }

    // Update last transaction date
    if (tx.date && (!existing.lastDate || tx.date > existing.lastDate)) {
      existing.lastDate = tx.date;
    }

    insiderMap.set(tx.insider, existing);
  }

  // Convert to InsiderOwner array
  const insiders: InsiderOwner[] = [];
  for (const [name, data] of insiderMap.entries()) {
    if (data.shares > 0) {
      insiders.push({
        name,
        shares: data.shares,
        lastTransactionDate: data.lastDate || undefined,
        source: data.formType === '3' ? 'Form 3' : data.formType === '4' ? 'Form 4' : 'Form 5',
      });
    }
  }

  return insiders.sort((a, b) => b.shares - a.shares);
}

/**
 * Calculate ownership breakdown and percentages
 */
function calculateOwnershipBreakdown(
  insiders: InsiderOwner[],
  beneficialOwners: BeneficialOwner[],
  institutionalHolders: InstitutionalHolder[]
): OwnershipBreakdown {
  // Sum up shares from each category
  const insiderShares = insiders.reduce((sum, owner) => sum + owner.shares, 0);
  const beneficialShares = beneficialOwners.reduce((sum, owner) => sum + owner.shares, 0);
  const institutionalShares = institutionalHolders.reduce((sum, holder) => sum + holder.shares, 0);

  // If we have beneficial owner percentages, use them to estimate total shares
  let totalShares = 0;
  if (beneficialOwners.length > 0 && beneficialOwners[0].percentOwnership > 0) {
    // Use the first beneficial owner to estimate total shares
    totalShares = Math.round(beneficialOwners[0].shares / (beneficialOwners[0].percentOwnership / 100));
  } else {
    // Otherwise estimate from all known shares (rough estimate)
    totalShares = insiderShares + beneficialShares + institutionalShares;
    // Add estimated public float (assume at least 30% public ownership if we have data)
    if (totalShares > 0) {
      totalShares = Math.round(totalShares / 0.7); // Assume known shares are ~70%
    }
  }

  // Ensure total shares is at least the sum of all known shares
  totalShares = Math.max(totalShares, insiderShares + beneficialShares + institutionalShares);

  // Calculate percentages
  const insiderPercent = totalShares > 0 ? (insiderShares / totalShares) * 100 : 0;
  const beneficialPercent = totalShares > 0 ? (beneficialShares / totalShares) * 100 : 0;
  const institutionalPercent = totalShares > 0 ? (institutionalShares / totalShares) * 100 : 0;

  // Public ownership is what's left
  const publicPercent = Math.max(0, 100 - insiderPercent - beneficialPercent - institutionalPercent);
  const publicShares = Math.round((publicPercent / 100) * totalShares);

  // Float shares (available for public trading) excludes insider and beneficial owner shares
  const floatShares = totalShares - insiderShares - beneficialShares;

  return {
    insiderShares,
    insiderPercent: Math.round(insiderPercent * 100) / 100,
    institutionalShares,
    institutionalPercent: Math.round(institutionalPercent * 100) / 100,
    beneficialShares,
    beneficialPercent: Math.round(beneficialPercent * 100) / 100,
    publicShares,
    publicPercent: Math.round(publicPercent * 100) / 100,
    floatShares: Math.max(0, floatShares),
  };
}

/**
 * Create a combined top holders list
 */
function createTopHoldersList(
  insiders: InsiderOwner[],
  beneficialOwners: BeneficialOwner[],
  institutionalHolders: InstitutionalHolder[],
  _insiderPercent: number,
  _beneficialPercent: number
): TopHolder[] {
  const topHolders: TopHolder[] = [];

  // Calculate total shares for percentage calculation
  const insiderShares = insiders.reduce((sum, owner) => sum + owner.shares, 0);
  const beneficialShares = beneficialOwners.reduce((sum, owner) => sum + owner.shares, 0);
  const institutionalShares = institutionalHolders.reduce((sum, holder) => sum + holder.shares, 0);
  const totalShares = Math.max(1, insiderShares + beneficialShares + institutionalShares);

  // Add beneficial owners (already have percentages)
  for (const owner of beneficialOwners) {
    topHolders.push({
      name: owner.name,
      shares: owner.shares,
      percentOwnership: owner.percentOwnership,
      type: 'beneficial',
      source: owner.formType,
    });
  }

  // Add insiders
  for (const insider of insiders) {
    topHolders.push({
      name: insider.name,
      shares: insider.shares,
      percentOwnership: (insider.shares / totalShares) * 100,
      type: 'insider',
      source: insider.source,
    });
  }

  // Add institutional holders
  for (const holder of institutionalHolders) {
    topHolders.push({
      name: holder.name,
      shares: holder.shares,
      percentOwnership: holder.percentOwnership || (holder.shares / totalShares) * 100,
      type: 'institutional',
      source: holder.source,
    });
  }

  // Sort by shares descending and take top 20
  return topHolders
    .sort((a, b) => b.shares - a.shares)
    .slice(0, 20)
    .map(holder => ({
      ...holder,
      percentOwnership: Math.round(holder.percentOwnership * 100) / 100,
    }));
}

/**
 * Read detailed ownership from MongoDB cache
 */
async function readStoredDetailedOwnership(
  ticker: string
): Promise<DetailedOwnership | null> {
  try {
    const record = await StockMetrics.findOne({
      ticker,
      dataType: 'detailed-ownership',
    }).lean();

    if (!record || !record.data) {
      return null;
    }

    // Check if data is still fresh (24 hours)
    const age = Date.now() - record.fetchedAt.getTime();
    if (age > CACHE_TTL_MS) {
      return null;
    }

    return record.data as DetailedOwnership;
  } catch (error) {
    console.warn(`[DB] Failed to read cached detailed ownership for ${ticker}`, error);
    return null;
  }
}

/**
 * Write detailed ownership to MongoDB cache
 */
async function writeStoredDetailedOwnership(
  ticker: string,
  data: DetailedOwnership
): Promise<void> {
  try {
    await StockMetrics.updateOne(
      { ticker, dataType: 'detailed-ownership' },
      {
        ticker,
        dataType: 'detailed-ownership',
        data,
        fetchedAt: new Date(),
      },
      { upsert: true }
    );
  } catch (error) {
    console.warn(`[DB] Failed to persist detailed ownership for ${ticker}`, error);
  }
}

/**
 * Clear detailed ownership cache
 */
export function clearDetailedOwnershipCache(): void {
  detailedOwnershipCache.clear();
}
