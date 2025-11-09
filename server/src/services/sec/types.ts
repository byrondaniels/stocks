/**
 * SEC API Type Definitions
 */

export type RecentFiling = {
  accessionNumber: string;
  form: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
};

export type ParsedTransaction = {
  date: string | null;
  insider: string;
  formType: string;
  transactionCode?: string;
  type: "buy" | "sell" | "exercise" | "other";
  shares: number;
  price?: number | null;
  securityTitle?: string;
  source: string;
  note?: string;
};

export type Summary = {
  totalBuyShares: number;
  totalSellShares: number;
  netShares: number;
};

export type InsiderLookupResult = {
  ticker: string;
  cik: string;
  summary: Summary;
  transactions: ParsedTransaction[];
};

export type CompanySubmissions = {
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

export type TransactionAmounts = {
  transactionShares?: unknown;
  transactionPricePerShare?: unknown;
  transactionAcquiredDisposedCode?: unknown;
};
