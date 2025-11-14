/**
 * Spinoff Lookup Prompt
 * Uses Google Search grounding to identify recent spinoffs and parent companies
 */

/**
 * Gets the date from 2 years ago in YYYY-MM-DD format
 *
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * const date = getDateTwoYearsAgo();
 * // Returns: "2023-11-13" (if today is 2025-11-13)
 */
export function getDateTwoYearsAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date.toISOString().split('T')[0];
}

/**
 * Builds the prompt for Gemini to lookup spinoff information with Google Search
 *
 * Asks Gemini to use Google Search to answer three specific questions:
 * 1. Is this a spinoff from the last 2 years?
 * 2. What is the parent company name?
 * 3. What is the parent company's ticker?
 *
 * @param ticker - Stock ticker symbol
 * @returns Formatted prompt for Gemini API with grounding
 *
 * @example
 * const prompt = buildSpinoffLookupPrompt('GOOGL');
 * // Returns prompt instructing Gemini to use Google Search
 */
export function buildSpinoffLookupPrompt(ticker: string): string {
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
