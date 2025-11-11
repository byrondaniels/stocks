/**
 * SEC Form 13F Parser
 * Parses institutional holdings filings
 */

import { XMLParser } from "fast-xml-parser";
import { politeFetch } from "../sec/utils.js";
import { SEC_CONFIG } from "../../constants.js";
import { Parsed13F } from "./types.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseAttributeValue: true,
  parseTagValue: true,
});

/**
 * Fetch and parse a 13F document
 */
export async function parse13FDocument(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): Promise<Parsed13F | null> {
  try {
    const cleanAccession = accessionNumber.replace(/-/g, "");
    const url = `${SEC_CONFIG.ARCHIVES_URL}/${cik}/${cleanAccession}/${primaryDocument}`;

    const response = await politeFetch(url);
    const text = await response.text();

    // Try XML parsing
    if (text.includes("<?xml") || text.includes("<informationTable")) {
      return parseXML13F(text, cik);
    }

    // Try text parsing for older filings
    return parseText13F(text, cik);
  } catch (error) {
    console.error(`Error parsing 13F document: ${error}`);
    return null;
  }
}

/**
 * Parse XML formatted 13F
 */
function parseXML13F(xmlText: string, cik: string): Parsed13F | null {
  try {
    const doc = xmlParser.parse(xmlText);

    // Extract manager name
    const managerName = extractManagerName(doc, cik);

    // Extract reporting period
    const reportingPeriod = extractReportingPeriod(doc);

    // Extract holdings
    const holdings = extractHoldings(doc);

    if (!managerName || holdings.length === 0) {
      return null;
    }

    return {
      managerName,
      holdings,
      reportingPeriod,
      filingDate: new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error(`Error parsing XML 13F: ${error}`);
    return null;
  }
}

/**
 * Parse text formatted 13F
 */
function parseText13F(text: string, cik: string): Parsed13F | null {
  try {
    // Extract manager name
    const managerMatch = text.match(/FILED\s+BY[:\s]+([^\n]+)/i) ||
                        text.match(/INVESTMENT\s+MANAGER[:\s]+([^\n]+)/i) ||
                        text.match(/NAME\s+OF\s+FILING\s+MANAGER[:\s]+([^\n]+)/i);

    const managerName = managerMatch
      ? managerMatch[1].trim()
      : `CIK ${cik}`;

    // Extract reporting period
    const periodMatch = text.match(/REPORT\s+FOR\s+THE\s+CALENDAR\s+YEAR\s+OR\s+QUARTER\s+ENDED[:\s]+([^\n]+)/i);
    const reportingPeriod = periodMatch
      ? periodMatch[1].trim()
      : new Date().toISOString().split('T')[0];

    // Extract holdings (this is simplified - real 13F text parsing is complex)
    const holdings: Array<{
      cusip: string;
      name: string;
      shares: number;
      value: number;
    }> = [];

    // Note: Full text parsing would require more sophisticated regex
    // This is a placeholder for demonstration
    return {
      managerName,
      holdings,
      reportingPeriod,
      filingDate: new Date().toISOString().split('T')[0],
    };
  } catch (error) {
    console.error(`Error parsing text 13F: ${error}`);
    return null;
  }
}

/**
 * Extract manager name from XML document
 */
function extractManagerName(doc: any, fallbackCik: string): string {
  try {
    // Try different paths where manager name might be
    const formData = doc.edgarSubmission?.formData || doc.informationTable;

    if (formData?.coverPage?.filingManager?.name) {
      return formData.coverPage.filingManager.name;
    }

    if (formData?.headerData?.filerInfo?.filerName) {
      return formData.headerData.filerInfo.filerName;
    }

    if (doc.ownershipDocument?.issuer?.issuerName) {
      return doc.ownershipDocument.issuer.issuerName;
    }

    return `CIK ${fallbackCik}`;
  } catch (error) {
    return `CIK ${fallbackCik}`;
  }
}

/**
 * Extract reporting period from XML document
 */
function extractReportingPeriod(doc: any): string {
  try {
    const formData = doc.edgarSubmission?.formData || doc.informationTable;

    if (formData?.coverPage?.reportCalendarOrQuarter) {
      return formData.coverPage.reportCalendarOrQuarter;
    }

    if (formData?.headerData?.periodnOfReport) {
      return formData.headerData.periodnOfReport;
    }

    return new Date().toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Extract holdings from XML document
 */
function extractHoldings(doc: any): Array<{
  cusip: string;
  name: string;
  shares: number;
  value: number;
}> {
  try {
    const holdings: Array<{
      cusip: string;
      name: string;
      shares: number;
      value: number;
    }> = [];

    const formData = doc.edgarSubmission?.formData || doc.informationTable;
    let infoTable = formData?.infoTable || [];

    // Normalize to array
    if (!Array.isArray(infoTable)) {
      infoTable = [infoTable];
    }

    for (const entry of infoTable) {
      try {
        const cusip = String(entry.cusip || '').trim();
        const name = String(entry.nameOfIssuer || entry.issuerName || '').trim();
        const shares = parseInt(String(entry.shrsOrPrnAmt?.sshPrnamt || entry.shares || 0), 10);
        const value = parseInt(String(entry.value || 0), 10);

        if (cusip && name && shares > 0) {
          holdings.push({ cusip, name, shares, value });
        }
      } catch (err) {
        continue;
      }
    }

    return holdings;
  } catch (error) {
    return [];
  }
}

/**
 * Find holdings for a specific ticker/company in 13F data
 */
export function findHoldingsByName(
  parsed13F: Parsed13F,
  companyName: string,
  ticker: string
): {
  shares: number;
  value: number;
} | null {
  // Try to find by exact ticker match first
  const tickerMatch = parsed13F.holdings.find(h =>
    h.name.toUpperCase().includes(ticker.toUpperCase())
  );

  if (tickerMatch) {
    return {
      shares: tickerMatch.shares,
      value: tickerMatch.value,
    };
  }

  // Try to find by company name match
  const nameWords = companyName.toUpperCase().split(/\s+/);
  const nameMatch = parsed13F.holdings.find(h => {
    const holdingName = h.name.toUpperCase();
    return nameWords.some(word => word.length > 3 && holdingName.includes(word));
  });

  if (nameMatch) {
    return {
      shares: nameMatch.shares,
      value: nameMatch.value,
    };
  }

  return null;
}
