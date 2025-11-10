/**
 * Displays AI-generated analysis including overall assessment, strengths,
 * weaknesses, and investment recommendation.
 *
 * @param analysis - Analysis object containing overall analysis, strengths, weaknesses, and recommendation
 *
 * @example
 * ```tsx
 * <AnalysisSection
 *   analysis={{
 *     overallAnalysis: "This stock shows strong momentum...",
 *     strengths: ["Excellent earnings growth", "Near 52-week high"],
 *     weaknesses: ["Low volume", "High volatility"],
 *     recommendation: "Consider for growth portfolio"
 *   }}
 * />
 * ```
 */

interface CANSLIMAnalysis {
  overallAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

interface AnalysisSectionProps {
  analysis: CANSLIMAnalysis;
}

export function AnalysisSection({ analysis }: AnalysisSectionProps) {
  return (
    <div className="analysis-section">
      <h3>AI Analysis</h3>
      <div className="analysis-content">
        <div className="overall-analysis">
          <p>{analysis.overallAnalysis}</p>
        </div>

        <div className="analysis-grid">
          {analysis.strengths.length > 0 && (
            <div className="strengths">
              <h4>💪 Strengths</h4>
              <ul>
                {analysis.strengths.map((strength, index) => (
                  <li key={index}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.weaknesses.length > 0 && (
            <div className="weaknesses">
              <h4>⚠️ Weaknesses</h4>
              <ul>
                {analysis.weaknesses.map((weakness, index) => (
                  <li key={index}>{weakness}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="recommendation">
          <h4>Recommendation</h4>
          <p>{analysis.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
