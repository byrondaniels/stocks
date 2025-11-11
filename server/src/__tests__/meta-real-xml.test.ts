/**
 * Unit tests using REAL SEC XML payloads from META
 * Based on actual SEC API responses for META (CIK: 0001326801)
 */

import { parseOwnershipXml } from '../services/sec/ownership-parser.js';
import { RecentFiling } from '../services/sec/types.js';

describe('META Real SEC XML Parsing', () => {
  // REAL Jennifer Newstead Form 4 XML from SEC
  const realNewsteadForm4XML = `<?xml version="1.0"?>
<ownershipDocument>

    <schemaVersion>X0508</schemaVersion>

    <documentType>4</documentType>

    <periodOfReport>2025-11-04</periodOfReport>

    <notSubjectToSection16>0</notSubjectToSection16>

    <issuer>
        <issuerCik>0001326801</issuerCik>
        <issuerName>Meta Platforms, Inc.</issuerName>
        <issuerTradingSymbol>META</issuerTradingSymbol>
    </issuer>

    <reportingOwner>
        <reportingOwnerId>
            <rptOwnerCik>0001780525</rptOwnerCik>
            <rptOwnerName>Newstead Jennifer</rptOwnerName>
        </reportingOwnerId>
        <reportingOwnerAddress>
            <rptOwnerStreet1>C/O META PLATFORMS, INC.</rptOwnerStreet1>
            <rptOwnerStreet2>1 META WAY</rptOwnerStreet2>
            <rptOwnerCity>MENLO PARK</rptOwnerCity>
            <rptOwnerState>CA</rptOwnerState>
            <rptOwnerZipCode>94025</rptOwnerZipCode>
            <rptOwnerStateDescription></rptOwnerStateDescription>
        </reportingOwnerAddress>
        <reportingOwnerRelationship>
            <isDirector>0</isDirector>
            <isOfficer>1</isOfficer>
            <isTenPercentOwner>0</isTenPercentOwner>
            <isOther>0</isOther>
            <officerTitle>Chief Legal Officer</officerTitle>
            <otherText></otherText>
        </reportingOwnerRelationship>
    </reportingOwner>

    <aff10b5One>1</aff10b5One>

    <nonDerivativeTable>
        <nonDerivativeTransaction>
            <securityTitle>
                <value>Class A Common Stock</value>
            </securityTitle>
            <transactionDate>
                <value>2025-11-04</value>
            </transactionDate>
            <deemedExecutionDate></deemedExecutionDate>
            <transactionCoding>
                <transactionFormType>4</transactionFormType>
                <transactionCode>S</transactionCode>
                <equitySwapInvolved>0</equitySwapInvolved>
                <footnoteId id="F1"/>
            </transactionCoding>
            <transactionTimeliness></transactionTimeliness>
            <transactionAmounts>
                <transactionShares>
                    <value>519</value>
                </transactionShares>
                <transactionPricePerShare>
                    <value>628.00</value>
                </transactionPricePerShare>
                <transactionAcquiredDisposedCode>
                    <value>D</value>
                </transactionAcquiredDisposedCode>
            </transactionAmounts>
            <postTransactionAmounts>
                <sharesOwnedFollowingTransaction>
                    <value>27237</value>
                </sharesOwnedFollowingTransaction>
            </postTransactionAmounts>
            <ownershipNature>
                <directOrIndirectOwnership>
                    <value>D</value>
                </directOrIndirectOwnership>
            </ownershipNature>
        </nonDerivativeTransaction>
    </nonDerivativeTable>

    <footnotes>
        <footnote id="F1">The sale reported was effected pursuant to a Rule 10b5-1 trading plan adopted by the reporting person on February 11, 2025.</footnote>
    </footnotes>

    <ownerSignature>
        <signatureName>/s/ Erin Guldiken, attorney-in-fact for Jennifer Newstead</signatureName>
        <signatureDate>2025-11-06</signatureDate>
    </ownerSignature>
</ownershipDocument>`;

  // REAL Mark Zuckerberg Form 4 XML from SEC
  const realZuckerbergForm4XML = `<?xml version="1.0"?>
<ownershipDocument>

    <schemaVersion>X0508</schemaVersion>

    <documentType>4</documentType>

    <periodOfReport>2025-10-31</periodOfReport>

    <notSubjectToSection16>0</notSubjectToSection16>

    <issuer>
        <issuerCik>0001326801</issuerCik>
        <issuerName>Meta Platforms, Inc.</issuerName>
        <issuerTradingSymbol>META</issuerTradingSymbol>
    </issuer>

    <reportingOwner>
        <reportingOwnerId>
            <rptOwnerCik>0001548760</rptOwnerCik>
            <rptOwnerName>Zuckerberg Mark</rptOwnerName>
        </reportingOwnerId>
        <reportingOwnerAddress>
            <rptOwnerStreet1>C/O META PLATFORMS, INC.</rptOwnerStreet1>
            <rptOwnerStreet2>1 META WAY</rptOwnerStreet2>
            <rptOwnerCity>MENLO PARK</rptOwnerCity>
            <rptOwnerState>CA</rptOwnerState>
            <rptOwnerZipCode>94025</rptOwnerZipCode>
            <rptOwnerStateDescription></rptOwnerStateDescription>
        </reportingOwnerAddress>
        <reportingOwnerRelationship>
            <isDirector>1</isDirector>
            <isOfficer>1</isOfficer>
            <isTenPercentOwner>1</isTenPercentOwner>
            <isOther>0</isOther>
            <officerTitle>COB and CEO</officerTitle>
            <otherText></otherText>
        </reportingOwnerRelationship>
    </reportingOwner>

    <aff10b5One>0</aff10b5One>

    <nonDerivativeTable>
        <nonDerivativeTransaction>
            <securityTitle>
                <value>Class A Common Stock</value>
            </securityTitle>
            <transactionDate>
                <value>2025-10-31</value>
            </transactionDate>
            <deemedExecutionDate></deemedExecutionDate>
            <transactionCoding>
                <transactionFormType>4</transactionFormType>
                <transactionCode>C</transactionCode>
                <equitySwapInvolved>0</equitySwapInvolved>
            </transactionCoding>
            <transactionTimeliness></transactionTimeliness>
            <transactionAmounts>
                <transactionShares>
                    <value>242340</value>
                </transactionShares>
                <transactionPricePerShare>
                    <value>0</value>
                </transactionPricePerShare>
                <transactionAcquiredDisposedCode>
                    <value>A</value>
                </transactionAcquiredDisposedCode>
            </transactionAmounts>
            <postTransactionAmounts>
                <sharesOwnedFollowingTransaction>
                    <value>242340</value>
                </sharesOwnedFollowingTransaction>
            </postTransactionAmounts>
            <ownershipNature>
                <directOrIndirectOwnership>
                    <value>I</value>
                </directOrIndirectOwnership>
                <natureOfOwnership>
                    <value>By CZI Holdings, LLC</value>
                    <footnoteId id="F1"/>
                </natureOfOwnership>
            </ownershipNature>
        </nonDerivativeTransaction>
        <nonDerivativeTransaction>
            <securityTitle>
                <value>Class A Common Stock</value>
            </securityTitle>
            <transactionDate>
                <value>2025-10-31</value>
            </transactionDate>
            <deemedExecutionDate></deemedExecutionDate>
            <transactionCoding>
                <transactionFormType>4</transactionFormType>
                <transactionCode>G</transactionCode>
                <equitySwapInvolved>0</equitySwapInvolved>
            </transactionCoding>
            <transactionTimeliness></transactionTimeliness>
            <transactionAmounts>
                <transactionShares>
                    <value>242340</value>
                </transactionShares>
                <transactionPricePerShare>
                    <value>0</value>
                </transactionPricePerShare>
                <transactionAcquiredDisposedCode>
                    <value>D</value>
                </transactionAcquiredDisposedCode>
            </transactionAmounts>
            <postTransactionAmounts>
                <sharesOwnedFollowingTransaction>
                    <value>351470516</value>
                </sharesOwnedFollowingTransaction>
            </postTransactionAmounts>
            <ownershipNature>
                <directOrIndirectOwnership>
                    <value>D</value>
                </directOrIndirectOwnership>
            </ownershipNature>
        </nonDerivativeTransaction>
    </nonDerivativeTable>

    <footnotes>
        <footnote id="F1">The transaction was a conversion of Class B Common Stock to Class A Common Stock pursuant to the Certificate of Incorporation. The reporting person disclaims beneficial ownership of shares held by CZI Holdings, LLC ("CZI Holdings"), except to the extent of any pecuniary interest therein. CZI Holdings is controlled by an entity that is controlled by the reporting person and the reporting person's spouse.</footnote>
    </footnotes>

    <ownerSignature>
        <signatureName>/s/ Jennifer Newstead, attorney-in-fact for Mark Zuckerberg</signatureName>
        <signatureDate>2025-11-04</signatureDate>
    </ownerSignature>
</ownershipDocument>`;

  describe('Jennifer Newstead Form 4 Parsing', () => {
    const mockFiling: RecentFiling = {
      accessionNumber: "0000950103-25-014438",
      form: "4",
      filingDate: "2025-11-06",
      reportDate: "2025-11-04",
      primaryDocument: "dp236998_4-newstead.xml"
    };

    test('should parse Jennifer Newstead insider transaction correctly', () => {
      const transactions = parseOwnershipXml(realNewsteadForm4XML, mockFiling, "0001326801");
      
      expect(transactions).toHaveLength(1);
      
      const transaction = transactions[0];
      expect(transaction.insider).toBe("Newstead Jennifer");
      expect(transaction.date).toBe("2025-11-04");
      expect(transaction.formType).toBe("4");
      expect(transaction.type).toBe("sell");
      expect(transaction.shares).toBe(519);
      expect(transaction.price).toBe(628.00);
      expect(transaction.securityTitle).toBe("Class A Common Stock");
      expect(transaction.source).toBe("Form 4");
    });

    test('should extract correct transaction metadata', () => {
      const transactions = parseOwnershipXml(realNewsteadForm4XML, mockFiling, "0001326801");
      const transaction = transactions[0];
      
      expect(transaction.transactionCode).toBe("S");
      expect(transaction.note).toContain("Rule 10b5-1 trading plan");
      expect(transaction.note).toContain("February 11, 2025");
    });
  });

  describe('Mark Zuckerberg Form 4 Parsing', () => {
    const mockFiling: RecentFiling = {
      accessionNumber: "0000950103-25-014304", 
      form: "4",
      filingDate: "2025-11-04",
      reportDate: "2025-10-31",
      primaryDocument: "dp236823_4-zuckerberg1031.xml"
    };

    test('should parse Mark Zuckerberg multiple transactions correctly', () => {
      const transactions = parseOwnershipXml(realZuckerbergForm4XML, mockFiling, "0001326801");
      
      expect(transactions).toHaveLength(2);
      
      // First transaction - Conversion (C)
      const conversion = transactions[0];
      expect(conversion.insider).toBe("Zuckerberg Mark");
      expect(conversion.date).toBe("2025-10-31");
      expect(conversion.formType).toBe("4");
      expect(conversion.type).toBe("other");
      expect(conversion.transactionCode).toBe("C");
      expect(conversion.shares).toBe(242340);
      expect(conversion.price).toBe(0);
      
      // Second transaction - Gift (G)  
      const gift = transactions[1];
      expect(gift.insider).toBe("Zuckerberg Mark");
      expect(gift.date).toBe("2025-10-31");
      expect(gift.formType).toBe("4");
      expect(gift.type).toBe("other");
      expect(gift.transactionCode).toBe("G");
      expect(gift.shares).toBe(242340);
      expect(gift.price).toBe(0);
    });

    test('should handle complex ownership structure footnotes', () => {
      const transactions = parseOwnershipXml(realZuckerbergForm4XML, mockFiling, "0001326801");
      
      const conversionTransaction = transactions[0];
      expect(conversionTransaction.note).toContain("Class B Common Stock to Class A Common Stock");
      expect(conversionTransaction.note).toContain("CZI Holdings, LLC");
      expect(conversionTransaction.note).toContain("reporting person disclaims beneficial ownership");
    });

    test('should handle direct vs indirect ownership properly', () => {
      const transactions = parseOwnershipXml(realZuckerbergForm4XML, mockFiling, "0001326801");
      
      // First transaction is indirect ownership through CZI Holdings
      const conversion = transactions[0];
      expect(conversion.note).toContain("CZI Holdings, LLC");
      
      // Second transaction is direct ownership  
      const gift = transactions[1];
      expect(gift.note || "").not.toContain("CZI Holdings, LLC");
    });
  });

  describe('Real SEC Data Validation', () => {
    test('should handle actual SEC XML structure and namespaces', () => {
      // Test that our parser handles the real XML without breaking
      const newsteadFiling: RecentFiling = {
        accessionNumber: "0000950103-25-014438",
        form: "4", 
        filingDate: "2025-11-06",
        primaryDocument: "dp236998_4-newstead.xml"
      };

      const zuckerbergFiling: RecentFiling = {
        accessionNumber: "0000950103-25-014304",
        form: "4",
        filingDate: "2025-11-04", 
        primaryDocument: "dp236823_4-zuckerberg1031.xml"
      };

      const newsteadTransactions = parseOwnershipXml(realNewsteadForm4XML, newsteadFiling, "0001326801");
      const zuckerbergTransactions = parseOwnershipXml(realZuckerbergForm4XML, zuckerbergFiling, "0001326801");

      // Should successfully parse both without errors
      expect(newsteadTransactions).toHaveLength(1);
      expect(zuckerbergTransactions).toHaveLength(2);

      // All transactions should have required fields
      [...newsteadTransactions, ...zuckerbergTransactions].forEach(tx => {
        expect(tx.insider).toBeDefined();
        expect(tx.date).toBeDefined();
        expect(tx.shares).toBeGreaterThan(0);
        expect(tx.type).toMatch(/^(buy|sell|exercise|other)$/);
        expect(tx.source).toBe("Form 4");
      });
    });

    test('should extract Meta-specific company information correctly', () => {
      const transactions = parseOwnershipXml(realNewsteadForm4XML, {
        accessionNumber: "test",
        form: "4",
        filingDate: "2025-11-06",
        primaryDocument: "test.xml"
      }, "0001326801");

      const transaction = transactions[0];
      
      // Verify META-specific details are preserved
      expect(transaction.securityTitle).toBe("Class A Common Stock");
      expect(transaction.source).toBe("Form 4");
    });

    test('should handle various transaction codes correctly', () => {
      const newsteadTransactions = parseOwnershipXml(realNewsteadForm4XML, {
        accessionNumber: "test1", form: "4", filingDate: "2025-11-06", primaryDocument: "test1.xml"
      }, "0001326801");

      const zuckerbergTransactions = parseOwnershipXml(realZuckerbergForm4XML, {
        accessionNumber: "test2", form: "4", filingDate: "2025-11-04", primaryDocument: "test2.xml" 
      }, "0001326801");

      // Jennifer Newstead: S (Sell)
      expect(newsteadTransactions[0].transactionCode).toBe("S");
      expect(newsteadTransactions[0].type).toBe("sell");

      // Mark Zuckerberg: C (Conversion), G (Gift)
      expect(zuckerbergTransactions[0].transactionCode).toBe("C");
      expect(zuckerbergTransactions[0].type).toBe("other");
      expect(zuckerbergTransactions[1].transactionCode).toBe("G");
      expect(zuckerbergTransactions[1].type).toBe("other");
    });

    test('should preserve footnote information from real filings', () => {
      const newsteadTransactions = parseOwnershipXml(realNewsteadForm4XML, {
        accessionNumber: "test", form: "4", filingDate: "2025-11-06", primaryDocument: "test.xml"
      }, "0001326801");

      const zuckerbergTransactions = parseOwnershipXml(realZuckerbergForm4XML, {
        accessionNumber: "test", form: "4", filingDate: "2025-11-04", primaryDocument: "test.xml"
      }, "0001326801");

      // Jennifer Newstead footnote about 10b5-1 plan
      expect(newsteadTransactions[0].note).toBeDefined();
      expect(newsteadTransactions[0].note).toContain("Rule 10b5-1 trading plan");

      // Mark Zuckerberg footnote about class conversion
      expect(zuckerbergTransactions[0].note).toBeDefined();
      expect(zuckerbergTransactions[0].note).toContain("conversion of Class B Common Stock");
    });
  });
});