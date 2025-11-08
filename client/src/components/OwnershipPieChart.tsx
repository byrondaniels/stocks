import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { OwnershipData } from '../types';
import './OwnershipPieChart.css';

interface OwnershipPieChartProps {
  ownershipData: OwnershipData;
}

const COLORS = {
  institutional: '#0088FE',
  insider: '#00C49F',
  public: '#FFBB28',
};

const OwnershipPieChart: React.FC<OwnershipPieChartProps> = ({ ownershipData }) => {
  const data = [
    {
      name: 'Institutional',
      value: ownershipData.institutionalOwnership,
      percentage: ownershipData.institutionalOwnership.toFixed(2),
    },
    {
      name: 'Insider',
      value: ownershipData.insiderOwnership,
      percentage: ownershipData.insiderOwnership.toFixed(2),
    },
    {
      name: 'Public/Retail',
      value: ownershipData.publicOwnership,
      percentage: ownershipData.publicOwnership.toFixed(2),
    },
  ];

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`;
  };

  const lastUpdated = new Date(ownershipData.timestamp).toLocaleString();

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
              <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
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
          <p>Float Shares: {ownershipData.floatShares.toLocaleString()}</p>
          <p>Shares Outstanding: {ownershipData.sharesOutstanding.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default OwnershipPieChart;
