/**
 * SEC EDGAR XBRL API Client
 * Fetches company facts from the SEC EDGAR database
 */

import { politeFetch } from "./utils.js";
import { SEC_CONFIG } from "../../constants.js";

export interface CompanyFactsResponse {
  cik: string;
  entityName: string;
  facts: {
    [taxonomy: string]: {
      [tag: string]: {
        label: string;
        description: string;
        units: {
          [unit: string]: Array<{
            start?: string;
            end: string;
            val: number;
            accn: string;
            fy: number;
            fp: string;
            form: string;
            filed: string;
            frame?: string;
          }>;
        };
      };
    };
  };
}

/**
 * Fetch company facts from SEC EDGAR API
 * @param cik - 10-digit CIK with leading zeros
 * @returns Company facts data
 */
export async function fetchCompanyFacts(cik: string): Promise<CompanyFactsResponse> {
  const url = `${SEC_CONFIG.EDGAR_API_BASE}/companyfacts/CIK${cik}.json`;

  console.log(`[SEC EDGAR] Fetching company facts for CIK ${cik}...`);

  const response = await politeFetch(url);

  if (!response.ok) {
    throw new Error(`SEC EDGAR API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as CompanyFactsResponse;
  console.log(`[SEC EDGAR] Successfully fetched company facts for ${data.entityName}`);

  return data;
}

/**
 * Fetch a specific concept for a company
 * @param cik - 10-digit CIK with leading zeros
 * @param taxonomy - XBRL taxonomy (e.g., 'us-gaap', 'dei')
 * @param tag - Concept tag (e.g., 'Assets', 'Revenues')
 * @returns Company concept data
 */
export async function fetchCompanyConcept(
  cik: string,
  taxonomy: string,
  tag: string
): Promise<any> {
  const url = `${SEC_CONFIG.EDGAR_API_BASE}/companyconcept/CIK${cik}/${taxonomy}/${tag}.json`;

  console.log(`[SEC EDGAR] Fetching ${taxonomy}:${tag} for CIK ${cik}...`);

  const response = await politeFetch(url);

  if (!response.ok) {
    throw new Error(`SEC EDGAR API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
