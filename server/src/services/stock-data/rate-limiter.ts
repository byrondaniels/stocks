/**
 * Rate Limiting for API Requests
 */

import { MIN_REQUEST_INTERVAL } from "./config.js";

export type RateLimitState = {
  requests: number[];
  lastRequestTime: number;
};

export const alphaVantageRateLimit: RateLimitState = {
  requests: [],
  lastRequestTime: 0,
};

export const fmpRateLimit: RateLimitState = {
  requests: [],
  lastRequestTime: 0,
};

export function cleanOldRequests(state: RateLimitState): void {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  state.requests = state.requests.filter((time) => time > oneDayAgo);
}

export function canMakeRequest(state: RateLimitState, dailyLimit: number): boolean {
  cleanOldRequests(state);
  return state.requests.length < dailyLimit;
}

export function recordRequest(state: RateLimitState): void {
  state.requests.push(Date.now());
  state.lastRequestTime = Date.now();
}

export async function enforceInterval(state: RateLimitState): Promise<void> {
  const timeSinceLast = Date.now() - state.lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
}

export function getRateLimitStatus(
  alphaLimit: number,
  fmpLimit: number
) {
  cleanOldRequests(alphaVantageRateLimit);
  cleanOldRequests(fmpRateLimit);

  return {
    alphaVantage: {
      used: alphaVantageRateLimit.requests.length,
      limit: alphaLimit,
      remaining: Math.max(
        0,
        alphaLimit - alphaVantageRateLimit.requests.length
      ),
    },
    fmp: {
      used: fmpRateLimit.requests.length,
      limit: fmpLimit,
      remaining: Math.max(0, fmpLimit - fmpRateLimit.requests.length),
    },
  };
}
