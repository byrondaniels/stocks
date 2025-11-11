import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { OwnershipData } from '../types';
import { CHART_COLORS } from '../constants';
import './OwnershipPieChart.css';

interface OwnershipPieChartProps {
  ownershipData: OwnershipData;
}

const COLORS = [
  CHART_COLORS.INSTITUTIONAL,
  CHART_COLORS.INSIDER,
  CHART_COLORS.PUBLIC,
];

const OwnershipPieChart: React.FC<OwnershipPieChartProps> = ({ ownershipData }) => {
  const data = [
    {
      name: 'Institutional',
      value: ownershipData.breakdown.institutionalPercent,
      percentage: ownershipData.breakdown.institutionalPercent.toFixed(2),
    },
    {
      name: 'Insider',
      value: ownershipData.breakdown.insiderPercent,
      percentage: ownershipData.breakdown.insiderPercent.toFixed(2),
    },
    {
      name: 'Public/Retail',
      value: ownershipData.breakdown.publicPercent,
      percentage: ownershipData.breakdown.publicPercent.toFixed(2),
    },
  ];

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  const lastUpdated = new Date(ownershipData.lastUpdated).toLocaleString();

  return (
    <div className="ownership-chart-container">
      <h3>Stock Ownership Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)}%`}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="ownership-metadata">
        <p className="ownership-source">Source: {ownershipData.source.toUpperCase()}</p>
        <p className="ownership-timestamp">Last updated: {lastUpdated}</p>
        <div className="ownership-shares-info">
          <p>Float Shares: {ownershipData.breakdown.floatShares.toLocaleString()}</p>
          <p>Shares Outstanding: {ownershipData.sharesOutstanding.toLocaleString()}</p>
        </div>
        {ownershipData.topHolders.length > 0 && (
          <div className="top-holders-section">
            <h4>Top Holders</h4>
            <div className="top-holders-list">
              {ownershipData.topHolders.slice(0, 5).map((holder, index) => (
                <div key={index} className="holder-item">
                  <span className="holder-name">{holder.name}</span>
                  <span className="holder-ownership">{holder.percentOwnership.toFixed(2)}%</span>
                  <span className="holder-type">{holder.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnershipPieChart;
