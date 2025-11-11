/**
 * Unit tests for META ownership parsing based on real SEC data findings
 */

import { extract13DGFilings } from '../services/ownership/ownership-submissions.js';
import { normalizeRecentFilings } from '../services/sec/submissions.js';
import { CompanySubmissions } from '../services/sec/types.js';

describe('META Ownership Parsing', () => {
  // Mock META submissions data based on real SEC findings
  const mockMETASubmissions: CompanySubmissions = {
    filings: {
      recent: {
        accessionNumber: [
          "0001921094-25-001334",
          "0001921094-25-001333", 
          "0000950103-25-014438",
          "0000950103-25-014374",
          "0000950103-25-014304",
          "0000315066-25-001054",
          "0001193125-24-036200",
          "0001104659-24-021456",
          "0001086364-24-006971",
          "0000315066-24-001346"
        ],
        form: [
          "144",
          "144",
          "4",
          "4", 
          "4",
          "SCHEDULE 13G/A",
          "SC 13G/A",
          "SC 13G/A", 
          "SC 13G/A",
          "SC 13G/A"
        ],
        filingDate: [
          "2025-11-10",
          "2025-11-10",
          "2025-11-06",
          "2025-11-05",
          "2025-11-04",
          "2025-04-07",
          "2024-02-14",
          "2024-02-13",
          "2024-02-12", 
          "2024-02-09"
        ],
        reportDate: [
          null,
          null,
          "2025-11-06",
          "2025-11-05",
          "2025-11-04",
          "2025-03-31",
          "2024-02-14",
          "2024-02-13",
          "2024-02-12",
          "2024-02-09"
        ],
        primaryDocument: [
          "xsl144X01/primary_doc.xml",
          "xsl144X01/primary_doc.xml",
          "xslF345X05/dp236998_4-newstead.xml",
          "xslF345X05/dp236884_4-olivan.xml",
          "xslF345X05/dp236823_4-zuckerberg1031.xml",
          "xslSCHEDULE_13G_X01/primary_doc.xml",
          "d739494dsc13ga.htm",
          "tv01445-metaplatformsincclas.htm",
          "us30303m1027_021224.txt",
          "filing.txt"
        ]
      }
    }
  };

  describe('13D/13G Form Extraction', () => {
    test('should extract SCHEDULE 13G/A forms correctly', () => {
      const filings = extract13DGFilings(mockMETASubmissions, 10);
      
      expect(filings).toHaveLength(5); // Should find 5 beneficial ownership filings
      
      // Check the most recent SCHEDULE 13G/A filing
      const scheduleForm = filings.find(f => f.formType === "SCHEDULE 13G/A");
      expect(scheduleForm).toBeDefined();
      expect(scheduleForm?.filingDate).toBe("2025-04-07");
      expect(scheduleForm?.accessionNumber).toBe("0000315066-25-001054");
      expect(scheduleForm?.primaryDocument).toBe("xslSCHEDULE_13G_X01/primary_doc.xml");
    });

    test('should extract SC 13G/A forms correctly', () => {
      const filings = extract13DGFilings(mockMETASubmissions, 10);
      
      const sc13GForms = filings.filter(f => f.formType === "SC 13G/A");
      expect(sc13GForms).toHaveLength(4); // Should find 4 SC 13G/A filings
      
      // Check most recent SC 13G/A filing
      const mostRecent = sc13GForms[0];
      expect(mostRecent.filingDate).toBe("2024-02-14");
      expect(mostRecent.accessionNumber).toBe("0001193125-24-036200");
      expect(mostRecent.primaryDocument).toBe("d739494dsc13ga.htm");
    });

    test('should preserve filing order by date (most recent first)', () => {
      const filings = extract13DGFilings(mockMETASubmissions, 10);
      
      // Verify date ordering
      for (let i = 0; i < filings.length - 1; i++) {
        const currentDate = new Date(filings[i].filingDate);
        const nextDate = new Date(filings[i + 1].filingDate);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    test('should handle maxFilings limit correctly', () => {
      const filings = extract13DGFilings(mockMETASubmissions, 3);
      expect(filings).toHaveLength(3);
      
      // Should get the 3 most recent filings
      expect(filings[0].formType).toBe("SCHEDULE 13G/A");
      expect(filings[1].formType).toBe("SC 13G/A");
      expect(filings[2].formType).toBe("SC 13G/A");
    });
  });

  describe('Insider Form Processing (Form 4)', () => {
    test('should extract Form 4 filings correctly', () => {
      const filings = normalizeRecentFilings(mockMETASubmissions);
      
      expect(filings).toHaveLength(3); // Should find 3 Form 4 filings
      
      // Check most recent Form 4
      const mostRecent = filings[0];
      expect(mostRecent.form).toBe("4");
      expect(mostRecent.filingDate).toBe("2025-11-06");
      expect(mostRecent.accessionNumber).toBe("0000950103-25-014438");
      expect(mostRecent.primaryDocument).toBe("xslF345X05/dp236998_4-newstead.xml");
    });

    test('should include all recent Form 4 filings from different insiders', () => {
      const filings = normalizeRecentFilings(mockMETASubmissions);
      
      const insiderNames = [
        "dp236998_4-newstead.xml",     // Jennifer Newstead  
        "dp236884_4-olivan.xml",       // Javier Olivan
        "dp236823_4-zuckerberg1031.xml" // Mark Zuckerberg
      ];
      
      filings.forEach((filing, index) => {
        expect(filing.primaryDocument).toContain(insiderNames[index].split('_')[1].split('.')[0]);
      });
    });

    test('should exclude non-Form 3/4/5 filings', () => {
      const filings = normalizeRecentFilings(mockMETASubmissions);
      
      // Should not include Form 144 or 8-K filings
      expect(filings.every(f => ["3", "4", "5"].includes(f.form))).toBe(true);
    });
  });

  describe('Data Quality Validation', () => {
    test('should indicate presence of both insider and beneficial data for META', () => {
      const insiderFilings = normalizeRecentFilings(mockMETASubmissions);
      const beneficialFilings = extract13DGFilings(mockMETASubmissions, 10);
      
      const dataQuality = {
        hasInsiderData: insiderFilings.length > 0,
        hasBeneficialOwnerData: beneficialFilings.length > 0,
        hasInstitutionalData: false, // Not implemented yet
        hasSharesOutstanding: true   // Can be estimated from beneficial filings
      };
      
      expect(dataQuality.hasInsiderData).toBe(true);
      expect(dataQuality.hasBeneficialOwnerData).toBe(true);
      expect(dataQuality.hasInstitutionalData).toBe(false);
      expect(dataQuality.hasSharesOutstanding).toBe(true);
    });

    test('should handle edge cases with missing data', () => {
      const emptySubmissions: CompanySubmissions = {
        filings: {
          recent: {
            accessionNumber: [],
            form: [],
            filingDate: [],
            reportDate: [],
            primaryDocument: []
          }
        }
      };
      
      const insiderFilings = normalizeRecentFilings(emptySubmissions);
      const beneficialFilings = extract13DGFilings(emptySubmissions, 10);
      
      expect(insiderFilings).toHaveLength(0);
      expect(beneficialFilings).toHaveLength(0);
    });
  });

  describe('Form Type Compatibility', () => {
    test('should recognize both SCHEDULE and SC form formats', () => {
      const testData = {
        ...mockMETASubmissions,
        filings: {
          recent: {
            accessionNumber: ["123", "456", "789", "abc"],
            form: ["SCHEDULE 13D", "SC 13D", "SCHEDULE 13G/A", "SC 13G/A"],
            filingDate: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04"],
            reportDate: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04"],
            primaryDocument: ["doc1.xml", "doc2.xml", "doc3.xml", "doc4.xml"]
          }
        }
      };
      
      const filings = extract13DGFilings(testData, 10);
      expect(filings).toHaveLength(4);
      
      const formTypes = filings.map(f => f.formType);
      expect(formTypes).toContain("SCHEDULE 13D");
      expect(formTypes).toContain("SC 13D");
      expect(formTypes).toContain("SCHEDULE 13G/A");
      expect(formTypes).toContain("SC 13G/A");
    });
  });
});