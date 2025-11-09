/**
 * SEC Insider Trading Service
 * Main service for fetching and analyzing insider transactions
 */

import { InsiderTransaction } from "../../db/index.js";
import { loadTickerMap } from "./ticker-map.js";
import { fetchCompanySubmissions, normalizeRecentFilings } from "./submissions.js";
import {
  fetchOwnershipDocument,
  parseOwnershipXml,
  buildFilingDocumentUrl,
} from "./ownership-parser.js";
import {
  InsiderLookupResult,
  ParsedTransaction,
  Summary,
} from "./types.js";
import { SEC_CONFIG } from "../../constants.js";

const transactionsCache = new Map<
  string,
  { timestamp: number; data: InsiderLookupResult }
>();

function summarizeTransactions(transactions: ParsedTransaction[]): Summary {
  return transactions.reduce<Summary>(
    (acc, tx) => {
      if (tx.type === "buy") {
        acc.totalBuyShares += tx.shares;
      } else if (tx.type === "sell") {
        acc.totalSellShares += tx.shares;
      }
      acc.netShares = acc.totalBuyShares - acc.totalSellShares;
      return acc;
    },
    { totalBuyShares: 0, totalSellShares: 0, netShares: 0 }
  );
}

async function readStoredInsider(
  ticker: string
): Promise<InsiderLookupResult | null> {
  try {
    const record = await InsiderTransaction.findOne({ ticker }).lean();
    if (!record) {
      return null;
    }
    // MongoDB TTL index will automatically delete expired documents
    // So if we found it, it's valid
    return {
      ticker: record.ticker,
      cik: record.cik,
      summary: record.summary,
      transactions: record.transactions,
    };
  } catch (error) {
    console.warn(`[DB] Failed to read cached insider data for ${ticker}`, error);
    return null;
  }
}

async function writeStoredInsider(
  ticker: string,
  record: InsiderLookupResult
): Promise<void> {
  try {
    await InsiderTransaction.updateOne(
      { ticker },
      {
        ticker: record.ticker,
        cik: record.cik,
        transactions: record.transactions,
        summary: record.summary,
        fetchedAt: new Date(),
      },
      { upsert: true }
    );
  } catch (error) {
    console.warn(`[DB] Failed to persist insider data for ${ticker}`, error);
  }
}

export async function getInsiderTransactions(
  ticker: string
): Promise<InsiderLookupResult | null> {
  const inMemory = transactionsCache.get(ticker);
  if (inMemory && Date.now() - inMemory.timestamp < SEC_CONFIG.TRANSACTION_CACHE_MS) {
    return inMemory.data;
  }

  const persisted = await readStoredInsider(ticker);
  if (persisted) {
    transactionsCache.set(ticker, { timestamp: Date.now(), data: persisted });
    return persisted;
  }

  const map = await loadTickerMap();
  const cik = map.get(ticker);
  if (!cik) {
    return null;
  }

  const submissions = await fetchCompanySubmissions(cik);
  const filings = normalizeRecentFilings(submissions)
    .sort((a, b) => {
      const aTime = a.filingDate ? Date.parse(a.filingDate) : 0;
      const bTime = b.filingDate ? Date.parse(b.filingDate) : 0;
      return bTime - aTime;
    })
    .slice(0, SEC_CONFIG.MAX_FILINGS_TO_PROCESS);
  const transactions: ParsedTransaction[] = [];

  for (const filing of filings) {
    const xml = await fetchOwnershipDocument(cik, filing);
    if (xml) {
      const parsed = parseOwnershipXml(xml, filing, cik);
      if (parsed.length > 0) {
        transactions.push(...parsed);
        continue;
      }
    }
    transactions.push({
      date: filing.filingDate ?? null,
      insider: "Unknown",
      formType: filing.form,
      type: "other",
      shares: 0,
      price: null,
      source: buildFilingDocumentUrl(cik, filing),
      note: "Transaction details unavailable",
    });
  }

  const result: InsiderLookupResult = {
    ticker,
    cik,
    summary: summarizeTransactions(transactions),
    transactions,
  };
  transactionsCache.set(ticker, { timestamp: Date.now(), data: result });
  await writeStoredInsider(ticker, result);
  return result;
}
