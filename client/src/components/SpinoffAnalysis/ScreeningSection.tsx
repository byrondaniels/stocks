import { Phase1Screening } from '../../types';

interface ScreeningSectionProps {
  screening: Phase1Screening;
}

export function ScreeningSection({ screening }: ScreeningSectionProps) {
  return (
    <div className="phase-section screening-section">
      <div className="phase-header">
        <h3>Phase 1: Screening Criteria</h3>
        <div className={`screening-badge ${screening.passed ? 'passed' : 'failed'}`}>
          {screening.passed ? '✓ PASSED' : '✗ FAILED'}
        </div>
      </div>

      <p className="phase-description">
        All criteria must pass for the spinoff to proceed to quality assessment.
      </p>

      <div className="criteria-list">
        {screening.criteria.map((criterion, index) => (
          <div key={index} className={`criterion-item ${criterion.status.toLowerCase()}`}>
            <div className="criterion-header">
              <span className={`criterion-icon ${criterion.status.toLowerCase()}`}>
                {criterion.status === 'PASS' ? '✓' : '✗'}
              </span>
              <span className="criterion-name">{criterion.name}</span>
              <span className={`criterion-status ${criterion.status.toLowerCase()}`}>
                {criterion.status}
              </span>
            </div>
            <div className="criterion-details">{criterion.details}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
