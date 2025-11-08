import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { XMLParser } from "fast-xml-parser";
const PORT = process.env.PORT || 3001;
const SEC_TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_URL = "https://data.sec.gov/submissions/";
const SEC_ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data";
const USER_AGENT = process.env.SEC_USER_AGENT ||
    "stocks-insider-poc/1.0 (byrondaniels@gmail.com)";
const MIN_REQUEST_INTERVAL_MS = 250; // politeness delay between SEC requests
const SUBMISSION_CACHE_MS = 15 * 60 * 1000;
const TRANSACTION_CACHE_MS = 5 * 60 * 1000;
const PERSISTED_CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_FILINGS_TO_PROCESS = 3;
let lastRequestTime = 0;
let tickerMapPromise = null;
const submissionCache = new Map();
const transactionsCache = new Map();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, "../data/insiders.json");
const defaultDbData = { insiders: {} };
const dbPromise = (async () => {
    const adapter = new JSONFile(DB_PATH);
    const db = new Low(adapter, defaultDbData);
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
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function politeFetch(url, init = {}) {
    const timeSinceLast = Date.now() - lastRequestTime;
    if (timeSinceLast < MIN_REQUEST_INTERVAL_MS) {
        await delay(MIN_REQUEST_INTERVAL_MS - timeSinceLast);
    }
    lastRequestTime = Date.now();
    const headers = {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...init.headers,
    };
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
        throw new Error(`SEC request failed (${response.status} ${response.statusText})`);
    }
    return response;
}
async function loadTickerMap() {
    if (!tickerMapPromise) {
        tickerMapPromise = (async () => {
            const response = await politeFetch(SEC_TICKER_URL);
            const payload = (await response.json());
            const map = new Map();
            Object.values(payload).forEach(({ ticker, cik_str }) => {
                map.set(ticker.toUpperCase(), cik_str.toString().padStart(10, "0"));
            });
            return map;
        })();
    }
    return tickerMapPromise;
}
async function fetchCompanySubmissions(cik) {
    const cached = submissionCache.get(cik);
    if (cached && Date.now() - cached.timestamp < SUBMISSION_CACHE_MS) {
        return cached.data;
    }
    const url = `${SEC_SUBMISSIONS_URL}CIK${cik}.json`;
    const response = await politeFetch(url);
    const data = (await response.json());
    submissionCache.set(cik, { timestamp: Date.now(), data });
    return data;
}
function normalizeRecentFilings(data) {
    const recent = data.filings?.recent;
    if (!recent) {
        return [];
    }
    const accessionNumbers = recent.accessionNumber ?? [];
    const forms = recent.form ?? [];
    const filingDates = recent.filingDate ?? [];
    const reportDates = recent.reportDate ?? [];
    const primaryDocs = recent.primaryDocument ?? [];
    const filings = [];
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
function ensureArray(value) {
    if (!value) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
function extractValue(node) {
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
        const record = node;
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
function parseOwnershipXml(xml, filing, cik) {
    const parsed = xmlParser.parse(xml);
    const doc = parsed?.ownershipDocument;
    if (!doc) {
        return [];
    }
    const reportingOwners = ensureArray(doc.reportingOwner).map((owner) => {
        const ownerRecord = owner;
        const ownerId = ownerRecord.reportingOwnerId;
        return (extractValue(ownerId?.rptOwnerName) ??
            extractValue(ownerRecord.reportingOwnerId) ??
            "Unknown owner");
    });
    const ownerName = reportingOwners.filter((name) => Boolean(name)).join(", ") || "Unknown";
    const transactions = [];
    const nonDerivative = ensureArray(doc.nonDerivativeTable?.nonDerivativeTransaction);
    const derivative = ensureArray(doc.derivativeTable?.derivativeTransaction);
    const pushTransactions = (items, isDerivative) => {
        items.forEach((entry) => {
            const tx = entry;
            const transactionAmountsRaw = tx.transactionAmounts;
            const transactionAmountsNode = Array.isArray(transactionAmountsRaw)
                ? transactionAmountsRaw[0]
                : transactionAmountsRaw;
            const transactionAmounts = transactionAmountsNode || {};
            const sharesRaw = extractValue(transactionAmounts?.transactionShares);
            const shares = sharesRaw ? Number.parseFloat(sharesRaw) : NaN;
            if (!Number.isFinite(shares) || shares === 0) {
                return;
            }
            const priceRaw = extractValue(transactionAmounts?.transactionPricePerShare);
            const transactionDateRaw = tx.transactionDate;
            const transactionDate = Array.isArray(transactionDateRaw)
                ? transactionDateRaw[0]
                : transactionDateRaw;
            const date = extractValue(transactionDate) ??
                filing.reportDate ??
                filing.filingDate ??
                null;
            const transactionCodingRaw = tx.transactionCoding;
            const transactionCoding = Array.isArray(transactionCodingRaw)
                ? transactionCodingRaw[0]
                : transactionCodingRaw;
            const transactionCode = extractValue(transactionCoding
                ?.transactionCode);
            const acquireDisposedNode = tx.transactionAcquiredDisposedCode;
            const acquireDisposed = extractValue(transactionAmounts.transactionAcquiredDisposedCode) ??
                extractValue(acquireDisposedNode);
            let type = "other";
            if (acquireDisposed === "A") {
                type = "buy";
            }
            else if (acquireDisposed === "D") {
                type = "sell";
            }
            else if (transactionCode === "P") {
                type = "buy";
            }
            else if (transactionCode === "S") {
                type = "sell";
            }
            const securityTitle = extractValue(tx.securityTitle?.value ??
                tx.securityTitle);
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
function buildFilingDocumentUrl(cik, filing) {
    const numericCik = String(Number.parseInt(cik, 10));
    const accessionPath = filing.accessionNumber.replace(/-/g, "");
    return `${SEC_ARCHIVES_URL}/${numericCik}/${accessionPath}/${filing.primaryDocument}`;
}
async function fetchOwnershipDocument(cik, filing) {
    const url = buildFilingDocumentUrl(cik, filing);
    try {
        const response = await politeFetch(url, {
            headers: {
                Accept: "application/xml, text/xml, */*",
            },
        });
        return await response.text();
    }
    catch (error) {
        console.warn(`Failed to fetch ownership document: ${url}`, error);
        return null;
    }
}
function summarizeTransactions(transactions) {
    return transactions.reduce((acc, tx) => {
        if (tx.type === "buy") {
            acc.totalBuyShares += tx.shares;
        }
        else if (tx.type === "sell") {
            acc.totalSellShares += tx.shares;
        }
        acc.netShares = acc.totalBuyShares - acc.totalSellShares;
        return acc;
    }, { totalBuyShares: 0, totalSellShares: 0, netShares: 0 });
}
async function getInsiderTransactions(ticker) {
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
    const transactions = [];
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
    const result = {
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
app.get("/api/insiders", async (req, res) => {
    const rawTicker = req.query.ticker ?? "";
    const ticker = rawTicker.trim().toUpperCase();
    if (!ticker || !TICKER_REGEX.test(ticker)) {
        res.status(400).json({
            error: "Invalid ticker. Please use 1-5 uppercase letters with optional .suffix.",
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
    }
    catch (error) {
        console.error(error);
        res.status(502).json({
            error: "Unable to retrieve insider transactions from the SEC.",
        });
    }
});
app.listen(PORT, () => {
    console.log(`Insider transactions API listening on port ${PORT}`);
});
async function readStoredInsider(ticker) {
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
        return payload;
    }
    catch (error) {
        console.warn(`[DB] Failed to read cached insider data for ${ticker}`, error);
        return null;
    }
}
async function writeStoredInsider(ticker, record) {
    try {
        const db = await dbPromise;
        if (!db.data) {
            db.data = { insiders: {} };
        }
        db.data.insiders[ticker] = { ...record, cachedAt: Date.now() };
        await db.write();
    }
    catch (error) {
        console.warn(`[DB] Failed to persist insider data for ${ticker}`, error);
    }
}
