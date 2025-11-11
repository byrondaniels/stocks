/**
 * Integration tests for ownership parsing with META data
 */

import { extract13DGFilings } from '../services/ownership/ownership-submissions.js';

describe('Ownership Parsing Integration', () => {
  describe('Real SEC Data Scenarios', () => {
    test('should handle META-style SCHEDULE 13G/A form names', () => {
      // This tests the specific issue found with META where forms are named "SCHEDULE 13G/A" instead of "SC 13G/A"
      const testSubmissions = {
        filings: {
          recent: {
            accessionNumber: ["test-123", "test-456", "test-789"],
            form: ["SCHEDULE 13G/A", "SC 13G/A", "4"],
            filingDate: ["2025-04-07", "2024-02-14", "2025-11-06"],
            reportDate: [null, "2024-02-14", "2025-11-06"],
            primaryDocument: ["doc1.xml", "doc2.htm", "doc3.xml"]
          }
        }
      };

      const result = extract13DGFilings(testSubmissions, 5);
      
      // Should find both SCHEDULE and SC format forms
      expect(result).toHaveLength(2);
      expect(result.map(r => r.formType)).toContain("SCHEDULE 13G/A");
      expect(result.map(r => r.formType)).toContain("SC 13G/A");
    });

    test('should extract forms in correct date order', () => {
      const testSubmissions = {
        filings: {
          recent: {
            accessionNumber: ["new-2025", "old-2024", "newer-2025"],
            form: ["SC 13G/A", "SCHEDULE 13G/A", "SC 13D"],
            filingDate: ["2025-04-07", "2024-02-14", "2025-05-01"],
            reportDate: [null, "2024-02-14", null],
            primaryDocument: ["doc1.xml", "doc2.htm", "doc3.xml"]
          }
        }
      };

      const result = extract13DGFilings(testSubmissions, 5);
      
      expect(result).toHaveLength(3);
      
      // Should be ordered by array index (most recent filings appear first in SEC data)
      expect(result[0].accessionNumber).toBe("new-2025");
      expect(result[0].formType).toBe("SC 13G/A");
      expect(result[1].accessionNumber).toBe("old-2024");
      expect(result[1].formType).toBe("SCHEDULE 13G/A");
      expect(result[2].accessionNumber).toBe("newer-2025");
      expect(result[2].formType).toBe("SC 13D");
    });

    test('should handle all supported 13D/13G form variations', () => {
      const allFormTypes = [
        "SC 13D", "SC 13G", "SC 13D/A", "SC 13G/A",
        "SCHEDULE 13D", "SCHEDULE 13G", "SCHEDULE 13D/A", "SCHEDULE 13G/A"
      ];

      const testSubmissions = {
        filings: {
          recent: {
            accessionNumber: allFormTypes.map((_, i) => `acc-${i}`),
            form: allFormTypes,
            filingDate: allFormTypes.map((_, i) => `2025-01-${(i + 1).toString().padStart(2, '0')}`),
            reportDate: allFormTypes.map(() => null),
            primaryDocument: allFormTypes.map((_, i) => `doc${i}.xml`)
          }
        }
      };

      const result = extract13DGFilings(testSubmissions, 20);
      
      expect(result).toHaveLength(8);
      
      // Verify all form types are recognized
      const resultFormTypes = result.map(r => r.formType);
      allFormTypes.forEach(formType => {
        expect(resultFormTypes).toContain(formType);
      });
    });

    test('should ignore invalid or unrelated form types', () => {
      const testSubmissions = {
        filings: {
          recent: {
            accessionNumber: ["good-1", "bad-1", "good-2", "bad-2", "good-3"],
            form: ["SC 13G/A", "8-K", "SCHEDULE 13D/A", "10-K", "SC 13D"],
            filingDate: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"],
            reportDate: [null, null, null, null, null],
            primaryDocument: ["doc1.xml", "doc2.htm", "doc3.xml", "doc4.htm", "doc5.xml"]
          }
        }
      };

      const result = extract13DGFilings(testSubmissions, 10);
      
      expect(result).toHaveLength(3);
      expect(result.map(r => r.formType)).toEqual(["SC 13G/A", "SCHEDULE 13D/A", "SC 13D"]);
      
      // Should not include 8-K or 10-K
      expect(result.map(r => r.formType)).not.toContain("8-K");
      expect(result.map(r => r.formType)).not.toContain("10-K");
    });

    test('should respect maxFilings parameter', () => {
      const testSubmissions = {
        filings: {
          recent: {
            accessionNumber: ["1", "2", "3", "4", "5"],
            form: ["SC 13G/A", "SCHEDULE 13G/A", "SC 13D", "SC 13D/A", "SCHEDULE 13D"],
            filingDate: ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"],
            reportDate: [null, null, null, null, null],
            primaryDocument: ["doc1.xml", "doc2.xml", "doc3.xml", "doc4.xml", "doc5.xml"]
          }
        }
      };

      // Test with limit of 2
      const limitedResult = extract13DGFilings(testSubmissions, 2);
      expect(limitedResult).toHaveLength(2);
      expect(limitedResult[0].accessionNumber).toBe("1");
      expect(limitedResult[1].accessionNumber).toBe("2");

      // Test with larger limit
      const fullResult = extract13DGFilings(testSubmissions, 10);
      expect(fullResult).toHaveLength(5);
    });
  });
});