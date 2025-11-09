/**
 * Utility functions for SEC API operations
 */

import { SEC_CONFIG } from "../../constants.js";

const USER_AGENT =
  process.env.SEC_USER_AGENT ||
  "stocks-insider-poc/1.0 (byrondaniels@gmail.com)";

let lastRequestTime = 0;

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function politeFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const timeSinceLast = Date.now() - lastRequestTime;
  if (timeSinceLast < SEC_CONFIG.MIN_REQUEST_INTERVAL_MS) {
    await delay(SEC_CONFIG.MIN_REQUEST_INTERVAL_MS - timeSinceLast);
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

export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function extractValue(node: unknown): string | undefined {
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
