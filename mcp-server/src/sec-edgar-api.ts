/**
 * SEC EDGAR API Client
 * Provides access to SEC EDGAR database for financial data
 */

import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

const SEC_BASE_URL = 'https://data.sec.gov';
const SEC_API_URL = 'https://efts.sec.gov/LATEST';

// User agent required by SEC API
const USER_AGENT = 'stocks-insider mcp-server/1.0.0 (contact@example.com)';

export interface CompanyInfo {
  cik: string;
  name: string;
  ticker?: string;
  sic?: string;
  sicDescription?: string;
}

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate?: string;
  acceptanceDateTime: string;
  form: string;
  size: string;
  isXBRL: boolean;
  isInlineXBRL: boolean;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface FinancialStatement {
  concept: string;
  label: string;
  unit: string;
  value: number | string;
  period: string;
  frame?: string;
}

/**
 * Search for company by ticker or name
 */
export async function searchCompany(query: string): Promise<CompanyInfo[]> {
  try {
    // First try to get the company tickers file
    const tickersUrl = `https://www.sec.gov/files/company_tickers.json`;
    const response = await fetch(tickersUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const tickersData = await response.json() as Record<string, any>;
    
    const results: CompanyInfo[] = [];
    const searchTerm = query.toLowerCase();

    // Search through the tickers data
    for (const [key, company] of Object.entries(tickersData)) {
      if (typeof company === 'object' && company !== null) {
        const ticker = company.ticker?.toString().toLowerCase();
        const name = company.title?.toString().toLowerCase();
        const cik = company.cik_str?.toString().padStart(10, '0');

        if ((ticker && ticker === searchTerm) || 
            (name && name.includes(searchTerm)) ||
            (ticker && ticker.includes(searchTerm))) {
          results.push({
            cik: cik || '',
            name: company.title || '',
            ticker: company.ticker || ''
          });
        }
      }
    }

    return results.slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('Error searching company:', error);
    throw new Error(`Failed to search company: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get company filings by CIK
 */
export async function getFilings(
  cik: string, 
  form?: string, 
  count: number = 10
): Promise<Filing[]> {
  try {
    // Normalize CIK to 10 digits
    const normalizedCik = cik.padStart(10, '0');
    
    const url = `${SEC_BASE_URL}/submissions/CIK${normalizedCik}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const filings = data.filings?.recent;

    if (!filings) {
      return [];
    }

    const results: Filing[] = [];
    const maxCount = Math.min(count, filings.accessionNumber?.length || 0);

    for (let i = 0; i < maxCount; i++) {
      const formType = filings.form?.[i];
      
      // Filter by form type if specified
      if (form && formType !== form) {
        continue;
      }

      results.push({
        accessionNumber: filings.accessionNumber[i] || '',
        filingDate: filings.filingDate[i] || '',
        reportDate: filings.reportDate[i] || '',
        acceptanceDateTime: filings.acceptanceDateTime[i] || '',
        form: formType || '',
        size: filings.size[i]?.toString() || '',
        isXBRL: Boolean(filings.isXBRL[i]),
        isInlineXBRL: Boolean(filings.isInlineXBRL[i]),
        primaryDocument: filings.primaryDocument[i] || '',
        primaryDocDescription: filings.primaryDocDescription[i] || ''
      });
    }

    return results;
  } catch (error) {
    console.error('Error getting filings:', error);
    throw new Error(`Failed to get filings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get company facts (standardized financial data)
 */
export async function getCompanyFacts(cik: string): Promise<any> {
  try {
    const normalizedCik = cik.padStart(10, '0');
    const url = `${SEC_BASE_URL}/api/xbrl/companyfacts/CIK${normalizedCik}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting company facts:', error);
    throw new Error(`Failed to get company facts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract financial statements from XBRL filing
 */
export async function getFinancialStatements(
  cik: string, 
  accessionNumber: string
): Promise<FinancialStatement[]> {
  try {
    const normalizedCik = cik.padStart(10, '0');
    // Remove hyphens from accession number
    const normalizedAccession = accessionNumber.replace(/-/g, '');
    
    // Try to get the XBRL instance document
    const url = `${SEC_BASE_URL}/Archives/edgar/data/${parseInt(cik)}/${normalizedAccession}/`;
    
    // This is a simplified implementation - in practice you'd need to:
    // 1. Get the filing index
    // 2. Find the XBRL instance document
    // 3. Parse the XBRL to extract financial data
    
    // For now, return company facts as a fallback
    const facts = await getCompanyFacts(cik);
    
    const statements: FinancialStatement[] = [];
    
    // Extract key financial metrics from company facts
    if (facts?.facts) {
      const usgaap = facts.facts['us-gaap'] || {};
      const dei = facts.facts['dei'] || {};
      
      // Common financial statement items
      const commonConcepts = [
        'Revenues',
        'RevenueFromContractWithCustomerExcludingAssessedTax',
        'NetIncomeLoss',
        'EarningsPerShareBasic',
        'EarningsPerShareDiluted',
        'Assets',
        'AssetsCurrent',
        'Liabilities',
        'LiabilitiesCurrent',
        'StockholdersEquity',
        'CashAndCashEquivalentsAtCarryingValue',
        'OperatingIncomeLoss',
        'InterestExpense',
        'IncomeTaxExpenseBenefit'
      ];
      
      for (const concept of commonConcepts) {
        const conceptData = usgaap[concept];
        if (conceptData?.units?.USD) {
          const latestData = conceptData.units.USD[conceptData.units.USD.length - 1];
          if (latestData) {
            statements.push({
              concept: concept,
              label: conceptData.label || concept,
              unit: 'USD',
              value: latestData.val,
              period: latestData.end || latestData.period || '',
              frame: latestData.frame
            });
          }
        }
      }
    }
    
    return statements;
  } catch (error) {
    console.error('Error getting financial statements:', error);
    throw new Error(`Failed to get financial statements: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}