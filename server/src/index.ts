import cors from "cors";
import express, { Request, Response as ExpressResponse } from "express";
import { XMLParser } from "fast-xml-parser";
import {
  getCurrentPrice,
  getOwnershipData,
  getFinancialMetrics,
  getHistoricalPrices,
  getRateLimitStatus,
  clearAllCaches,
  type ApiError,
} from "./services/stockData.js";
import {
  fetchAndStoreHistoricalPrices,
  calculateMovingAverage,
  getPriceHistorySummary,
  getLatestStoredPrice,
} from "./services/priceHistory.js";
import {
  getOrCalculateCANSLIMScore,
  calculateCANSLIMScore,
} from "./services/canslimCalculator.js";
import { connectToDatabase, InsiderTransaction, Portfolio } from "./db/index.js";

const PORT = process.env.PORT || 3001;
const SEC_TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/";
const SEC_ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data";
const USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "stocks-insider-poc/1.0 (byrondaniels@gmail.com)";
const MIN_REQUEST_INTERVAL_MS = 250; // politeness delay between SEC requests
const SUBMISSION_CACHE_MS = 15 * 60 * 1000;
const TRANSACTION_CACHE_MS = 5 * 60 * 1000;
const PERSISTED_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_FILINGS_TO_PROCESS = 3;

type RecentFiling = {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
};

type ParsedTransaction = {
  date: string | null;
  insider: string;
  formType: string;
  transactionCode?: string;
  type: "buy" | "sell" | "other";
  shares: number;
  price?: number | null;
  securityTitle?: string;
  source: string;
  note?: string;
};

type Summary = {
  totalBuyShares: number;
  totalSellShares: number;
  netShares: number;
};

type InsiderLookupResult = {
  ticker: string;
  cik: string;
  summary: Summary;
  transactions: ParsedTransaction[];
};

type CompanySubmissions = {
  filings?: {
    recent?: {
      accessionNumber?: string[];
      form?: string[];
      filingDate?: string[];
      reportDate?: (string | null)[];
      primaryDocument?: string[];
    };
  };
};

type TransactionAmounts = {
  transactionShares?: unknown;
  transactionPricePerShare?: unknown;
  transactionAcquiredDisposedCode?: unknown;
};

let lastRequestTime = 0;
let tickerMapPromise: Promise<Map<string, string>> | null = null;

const submissionCache = new Map<
  string,
  { timestamp: number; data: CompanySubmissions }
>();
const transactionsCache = new Map<
  string,
  { timestamp: number; data: InsiderLookupResult }
>();


const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function politeFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const timeSinceLast = Date.now() - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
    await delay(MIN_REQUEST_INTERVAL_MS - timeSinceLast);
  }
  lastRequestTime = Date.now();
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const method =
    typeof init.method === "string" && init.method.length > 0
      ? init.method.toUpperCase()
      : "GET";
  console.log(`[SEC] Request: ${method} ${url}`);
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    console.error(`[SEC] Network error for ${method} ${url}`, error);
    throw error;
  }
  console.log(
    `[SEC] Response: ${method} ${url} -> ${response.status} ${response.statusText}`
  );
  if (!response.ok) {
    throw new Error(
      `SEC request failed (${response.status} ${response.statusText})`
    );
  }
  return response;
}

async function loadTickerMap(): Promise<Map<string, string>> {
  if (!tickerMapPromise) {
    tickerMapPromise = (async () => {
      const response = await politeFetch(SEC_TICKER_URL);
      const payload = (await response.json()) as Record<
        string,
        { ticker: string; cik_str: number }
      >;
      const map = new Map<string, string>();
      Object.values(payload).forEach(({ ticker, cik_str }) => {
        map.set(ticker.toUpperCase(), cik_str.toString().padStart(10, "0"));
      });
      return map;
    })();
  }
  return tickerMapPromise;
}

async function fetchCompanySubmissions(
  cik: string
): Promise<CompanySubmissions> {
  const cached = submissionCache.get(cik);
  if (cached && Date.now() - cached.timestamp < SUBMISSION_CACHE_MS) {
    return cached.data;
  }
  const url = `${SEC_SUBMISSIONS_URL}CIK${cik}.json`;
  const response = await politeFetch(url);
  const data = (await response.json()) as CompanySubmissions;
  submissionCache.set(cik, { timestamp: Date.now(), data });
  return data;
}

function normalizeRecentFilings(
  data: CompanySubmissions
): RecentFiling[] {
  const recent = data.filings?.recent;
  if (!recent) {
    return [];
  }
  const accessionNumbers = recent.accessionNumber ?? [];
  const forms = recent.form ?? [];
  const filingDates = recent.filingDate ?? [];
  const reportDates = recent.reportDate ?? [];
  const primaryDocs = recent.primaryDocument ?? [];

  const filings: RecentFiling[] = [];
  for (let i = 0; i < accessionNumbers.length; i += 1) {
    const form = forms[i];
    if (!form || !["3", "4", "5"].includes(form.trim())) {
      continue;
    }
    const accessionNumber = accessionNumbers[i];
    const filingDate = filingDates[i] ?? null;
    const reportDate = reportDates[i] ?? undefined;
    const primaryDocument = primaryDocs[i];
    if (!accessionNumber || !primaryDocument) {
      continue;
    }
    filings.push({
      form,
      accessionNumber,
      filingDate: filingDate ?? "",
      reportDate: reportDate ?? undefined,
      primaryDocument,
    });
  }
  return filings;
}

function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function extractValue(node: unknown): string | undefined {
  if (node == null) {
    return undefined;
  }
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return String(node);
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const value = extractValue(item);
      if (value) {
        return value;
      }
    }
    return undefined;
  }
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if ("#text" in record) {
      const value = extractValue(record["#text"]);
      if (value) {
        return value;
      }
    }
    if ("_text" in record) {
      const value = extractValue(record._text);
      if (value) {
        return value;
      }
    }
    if ("value" in record) {
      const value = extractValue(record.value);
      if (value) {
        return value;
      }
    }
    for (const [key, value] of Object.entries(record)) {
      if (key.startsWith("@_")) {
        continue;
      }
      const extracted = extractValue(value);
      if (extracted) {
        return extracted;
      }
    }
  }
  return undefined;
}

function parseOwnershipXml(
  xml: string,
  filing: RecentFiling,
  cik: string
): ParsedTransaction[] {
  const parsed = xmlParser.parse(xml);
  const doc = parsed?.ownershipDocument;
  if (!doc) {
    return [];
  }

  const reportingOwners = ensureArray(doc.reportingOwner).map((owner) => {
    const ownerRecord = owner as Record<string, unknown>;
    const ownerId = ownerRecord.reportingOwnerId as Record<string, unknown>;
    return (
      extractValue(ownerId?.rptOwnerName) ??
      extractValue(ownerRecord.reportingOwnerId) ??
      "Unknown owner"
    );
  });

  const ownerName =
    reportingOwners.filter((name) => Boolean(name)).join(", ") || "Unknown";

  const transactions: ParsedTransaction[] = [];

  const nonDerivative = ensureArray(
    doc.nonDerivativeTable?.nonDerivativeTransaction
  );
  const derivative = ensureArray(doc.derivativeTable?.derivativeTransaction);

  const pushTransactions = (
    items: unknown[],
    isDerivative: boolean
  ): void => {
    items.forEach((entry) => {
      const tx = entry as Record<string, unknown>;
      const transactionAmountsRaw = tx.transactionAmounts;
      const transactionAmountsNode = Array.isArray(transactionAmountsRaw)
        ? transactionAmountsRaw[0]
        : transactionAmountsRaw;
      const transactionAmounts =
        (transactionAmountsNode as TransactionAmounts | undefined) || {};
      const sharesRaw = extractValue(transactionAmounts?.transactionShares);
      const shares = sharesRaw ? Number.parseFloat(sharesRaw) : NaN;
      if (!Number.isFinite(shares) || shares === 0) {
        return;
      }
      const priceRaw = extractValue(
        transactionAmounts?.transactionPricePerShare
      );
      const transactionDateRaw = tx.transactionDate;
      const transactionDate = Array.isArray(transactionDateRaw)
        ? transactionDateRaw[0]
        : transactionDateRaw;
      const date =
        extractValue(transactionDate) ??
        filing.reportDate ??
        filing.filingDate ??
        null;
      const transactionCodingRaw = tx.transactionCoding;
      const transactionCoding = Array.isArray(transactionCodingRaw)
        ? transactionCodingRaw[0]
        : transactionCodingRaw;
      const transactionCode = extractValue(
        (transactionCoding as Record<string, unknown> | undefined)
          ?.transactionCode
      );
      const acquireDisposedNode = tx.transactionAcquiredDisposedCode as unknown;
      const acquireDisposed =
        extractValue(transactionAmounts.transactionAcquiredDisposedCode) ??
        extractValue(acquireDisposedNode);
      let type: ParsedTransaction["type"] = "other";
      if (acquireDisposed === "A") {
        type = "buy";
      } else if (acquireDisposed === "D") {
        type = "sell";
      } else if (transactionCode === "P") {
        type = "buy";
      } else if (transactionCode === "S") {
        type = "sell";
      }
      const securityTitle = extractValue(
        (tx.securityTitle as Record<string, unknown>)?.value ??
          tx.securityTitle
      );
      transactions.push({
        date,
        insider: ownerName,
        formType: filing.form,
        transactionCode,
        type,
        shares,
        price: priceRaw ? Number.parseFloat(priceRaw) : null,
        securityTitle: securityTitle ?? (isDerivative ? "Derivative" : undefined),
        source: buildFilingDocumentUrl(cik, filing),
      });
    });
  };

  pushTransactions(nonDerivative, false);
  pushTransactions(derivative, true);

  return transactions;
}

function buildFilingDocumentUrl(cik: string, filing: RecentFiling): string {
  const numericCik = String(Number.parseInt(cik, 10));
  const accessionPath = filing.accessionNumber.replace(/-/g, "");
  const cleanedDocument = filing.primaryDocument.replace(/^xslF[^/]+\//i, "");
  return `${SEC_ARCHIVES_URL}/${numericCik}/${accessionPath}/${cleanedDocument}`;
}

async function fetchOwnershipDocument(
  cik: string,
  filing: RecentFiling
): Promise<string | null> {
  const url = buildFilingDocumentUrl(cik, filing);
  try {
    const response = await politeFetch(url, {
      headers: {
        Accept: "application/xml, text/xml, */*",
      },
    });
    return await response.text();
  } catch (error) {
    console.warn(`Failed to fetch ownership document: ${url}`, error);
    return null;
  }
}

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

async function getInsiderTransactions(
  ticker: string
): Promise<InsiderLookupResult | null> {
  const inMemory = transactionsCache.get(ticker);
  if (inMemory && Date.now() - inMemory.timestamp < TRANSACTION_CACHE_MS) {
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
    .slice(0, MAX_FILINGS_TO_PROCESS);
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

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

const TICKER_REGEX = /^[A-Z]{1,5}(\.[A-Z0-9]{1,4})?$/;

app.get("/api/insiders", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error:
        "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const result = await getInsiderTransactions(ticker);
    if (!result) {
      res.status(404).json({ error: `Ticker ${ticker} not found in SEC data.` });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve insider transactions from the SEC.",
    });
  }
});

// ============================================================================
// Portfolio Management API Endpoints
// ============================================================================

/**
 * GET /api/portfolio
 * Get all portfolio stocks with their latest price data and 50DMA
 */
app.get("/api/portfolio", async (_req: Request, res: ExpressResponse) => {
  try {
    const portfolioStocks = await Portfolio.find().sort({ createdAt: -1 }).lean();

    // Enrich each portfolio item with price history data
    const enrichedPortfolio = await Promise.all(
      portfolioStocks.map(async (stock: any) => {
        const summary = await getPriceHistorySummary(stock.ticker);
        const latestPrice = await getLatestStoredPrice(stock.ticker);

        return {
          ...stock,
          priceHistory: {
            priceCount: summary.priceCount,
            oldestDate: summary.oldestDate,
            latestDate: summary.latestDate,
            movingAverage50: summary.movingAverage50,
            latestClose: latestPrice?.close || null,
          },
        };
      })
    );

    res.json({
      success: true,
      count: enrichedPortfolio.length,
      portfolio: enrichedPortfolio,
    });
  } catch (error) {
    console.error("[Portfolio] Error fetching portfolio:", error);
    res.status(500).json({
      error: "Failed to retrieve portfolio",
    });
  }
});

/**
 * POST /api/portfolio
 * Add a new stock to the portfolio and fetch historical prices
 * Body: { ticker, shares, purchasePrice, purchaseDate }
 */
app.post("/api/portfolio", async (req: Request, res: ExpressResponse) => {
  const { ticker, shares, purchasePrice, purchaseDate } = req.body;

  // Validate required fields
  if (!ticker || shares === undefined || !purchasePrice || !purchaseDate) {
    res.status(400).json({
      error: "Missing required fields: ticker, shares, purchasePrice, purchaseDate",
    });
    return;
  }

  const normalizedTicker = ticker.trim().toUpperCase();

  // Validate ticker format
  if (!TICKER_REGEX.test(normalizedTicker)) {
    res.status(400).json({
      error: "Invalid ticker format. Use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  // Validate numeric values
  if (typeof shares !== "number" || shares <= 0) {
    res.status(400).json({
      error: "Shares must be a positive number",
    });
    return;
  }

  if (typeof purchasePrice !== "number" || purchasePrice <= 0) {
    res.status(400).json({
      error: "Purchase price must be a positive number",
    });
    return;
  }

  try {
    // Create portfolio entry
    const portfolioEntry = new Portfolio({
      ticker: normalizedTicker,
      shares,
      purchasePrice,
      purchaseDate: new Date(purchaseDate),
      lastUpdated: new Date(),
    });

    await portfolioEntry.save();

    console.log(`[Portfolio] Added ${normalizedTicker} to portfolio`);

    // Fetch and store 50 days of historical prices in the background
    fetchAndStoreHistoricalPrices(normalizedTicker, 50)
      .then((count) => {
        console.log(`[Portfolio] Stored ${count} historical prices for ${normalizedTicker}`);
      })
      .catch((error) => {
        console.error(`[Portfolio] Failed to fetch historical prices for ${normalizedTicker}:`, error);
      });

    res.status(201).json({
      success: true,
      message: `Successfully added ${normalizedTicker} to portfolio. Historical prices are being fetched.`,
      portfolio: portfolioEntry,
    });
  } catch (error) {
    console.error("[Portfolio] Error adding stock to portfolio:", error);
    res.status(500).json({
      error: "Failed to add stock to portfolio",
    });
  }
});

/**
 * DELETE /api/portfolio/:id
 * Remove a stock from the portfolio
 */
app.delete("/api/portfolio/:id", async (req: Request, res: ExpressResponse) => {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({
      error: "Portfolio entry ID is required",
    });
    return;
  }

  try {
    const result = await Portfolio.findByIdAndDelete(id);

    if (!result) {
      res.status(404).json({
        error: "Portfolio entry not found",
      });
      return;
    }

    console.log(`[Portfolio] Removed ${result.ticker} from portfolio (ID: ${id})`);

    res.json({
      success: true,
      message: `Successfully removed ${result.ticker} from portfolio`,
      removed: result,
    });
  } catch (error) {
    console.error("[Portfolio] Error removing stock from portfolio:", error);
    res.status(500).json({
      error: "Failed to remove stock from portfolio",
    });
  }
});

/**
 * POST /api/portfolio/:ticker/refresh
 * Manually refresh price history for a specific ticker
 */
app.post("/api/portfolio/:ticker/refresh", async (req: Request, res: ExpressResponse) => {
  const { ticker } = req.params;

  if (!ticker) {
    res.status(400).json({
      error: "Ticker is required",
    });
    return;
  }

  const normalizedTicker = ticker.trim().toUpperCase();

  if (!TICKER_REGEX.test(normalizedTicker)) {
    res.status(400).json({
      error: "Invalid ticker format",
    });
    return;
  }

  try {
    // Check if ticker exists in portfolio
    const portfolioEntry = await Portfolio.findOne({ ticker: normalizedTicker });

    if (!portfolioEntry) {
      res.status(404).json({
        error: `${normalizedTicker} not found in portfolio`,
      });
      return;
    }

    // Fetch and store historical prices
    console.log(`[Portfolio] Manually refreshing price history for ${normalizedTicker}`);

    const storedCount = await fetchAndStoreHistoricalPrices(normalizedTicker, 50);

    // Calculate 50DMA
    const movingAverage50 = await calculateMovingAverage(normalizedTicker, 50);

    // Update lastUpdated timestamp
    portfolioEntry.lastUpdated = new Date();
    await portfolioEntry.save();

    // Get summary
    const summary = await getPriceHistorySummary(normalizedTicker);

    res.json({
      success: true,
      message: `Successfully refreshed price history for ${normalizedTicker}`,
      ticker: normalizedTicker,
      storedPrices: storedCount,
      movingAverage50,
      summary,
      lastUpdated: portfolioEntry.lastUpdated,
    });
  } catch (error) {
    console.error(`[Portfolio] Error refreshing prices for ${normalizedTicker}:`, error);

    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    res.status(500).json({
      error: "Failed to refresh price history",
      details: apiError.message || "Unknown error",
    });
  }
});

// ============================================================================
// Stock Data API Endpoints
// ============================================================================

app.get("/api/stock/price", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const price = await getCurrentPrice(ticker);
    res.json(price);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }
    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve stock price from external APIs.",
    });
  }
});

app.get("/api/stock/ownership", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const ownership = await getOwnershipData(ticker);
    res.json(ownership);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }
    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve ownership data from external APIs.",
    });
  }
});

app.get("/api/stock/financials", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const financials = await getFinancialMetrics(ticker);
    res.json(financials);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }
    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve financial metrics from external APIs.",
    });
  }
});

app.get("/api/stock/historical", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();
  const rawDays = (req.query.days as string | undefined) ?? "50";
  const days = parseInt(rawDays, 10);

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  if (isNaN(days) || days < 1 || days > 365) {
    res.status(400).json({
      error: "Invalid days parameter. Must be between 1 and 365.",
    });
    return;
  }

  try {
    const historical = await getHistoricalPrices(ticker, days);
    res.json(historical);
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }
    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }
    console.error(error);
    res.status(502).json({
      error: "Unable to retrieve historical prices from external APIs.",
    });
  }
});

app.get("/api/stock/rate-limits", (_req: Request, res: ExpressResponse) => {
  const status = getRateLimitStatus();
  res.json(status);
});

app.post("/api/stock/clear-cache", (_req: Request, res: ExpressResponse) => {
  clearAllCaches();
  res.json({ success: true, message: "All caches cleared" });
});

// ============================================================================
// CANSLIM Score API Endpoints
// ============================================================================

// GET /api/stock/canslim?ticker=AAPL - Get CANSLIM score (cached or calculate)
app.get("/api/stock/canslim", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    // Get cached score or calculate if not cached/stale (24 hour cache)
    const canslimScore = await getOrCalculateCANSLIMScore(ticker, 24);
    res.json(canslimScore);
  } catch (error) {
    console.error("Error calculating CANSLIM score:", error);
    const apiError = error as ApiError;

    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }

    res.status(502).json({
      error: "Unable to calculate CANSLIM score. Please try again later.",
    });
  }
});

// POST /api/stock/canslim/refresh?ticker=AAPL - Force recalculation of CANSLIM score
app.post("/api/stock/canslim/refresh", async (req: Request, res: ExpressResponse) => {
  const rawTicker = (req.query.ticker as string | undefined) ?? "";
  const ticker = rawTicker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    console.log(`[API] Forcing CANSLIM score refresh for ${ticker}`);
    const canslimScore = await calculateCANSLIMScore(ticker);
    res.json({
      success: true,
      message: "CANSLIM score refreshed successfully",
      data: canslimScore,
    });
  } catch (error) {
    console.error("Error refreshing CANSLIM score:", error);
    const apiError = error as ApiError;

    if (apiError.code === "RATE_LIMIT") {
      res.status(429).json({
        error: apiError.message,
        retryAfter: apiError.retryAfter,
      });
      return;
    }

    if (apiError.code === "NOT_FOUND") {
      res.status(404).json({ error: apiError.message });
      return;
    }

    res.status(502).json({
      error: "Unable to refresh CANSLIM score. Please try again later.",
    });
  }
});

// ============================================================================
// Portfolio CRUD API Endpoints
// ============================================================================

// GET /api/portfolio - List all stocks in portfolio
app.get("/api/portfolio", async (_req: Request, res: ExpressResponse) => {
  try {
    const portfolioItems = await Portfolio.find({}).lean();

    // Fetch current prices and calculate profit/loss for each stock
    const portfolioWithMetrics = await Promise.all(
      portfolioItems.map(async (item) => {
        try {
          const priceData = await getCurrentPrice(item.ticker);
          const currentPrice = priceData.price;
          const profitLoss = (currentPrice - item.purchasePrice) * item.shares;
          const profitLossPercent = ((currentPrice - item.purchasePrice) / item.purchasePrice) * 100;

          return {
            ticker: item.ticker,
            shares: item.shares,
            purchasePrice: item.purchasePrice,
            purchaseDate: item.purchaseDate.toISOString(),
            currentPrice,
            profitLoss: parseFloat(profitLoss.toFixed(2)),
            profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
          };
        } catch (error) {
          // If we can't get current price, return without profit/loss metrics
          return {
            ticker: item.ticker,
            shares: item.shares,
            purchasePrice: item.purchasePrice,
            purchaseDate: item.purchaseDate.toISOString(),
          };
        }
      })
    );

    res.json(portfolioWithMetrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to retrieve portfolio data.",
    });
  }
});

// GET /api/portfolio/:ticker - Get detailed view for one stock
app.get("/api/portfolio/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const portfolioItem = await Portfolio.findOne({ ticker }).lean();

    if (!portfolioItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    try {
      const priceData = await getCurrentPrice(ticker);
      const currentPrice = priceData.price;
      const profitLoss = (currentPrice - portfolioItem.purchasePrice) * portfolioItem.shares;
      const profitLossPercent = ((currentPrice - portfolioItem.purchasePrice) / portfolioItem.purchasePrice) * 100;

      res.json({
        ticker: portfolioItem.ticker,
        shares: portfolioItem.shares,
        purchasePrice: portfolioItem.purchasePrice,
        purchaseDate: portfolioItem.purchaseDate.toISOString(),
        currentPrice,
        profitLoss: parseFloat(profitLoss.toFixed(2)),
        profitLossPercent: parseFloat(profitLossPercent.toFixed(2)),
      });
    } catch (error) {
      // If we can't get current price, return without profit/loss metrics
      res.json({
        ticker: portfolioItem.ticker,
        shares: portfolioItem.shares,
        purchasePrice: portfolioItem.purchasePrice,
        purchaseDate: portfolioItem.purchaseDate.toISOString(),
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to retrieve stock from portfolio.",
    });
  }
});

// POST /api/portfolio - Add stock to portfolio
app.post("/api/portfolio", async (req: Request, res: ExpressResponse) => {
  const { ticker: rawTicker, shares, purchasePrice, purchaseDate } = req.body;

  // Validate required fields
  if (!rawTicker || shares === undefined || purchasePrice === undefined || !purchaseDate) {
    res.status(400).json({
      error: "Missing required fields: ticker, shares, purchasePrice, purchaseDate.",
    });
    return;
  }

  const ticker = rawTicker.trim().toUpperCase();

  // Validate ticker format
  if (!TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker format. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  // Validate positive numbers
  if (typeof shares !== "number" || shares <= 0) {
    res.status(400).json({
      error: "Shares must be a positive number.",
    });
    return;
  }

  if (typeof purchasePrice !== "number" || purchasePrice <= 0) {
    res.status(400).json({
      error: "Purchase price must be a positive number.",
    });
    return;
  }

  // Validate date format
  const date = new Date(purchaseDate);
  if (isNaN(date.getTime())) {
    res.status(400).json({
      error: "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).",
    });
    return;
  }

  try {
    // Check if ticker already exists in portfolio
    const existing = await Portfolio.findOne({ ticker });
    if (existing) {
      res.status(409).json({
        error: `Stock ${ticker} already exists in portfolio. Use PUT to update.`,
      });
      return;
    }

    // Create new portfolio entry
    const newPortfolioItem = new Portfolio({
      ticker,
      shares,
      purchasePrice,
      purchaseDate: date,
    });

    await newPortfolioItem.save();

    res.status(201).json({
      ticker: newPortfolioItem.ticker,
      shares: newPortfolioItem.shares,
      purchasePrice: newPortfolioItem.purchasePrice,
      purchaseDate: newPortfolioItem.purchaseDate.toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to add stock to portfolio.",
    });
  }
});

// PUT /api/portfolio/:ticker - Update stock (shares, purchase price)
app.put("/api/portfolio/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();
  const { shares, purchasePrice, purchaseDate } = req.body;

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  // Build update object with only provided fields
  const updateFields: any = {};

  if (shares !== undefined) {
    if (typeof shares !== "number" || shares <= 0) {
      res.status(400).json({
        error: "Shares must be a positive number.",
      });
      return;
    }
    updateFields.shares = shares;
  }

  if (purchasePrice !== undefined) {
    if (typeof purchasePrice !== "number" || purchasePrice <= 0) {
      res.status(400).json({
        error: "Purchase price must be a positive number.",
      });
      return;
    }
    updateFields.purchasePrice = purchasePrice;
  }

  if (purchaseDate !== undefined) {
    const date = new Date(purchaseDate);
    if (isNaN(date.getTime())) {
      res.status(400).json({
        error: "Invalid purchase date. Please use ISO date format (YYYY-MM-DD).",
      });
      return;
    }
    updateFields.purchaseDate = date;
  }

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    res.status(400).json({
      error: "No fields to update. Provide shares, purchasePrice, or purchaseDate.",
    });
    return;
  }

  try {
    const updatedItem = await Portfolio.findOneAndUpdate(
      { ticker },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    res.json({
      ticker: updatedItem.ticker,
      shares: updatedItem.shares,
      purchasePrice: updatedItem.purchasePrice,
      purchaseDate: updatedItem.purchaseDate.toISOString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to update stock in portfolio.",
    });
  }
});

// DELETE /api/portfolio/:ticker - Remove stock from portfolio
app.delete("/api/portfolio/:ticker", async (req: Request, res: ExpressResponse) => {
  const ticker = req.params.ticker.trim().toUpperCase();

  if (!ticker || !TICKER_REGEX.test(ticker)) {
    res.status(400).json({
      error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
    });
    return;
  }

  try {
    const deletedItem = await Portfolio.findOneAndDelete({ ticker });

    if (!deletedItem) {
      res.status(404).json({
        error: `Stock ${ticker} not found in portfolio.`,
      });
      return;
    }

    res.json({
      message: `Stock ${ticker} removed from portfolio.`,
      ticker: deletedItem.ticker,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to remove stock from portfolio.",
    });
  }
});

// ============================================================================

// Connect to MongoDB and start server
connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Stock API listening on port ${PORT}`);
      console.log(`Available endpoints: /api/stock/*, /api/portfolio, /api/insiders`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB. Server not started:", error);
    process.exit(1);
  });
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
