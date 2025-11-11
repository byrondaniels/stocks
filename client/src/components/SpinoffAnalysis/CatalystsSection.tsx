interface CatalystsSectionProps {
  catalysts: string[];
  redFlags: string[];
}

export function CatalystsSection({ catalysts, redFlags }: CatalystsSectionProps) {
  return (
    <div className="phase-section catalysts-section">
      <div className="phase-header">
        <h3>Phase 4: Catalysts & Red Flags</h3>
      </div>

      <div className="catalysts-grid">
        <div className="catalysts-column">
          <div className="column-header catalysts-header">
            <span className="header-icon">📈</span>
            <h4>Investment Catalysts</h4>
          </div>
          {catalysts.length > 0 ? (
            <ul className="catalysts-list">
              {catalysts.map((catalyst, index) => (
                <li key={index} className="catalyst-item">
                  <span className="bullet">•</span>
                  {catalyst}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-message">No specific catalysts identified.</p>
          )}
        </div>

        <div className="red-flags-column">
          <div className="column-header red-flags-header">
            <span className="header-icon">⚠️</span>
            <h4>Red Flags</h4>
          </div>
          {redFlags.length > 0 ? (
            <ul className="red-flags-list">
              {redFlags.map((flag, index) => (
                <li key={index} className="red-flag-item">
                  <span className="bullet">!</span>
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-message success-message">No major red flags identified.</p>
          )}
        </div>
      </div>
    </div>
  );
}
