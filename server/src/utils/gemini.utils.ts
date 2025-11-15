/**
 * Shared utilities for Gemini AI interactions
 * Centralizes JSON parsing, error handling, and common operations
 */

import { GoogleGenAI } from '@google/genai';

export const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || ''
});

/**
 * Parses Gemini JSON response and removes markdown artifacts
 *
 * @param responseText - Raw text response from Gemini API
 * @returns Parsed JSON object
 * @throws {Error} If JSON parsing fails
 */
export function parseGeminiJSON<T>(responseText: string): T {
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  jsonText = jsonText.replace(/^```json\s*\n?/i, '');
  jsonText = jsonText.replace(/^```\s*\n?/i, '');
  jsonText = jsonText.replace(/\n?```\s*$/i, '');
  jsonText = jsonText.trim();

  return JSON.parse(jsonText);
}

/**
 * Safely parses Gemini JSON response with fallback
 *
 * @param responseText - Raw text response from Gemini API
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed JSON object or fallback
 */
export function parseGeminiJSONSafe<T>(
  responseText: string,
  fallback: T
): T {
  try {
    return parseGeminiJSON<T>(responseText);
  } catch (error) {
    console.error('Failed to parse Gemini response:', responseText);
    console.error('Parse error:', error);
    return fallback;
  }
}

/**
 * Validates that Gemini API key is configured
 *
 * @throws {Error} If GEMINI_API_KEY is not configured
 */
export function validateGeminiAPIKey(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
}

/**
 * Calls Gemini API with a prompt and returns the response text
 *
 * @param model - Gemini model to use
 * @param prompt - Prompt text or array of content parts
 * @param config - Optional generation config
 * @returns Response text from Gemini
 * @throws {Error} If API call fails
 */
export async function callGemini(
  model: string,
  prompt: string | any[],
  config?: any
): Promise<string> {
  const contents = Array.isArray(prompt)
    ? prompt
    : [{ role: 'user', parts: [{ text: prompt }] }];

  const response = await genAI.models.generateContent({
    model,
    contents,
    ...config
  });

  const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response text received from Gemini API');
  }

  return text;
}

/**
 * Calls Gemini API and parses JSON response
 *
 * @param model - Gemini model to use
 * @param prompt - Prompt text or array of content parts
 * @param fallback - Fallback value if parsing fails
 * @param config - Optional generation config
 * @returns Parsed JSON response or fallback
 */
export async function callGeminiJSON<T>(
  model: string,
  prompt: string | any[],
  fallback?: T,
  config?: any
): Promise<T> {
  const text = await callGemini(model, prompt, config);

  if (fallback !== undefined) {
    return parseGeminiJSONSafe<T>(text, fallback);
  }

  return parseGeminiJSON<T>(text);
}
