/**
 * SEC Ticker to CIK mapping service
 */

import { politeFetch } from "./utils.js";

const SEC_TICKER_URL = "https://www.sec.gov/files/company_tickers.json";

let tickerMapPromise: Promise<Map<string, string>> | null = null;

export async function loadTickerMap(): Promise<Map<string, string>> {
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
