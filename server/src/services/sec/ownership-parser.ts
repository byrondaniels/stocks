/**
 * SEC Ownership Document Parser
 */

import { XMLParser } from "fast-xml-parser";
import { politeFetch, ensureArray, extractValue } from "./utils.js";
import { ParsedTransaction, RecentFiling, TransactionAmounts } from "./types.js";

const SEC_ARCHIVES_URL = "https://www.sec.gov/Archives/edgar/data";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: true,
});

export function buildFilingDocumentUrl(cik: string, filing: RecentFiling): string {
  const numericCik = String(Number.parseInt(cik, 10));
  const accessionPath = filing.accessionNumber.replace(/-/g, "");
  const cleanedDocument = filing.primaryDocument.replace(/^xslF[^/]+\//i, "");
  return `${SEC_ARCHIVES_URL}/${numericCik}/${accessionPath}/${cleanedDocument}`;
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
      let type: ParsedTransaction["type"] = "other";
      if (acquireDisposed === "A") {
        type = "buy";
      } else if (acquireDisposed === "D") {
        type = "sell";
      } else if (transactionCode === "P") {
        type = "buy";
      } else if (transactionCode === "S") {
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
        source: buildFilingDocumentUrl(cik, filing),
      });
    });
  };

  pushTransactions(nonDerivative, false);
  pushTransactions(derivative, true);

  return transactions;
}
