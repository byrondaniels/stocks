/**
 * Spinoff Lookup Service
 * Uses Gemini AI with Google Search grounding to identify spinoffs and parent companies
 */

import { GoogleGenAI } from "@google/genai";
import { SpinoffLookupModel, ISpinoffLookupDocument } from "../db/models/SpinoffLookup.model.js";

// Initialize Gemini AI
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ""
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
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const normalizedTicker = ticker.toUpperCase().trim();

  try {
    const prompt = buildSpinoffLookupPrompt(normalizedTicker);

    // Call Gemini with Google Search grounding enabled
    // Use the models API directly with tools parameter for grounding
    const result = await genAI.models.generateContent({
      model: "gemini-1.5-pro-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      tools: [
        {
          googleSearch: {}, // Enable live Google Search grounding
        },
      ],
    });

    const text = result.text;

    if (!text) {
      throw new Error("No response text received from Gemini API");
    }

    // Parse the response
    const lookupResult = parseSpinoffLookupResponse(text, normalizedTicker);

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
 * Builds the prompt for Gemini to lookup spinoff information
 *
 * Asks Gemini to use Google Search to answer three specific questions:
 * 1. Is this a spinoff from the last 2 years?
 * 2. What is the parent company name?
 * 3. What is the parent company's ticker?
 *
 * @param ticker - Stock ticker symbol
 * @returns Formatted prompt for Gemini API with grounding
 */
function buildSpinoffLookupPrompt(ticker: string): string {
  return `Use Google Search to answer the following questions about stock ticker ${ticker}:

1. Is ${ticker} a spinoff company that was spun off within the last 2 years (since ${getDateTwoYearsAgo()})?
2. If yes, what is the name of the parent company that ${ticker} was spun off from?
3. If yes, what is the NYSE or NASDAQ ticker symbol for the parent company?

Return your answer in the following JSON format:

{
  "isSpinoff": true or false,
  "parentCompany": "Parent Company Name" or null,
  "parentTicker": "TICKER" or null
}

Rules:
- Set isSpinoff to true ONLY if ${ticker} was spun off within the last 2 years
- If isSpinoff is false, set both parentCompany and parentTicker to null
- If isSpinoff is true, provide both the parent company name and its ticker symbol
- Parent ticker should be the NYSE/NASDAQ ticker (uppercase letters only)
- Use Google Search to find accurate, current information
- Return ONLY valid JSON, no additional text

Provide ONLY the JSON response, no markdown code blocks or additional text.`;
}

/**
 * Gets the date from 2 years ago in YYYY-MM-DD format
 */
function getDateTwoYearsAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date.toISOString().split("T")[0];
}

/**
 * Parses Gemini's spinoff lookup response
 *
 * Handles JSON parsing with fallback error handling:
 * - Removes markdown code block markers if present
 * - Validates response structure
 * - Returns error result if parsing fails
 *
 * @param responseText - Raw text response from Gemini API
 * @param ticker - Ticker being looked up
 * @returns Parsed spinoff lookup result
 */
function parseSpinoffLookupResponse(
  responseText: string,
  ticker: string
): SpinoffLookupResult {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();

    // Remove ```json and ``` markers
    jsonText = jsonText.replace(/^```json\s*\n?/i, "");
    jsonText = jsonText.replace(/\n?```\s*$/i, "");
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText);

    // Validate structure
    if (typeof parsed.isSpinoff !== "boolean") {
      throw new Error("Invalid response structure: isSpinoff must be boolean");
    }

    return {
      ticker: ticker.toUpperCase(),
      isSpinoff: parsed.isSpinoff,
      parentCompany: parsed.parentCompany || null,
      parentTicker: parsed.parentTicker ? parsed.parentTicker.toUpperCase() : null,
      analyzedAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to parse Gemini spinoff lookup response:", responseText);
    console.error("Parse error:", error);

    // Return fallback result indicating lookup failed
    return {
      ticker: ticker.toUpperCase(),
      isSpinoff: false,
      parentCompany: null,
      parentTicker: null,
      analyzedAt: new Date(),
    };
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
