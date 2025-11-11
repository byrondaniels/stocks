/**
 * SEC Schedule 13D/13G Parser
 * Parses beneficial ownership filings (>5% ownership)
 */

import { XMLParser } from "fast-xml-parser";
import { politeFetch } from "../sec/utils.js";
import { SEC_CONFIG } from "../../constants.js";
import { Parsed13DG } from "./types.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * Fetch and parse a 13D/13G document
 */
export async function parse13DGDocument(
  cik: string,
  accessionNumber: string,
  primaryDocument: string
): Promise<Parsed13DG | null> {
  try {
    const cleanAccession = accessionNumber.replace(/-/g, "");
    const url = `${SEC_CONFIG.ARCHIVES_URL}/${cik}/${cleanAccession}/${primaryDocument}`;

    const response = await politeFetch(url);
    const text = await response.text();

    // Try XML parsing first
    if (text.includes("<?xml")) {
      return parseXML13DG(text);
    }

    // Try text parsing for plain text filings
    return parseText13DG(text);
  } catch (error) {
    console.error(`Error parsing 13D/13G document: ${error}`);
    return null;
  }
}

/**
 * Parse XML formatted 13D/13G
 */
function parseXML13DG(xmlText: string): Parsed13DG | null {
  try {
    const doc = xmlParser.parse(xmlText);

    // SC 13D/G XML structure varies, try common paths
    const ownershipDocument = doc.ownershipDocument || doc.SC13D || doc.SC13G;
    if (!ownershipDocument) {
      return null;
    }

    const reportingOwner = ownershipDocument.reportingOwner;
    const filerName = extractFilerName(reportingOwner);

    // Extract ownership amounts
    const ownershipData = extractOwnershipData(ownershipDocument);

    if (!filerName || !ownershipData) {
      return null;
    }

    return {
      filerName,
      shares: ownershipData.shares,
      percentOwnership: ownershipData.percentOwnership,
      filingDate: ownershipData.filingDate || new Date().toISOString().split('T')[0],
      formType: ownershipData.formType || 'SC 13G',
      purpose: ownershipData.purpose,
    };
  } catch (error) {
    console.error(`Error parsing XML 13D/G: ${error}`);
    return null;
  }
}

/**
 * Parse text formatted 13D/13G (older filings)
 */
function parseText13DG(text: string): Parsed13DG | null {
  try {
    // Extract filer name
    const filerMatch = text.match(/REPORTING\s+PERSON[:\s]+([^\n]+)/i) ||
                      text.match(/NAME\s+OF\s+REPORTING\s+PERSON[:\s]+([^\n]+)/i) ||
                      text.match(/FILED\s+BY[:\s]+([^\n]+)/i);

    if (!filerMatch) {
      return null;
    }

    const filerName = filerMatch[1].trim();

    // Extract shares owned
    const sharesMatch = text.match(/AGGREGATE\s+AMOUNT\s+BENEFICIALLY\s+OWNED[:\s]+([0-9,]+)/i) ||
                       text.match(/NUMBER\s+OF\s+SHARES[:\s]+([0-9,]+)/i) ||
                       text.match(/SHARES\s+BENEFICIALLY\s+OWNED[:\s]+([0-9,]+)/i);

    const shares = sharesMatch
      ? parseInt(sharesMatch[1].replace(/,/g, ''), 10)
      : 0;

    // Extract percent ownership
    const percentMatch = text.match(/PERCENT\s+OF\s+CLASS[:\s]+([0-9.]+)%?/i) ||
                        text.match(/PERCENTAGE[:\s]+([0-9.]+)%?/i);

    const percentOwnership = percentMatch
      ? parseFloat(percentMatch[1])
      : 0;

    // Extract purpose (for 13D)
    const purposeMatch = text.match(/PURPOSE\s+OF\s+TRANSACTION[:\s]+([^\n]+)/i);
    const purpose = purposeMatch ? purposeMatch[1].trim() : undefined;

    // Determine form type
    const formType = text.includes('SCHEDULE 13D') || text.includes('SC 13D')
      ? '13D'
      : '13G';

    return {
      filerName,
      shares,
      percentOwnership,
      filingDate: new Date().toISOString().split('T')[0],
      formType,
      purpose,
    };
  } catch (error) {
    console.error(`Error parsing text 13D/G: ${error}`);
    return null;
  }
}

/**
 * Extract filer name from reporting owner XML
 */
function extractFilerName(reportingOwner: any): string | null {
  if (!reportingOwner) return null;

  try {
    // Try individual name first
    if (reportingOwner.reportingOwnerId?.rptOwnerName) {
      return reportingOwner.reportingOwnerId.rptOwnerName;
    }

    // Try entity name
    if (reportingOwner.reportingOwnerId?.rptOwnerCik) {
      return `CIK ${reportingOwner.reportingOwnerId.rptOwnerCik}`;
    }

    // Try alternate structures
    if (reportingOwner.name) {
      return reportingOwner.name;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract ownership data from XML document
 */
function extractOwnershipData(doc: any): {
  shares: number;
  percentOwnership: number;
  filingDate?: string;
  formType?: string;
  purpose?: string;
} | null {
  try {
    let shares = 0;
    let percentOwnership = 0;
    let purpose: string | undefined;

    // Try to extract from common paths
    if (doc.aggregateAmount) {
      shares = parseInt(String(doc.aggregateAmount).replace(/,/g, ''), 10) || 0;
    }

    if (doc.percentOfClass) {
      percentOwnership = parseFloat(String(doc.percentOfClass)) || 0;
    }

    if (doc.purposeOfTransaction) {
      purpose = String(doc.purposeOfTransaction);
    }

    const filingDate = doc.signatureDate || doc.filingDate;
    const formType = doc.schemaVersion?.includes('13D') ? '13D' : '13G';

    return {
      shares,
      percentOwnership,
      filingDate,
      formType,
      purpose,
    };
  } catch {
    return null;
  }
}
