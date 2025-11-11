import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PriceHistoryPoint } from '../types';
import './PriceLineChart.css';

export interface PricePoint {
  date: string;
  close: number;
}

interface PriceLineChartProps {
  data: PricePoint[] | PriceHistoryPoint[];
  ticker: string;
  compact?: boolean; // For sparkline mode
  height?: number;
}

export function PriceLineChart({ data, ticker, compact = false, height = 250 }: PriceLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`price-chart ${compact ? 'compact' : ''}`}>
        <p className="no-data">No price history available</p>
      </div>
    );
  }

  // Format data for the chart and reverse to show earliest dates on left
  const chartData = data.map((point) => ({
    date: new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    price: point.close,
  })).reverse();

  // Calculate price change (first is oldest, last is newest)
  const firstPrice = data[data.length - 1]?.close || 0; // oldest price
  const lastPrice = data[0]?.close || 0; // newest price
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Determine line color based on trend
  const lineColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className={`price-chart ${compact ? 'compact' : ''}`}>
      {!compact && (
        <div className="chart-header">
          <h3>{ticker} - 50 Day Price Trend</h3>
          <div className={`price-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={compact ? { top: 5, right: 5, left: 5, bottom: 5 } : { top: 10, right: 30, left: 0, bottom: 0 }}
        >
          {!compact && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}

          <XAxis
            dataKey="date"
            tick={compact ? false : { fontSize: 12 }}
            axisLine={!compact}
            hide={compact}
          />

          <YAxis
            domain={['auto', 'auto']}
            tick={compact ? false : { fontSize: 12 }}
            axisLine={!compact}
            hide={compact}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />

          {!compact && (
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '14px',
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
          )}

          <Line
            type="monotone"
            dataKey="price"
            stroke={lineColor}
            strokeWidth={compact ? 1.5 : 2}
            dot={compact ? false : { r: 3, fill: lineColor }}
            activeDot={compact ? false : { r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {!compact && (
        <div className="chart-footer">
          <span className="data-points">{data.length} days of data</span>
        </div>
      )}
    </div>
  );
}
