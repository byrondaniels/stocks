import { PortfolioStock } from '../types';
import { InsiderActivity } from './InsiderActivity';

interface PortfolioTableProps {
  stocks: PortfolioStock[];
  onRemove: (ticker: string) => void;
  onDetail: (ticker: string) => void;
}

export function PortfolioTable({ stocks, onRemove, onDetail }: PortfolioTableProps) {
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '-';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined) return '-';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="table-container">
      <table className="portfolio-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Shares</th>
            <th>Purchase Price</th>
            <th>Purchase Date</th>
            <th>Current Price</th>
            <th>Total Value</th>
            <th>Profit/Loss</th>
            <th>Profit/Loss %</th>
            <th>Insider Activity</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((stock) => {
            const totalValue = stock.currentPrice !== undefined
              ? stock.currentPrice * stock.shares
              : undefined;
            const isProfitable = stock.profitLoss !== undefined && stock.profitLoss >= 0;

            return (
              <tr key={stock.ticker}>
                <td>
                  <button
                    className="ticker-link"
                    onClick={() => onDetail(stock.ticker)}
                  >
                    {stock.ticker}
                  </button>
                </td>
                <td className="number">{stock.shares}</td>
                <td className="number">{formatCurrency(stock.purchasePrice)}</td>
                <td>{formatDate(stock.purchaseDate)}</td>
                <td className="number">{formatCurrency(stock.currentPrice)}</td>
                <td className="number">{formatCurrency(totalValue)}</td>
                <td className={`number ${isProfitable ? 'profit' : 'loss'}`}>
                  {formatCurrency(stock.profitLoss)}
                </td>
                <td className={`number ${isProfitable ? 'profit' : 'loss'}`}>
                  {formatPercent(stock.profitLossPercent)}
                </td>
                <td className="insider-cell">
                  <InsiderActivity summary={stock.insiderActivity} />
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-detail"
                      onClick={() => onDetail(stock.ticker)}
                    >
                      Detail
                    </button>
                    <button
                      className="btn-remove"
                      onClick={() => onRemove(stock.ticker)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
