import { formatCurrency } from '../../utils/formatters';
import { InsiderData } from '../../types';

interface InsiderActivitySectionProps {
  loading: boolean;
  data: InsiderData | null;
}

/**
 * Displays insider trading activity including summary statistics and
 * a detailed transaction table with buy/sell transactions.
 *
 * @param loading - Whether insider data is currently being loaded
 * @param data - Insider trading data including summary and transaction history
 *
 * @example
 * ```tsx
 * <InsiderActivitySection
 *   loading={false}
 *   data={{
 *     summary: {
 *       totalBuyShares: 10000,
 *       totalSellShares: 5000,
 *       netShares: 5000
 *     },
 *     transactions: [
 *       { date: '2024-01-15', insider: 'John Doe', type: 'buy', shares: 1000, price: 175.50, ... }
 *     ]
 *   }}
 * />
 * ```
 */
export function InsiderActivitySection({ loading, data }: InsiderActivitySectionProps) {
  return (
    <>
      <div className="section-divider"></div>
      <h2>Insider Activity</h2>
      <div className="insider-section">
        {loading ? (
          <div className="loading-state">Loading insider data...</div>
        ) : data ? (
          <>
            <div className="insider-summary">
              <div className="summary-item">
                <span className="summary-label">Total Buy Shares:</span>
                <span className="summary-value buy">{data.summary.totalBuyShares.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Sell Shares:</span>
                <span className="summary-value sell">{data.summary.totalSellShares.toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Net Shares:</span>
                <span className={`summary-value ${data.summary.netShares >= 0 ? 'buy' : 'sell'}`}>
                  {data.summary.netShares > 0 ? '+' : ''}{data.summary.netShares.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="insider-transactions">
              <h3>Recent Transactions</h3>
              {data.transactions.length > 0 ? (
                <div className="table-wrapper">
                  <table className="insider-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Insider</th>
                        <th>Form</th>
                        <th>Type</th>
                        <th>Shares</th>
                        <th>Price</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.map((tx, idx) => (
                        <tr key={idx}>
                          <td>{tx.date ? new Date(tx.date).toLocaleDateString() : '-'}</td>
                          <td>{tx.insider}</td>
                          <td>{tx.formType}</td>
                          <td>
                            <span className={`transaction-type ${tx.type}`}>
                              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </span>
                          </td>
                          <td className="number">{tx.shares.toLocaleString()}</td>
                          <td className="number">{tx.price ? formatCurrency(tx.price) : '-'}</td>
                          <td>
                            <a href={tx.source} target="_blank" rel="noopener noreferrer" className="source-link">
                              SEC Filing
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No insider transactions found.</div>
              )}
            </div>
          </>
        ) : (
          <div className="no-data">Insider data not available for this ticker.</div>
        )}
      </div>
    </>
  );
}
