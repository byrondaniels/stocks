/**
 * SEC Company Submissions service
 */

import { politeFetch } from "./utils.js";
import { CompanySubmissions, RecentFiling } from "./types.js";
import { SEC_CONFIG } from "../../constants.js";

const submissionCache = new Map<
  string,
  { timestamp: number; data: CompanySubmissions }
>();

export async function fetchCompanySubmissions(
  cik: string
): Promise<CompanySubmissions> {
  const cached = submissionCache.get(cik);
  if (cached && Date.now() - cached.timestamp < SEC_CONFIG.SUBMISSION_CACHE_MS) {
    return cached.data;
  }
  const url = `${SEC_CONFIG.SUBMISSIONS_URL}CIK${cik}.json`;
  const response = await politeFetch(url);
  const data = (await response.json()) as CompanySubmissions;
  submissionCache.set(cik, { timestamp: Date.now(), data });
  return data;
}

export function normalizeRecentFilings(
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
