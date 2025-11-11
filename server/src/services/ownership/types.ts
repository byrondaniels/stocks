/**
 * Detailed Ownership Type Definitions
 * Types for aggregated ownership data from free sources (SEC EDGAR)
 */

/**
 * Insider owner from Forms 3, 4, 5
 */
export type InsiderOwner = {
  name: string;
  position?: string;
  shares: number;
  percentOwnership?: number;
  lastTransactionDate?: string;
  source: 'Form 3' | 'Form 4' | 'Form 5';
};

/**
 * Beneficial owner from Schedule 13D/13G (>5% ownership)
 */
export type BeneficialOwner = {
  name: string;
  shares: number;
  percentOwnership: number;
  filingDate: string;
  formType: '13D' | '13G' | 'SC 13D' | 'SC 13G';
  purpose?: string; // Investment purpose or activist intent
  source: 'SEC EDGAR';
};

/**
 * Institutional holder from Form 13F
 */
export type InstitutionalHolder = {
  name: string;
  shares: number;
  value?: number; // Market value in dollars
  percentOwnership?: number;
  filingDate: string;
  reportingPeriod?: string;
  source: 'Form 13F';
};

/**
 * Aggregated ownership breakdown
 */
export type OwnershipBreakdown = {
  insiderShares: number;
  insiderPercent: number;
  institutionalShares: number;
  institutionalPercent: number;
  beneficialShares: number; // >5% beneficial owners
  beneficialPercent: number;
  publicShares: number;
  publicPercent: number;
  floatShares: number; // Shares available for public trading
};

/**
 * Complete detailed ownership data
 */
export type DetailedOwnership = {
  ticker: string;
  companyName?: string;
  sharesOutstanding: number;
  breakdown: OwnershipBreakdown;
  insiders: InsiderOwner[];
  beneficialOwners: BeneficialOwner[];
  institutionalHolders: InstitutionalHolder[];
  topHolders: TopHolder[]; // Combined top holders
  lastUpdated: string;
  dataQuality: {
    hasInsiderData: boolean;
    hasBeneficialOwnerData: boolean;
    hasInstitutionalData: boolean;
    hasSharesOutstanding: boolean;
  };
  source: 'SEC EDGAR';
};

/**
 * Top holder (combined from all sources)
 */
export type TopHolder = {
  name: string;
  shares: number;
  percentOwnership: number;
  type: 'insider' | 'beneficial' | 'institutional';
  source: string;
};

/**
 * Filing information for 13D/13G
 */
export type BeneficialOwnershipFiling = {
  accessionNumber: string;
  formType: string;
  filingDate: string;
  reportDate?: string;
  primaryDocument: string;
};

/**
 * Filing information for 13F
 */
export type InstitutionalFiling = {
  accessionNumber: string;
  formType: string;
  filingDate: string;
  reportingPeriod?: string;
  primaryDocument: string;
};

/**
 * Parsed 13D/13G data
 */
export type Parsed13DG = {
  filerName: string;
  shares: number;
  percentOwnership: number;
  filingDate: string;
  formType: string;
  purpose?: string;
};

/**
 * Parsed 13F data (institutional holdings)
 */
export type Parsed13F = {
  managerName: string;
  holdings: {
    cusip: string;
    name: string;
    shares: number;
    value: number;
  }[];
  reportingPeriod: string;
  filingDate: string;
};
