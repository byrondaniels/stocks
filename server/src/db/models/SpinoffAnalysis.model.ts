/**
 * SpinoffAnalysis Model
 * Stores cached spinoff investment analysis results
 */

import mongoose, { Document, Model } from "mongoose";
import { SpinoffAnalysisSchema } from "../schemas.js";
import { SpinoffAnalysis } from "../../services/spinoffAnalyzer.js";

export interface ISpinoffAnalysisDocument extends Document {
  ticker: string;
  analysis: SpinoffAnalysis;
  timestamp: Date;
}

export const SpinoffAnalysisModel: Model<ISpinoffAnalysisDocument> =
  mongoose.model<ISpinoffAnalysisDocument>(
    "SpinoffAnalysis",
    SpinoffAnalysisSchema,
    "spinoffAnalyses"
  );
