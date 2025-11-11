import { ExecutiveSummary } from '../../types';

interface ExecutiveSummarySectionProps {
  summary: ExecutiveSummary;
}

export function ExecutiveSummarySection({ summary }: ExecutiveSummarySectionProps) {
  const getRecommendationClass = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return 'recommendation-buy';
      case 'PASS':
        return 'recommendation-pass';
      case 'AVOID':
        return 'recommendation-avoid';
      default:
        return '';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'BUY':
        return '✓';
      case 'PASS':
        return '−';
      case 'AVOID':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <div className="executive-summary-section">
      <div className="summary-grid">
        <div className="summary-card score-card">
          <div className="card-label">Overall Score</div>
          <div className="card-value score-value">{summary.overall_score.toFixed(1)}</div>
          <div className="card-sublabel">out of 5.0</div>
        </div>

        <div className={`summary-card recommendation-card ${getRecommendationClass(summary.recommendation)}`}>
          <div className="card-label">Recommendation</div>
          <div className="card-value recommendation-value">
            <span className="recommendation-icon">{getRecommendationIcon(summary.recommendation)}</span>
            {summary.recommendation}
          </div>
        </div>

        <div className="summary-card position-card">
          <div className="card-label">Position Size</div>
          <div className="card-value position-value">{summary.position_size}</div>
        </div>
      </div>

      <div className="key-thesis">
        <h3>Investment Thesis</h3>
        <p>{summary.key_thesis}</p>
      </div>
    </div>
  );
}
