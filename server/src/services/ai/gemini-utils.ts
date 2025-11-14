/**
 * Shared Gemini Utilities
 * Common functions for working with Gemini API responses
 *
 * These utilities provide consistent error handling and response parsing
 * across all Gemini-powered features.
 */

/**
 * Removes markdown code blocks from JSON responses
 *
 * Gemini sometimes wraps JSON responses in markdown code blocks (```json ... ```).
 * This function cleanly removes those markers while preserving the JSON content.
 *
 * @param text - Raw text response from Gemini
 * @returns Cleaned text without markdown markers
 *
 * @example
 * const response = '```json\n{"key": "value"}\n```';
 * const cleaned = cleanJSONResponse(response);
 * // Returns: '{"key": "value"}'
 */
export function cleanJSONResponse(text: string): string {
  let cleaned = text.trim();

  // Remove opening ```json marker
  cleaned = cleaned.replace(/^```json\s*\n?/i, '');

  // Remove closing ``` marker
  cleaned = cleaned.replace(/\n?```\s*$/i, '');

  return cleaned.trim();
}

/**
 * Parses Gemini JSON response with error handling and fallback
 *
 * Attempts to parse a JSON response from Gemini, with automatic cleanup
 * of markdown code blocks. If parsing fails, returns the provided fallback
 * value and logs the error.
 *
 * @param responseText - Raw text response from Gemini
 * @param fallback - Fallback value to return if parsing fails
 * @returns Parsed JSON object or fallback value
 *
 * @example
 * const fallback = { score: 0, status: 'error' };
 * const result = parseGeminiJSON<MyType>(geminiResponse, fallback);
 * // Returns parsed JSON or fallback on error
 */
export function parseGeminiJSON<T>(responseText: string, fallback: T): T {
  try {
    const cleaned = cleanJSONResponse(responseText);
    return JSON.parse(cleaned) as T;
  } catch (error) {
    console.error('[Gemini] Failed to parse JSON response');
    console.error('[Gemini] Response text:', responseText.substring(0, 500));
    console.error('[Gemini] Parse error:', error);
    return fallback;
  }
}

/**
 * Validates that a parsed object has required fields
 *
 * Useful for ensuring Gemini responses contain expected data structure
 * before using them in application logic.
 *
 * @param obj - Object to validate
 * @param requiredFields - Array of field names that must exist
 * @returns true if all fields exist, false otherwise
 *
 * @example
 * const response = { name: 'AAPL', price: 150 };
 * const isValid = validateResponseFields(response, ['name', 'price']);
 * // Returns: true
 */
export function validateResponseFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): boolean {
  return requiredFields.every(field => field in obj && obj[field] !== undefined);
}

/**
 * Extracts error message from Gemini API errors
 *
 * @param error - Error object from Gemini API call
 * @returns Human-readable error message
 *
 * @example
 * try {
 *   await geminiCall();
 * } catch (error) {
 *   const message = extractErrorMessage(error);
 *   console.error('Gemini error:', message);
 * }
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}
