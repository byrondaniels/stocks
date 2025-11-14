/**
 * Simplified unit tests for spinoff lookup parsing behavior
 */

describe('Spinoff Lookup Response Parsing', () => {
  // Test the parsing logic by importing the core function logic
  function parseSpinoffLookupResponse(responseText: string, ticker: string) {
    try {
      // Clean up common markdown artifacts (same logic as service)
      const cleanedText = responseText
        .trim()
        .replace(/^```(?:json)?\s*\n?/i, "") // Remove opening code blocks
        .replace(/\n?```\s*$/i, "")         // Remove closing code blocks
        .trim();

      const parsed = JSON.parse(cleanedText);

      // Simple validation
      if (typeof parsed.isSpinoff !== "boolean") {
        throw new Error("Invalid response: isSpinoff must be boolean");
      }

      return {
        ticker: ticker.toUpperCase().trim(),  // Match service behavior
        isSpinoff: parsed.isSpinoff,
        parentCompany: parsed.parentCompany?.trim() || null,
        parentTicker: parsed.parentTicker?.toUpperCase().trim() || null,
        analyzedAt: new Date(),
      };
    } catch (error) {
      // Return safe fallback
      return {
        ticker: ticker.toUpperCase().trim(),  // Match service behavior
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: new Date(),
      };
    }
  }

  describe('JSON parsing', () => {
    it('should parse SOBO spinoff response correctly', () => {
      const response = JSON.stringify({
        isSpinoff: true,
        parentCompany: "TC Energy",
        parentTicker: "TRP"
      });

      const result = parseSpinoffLookupResponse(response, 'SOBO');

      expect(result).toEqual({
        ticker: 'SOBO',
        isSpinoff: true,
        parentCompany: 'TC Energy',
        parentTicker: 'TRP',
        analyzedAt: expect.any(Date)
      });
    });

    it('should parse non-spinoff response correctly', () => {
      const response = JSON.stringify({
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null
      });

      const result = parseSpinoffLookupResponse(response, 'AAPL');

      expect(result).toEqual({
        ticker: 'AAPL',
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle JSON with markdown code blocks', () => {
      const response = '```json\n{\n  "isSpinoff": true,\n  "parentCompany": "Enbridge Inc.",\n  "parentTicker": "ENB"\n}\n```';

      const result = parseSpinoffLookupResponse(response, 'SBOW');

      expect(result).toEqual({
        ticker: 'SBOW',
        isSpinoff: true,
        parentCompany: 'Enbridge Inc.',
        parentTicker: 'ENB',
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle plain code blocks', () => {
      const response = '```\n{\n  "isSpinoff": false,\n  "parentCompany": null,\n  "parentTicker": null\n}\n```';

      const result = parseSpinoffLookupResponse(response, 'MSFT');

      expect(result).toEqual({
        ticker: 'MSFT',
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: expect.any(Date)
      });
    });

    it('should normalize ticker to uppercase', () => {
      const response = JSON.stringify({
        isSpinoff: true,
        parentCompany: "TC Energy",
        parentTicker: "trp"  // lowercase
      });

      const result = parseSpinoffLookupResponse(response, 'sobo');  // lowercase input

      expect(result).toEqual({
        ticker: 'SOBO',  // normalized
        isSpinoff: true,
        parentCompany: 'TC Energy',
        parentTicker: 'TRP',  // normalized
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle malformed JSON gracefully', () => {
      const response = '{ invalid json response';

      const result = parseSpinoffLookupResponse(response, 'INVALID');

      expect(result).toEqual({
        ticker: 'INVALID',
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle missing isSpinoff field', () => {
      const response = JSON.stringify({
        parentCompany: "Some Company",
        parentTicker: "SOME"
      });

      const result = parseSpinoffLookupResponse(response, 'TEST');

      expect(result).toEqual({
        ticker: 'TEST',
        isSpinoff: false,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle null parent values', () => {
      const response = JSON.stringify({
        isSpinoff: true,
        parentCompany: null,
        parentTicker: null
      });

      const result = parseSpinoffLookupResponse(response, 'TEST');

      expect(result).toEqual({
        ticker: 'TEST',
        isSpinoff: true,
        parentCompany: null,
        parentTicker: null,
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle whitespace and formatting variations', () => {
      const response = `
        {
          "isSpinoff": true,
          "parentCompany": "  TC Energy  ",
          "parentTicker": "  trp  "
        }
      `;

      const result = parseSpinoffLookupResponse(response, ' sobo ');

      expect(result).toEqual({
        ticker: 'SOBO',  // Input ticker is normalized (uppercased and trimmed)
        isSpinoff: true,
        parentCompany: 'TC Energy', // Company name is now trimmed
        parentTicker: 'TRP',  // Parent ticker is now trimmed too
        analyzedAt: expect.any(Date)
      });
    });
  });

  describe('Gemini API Response Extraction', () => {
    // Test the actual Gemini response structure we discovered
    function extractTextFromGeminiResponse(apiResponse: any): string | undefined {
      if (apiResponse.candidates && apiResponse.candidates.length > 0) {
        const candidate = apiResponse.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text;
        }
      }
      return undefined;
    }

    it('should extract text from actual Gemini grounded response structure', () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    isSpinoff: true,
                    parentCompany: "TC Energy",
                    parentTicker: "TRP"
                  })
                }
              ],
              role: "model"
            },
            finishReason: "STOP",
            groundingMetadata: {
              searchEntryPoint: {
                renderedContent: "<div>Search UI</div>"
              },
              webSearchQueries: ["SOBO stock ticker", "SOBO spinoff"]
            }
          }
        ]
      };

      const extractedText = extractTextFromGeminiResponse(mockGeminiResponse);
      expect(extractedText).toBeDefined();
      
      const result = parseSpinoffLookupResponse(extractedText!, 'SOBO');
      expect(result).toEqual({
        ticker: 'SOBO',
        isSpinoff: true,
        parentCompany: 'TC Energy',
        parentTicker: 'TRP',
        analyzedAt: expect.any(Date)
      });
    });

    it('should handle response with no content parts', () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              role: "model"
              // No parts array
            },
            finishReason: "STOP",
            groundingMetadata: {
              webSearchQueries: ["SOBO stock"]
            }
          }
        ]
      };

      const extractedText = extractTextFromGeminiResponse(mockGeminiResponse);
      expect(extractedText).toBeUndefined();
    });

    it('should handle response with empty candidates', () => {
      const mockGeminiResponse = {
        candidates: []
      };

      const extractedText = extractTextFromGeminiResponse(mockGeminiResponse);
      expect(extractedText).toBeUndefined();
    });

    it('should handle response with no candidates property', () => {
      const mockGeminiResponse = {
        modelVersion: "gemini-2.5-flash"
      };

      const extractedText = extractTextFromGeminiResponse(mockGeminiResponse);
      expect(extractedText).toBeUndefined();
    });
  });

  describe('Expected SOBO behavior', () => {
    it('should correctly identify SOBO as a TC Energy spinoff', () => {
      const validSOBOResponse = JSON.stringify({
        isSpinoff: true,
        parentCompany: "TC Energy",
        parentTicker: "TRP"
      });

      const result = parseSpinoffLookupResponse(validSOBOResponse, 'SOBO');

      expect(result.ticker).toBe('SOBO');
      expect(result.isSpinoff).toBe(true);
      expect(result.parentCompany).toBe('TC Energy');
      expect(result.parentTicker).toBe('TRP');
    });

    it('should handle alternative SOBO response formats', () => {
      const altResponse = '```json\n{"isSpinoff": true, "parentCompany": "TC Energy Corp", "parentTicker": "TRP"}\n```';

      const result = parseSpinoffLookupResponse(altResponse, 'SOBO');

      expect(result.isSpinoff).toBe(true);
      expect(result.parentTicker).toBe('TRP');
    });

    it('should handle actual API response format for SOBO', () => {
      // Test the exact response format we're getting from the live API
      const actualAPIResponse = {
        isSpinoff: true,
        parentCompany: "TC Energy",
        parentTicker: "TRP"
      };

      const result = parseSpinoffLookupResponse(JSON.stringify(actualAPIResponse), 'SOBO');

      expect(result).toEqual({
        ticker: 'SOBO',
        isSpinoff: true,
        parentCompany: 'TC Energy',
        parentTicker: 'TRP',
        analyzedAt: expect.any(Date)
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle South Bow Corporation variations', () => {
      // Test variations of how the parent company might be named
      const variations = [
        { parentCompany: "TC Energy", parentTicker: "TRP" },
        { parentCompany: "TC Energy Corporation", parentTicker: "TRP" },
        { parentCompany: "TransCanada Corporation", parentTicker: "TRP" },
        { parentCompany: "  TC Energy  ", parentTicker: "  TRP  " }, // With whitespace
      ];

      variations.forEach((variation, index) => {
        const response = JSON.stringify({
          isSpinoff: true,
          ...variation
        });

        const result = parseSpinoffLookupResponse(response, 'SOBO');

        expect(result.ticker).toBe('SOBO');
        expect(result.isSpinoff).toBe(true);
        expect(result.parentTicker).toBe('TRP'); // Should be normalized
        expect(result.parentCompany).toBe(variation.parentCompany.trim());
        expect(result.analyzedAt).toBeInstanceOf(Date);
      });
    });

    it('should handle mixed case ticker responses', () => {
      const response = JSON.stringify({
        isSpinoff: true,
        parentCompany: "TC Energy",
        parentTicker: "trp" // lowercase
      });

      const result = parseSpinoffLookupResponse(response, 'sobo'); // lowercase input

      expect(result.ticker).toBe('SOBO');
      expect(result.parentTicker).toBe('TRP');
    });
  });
});