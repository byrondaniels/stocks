/**
 * API Request Utilities
 */

import type { ApiError } from "./types.js";

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export function handleApiError(error: unknown, apiName: string): never {
  console.error(`[${apiName}] API error:`, error);

  if (error instanceof Error) {
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      const apiError: ApiError = {
        message: `${apiName} rate limit exceeded`,
        code: 'RATE_LIMIT',
        retryAfter: 86400, // 24 hours
      };
      throw apiError;
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      const apiError: ApiError = {
        message: 'Ticker not found',
        code: 'NOT_FOUND',
      };
      throw apiError;
    }

    if (error.message.includes('Invalid API key') || error.message.includes('401')) {
      const apiError: ApiError = {
        message: `${apiName} API key is invalid or missing`,
        code: 'INVALID_KEY',
      };
      throw apiError;
    }
  }

  const apiError: ApiError = {
    message: `${apiName} API request failed`,
    code: 'API_ERROR',
  };
  throw apiError;
}
