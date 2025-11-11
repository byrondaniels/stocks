import { Phase2Quality, QualityMetric } from '../../types';

interface QualitySectionProps {
  quality: Phase2Quality;
}

interface QualityMetricCardProps {
  title: string;
  metric: QualityMetric;
}

function QualityMetricCard({ title, metric }: QualityMetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 4) return 'score-excellent';
    if (score >= 3) return 'score-good';
    if (score >= 2) return 'score-fair';
    return 'score-poor';
  };

  return (
    <div className="quality-metric-card">
      <div className="metric-header">
        <h4>{title}</h4>
        <span className="metric-weight">{(metric.weight * 100).toFixed(0)}% weight</span>
      </div>
      <div className={`metric-score ${getScoreColor(metric.score)}`}>
        <span className="score-number">{metric.score}</span>
        <span className="score-max">/5</span>
      </div>
      <div className="score-bar">
        <div
          className={`score-fill ${getScoreColor(metric.score)}`}
          style={{ width: `${(metric.score / 5) * 100}%` }}
        ></div>
      </div>
      <p className="metric-explanation">{metric.explanation}</p>
    </div>
  );
}

export function QualitySection({ quality }: QualitySectionProps) {
  return (
    <div className="phase-section quality-section">
      <div className="phase-header">
        <h3>Phase 2: Quality Assessment</h3>
        <div className="weighted-score">
          Weighted Average: <strong>{quality.weighted_average.toFixed(2)}</strong> / 5.0
        </div>
      </div>

      <p className="phase-description">
        Each factor is scored 1-5 and weighted by importance to calculate overall quality.
      </p>

      <div className="quality-grid">
        <QualityMetricCard
          title="Competitive Position"
          metric={quality.competitive_position}
        />
        <QualityMetricCard
          title="Revenue Quality"
          metric={quality.revenue_quality}
        />
        <QualityMetricCard
          title="Profitability"
          metric={quality.profitability}
        />
        <QualityMetricCard
          title="Management"
          metric={quality.management}
        />
        <QualityMetricCard
          title="Strategic Value"
          metric={quality.strategic_value}
        />
      </div>
    </div>
  );
}
