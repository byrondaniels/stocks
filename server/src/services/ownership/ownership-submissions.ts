/**
 * SEC Ownership Filings Submissions Service
 * Fetches 13D/13G and 13F filings for ownership analysis
 */

import { fetchCompanySubmissions } from "../sec/submissions.js";
import { BeneficialOwnershipFiling, InstitutionalFiling } from "./types.js";
import { CompanySubmissions } from "../sec/types.js";

/**
 * Extract 13D/13G filings from company submissions
 */
export function extract13DGFilings(
  data: CompanySubmissions,
  maxFilings: number = 5
): BeneficialOwnershipFiling[] {
  const recent = data.filings?.recent;
  if (!recent) {
    return [];
  }

  const accessionNumbers = recent.accessionNumber ?? [];
  const forms = recent.form ?? [];
  const filingDates = recent.filingDate ?? [];
  const reportDates = recent.reportDate ?? [];
  const primaryDocs = recent.primaryDocument ?? [];

  const filings: BeneficialOwnershipFiling[] = [];

  for (let i = 0; i < accessionNumbers.length && filings.length < maxFilings; i += 1) {
    const form = forms[i]?.trim();

    // Look for 13D/13G forms and their amendments
    if (!form || !["SC 13D", "SC 13G", "SC 13D/A", "SC 13G/A"].includes(form)) {
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
      accessionNumber,
      formType: form,
      filingDate: filingDate ?? "",
      reportDate: reportDate ?? undefined,
      primaryDocument,
    });
  }

  return filings;
}

/**
 * Extract 13F filings from company submissions
 * Note: 13F filings are filed by institutional managers, not the company itself
 * This function is provided for completeness but typically you'd search by manager CIK
 */
export function extract13FFilings(
  data: CompanySubmissions,
  maxFilings: number = 5
): InstitutionalFiling[] {
  const recent = data.filings?.recent;
  if (!recent) {
    return [];
  }

  const accessionNumbers = recent.accessionNumber ?? [];
  const forms = recent.form ?? [];
  const filingDates = recent.filingDate ?? [];
  const reportDates = recent.reportDate ?? [];
  const primaryDocs = recent.primaryDocument ?? [];

  const filings: InstitutionalFiling[] = [];

  for (let i = 0; i < accessionNumbers.length && filings.length < maxFilings; i += 1) {
    const form = forms[i]?.trim();

    // Look for 13F forms
    if (!form || !["13F-HR", "13F-HR/A", "13F-NT", "13F-NT/A"].includes(form)) {
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
      accessionNumber,
      formType: form,
      filingDate: filingDate ?? "",
      reportingPeriod: reportDate ?? undefined,
      primaryDocument,
    });
  }

  return filings;
}

/**
 * Get beneficial ownership filings (13D/13G) for a company
 */
export async function getBeneficialOwnershipFilings(
  cik: string,
  maxFilings: number = 5
): Promise<BeneficialOwnershipFiling[]> {
  try {
    const submissions = await fetchCompanySubmissions(cik);
    return extract13DGFilings(submissions, maxFilings);
  } catch (error) {
    console.error(`Error fetching 13D/13G filings for CIK ${cik}:`, error);
    return [];
  }
}

/**
 * Get institutional holdings filings (13F) for a manager
 * Note: This would typically be called with an institutional manager's CIK
 */
export async function getInstitutionalFilings(
  managerCik: string,
  maxFilings: number = 5
): Promise<InstitutionalFiling[]> {
  try {
    const submissions = await fetchCompanySubmissions(managerCik);
    return extract13FFilings(submissions, maxFilings);
  } catch (error) {
    console.error(`Error fetching 13F filings for CIK ${managerCik}:`, error);
    return [];
  }
}
