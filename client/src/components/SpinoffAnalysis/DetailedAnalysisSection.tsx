import ReactMarkdown from 'react-markdown';
import { DataSource } from '../../types';

interface DetailedAnalysisSectionProps {
  detailedAnalysis: string;
  sources: DataSource[];
  analysisDate: string;
}

export function DetailedAnalysisSection({
  detailedAnalysis,
  sources,
  analysisDate,
}: DetailedAnalysisSectionProps) {
  return (
    <div className="phase-section detailed-analysis-section">
      <div className="phase-header">
        <h3>Detailed Analysis</h3>
        <span className="analysis-date">Analyzed: {analysisDate}</span>
      </div>

      <div className="markdown-content">
        <ReactMarkdown>{detailedAnalysis}</ReactMarkdown>
      </div>

      {sources.length > 0 && (
        <div className="sources-section">
          <h4>Data Sources</h4>
          <ul className="sources-list">
            {sources.map((source, index) => (
              <li key={index} className="source-item">
                <span className="source-name">{source.name}</span>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    View Source →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
