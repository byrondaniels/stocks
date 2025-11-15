/**
 * Spinoff Lookup Service
 * Uses Gemini AI with Google Search grounding to identify spinoffs and parent companies
 */

import { GoogleGenAI } from "@google/genai";
import { SpinoffLookupModel } from "../db";
import { validateGeminiAPIKey, parseGeminiJSONSafe } from "../utils/gemini.utils";
import { buildSpinoffLookupPrompt } from "../prompts";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  apiVersion: "v1alpha"
});

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
  validateGeminiAPIKey();

  const normalizedTicker = ticker.toUpperCase().trim();

  const fallback: SpinoffLookupResult = {
    ticker: normalizedTicker,
    isSpinoff: false,
    parentCompany: null,
    parentTicker: null,
    analyzedAt: new Date(),
  };

  try {
    const prompt = buildSpinoffLookupPrompt(normalizedTicker);
    const config = {
      tools: [{
        googleSearch: {}
      }]
    };

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config,
    });

    let text: string | undefined;

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        text = candidate.content.parts[0].text;
      }
    }

    if (!text) {
      throw new Error("No response text received from Gemini API - model may have only performed search without generating response");
    }

    const parsed = parseGeminiJSONSafe<any>(text, {
      isSpinoff: false,
      parentCompany: null,
      parentTicker: null
    });

    if (typeof parsed.isSpinoff !== "boolean") {
      console.warn(`Invalid spinoff lookup response for ${normalizedTicker}, using fallback`);
      return fallback;
    }

    const lookupResult: SpinoffLookupResult = {
      ticker: normalizedTicker,
      isSpinoff: parsed.isSpinoff,
      parentCompany: parsed.parentCompany?.trim() || null,
      parentTicker: parsed.parentTicker?.toUpperCase().trim() || null,
      analyzedAt: new Date(),
    };

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to lookup spinoff: ${errorMessage}`);
  }
}
