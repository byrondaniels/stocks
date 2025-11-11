import { Phase3Valuation } from '../../types';

interface ValuationSectionProps {
  valuation: Phase3Valuation;
}

export function ValuationSection({ valuation }: ValuationSectionProps) {
  return (
    <div className="phase-section valuation-section">
      <div className="phase-header">
        <h3>Phase 3: Valuation Metrics</h3>
      </div>

      <p className="phase-description">
        Key valuation metrics compared against investment thresholds.
      </p>

      <div className="valuation-table">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Threshold</th>
              <th>Status</th>
              <th>Calculation</th>
            </tr>
          </thead>
          <tbody>
            {valuation.metrics.map((metric, index) => (
              <tr key={index} className={metric.meets_threshold ? 'meets-threshold' : 'fails-threshold'}>
                <td className="metric-name">{metric.name}</td>
                <td className="metric-value">{metric.value}</td>
                <td className="metric-threshold">{metric.threshold}</td>
                <td className="metric-status">
                  <span className={`status-badge ${metric.meets_threshold ? 'pass' : 'fail'}`}>
                    {metric.meets_threshold ? '✓' : '✗'}
                  </span>
                </td>
                <td className="metric-calculation">
                  <details>
                    <summary>Show calculation</summary>
                    <pre>{metric.calculation}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="valuation-summary">
        <strong>Metrics Meeting Thresholds:</strong>{' '}
        {valuation.metrics.filter(m => m.meets_threshold).length} / {valuation.metrics.length}
      </div>
    </div>
  );
}
