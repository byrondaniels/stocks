/**
 * Unit tests for SEC Ownership Document Parser
 * Tests the parseOwnershipXml function with real-world XML data
 */

import { parseOwnershipXml } from '../services/sec/ownership-parser.js';
import { ParsedTransaction, RecentFiling } from '../services/sec/types.js';

// Example XML from Apple Inc. insider transaction (Form 4)
const EXAMPLE_OWNERSHIP_XML = `<?xml version="1.0"?>
<ownershipDocument>
<schemaVersion>X0508</schemaVersion>
<documentType>4</documentType>
<periodOfReport>2025-10-15</periodOfReport>
<notSubjectToSection16>0</notSubjectToSection16>
<issuer>
<issuerCik>0000320193</issuerCik>
<issuerName>Apple Inc.</issuerName>
<issuerTradingSymbol>AAPL</issuerTradingSymbol>
</issuer>
<reportingOwner>
<reportingOwnerId>
<rptOwnerCik>0002050912</rptOwnerCik>
<rptOwnerName>Parekh Kevan</rptOwnerName>
</reportingOwnerId>
<reportingOwnerAddress>
<rptOwnerStreet1>ONE APPLE PARK WAY</rptOwnerStreet1>
<rptOwnerStreet2/>
<rptOwnerCity>CUPERTINO</rptOwnerCity>
<rptOwnerState>CA</rptOwnerState>
<rptOwnerZipCode>95014</rptOwnerZipCode>
<rptOwnerStateDescription/>
</reportingOwnerAddress>
<reportingOwnerRelationship>
<isDirector>0</isDirector>
<isOfficer>1</isOfficer>
<isTenPercentOwner>0</isTenPercentOwner>
<isOther>0</isOther>
<officerTitle>Senior Vice President, CFO</officerTitle>
</reportingOwnerRelationship>
</reportingOwner>
<aff10b5One>1</aff10b5One>
<nonDerivativeTable>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
</securityTitle>
<transactionDate>
<value>2025-10-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>M</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>16457</value>
</transactionShares>
<transactionPricePerShare>
<footnoteId id="F1"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>A</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>21026</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
<footnoteId id="F2"/>
</securityTitle>
<transactionDate>
<value>2025-10-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>F</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>8062</value>
</transactionShares>
<transactionPricePerShare>
<value>249.34</value>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>12964</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
<footnoteId id="F3"/>
</securityTitle>
<transactionDate>
<value>2025-10-16</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>S</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>500</value>
</transactionShares>
<transactionPricePerShare>
<value>245.89</value>
<footnoteId id="F4"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>12464</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
<footnoteId id="F3"/>
</securityTitle>
<transactionDate>
<value>2025-10-16</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>S</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>1665</value>
</transactionShares>
<transactionPricePerShare>
<value>247.04</value>
<footnoteId id="F5"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>10799</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
<footnoteId id="F3"/>
</securityTitle>
<transactionDate>
<value>2025-10-16</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>S</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>1534</value>
</transactionShares>
<transactionPricePerShare>
<value>247.82</value>
<footnoteId id="F6"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>9265</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
<nonDerivativeTransaction>
<securityTitle>
<value>Common Stock</value>
<footnoteId id="F3"/>
</securityTitle>
<transactionDate>
<value>2025-10-16</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>S</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>500</value>
</transactionShares>
<transactionPricePerShare>
<value>248.73</value>
<footnoteId id="F7"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>8765</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</nonDerivativeTransaction>
</nonDerivativeTable>
<derivativeTable>
<derivativeTransaction>
<securityTitle>
<value>Restricted Stock Unit</value>
</securityTitle>
<conversionOrExercisePrice>
<footnoteId id="F1"/>
</conversionOrExercisePrice>
<transactionDate>
<value>2025-10-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>M</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>5530</value>
</transactionShares>
<transactionPricePerShare>
<footnoteId id="F1"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<exerciseDate>
<footnoteId id="F8"/>
</exerciseDate>
<expirationDate>
<footnoteId id="F8"/>
</expirationDate>
<underlyingSecurity>
<underlyingSecurityTitle>
<value>Common Stock</value>
</underlyingSecurityTitle>
<underlyingSecurityShares>
<value>5530</value>
</underlyingSecurityShares>
</underlyingSecurity>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>0</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</derivativeTransaction>
<derivativeTransaction>
<securityTitle>
<value>Restricted Stock Unit</value>
</securityTitle>
<conversionOrExercisePrice>
<footnoteId id="F1"/>
</conversionOrExercisePrice>
<transactionDate>
<value>2025-10-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>M</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>5816</value>
</transactionShares>
<transactionPricePerShare>
<footnoteId id="F1"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<exerciseDate>
<footnoteId id="F9"/>
</exerciseDate>
<expirationDate>
<footnoteId id="F9"/>
</expirationDate>
<underlyingSecurity>
<underlyingSecurityTitle>
<value>Common Stock</value>
</underlyingSecurityTitle>
<underlyingSecurityShares>
<value>5816</value>
</underlyingSecurityShares>
</underlyingSecurity>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>11633</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</derivativeTransaction>
<derivativeTransaction>
<securityTitle>
<value>Restricted Stock Unit</value>
</securityTitle>
<conversionOrExercisePrice>
<footnoteId id="F1"/>
</conversionOrExercisePrice>
<transactionDate>
<value>2025-10-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>M</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionAmounts>
<transactionShares>
<value>5111</value>
</transactionShares>
<transactionPricePerShare>
<footnoteId id="F1"/>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>D</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<exerciseDate>
<footnoteId id="F10"/>
</exerciseDate>
<expirationDate>
<footnoteId id="F10"/>
</expirationDate>
<underlyingSecurity>
<underlyingSecurityTitle>
<value>Common Stock</value>
</underlyingSecurityTitle>
<underlyingSecurityShares>
<value>5111</value>
</underlyingSecurityShares>
</underlyingSecurity>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>20442</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</derivativeTransaction>
</derivativeTable>
<footnotes>
<footnote id="F1">Each restricted stock unit represents the right to receive, at settlement, one share of common stock. This transaction represents the settlement of restricted stock units in shares of common stock on their scheduled vesting date.</footnote>
<footnote id="F2">Shares withheld by Apple to satisfy tax withholding requirements on vesting of restricted stock units.</footnote>
<footnote id="F3">This transaction was made pursuant to a Rule 10b5-1 trading plan adopted by the reporting person on November 26, 2024.</footnote>
<footnote id="F4">This transaction was executed in multiple trades at prices ranging from $245.41 to $246.36; the price reported above reflects the weighted average sale price. The reporting person hereby undertakes to provide full information regarding the number of shares and prices at which the transactions were effected upon request to the SEC staff, Apple, or a security holder of Apple.</footnote>
<footnote id="F5">This transaction was executed in multiple trades at prices ranging from $246.42 to $247.41; the price reported above reflects the weighted average sale price. The reporting person hereby undertakes to provide full information regarding the number of shares and prices at which the transactions were effected upon request to the SEC staff, Apple, or a security holder of Apple.</footnote>
<footnote id="F6">This transaction was executed in multiple trades at prices ranging from $247.43 to $248.30; the price reported above reflects the weighted average sale price. The reporting person hereby undertakes to provide full information regarding the number of shares and prices at which the transactions were effected upon request to the SEC staff, Apple, or a security holder of Apple.</footnote>
<footnote id="F7">This transaction was executed in multiple trades at prices ranging from $248.52 to $248.89; the price reported above reflects the weighted average sale price. The reporting person hereby undertakes to provide full information regarding the number of shares and prices at which the transactions were effected upon request to the SEC staff, Apple, or a security holder of Apple.</footnote>
<footnote id="F8">This award was granted on September 26, 2021. 12.5% of the award vested on April 15, 2022 and the remaining restricted stock units vested 12.5% in semi-annual installments over the four-year period ending October 15, 2025.</footnote>
<footnote id="F9">This award was granted on September 25, 2022. 12.5% of the award vested on April 15, 2023 and the remaining restricted stock units vest 12.5% in semi-annual installments over the four-year period ending October 15, 2026, subject to the terms and conditions of the underlying award agreement</footnote>
<footnote id="F10">This award was granted on October 1, 2023. 12.5% of the award vested on April 15, 2024 and the remaining restricted stock units vest 12.5% in semi-annual installments over the four-year period ending October 15, 2027, subject to the terms and conditions of the underlying award agreement.</footnote>
</footnotes>
<remarks/>
<ownerSignature>
<signatureName>/s/ Sam Whittington, Attorney-in-Fact for Kevan Parekh</signatureName>
<signatureDate>2025-10-17</signatureDate>
</ownerSignature>
</ownershipDocument>`;

describe('parseOwnershipXml', () => {
  const mockFiling: RecentFiling = {
    accessionNumber: '0000320193-25-000123',
    form: '4',
    filingDate: '2025-10-17',
    reportDate: '2025-10-15',
    primaryDocument: 'wk-form4_172918299800000.xml',
  };

  const mockCik = '0000320193';

  it('should parse the XML and return an array of transactions', () => {
    const transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);

    // Should have 5 non-derivative + 3 derivative = 8 total transactions
    // (M non-derivative transaction filtered out as duplicate)
    expect(transactions).toHaveLength(8);
  });

  it('should correctly parse insider name from reportingOwner', () => {
    const transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);

    // All transactions should have the same insider name
    transactions.forEach(tx => {
      expect(tx.insider).toBe('Parekh Kevan');
    });
  });

  describe('Non-derivative transactions', () => {
    let transactions: ParsedTransaction[];

    beforeEach(() => {
      transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);
    });

    it('should parse transaction 1 (F code - Tax withholding)', () => {
      const tx = transactions[0];
      expect(tx.date).toBe('2025-10-15');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.formType).toBe('4');
      expect(tx.transactionCode).toBe('F');
      expect(tx.type).toBe('sell'); // F is payment of tax liability
      expect(tx.shares).toBe(8062);
      expect(tx.price).toBe(249.34);
      expect(tx.securityTitle).toBe('Common Stock');
      expect(tx.source).toContain(mockCik);
    });

    it('should parse transaction 2 (S code - Sale)', () => {
      const tx = transactions[1];
      expect(tx.date).toBe('2025-10-16');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.formType).toBe('4');
      expect(tx.transactionCode).toBe('S');
      expect(tx.type).toBe('sell');
      expect(tx.shares).toBe(500);
      expect(tx.price).toBe(245.89);
      expect(tx.securityTitle).toBe('Common Stock');
    });

    it('should parse transaction 3 (S code - Sale)', () => {
      const tx = transactions[2];
      expect(tx.date).toBe('2025-10-16');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.formType).toBe('4');
      expect(tx.transactionCode).toBe('S');
      expect(tx.type).toBe('sell');
      expect(tx.shares).toBe(1665);
      expect(tx.price).toBe(247.04);
      expect(tx.securityTitle).toBe('Common Stock');
    });

    it('should parse transaction 4 (S code - Sale)', () => {
      const tx = transactions[3];
      expect(tx.date).toBe('2025-10-16');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.transactionCode).toBe('S');
      expect(tx.type).toBe('sell');
      expect(tx.shares).toBe(1534);
      expect(tx.price).toBe(247.82);
      expect(tx.securityTitle).toBe('Common Stock');
    });

    it('should parse transaction 5 (S code - Sale)', () => {
      const tx = transactions[4];
      expect(tx.date).toBe('2025-10-16');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.transactionCode).toBe('S');
      expect(tx.type).toBe('sell');
      expect(tx.shares).toBe(500);
      expect(tx.price).toBe(248.73);
      expect(tx.securityTitle).toBe('Common Stock');
    });

    // Transaction 6 is now a derivative transaction (first RSU)
    // The non-derivative M transaction was filtered out

    it('should correctly identify all sales transactions', () => {
      const salesTransactions = transactions.filter(tx => tx.type === 'sell');

      // 5 sale transactions (4 S code + 1 F code)
      expect(salesTransactions).toHaveLength(5);

      // Total shares sold
      const totalSharesSold = salesTransactions.reduce((sum, tx) => sum + tx.shares, 0);
      expect(totalSharesSold).toBe(12261); // 500 + 1665 + 1534 + 500 + 8062 (F transaction)
    });
  });

  describe('Derivative transactions', () => {
    let transactions: ParsedTransaction[];

    beforeEach(() => {
      transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);
    });

    it('should parse derivative transaction 1 (RSU exercise)', () => {
      const tx = transactions[5]; // First derivative transaction
      expect(tx.date).toBe('2025-10-15');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.formType).toBe('4');
      expect(tx.transactionCode).toBe('M');
      expect(tx.type).toBe('exercise'); // M is exercise/conversion
      expect(tx.shares).toBe(5530);
      expect(tx.price).toBeNull();
      expect(tx.securityTitle).toBe('Restricted Stock Unit');
    });

    it('should parse derivative transaction 2 (RSU exercise)', () => {
      const tx = transactions[6]; // Second derivative transaction
      expect(tx.date).toBe('2025-10-15');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.transactionCode).toBe('M');
      expect(tx.type).toBe('exercise');
      expect(tx.shares).toBe(5816);
      expect(tx.price).toBeNull();
      expect(tx.securityTitle).toBe('Restricted Stock Unit');
    });

    it('should parse derivative transaction 3 (RSU exercise)', () => {
      const tx = transactions[7]; // Third derivative transaction
      expect(tx.date).toBe('2025-10-15');
      expect(tx.insider).toBe('Parekh Kevan');
      expect(tx.transactionCode).toBe('M');
      expect(tx.type).toBe('exercise');
      expect(tx.shares).toBe(5111);
      expect(tx.price).toBeNull();
      expect(tx.securityTitle).toBe('Restricted Stock Unit');
    });

    it('should correctly parse all RSU transactions', () => {
      const rsuTransactions = transactions.filter(
        tx => tx.securityTitle === 'Restricted Stock Unit'
      );

      expect(rsuTransactions).toHaveLength(3);

      // Total RSU shares converted
      const totalRsuShares = rsuTransactions.reduce((sum, tx) => sum + tx.shares, 0);
      expect(totalRsuShares).toBe(16457); // 5530 + 5816 + 5111
    });
  });

  describe('Transaction metadata', () => {
    let transactions: ParsedTransaction[];

    beforeEach(() => {
      transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);
    });

    it('should include source URL for all transactions', () => {
      transactions.forEach(tx => {
        expect(tx.source).toBeDefined();
        expect(tx.source).toContain(mockCik);
        expect(tx.source).toContain(mockFiling.accessionNumber.replace(/-/g, ''));
      });
    });

    it('should correctly parse transaction dates', () => {
      // First transaction (F code) on Oct 15
      expect(transactions[0].date).toBe('2025-10-15');

      // Next 4 non-derivative transactions (S code) on Oct 16
      expect(transactions[1].date).toBe('2025-10-16');
      expect(transactions[2].date).toBe('2025-10-16');
      expect(transactions[3].date).toBe('2025-10-16');
      expect(transactions[4].date).toBe('2025-10-16');

      // Derivative transactions on Oct 15
      expect(transactions[5].date).toBe('2025-10-15');
      expect(transactions[6].date).toBe('2025-10-15');
      expect(transactions[7].date).toBe('2025-10-15');
    });

    it('should use formType from filing metadata', () => {
      transactions.forEach(tx => {
        expect(tx.formType).toBe('4');
      });
    });
  });

  describe('Data shown to users', () => {
    it('should provide accurate data for user display - sales summary', () => {
      const transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);

      // Filter for actual sales (S code)
      const salesTransactions = transactions.filter(tx => tx.transactionCode === 'S');

      expect(salesTransactions).toHaveLength(4);

      // Verify each sale transaction has all required fields for display
      salesTransactions.forEach(tx => {
        expect(tx.date).toBeTruthy();
        expect(tx.insider).toBe('Parekh Kevan');
        expect(tx.type).toBe('sell');
        expect(tx.shares).toBeGreaterThan(0);
        expect(tx.price).toBeGreaterThan(0);
        expect(tx.securityTitle).toBe('Common Stock');
      });

      // Calculate total value of sales for display
      const totalSaleValue = salesTransactions.reduce(
        (sum, tx) => sum + (tx.shares * (tx.price || 0)),
        0
      );

      // Expected: (500 * 245.89) + (1665 * 247.04) + (1534 * 247.82) + (500 * 248.73)
      // = 122945 + 411121.6 + 380355.88 + 124365 = 1038787.48
      expect(totalSaleValue).toBeCloseTo(1038787.48, 2);
    });

    it('should provide accurate data for user display - insider activity summary', () => {
      const transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);

      // What the user sees: count of buy vs sell vs exercise transactions
      const sellCount = transactions.filter(tx => tx.type === 'sell').length;
      const buyCount = transactions.filter(tx => tx.type === 'buy').length;
      const exerciseCount = transactions.filter(tx => tx.type === 'exercise').length;
      const otherCount = transactions.filter(tx => tx.type === 'other').length;

      expect(sellCount).toBe(5); // 4 S transactions + 1 F transaction
      expect(buyCount).toBe(0); // No P or A transactions
      expect(exerciseCount).toBe(3); // 3 M derivative only (non-derivative M filtered out)
      expect(otherCount).toBe(0); // No other types

      // Net shares calculation (for sells)
      const totalSellShares = transactions
        .filter(tx => tx.type === 'sell')
        .reduce((sum, tx) => sum + tx.shares, 0);

      expect(totalSellShares).toBe(12261);
    });

    it('should correctly categorize transaction types for user display', () => {
      const transactions = parseOwnershipXml(EXAMPLE_OWNERSHIP_XML, mockFiling, mockCik);

      // Transaction type mapping for user understanding
      const typeMap = {
        M: 'exercise', // Exercise or conversion
        F: 'sell',     // Payment of tax liability
        S: 'sell',     // Sale
        P: 'buy',      // Purchase
        A: 'buy',      // Award/grant
        D: 'sell'      // Disposition
      };

      transactions.forEach(tx => {
        const expectedType = typeMap[tx.transactionCode as keyof typeof typeMap];
        expect(tx.type).toBe(expectedType);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty XML gracefully', () => {
      const emptyXml = '<?xml version="1.0"?><root></root>';
      const transactions = parseOwnershipXml(emptyXml, mockFiling, mockCik);

      expect(transactions).toEqual([]);
    });

    it('should handle XML with no transactions', () => {
      const noTxXml = `<?xml version="1.0"?>
        <ownershipDocument>
          <issuer><issuerCik>0000320193</issuerCik></issuer>
          <reportingOwner>
            <reportingOwnerId><rptOwnerName>Test Owner</rptOwnerName></reportingOwnerId>
          </reportingOwner>
        </ownershipDocument>`;

      const transactions = parseOwnershipXml(noTxXml, mockFiling, mockCik);

      expect(transactions).toEqual([]);
    });

    it('should handle transactions with zero shares', () => {
      const zeroSharesXml = `<?xml version="1.0"?>
        <ownershipDocument>
          <reportingOwner>
            <reportingOwnerId><rptOwnerName>Test Owner</rptOwnerName></reportingOwnerId>
          </reportingOwner>
          <nonDerivativeTable>
            <nonDerivativeTransaction>
              <securityTitle><value>Common Stock</value></securityTitle>
              <transactionDate><value>2025-10-15</value></transactionDate>
              <transactionCoding>
                <transactionCode>S</transactionCode>
              </transactionCoding>
              <transactionAmounts>
                <transactionShares><value>0</value></transactionShares>
                <transactionPricePerShare><value>100.00</value></transactionPricePerShare>
                <transactionAcquiredDisposedCode><value>D</value></transactionAcquiredDisposedCode>
              </transactionAmounts>
            </nonDerivativeTransaction>
          </nonDerivativeTable>
        </ownershipDocument>`;

      const transactions = parseOwnershipXml(zeroSharesXml, mockFiling, mockCik);

      // Should filter out zero share transactions
      expect(transactions).toHaveLength(0);
    });
  });
});
