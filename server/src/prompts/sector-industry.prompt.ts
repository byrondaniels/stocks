/**
 * Sector and Industry Classification Prompt Template
 */

export function buildSectorIndustryPrompt(ticker: string): string {
  return `You are a financial data expert. Identify the sector and industry for the stock ticker: ${ticker.toUpperCase()}

**Task:** Determine the broad sector and MOST SPECIFIC industry for this company.

**Sector Options (choose one):**
- Technology
- Health Care (or Healthcare)
- Financials (or Financial Services)
- Consumer Discretionary (or Consumer Cyclical)
- Consumer Staples (or Consumer Defensive)
- Energy
- Industrials
- Materials (or Basic Materials)
- Utilities
- Real Estate
- Communication Services (or Communication, Telecommunications)

**Industry Options (BE AS SPECIFIC AS POSSIBLE - choose the most specific match):**

Technology Industries:
- Semiconductors (or Semiconductor) → maps to SOXX
- Software (or Software - Application, Software - Infrastructure) → maps to IGV
- (or use broader "Technology" → maps to XLK)

Health Care Industries:
- Biotechnology (or Biotech) → maps to XBI
- Medical Devices (or Medical Devices & Instruments) → maps to IHI
- Pharmaceuticals (or Drug Manufacturers, Drug Manufacturers - General, Drug Manufacturers - Specialty & Generic) → maps to IHE
- Healthcare Providers (or Healthcare Plans, Medical Care Facilities) → maps to IHF
- (or use broader "Health Care" → maps to XLV)

Financial Industries:
- Regional Banks (or Banks - Regional) → maps to KRE
- Insurance (or Insurance - Diversified, Insurance - Life, Insurance - Property & Casualty) → maps to IAK
- Financial Services (or Capital Markets, Asset Management) → maps to IYG
- (or use broader "Financials" → maps to XLF)

Consumer Discretionary Industries:
- Retail (or Retail - Apparel & Specialty, Retail - Cyclical) → maps to XRT
- Homebuilders (or Residential Construction, Home Builders, Homebuilding) → maps to ITB or XHB
- (or use broader "Consumer Discretionary" → maps to XLY)

Energy Industries:
- Oil & Gas E&P (or Oil & Gas Exploration & Production, Oil & Gas Exploration) → maps to XOP
- (or use broader "Energy" → maps to XLE)

Materials Industries:
- Metals & Mining (or Steel, Copper) → maps to XME
- Gold Miners (or Gold) → maps to GDX
- (or use broader "Materials" → maps to XLB)

Industrials Industries:
- Aerospace & Defense (or Aerospace, Defense) → maps to ITA
- Transportation (or Railroads, Airlines, Trucking) → maps to IYT
- (or use broader "Industrials" → maps to XLI)

Real Estate Industries:
- Residential Real Estate (or REIT - Residential) → maps to REZ
- Mortgage REITs (or REIT - Mortgage) → maps to REM
- (or use broader "Real Estate" → maps to XLRE)

Consumer Staples → maps to XLP
Utilities → maps to XLU
Communication Services → maps to XLC

**IMPORTANT:**
- Choose the MOST SPECIFIC industry that matches (e.g., prefer "Semiconductors" over "Technology")
- Use exact industry names from the list above when possible
- Sector should be one of the 11 broad categories

**Confidence Level:**
- high: Well-known company, clear classification
- medium: Less well-known but identifiable
- low: Uncertain or unknown ticker

**Response Format (MUST be valid JSON):**
{
  "sector": "<broad sector name>",
  "industry": "<most specific industry name from list>",
  "confidence": "<high|medium|low>"
}

Provide ONLY the JSON response, no additional text before or after.`;
}
