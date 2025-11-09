/**
 * Centralized error handling utilities for API routes
 */

import { Response } from "express";
import { HTTP_STATUS } from "../constants.js";

export interface ApiError {
  code?: string;
  message: string;
  retryAfter?: number;
}

/**
 * Handles API errors and sends appropriate HTTP responses
 * @param res - Express response object
 * @param error - Error object to handle
 * @param defaultErrorMessage - Default error message if no specific error is provided
 */
export function handleApiError(
  res: Response,
  error: unknown,
  defaultErrorMessage: string
): void {
  const apiError = error as ApiError;

  // Handle rate limit errors
  if (apiError.code === "RATE_LIMIT") {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      error: apiError.message,
      retryAfter: apiError.retryAfter,
    });
    return;
  }

  // Handle not found errors
  if (apiError.code === "NOT_FOUND") {
    res.status(HTTP_STATUS.NOT_FOUND).json({ error: apiError.message });
    return;
  }

  // Handle generic errors
  res.status(HTTP_STATUS.BAD_GATEWAY).json({
    error: defaultErrorMessage,
  });
}

/**
 * Sends a bad request (400) error response
 * @param res - Express response object
 * @param message - Error message to send
 */
export function sendBadRequest(res: Response, message: string): void {
  res.status(HTTP_STATUS.BAD_REQUEST).json({ error: message });
}

/**
 * Sends a not found (404) error response
 * @param res - Express response object
 * @param message - Error message to send
 */
export function sendNotFound(res: Response, message: string): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({ error: message });
}

/**
 * Sends an internal server error (500) response
 * @param res - Express response object
 * @param message - Error message to send
 */
export function sendInternalError(res: Response, message: string): void {
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: message });
}
