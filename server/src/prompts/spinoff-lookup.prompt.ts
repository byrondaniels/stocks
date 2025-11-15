/**
 * Spinoff Lookup Prompt Template
 */

function getDateTwoYearsAgo(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 2);
  return date.toISOString().split('T')[0];
}

export function buildSpinoffLookupPrompt(ticker: string): string {
  return `Stock ticker: ${ticker}

Please search Google extensively to find information about this ticker and determine if it's a recent spinoff. Try multiple search approaches:

Search strategies to use:
1. "${ticker} stock ticker company"
2. "${ticker} NYSE NASDAQ TSX"
3. "${ticker} spinoff"
4. "${ticker} spun off"
5. "${ticker} parent company"

If initial searches don't return clear results, try broader searches and look for any company that might trade under this ticker symbol.

Questions to answer:
1. Is ${ticker} a spinoff that occurred within the last 2 years (since ${getDateTwoYearsAgo()})?
2. If yes, what is the parent company that spun it off?
3. If yes, what is the parent company's ticker symbol?

You MUST return a response in this EXACT JSON format (no other text, no explanations, no markdown):

{
  "isSpinoff": true or false,
  "parentCompany": "Parent Company Name" or null,
  "parentTicker": "PARENT_TICKER" or null
}

CRITICAL REQUIREMENTS:
- Use the Google Search results to determine the answer
- Always return the JSON structure above
- Set isSpinoff to true only if you find evidence of a spinoff within the last 2 years
- Return ONLY the JSON - no other text whatsoever

Search comprehensively using Google Search, then provide your JSON response:`;
}
