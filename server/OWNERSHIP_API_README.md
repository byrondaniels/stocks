# Detailed Ownership API

This document describes the new ownership endpoints that provide stock ownership data using free SEC EDGAR sources.

## Overview

The Detailed Ownership API aggregates ownership information from multiple SEC filings to provide a comprehensive view of who owns a company's stock. Unlike the existing `/api/stock/ownership` endpoint (which requires a paid FMP subscription), this endpoint uses only free SEC EDGAR data.

## Endpoints

### GET `/api/ownership/detailed`

Returns comprehensive ownership data including all holders and detailed breakdowns.

**Query Parameters:**
- `ticker` (required): Stock ticker symbol (e.g., "AAPL", "TSLA")

**Example Request:**
```
GET /api/ownership/detailed?ticker=AAPL
```

**Response:**
```json
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "sharesOutstanding": 15000000000,
  "breakdown": {
    "insiderShares": 500000000,
    "insiderPercent": 3.33,
    "institutionalShares": 0,
    "institutionalPercent": 0,
    "beneficialShares": 1500000000,
    "beneficialPercent": 10.0,
    "publicShares": 13000000000,
    "publicPercent": 86.67,
    "floatShares": 13000000000
  },
  "insiders": [
    {
      "name": "Tim Cook",
      "shares": 5000000,
      "lastTransactionDate": "2024-03-15",
      "source": "Form 4"
    }
  ],
  "beneficialOwners": [
    {
      "name": "Vanguard Group Inc",
      "shares": 1200000000,
      "percentOwnership": 8.0,
      "filingDate": "2024-02-01",
      "formType": "13G",
      "source": "SEC EDGAR"
    }
  ],
  "institutionalHolders": [],
  "topHolders": [
    {
      "name": "Vanguard Group Inc",
      "shares": 1200000000,
      "percentOwnership": 8.0,
      "type": "beneficial",
      "source": "13G"
    }
  ],
  "lastUpdated": "2024-03-20T10:30:00.000Z",
  "dataQuality": {
    "hasInsiderData": true,
    "hasBeneficialOwnerData": true,
    "hasInstitutionalData": false,
    "hasSharesOutstanding": true
  },
  "source": "SEC EDGAR"
}
```

### GET `/api/ownership/summary`

Returns a simplified ownership summary with only the breakdown and top 10 holders.

**Query Parameters:**
- `ticker` (required): Stock ticker symbol

**Example Request:**
```
GET /api/ownership/summary?ticker=AAPL
```

**Response:**
```json
{
  "ticker": "AAPL",
  "companyName": "Apple Inc.",
  "sharesOutstanding": 15000000000,
  "breakdown": {
    "insiderShares": 500000000,
    "insiderPercent": 3.33,
    "institutionalShares": 0,
    "institutionalPercent": 0,
    "beneficialShares": 1500000000,
    "beneficialPercent": 10.0,
    "publicShares": 13000000000,
    "publicPercent": 86.67,
    "floatShares": 13000000000
  },
  "topHolders": [
    {
      "name": "Vanguard Group Inc",
      "shares": 1200000000,
      "percentOwnership": 8.0,
      "type": "beneficial",
      "source": "13G"
    }
  ],
  "lastUpdated": "2024-03-20T10:30:00.000Z",
  "dataQuality": {
    "hasInsiderData": true,
    "hasBeneficialOwnerData": true,
    "hasInstitutionalData": false,
    "hasSharesOutstanding": true
  },
  "source": "SEC EDGAR"
}
```

## Data Sources

The endpoint aggregates data from the following SEC filings:

### 1. **Form 3, 4, 5 - Insider Transactions**
- **Form 3**: Initial statement of beneficial ownership (when someone becomes an insider)
- **Form 4**: Changes in beneficial ownership (buys/sells by insiders)
- **Form 5**: Annual statement of changes in beneficial ownership

These forms track ownership by company officers, directors, and other insiders.

### 2. **Schedule 13D/13G - Beneficial Owners (>5%)**
- **Schedule 13D**: Filed by anyone who acquires more than 5% of a company's stock with activist intent
- **Schedule 13G**: Passive ownership of >5% (no intent to influence control)

These filings reveal large shareholders and their ownership percentages.

### 3. **Form 13F - Institutional Holdings** (Future Enhancement)
- Filed quarterly by institutional investment managers with >$100M in assets
- Shows holdings of mutual funds, hedge funds, and other large institutional investors
- *Note: Currently not fully implemented due to complexity of matching holdings across filings*

## How It Works

### Data Collection Process

1. **Ticker to CIK Resolution**: Maps the stock ticker to the company's CIK (Central Index Key) using SEC's ticker-to-CIK mapping

2. **Insider Data Collection**:
   - Fetches Forms 3, 4, and 5 from SEC EDGAR
   - Parses XML to extract transaction details
   - Aggregates net shares held by each insider

3. **Beneficial Ownership Collection**:
   - Fetches Schedule 13D/13G filings
   - Parses to extract filer name, shares owned, and ownership percentage
   - Identifies large shareholders (>5%)

4. **Ownership Calculation**:
   - Estimates total shares outstanding from beneficial owner percentages
   - Calculates insider, institutional, and public ownership percentages
   - Computes float shares (shares available for public trading)

### Caching

- **In-Memory Cache**: 24-hour TTL for fast subsequent requests
- **MongoDB Persistence**: Stores aggregated ownership data to reduce SEC API calls
- **Polite Request Handling**: Respects SEC's rate limiting (250ms minimum between requests)

## Data Quality Indicators

The `dataQuality` object indicates which data sources were available:

- `hasInsiderData`: Whether Forms 3, 4, or 5 were found
- `hasBeneficialOwnerData`: Whether Schedule 13D/13G filings were found
- `hasInstitutionalData`: Whether Form 13F data is available (currently always false)
- `hasSharesOutstanding`: Whether total shares could be estimated

Companies without recent SEC filings may return null or have limited data.

## Limitations

### Current Limitations

1. **13F Institutional Data**: Not fully implemented
   - Requires matching company holdings across multiple institutional manager filings
   - Would need additional services to aggregate all institutions holding a stock

2. **Shares Outstanding Estimation**:
   - Estimated from beneficial owner percentages when available
   - May not be 100% accurate without official company disclosures

3. **Historical Data**:
   - Only provides current/recent ownership
   - Historical tracking would require additional development

4. **Filing Delays**:
   - SEC filings have reporting deadlines (e.g., Form 4 within 2 days, 13F quarterly)
   - Data may lag real-time ownership by days or weeks

### Accuracy Considerations

- **Insider holdings** are calculated from transaction records, which may not reflect:
  - Stock splits or dividends
  - Transfers or gifts
  - Derivative securities

- **Beneficial ownership** relies on >5% threshold:
  - Holders with <5% ownership won't appear
  - Some filings may be delayed or amended

- **Float calculation** is estimated and may differ from official company reports

## Error Handling

### Possible Errors

- **404 Not Found**: Ticker not found in SEC database or no ownership filings available
- **400 Bad Request**: Invalid ticker format
- **500 Internal Server Error**: SEC API unavailable or parsing error

### Example Error Response

```json
{
  "error": "Ownership data not found for ticker. Company may not have recent SEC filings.",
  "ticker": "INVALID"
}
```

## Performance

- **First Request**: 3-10 seconds (fetches and parses SEC filings)
- **Cached Request**: <100ms (from in-memory cache)
- **MongoDB Cached**: <500ms (from database)

## Use Cases

### Investment Research
- Identify insider buying/selling patterns
- Track large institutional positions
- Monitor activist investor activity

### Float Analysis
- Calculate available shares for trading
- Understand liquidity constraints
- Analyze ownership concentration

### Corporate Governance
- Monitor insider ownership percentages
- Track beneficial owner changes
- Identify potential activist situations

## Future Enhancements

1. **13F Aggregation Service**:
   - Build service to aggregate all 13F filings mentioning a stock
   - Provide comprehensive institutional ownership data

2. **Historical Tracking**:
   - Store ownership snapshots over time
   - Provide trend analysis and ownership changes

3. **Advanced Analytics**:
   - Insider trading patterns (clusters of buys/sells)
   - Ownership concentration metrics (Herfindahl index)
   - Float rotation analysis

4. **Real-time Updates**:
   - Webhook notifications for new filings
   - Streaming updates for ownership changes

## Related Endpoints

- `/api/insiders?ticker=AAPL` - Get insider transaction details
- `/api/stock/company-name?ticker=AAPL` - Get company name for a ticker

## References

- [SEC EDGAR Database](https://www.sec.gov/edgar/searchedgar/companysearch.html)
- [Form 4 Information](https://www.sec.gov/files/forms-3-4-5.pdf)
- [Schedule 13D/13G Information](https://www.sec.gov/files/schedule13d.pdf)
- [Form 13F Information](https://www.sec.gov/divisions/investment/13ffaq.htm)
