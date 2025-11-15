/**
 * SpinoffQualityAnalysis Model
 * Stores cached spinoff quality analysis results
 */

import mongoose, { Document, Model } from "mongoose";
import { SpinoffQualityAnalysisSchema } from "../schemas.js";
import { SpinoffQualityAnalysis } from "../../services/spinoffQualityAnalysis.service.js";

export interface ISpinoffQualityAnalysisDocument extends Document {
  ticker: string;
  analysis: SpinoffQualityAnalysis;
  timestamp: Date;
}

export const SpinoffQualityAnalysisModel: Model<ISpinoffQualityAnalysisDocument> =
  mongoose.model<ISpinoffQualityAnalysisDocument>(
    "SpinoffQualityAnalysis",
    SpinoffQualityAnalysisSchema,
    "spinoffQualityAnalyses"
  );
