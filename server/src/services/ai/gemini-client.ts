/**
 * Centralized Gemini AI Client
 * Single source of truth for Gemini API integration
 *
 * This module provides a singleton Gemini client to avoid multiple initializations
 * and ensure consistent configuration across all AI-powered features.
 *
 * @example
 * import { getGeminiClient, GEMINI_MODELS } from './ai/gemini-client';
 *
 * const client = getGeminiClient();
 * const response = await client.models.generateContent({
 *   model: GEMINI_MODELS.FLASH,
 *   contents: [{ role: 'user', parts: [{ text: 'Hello!' }] }]
 * });
 */

import { GoogleGenAI } from '@google/genai';

// Singleton instance
let geminiClient: GoogleGenAI | null = null;

/**
 * Gets the singleton Gemini client instance
 *
 * Initializes the client on first call and reuses it for subsequent calls.
 * Validates that GEMINI_API_KEY environment variable is configured.
 *
 * @returns Gemini AI client instance
 * @throws {Error} If GEMINI_API_KEY is not configured
 *
 * @example
 * const client = getGeminiClient();
 * // Client is now ready to use for API calls
 */
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    console.log('[Gemini] Client initialized successfully');
  }

  return geminiClient;
}

/**
 * Default generation configuration for consistent AI responses
 *
 * These settings provide a good balance between creativity and reliability:
 * - temperature: 0.7 - Moderate randomness for natural responses
 * - topK: 40 - Consider top 40 most likely tokens
 * - topP: 0.95 - Nucleus sampling for quality
 */
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
} as const;

/**
 * Available Gemini model identifiers
 *
 * - FLASH: Fast, efficient model for most tasks (gemini-2.0-flash)
 * - PRO: More capable model for complex tasks (gemini-1.5-pro-latest)
 */
export const GEMINI_MODELS = {
  FLASH: 'gemini-2.0-flash',
  PRO: 'gemini-1.5-pro-latest',
} as const;

/**
 * Resets the singleton instance (useful for testing)
 *
 * @internal
 */
export function resetGeminiClient(): void {
  geminiClient = null;
}
