import cors from "cors";
import express, { Request, Response as ExpressResponse } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { XMLParser } from "fast-xml-parser";

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

type StoredInsiderRecord = InsiderLookupResult & { cachedAt: number };

type DatabaseSchema = {
  insiders: Record<string, StoredInsiderRecord>;
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../data/insiders.json");

const defaultDbData: DatabaseSchema = { insiders: {} };
const dbPromise = (async () => {
  const adapter = new JSONFile<DatabaseSchema>(DB_PATH);
  const db = new Low<DatabaseSchema>(adapter, defaultDbData);
  await db.read();
  if (!db.data) {
    db.data = { insiders: {} };
    await db.write();
  }
  return db;
})();

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

app.listen(PORT, () => {
  console.log(`Insider transactions API listening on port ${PORT}`);
});
async function readStoredInsider(
  ticker: string
): Promise<InsiderLookupResult | null> {
  try {
    const db = await dbPromise;
    const entry = db.data?.insiders?.[ticker];
    if (!entry) {
      return null;
    }
    if (Date.now() - entry.cachedAt > PERSISTED_CACHE_MS) {
      return null;
    }
    const { cachedAt: _cachedAt, ...payload } = entry;
    return payload as InsiderLookupResult;
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
    const db = await dbPromise;
    if (!db.data) {
      db.data = { insiders: {} };
    }
    db.data.insiders[ticker] = { ...record, cachedAt: Date.now() };
    await db.write();
  } catch (error) {
    console.warn(`[DB] Failed to persist insider data for ${ticker}`, error);
  }
}
