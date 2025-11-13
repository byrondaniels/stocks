/**
 * SpinoffLookup Model
 * Stores simple spinoff identification data
 */

import mongoose, { Document, Model } from "mongoose";
import { SpinoffLookupSchema } from "../schemas.js";

/**
 * Interface for SpinoffLookup document
 */
export interface ISpinoffLookupDocument extends Document {
  /** Stock ticker symbol */
  ticker: string;
  /** Whether the company is a spinoff within the last 2 years */
  isSpinoff: boolean;
  /** Name of the parent company (null if not a spinoff) */
  parentCompany: string | null;
  /** NYSE/NASDAQ ticker of the parent company (null if not a spinoff) */
  parentTicker: string | null;
  /** When this lookup was performed */
  analyzedAt: Date;
}

export const SpinoffLookupModel: Model<ISpinoffLookupDocument> =
  mongoose.model<ISpinoffLookupDocument>(
    "SpinoffLookup",
    SpinoffLookupSchema,
    "spinoffLookups"
  );
