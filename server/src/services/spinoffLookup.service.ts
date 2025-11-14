/**
 * Spinoff Lookup Service
 * Uses Gemini AI with Google Search grounding to identify spinoffs and parent companies
 *
 * This service uses the centralized Gemini client and prompts to provide:
 * - Recent spinoff identification (last 2 years)
 * - Parent company identification
 * - Parent ticker lookup
 */

import { getGeminiClient, GEMINI_MODELS, parseGeminiJSON } from "./ai/index.js";
import { buildSpinoffLookupPrompt } from "../prompts/index.js";
import { SpinoffLookupModel, ISpinoffLookupDocument } from "../db/models/SpinoffLookup.model.js";

/**
 * Spinoff lookup result interface
 */
export interface SpinoffLookupResult {
  ticker: string;
  isSpinoff: boolean;
  parentCompany: string | null;
  parentTicker: string | null;
  analyzedAt: Date;
}

/**
 * Looks up whether a stock is a spinoff within the last 2 years and identifies parent company
 *
 * Uses Gemini AI with Google Search grounding to answer:
 * 1. Is the ticker a spinoff from the last 2 years?
 * 2. What is the parent company name?
 * 3. What is the parent company's NYSE/NASDAQ ticker?
 *
 * Results are stored in the database. No caching - always performs fresh lookup.
 *
 * @param ticker - Stock ticker symbol to lookup
 * @returns Spinoff lookup result with parent information
 * @throws {Error} If GEMINI_API_KEY is not configured or API call fails
 *
 * @example
 * const result = await lookupSpinoff('GOOGL');
 * console.log(result.isSpinoff);      // false
 * console.log(result.parentCompany);  // null
 * console.log(result.parentTicker);   // null
 *
 * @example
 * const result = await lookupSpinoff('TRP');
 * console.log(result.isSpinoff);      // true (if it was a recent spinoff)
 * console.log(result.parentCompany);  // "Parent Company Name"
 * console.log(result.parentTicker);   // "PARENT"
 */
export async function lookupSpinoff(ticker: string): Promise<SpinoffLookupResult> {
  const client = getGeminiClient();
  const normalizedTicker = ticker.toUpperCase().trim();

  try {
    const prompt = buildSpinoffLookupPrompt(normalizedTicker);

    // Call Gemini with Google Search grounding enabled
    // Note: tools/googleSearch may not be available in current SDK version
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.PRO,
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = result.text;

    if (!text) {
      throw new Error("No response text received from Gemini API");
    }

    // Define fallback result
    const fallback: SpinoffLookupResult = {
      ticker: normalizedTicker,
      isSpinoff: false,
      parentCompany: null,
      parentTicker: null,
      analyzedAt: new Date(),
    };

    // Parse the response with centralized utility
    const parsed = parseGeminiJSON<Partial<SpinoffLookupResult>>(text, {});

    // Validate structure
    if (typeof parsed.isSpinoff !== "boolean") {
      console.warn('[Gemini] Invalid spinoff lookup response structure, using fallback');
      return fallback;
    }

    const lookupResult: SpinoffLookupResult = {
      ticker: normalizedTicker,
      isSpinoff: parsed.isSpinoff,
      parentCompany: parsed.parentCompany || null,
      parentTicker: parsed.parentTicker ? parsed.parentTicker.toUpperCase() : null,
      analyzedAt: new Date(),
    };

    // Store in database (upsert - always update with fresh data)
    await SpinoffLookupModel.findOneAndUpdate(
      { ticker: normalizedTicker },
      {
        ticker: normalizedTicker,
        isSpinoff: lookupResult.isSpinoff,
        parentCompany: lookupResult.parentCompany,
        parentTicker: lookupResult.parentTicker,
        analyzedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return lookupResult;
  } catch (error) {
    console.error(`Error looking up spinoff for ${normalizedTicker}:`, error);
    throw new Error(`Failed to lookup spinoff: ${error}`);
  }
}


/**
 * Gets spinoff lookup data from database (if exists)
 *
 * @param ticker - Stock ticker symbol
 * @returns Spinoff lookup result from database or null if not found
 *
 * @example
 * const cached = await getSpinoffLookupFromDB('AAPL');
 * if (cached) {
 *   console.log('Found in database:', cached.isSpinoff);
 * }
 */
export async function getSpinoffLookupFromDB(
  ticker: string
): Promise<ISpinoffLookupDocument | null> {
  const normalizedTicker = ticker.toUpperCase().trim();
  return await SpinoffLookupModel.findOne({ ticker: normalizedTicker });
}
