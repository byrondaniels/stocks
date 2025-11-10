/**
 * SEC Ticker to CIK mapping service
 */

import { politeFetch } from "./utils.js";
import { SEC_CONFIG } from "../../constants.js";

export interface TickerInfo {
  cik: string;
  companyName: string;
}

let tickerMapPromise: Promise<Map<string, string>> | null = null;
let tickerInfoMapPromise: Promise<Map<string, TickerInfo>> | null = null;

export async function loadTickerMap(): Promise<Map<string, string>> {
  if (!tickerMapPromise) {
    tickerMapPromise = (async () => {
      const response = await politeFetch(SEC_CONFIG.TICKER_URL);
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

export async function loadTickerInfoMap(): Promise<Map<string, TickerInfo>> {
  if (!tickerInfoMapPromise) {
    tickerInfoMapPromise = (async () => {
      const response = await politeFetch(SEC_CONFIG.TICKER_URL);
      const payload = (await response.json()) as Record<
        string,
        { ticker: string; cik_str: number; title: string }
      >;
      const map = new Map<string, TickerInfo>();
      Object.values(payload).forEach(({ ticker, cik_str, title }) => {
        map.set(ticker.toUpperCase(), {
          cik: cik_str.toString().padStart(10, "0"),
          companyName: title
        });
      });
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
