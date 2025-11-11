/**
 * SEC Ownership Document Parser
 */

import { XMLParser } from "fast-xml-parser";
import { politeFetch, ensureArray, extractValue } from "./utils.js";
import { ParsedTransaction, RecentFiling, TransactionAmounts } from "./types.js";
import { SEC_CONFIG } from "../../constants.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
});

export function buildFilingDocumentUrl(cik: string, filing: RecentFiling): string {
  const numericCik = String(Number.parseInt(cik, 10));
  const accessionPath = filing.accessionNumber.replace(/-/g, "");
  const cleanedDocument = filing.primaryDocument.replace(/^xslF[^/]+\//i, "");
  return `${SEC_CONFIG.ARCHIVES_URL}/${numericCik}/${accessionPath}/${cleanedDocument}`;
}

export async function fetchOwnershipDocument(
  cik: string,
  filing: RecentFiling
): Promise<string | null> {
  const url = buildFilingDocumentUrl(cik, filing);
  try {
    const response = await politeFetch(url, {
      headers: {
        Accept: "application/xml, text/xml, */*",
      },
    });
    return await response.text();
  } catch (error) {
    console.warn(`Failed to fetch ownership document: ${url}`, error);
    return null;
  }
}

export function parseOwnershipXml(
  xml: string,
  filing: RecentFiling,
  cik: string
): ParsedTransaction[] {
  const parsed = xmlParser.parse(xml);
  const doc = parsed?.ownershipDocument;
  if (!doc) {
    return [];
  }

  const reportingOwners = ensureArray(doc.reportingOwner).map((owner) => {
    const ownerRecord = owner as Record<string, unknown>;
    const ownerId = ownerRecord.reportingOwnerId as Record<string, unknown>;
    return (
      extractValue(ownerId?.rptOwnerName) ??
      extractValue(ownerRecord.reportingOwnerId) ??
      "Unknown owner"
    );
  });

  const ownerName =
    reportingOwners.filter((name) => Boolean(name)).join(", ") || "Unknown";

  // Parse footnotes for later reference
  const footnotes = new Map<string, string>();
  if (doc.footnotes) {
    const footnoteList = ensureArray(doc.footnotes.footnote);
    footnoteList.forEach((footnote) => {
      const footnoteRecord = footnote as Record<string, unknown>;
      const id = footnoteRecord['@_id'] || footnoteRecord.id;
      const text = extractValue(footnoteRecord['#text'] || footnoteRecord);
      if (id && text) {
        footnotes.set(String(id), text);
      }
    });
  }

  const transactions: ParsedTransaction[] = [];

  const nonDerivative = ensureArray(
    doc.nonDerivativeTable?.nonDerivativeTransaction
  );
  const derivative = ensureArray(doc.derivativeTable?.derivativeTransaction);

  const pushTransactions = (
    items: unknown[],
    isDerivative: boolean
  ): void => {
    items.forEach((entry) => {
      const tx = entry as Record<string, unknown>;
      const transactionAmountsRaw = tx.transactionAmounts;
      const transactionAmountsNode = Array.isArray(transactionAmountsRaw)
        ? transactionAmountsRaw[0]
        : transactionAmountsRaw;
      const transactionAmounts =
        (transactionAmountsNode as TransactionAmounts | undefined) || {};
      const sharesRaw = extractValue(transactionAmounts?.transactionShares);
      const shares = sharesRaw ? Number.parseFloat(sharesRaw) : NaN;
      if (!Number.isFinite(shares) || shares === 0) {
        return;
      }
      const priceRaw = extractValue(
        transactionAmounts?.transactionPricePerShare
      );
      const transactionDateRaw = tx.transactionDate;
      const transactionDate = Array.isArray(transactionDateRaw)
        ? transactionDateRaw[0]
        : transactionDateRaw;
      const date =
        extractValue(transactionDate) ??
        filing.reportDate ??
        filing.filingDate ??
        null;
      const transactionCodingRaw = tx.transactionCoding;
      const transactionCoding = Array.isArray(transactionCodingRaw)
        ? transactionCodingRaw[0]
        : transactionCodingRaw;
      const transactionCode = extractValue(
        (transactionCoding as Record<string, unknown> | undefined)
          ?.transactionCode
      );
      const acquireDisposedNode = tx.transactionAcquiredDisposedCode as unknown;
      const acquireDisposed =
        extractValue(transactionAmounts.transactionAcquiredDisposedCode) ??
        extractValue(acquireDisposedNode);

      // Extract footnote references - check multiple locations
      let note: string | undefined;
      
      // Check transaction coding for footnote references
      if (transactionCoding && typeof transactionCoding === 'object') {
        const footnoteId = (transactionCoding as Record<string, unknown>).footnoteId;
        if (footnoteId && typeof footnoteId === 'object') {
          const id = (footnoteId as Record<string, unknown>)['@_id'] || (footnoteId as Record<string, unknown>).id;
          if (id && footnotes.has(String(id))) {
            note = footnotes.get(String(id));
          }
        }
      }

      // Check ownership nature for footnotes (for indirect ownership details)
      if (!note && tx.ownershipNature) {
        const ownershipNature = tx.ownershipNature as Record<string, unknown>;
        const natureOfOwnership = ownershipNature.natureOfOwnership;
        if (natureOfOwnership && typeof natureOfOwnership === 'object') {
          const footnoteId = (natureOfOwnership as Record<string, unknown>).footnoteId;
          if (footnoteId && typeof footnoteId === 'object') {
            const id = (footnoteId as Record<string, unknown>)['@_id'] || (footnoteId as Record<string, unknown>).id;
            if (id && footnotes.has(String(id))) {
              note = footnotes.get(String(id));
            }
          }
        }
      }

      // Determine transaction type
      // Prioritize transaction code over acquire/dispose for accuracy
      let type: ParsedTransaction["type"] = "other";

      if (transactionCode === "M") {
        // M = Exercise or conversion of derivative security
        
        // Skip non-derivative M transactions that are results of derivative conversions
        // These represent the underlying shares acquired from RSU/option exercises
        // which we already show via the derivative transactions themselves
        if (!isDerivative && acquireDisposed === "A") {
          return; // Skip this duplicate transaction
        }
        
        type = "exercise";
      } else if (transactionCode === "F") {
        // F = Payment of exercise price or tax liability
        type = "sell";
      } else if (transactionCode === "S") {
        // S = Open market or private sale
        type = "sell";
      } else if (transactionCode === "P") {
        // P = Open market or private purchase
        type = "buy";
      } else if (transactionCode === "A") {
        // A = Grant, award or other acquisition
        type = "buy";
      } else if (transactionCode === "D") {
        // D = Disposition to the issuer
        type = "sell";
      } else if (transactionCode === "C") {
        // C = Conversion
        type = "other";
      } else if (transactionCode === "G") {
        // G = Gift or transfer
        type = "other";
      } else if (acquireDisposed === "A") {
        // Fallback: acquired
        type = "buy";
      } else if (acquireDisposed === "D") {
        // Fallback: disposed
        type = "sell";
      }
      const securityTitle = extractValue(
        (tx.securityTitle as Record<string, unknown>)?.value ??
          tx.securityTitle
      );
      transactions.push({
        date,
        insider: ownerName,
        formType: filing.form,
        transactionCode,
        type,
        shares,
        price: priceRaw ? Number.parseFloat(priceRaw) : null,
        securityTitle: securityTitle ?? (isDerivative ? "Derivative" : undefined),
        source: `Form ${filing.form}`,
        note,
      });
    });
  };

  pushTransactions(nonDerivative, false);
  pushTransactions(derivative, true);

  return transactions;
}
