/**
 * Sector to ETF Mapping
 * Maps sector/industry names to their corresponding ETFs
 */

export interface SectorETFMap {
  [sector: string]: string;
}

/**
 * Primary sector ETF mapping
 * Maps broad market sectors to their primary ETFs
 */
export const SECTOR_TO_ETF: SectorETFMap = {
  'Technology': 'XLK',
  'Health Care': 'XLV',
  'Healthcare': 'XLV', // Alternative spelling
  'Financials': 'XLF',
  'Financial Services': 'XLF', // Alternative
  'Consumer Discretionary': 'XLY',
  'Consumer Cyclical': 'XLY', // Alternative
  'Consumer Staples': 'XLP',
  'Consumer Defensive': 'XLP', // Alternative
  'Energy': 'XLE',
  'Industrials': 'XLI',
  'Materials': 'XLB',
  'Basic Materials': 'XLB', // Alternative
  'Utilities': 'XLU',
  'Real Estate': 'XLRE',
  'Communication Services': 'XLC',
  'Communication': 'XLC', // Alternative
  'Telecommunications': 'XLC', // Alternative
};

/**
 * Industry-specific ETF mapping
 * Maps specific industries to more targeted ETFs when available
 * Falls back to sector ETF if no specific match
 */
export const INDUSTRY_TO_ETF: SectorETFMap = {
  // Technology sub-sectors
  'Semiconductors': 'SOXX',
  'Semiconductor': 'SOXX', // singular
  'Software': 'IGV',
  'Software - Application': 'IGV',
  'Software - Infrastructure': 'IGV',

  // Healthcare sub-sectors
  'Biotechnology': 'XBI',
  'Biotech': 'XBI', // short form
  'Medical Devices': 'IHI',
  'Medical Devices & Instruments': 'IHI',
  'Drug Manufacturers': 'IHE',
  'Pharmaceuticals': 'IHE',
  'Drug Manufacturers - General': 'IHE',
  'Drug Manufacturers - Specialty & Generic': 'IHE',
  'Healthcare Providers': 'IHF',
  'Healthcare Plans': 'IHF',
  'Medical Care Facilities': 'IHF',

  // Financial sub-sectors
  'Regional Banks': 'KRE',
  'Banks - Regional': 'KRE',
  'Insurance': 'IAK',
  'Insurance - Diversified': 'IAK',
  'Insurance - Life': 'IAK',
  'Insurance - Property & Casualty': 'IAK',
  'Financial Services': 'IYG',
  'Capital Markets': 'IYG',
  'Asset Management': 'IYG',

  // Consumer Discretionary sub-sectors
  'Retail': 'XRT',
  'Retail - Apparel & Specialty': 'XRT',
  'Retail - Cyclical': 'XRT',
  'Homebuilders': 'ITB',
  'Residential Construction': 'ITB',
  'Home Builders': 'ITB', // alternative spelling
  'Homebuilding': 'XHB',

  // Energy sub-sectors
  'Oil & Gas E&P': 'XOP',
  'Oil & Gas Exploration & Production': 'XOP',
  'Oil & Gas Exploration': 'XOP',

  // Materials sub-sectors
  'Metals & Mining': 'XME',
  'Steel': 'XME',
  'Copper': 'XME',
  'Gold Miners': 'GDX',
  'Gold': 'GDX',

  // Industrials sub-sectors
  'Aerospace & Defense': 'ITA',
  'Aerospace': 'ITA',
  'Defense': 'ITA',
  'Transportation': 'IYT',
  'Railroads': 'IYT',
  'Airlines': 'IYT',
  'Trucking': 'IYT',

  // Real Estate sub-sectors
  'Residential Real Estate': 'REZ',
  'REIT - Residential': 'REZ',
  'Mortgage REITs': 'REM',
  'REIT - Mortgage': 'REM',
};

/**
 * Get the best matching ETF for a stock based on sector and industry
 * Priority: Industry-specific > Sector-specific > null
 *
 * @param sector - The stock's sector (e.g., "Technology")
 * @param industry - The stock's industry (e.g., "Semiconductors")
 * @returns ETF ticker symbol or null if no match found
 */
export function getETFForStock(sector: string | null, industry: string | null): string | null {
  // Try industry-specific ETF first
  if (industry) {
    const industryETF = INDUSTRY_TO_ETF[industry];
    if (industryETF) {
      return industryETF;
    }
  }

  // Fall back to sector ETF
  if (sector) {
    const sectorETF = SECTOR_TO_ETF[sector];
    if (sectorETF) {
      return sectorETF;
    }
  }

  // No match found
  return null;
}

/**
 * Get a user-friendly description of what ETF was matched and why
 */
export function getETFMatchDescription(
  etf: string | null,
  sector: string | null,
  industry: string | null
): string {
  if (!etf) {
    return 'No sector ETF available';
  }

  // Check if it was an industry match
  if (industry && INDUSTRY_TO_ETF[industry] === etf) {
    return `Industry: ${industry} (${etf})`;
  }

  // Otherwise it's a sector match
  if (sector && SECTOR_TO_ETF[sector] === etf) {
    return `Sector: ${sector} (${etf})`;
  }

  return `${etf}`;
}
