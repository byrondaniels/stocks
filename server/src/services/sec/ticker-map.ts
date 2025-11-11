/**
 * SEC Ticker to CIK mapping service
 * Now uses MongoDB for caching instead of just in-memory
 */

import { politeFetch } from "./utils.js";
import { SEC_CONFIG } from "../../constants.js";
import { SECCompanyTicker } from "../../db/models/index.js";

export interface TickerInfo {
  cik: string;
  companyName: string;
}

let tickerMapPromise: Promise<Map<string, string>> | null = null;
let tickerInfoMapPromise: Promise<Map<string, TickerInfo>> | null = null;

/**
 * Fetch ticker data from SEC API and store in database
 */
async function fetchAndStoreTickerData(): Promise<void> {
  console.log("[SEC Ticker] Fetching data from SEC API...");
  const response = await politeFetch(SEC_CONFIG.TICKER_URL);
  const payload = (await response.json()) as Record<
    string,
    { ticker: string; cik_str: number; title: string }
  >;

  // Prepare bulk operations for efficient insertion
  const bulkOps = Object.values(payload).map(({ ticker, cik_str, title }) => ({
    updateOne: {
      filter: { ticker: ticker.toUpperCase() },
      update: {
        $set: {
          ticker: ticker.toUpperCase(),
          cik: cik_str.toString().padStart(10, "0"),
          companyName: title,
          fetchedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  // Perform bulk write operation
  await SECCompanyTicker.bulkWrite(bulkOps);
  console.log(`[SEC Ticker] Stored ${bulkOps.length} tickers in database`);
}

export async function loadTickerMap(): Promise<Map<string, string>> {
  if (!tickerMapPromise) {
    tickerMapPromise = (async () => {
      // Check database first
      const count = await SECCompanyTicker.countDocuments();

      if (count === 0) {
        // Database is empty, fetch from API
        await fetchAndStoreTickerData();
      }

      // Load from database
      const tickers = await SECCompanyTicker.find({}, { ticker: 1, cik: 1, _id: 0 });
      const map = new Map<string, string>();

      tickers.forEach((doc: { ticker: string; cik: string }) => {
        map.set(doc.ticker, doc.cik);
      });

      console.log(`[SEC Ticker] Loaded ${map.size} tickers from database`);
      return map;
    })();
  }
  return tickerMapPromise;
}

export async function loadTickerInfoMap(): Promise<Map<string, TickerInfo>> {
  if (!tickerInfoMapPromise) {
    tickerInfoMapPromise = (async () => {
      // Check database first
      const count = await SECCompanyTicker.countDocuments();

      if (count === 0) {
        // Database is empty, fetch from API
        await fetchAndStoreTickerData();
      }

      // Load from database
      const tickers = await SECCompanyTicker.find({}, { ticker: 1, cik: 1, companyName: 1, _id: 0 });
      const map = new Map<string, TickerInfo>();

      tickers.forEach((doc: { ticker: string; cik: string; companyName: string }) => {
        map.set(doc.ticker, { cik: doc.cik, companyName: doc.companyName });
      });

      console.log(`[SEC Ticker] Loaded ${map.size} ticker info records from database`);
      return map;
    })();
  }
  return tickerInfoMapPromise;
}

export async function getCompanyName(ticker: string): Promise<string | null> {
  const map = await loadTickerInfoMap();
  const info = map.get(ticker.toUpperCase());
  return info?.companyName ?? null;
}
