/**
 * Shared Stock Data Sections Component
 * Contains the general stock analysis sections that are shared between StockDetail and Explore pages
 */

import { useState } from 'react';
import { PriceLineChart } from './PriceLineChart';
import OwnershipPieChart from './OwnershipPieChart';
import { CANSLIMScore as CANSLIMScoreComponent } from './CANSLIMScore';
import { RSIndicator } from './RSIndicator';
import { MovingAverageSection, InsiderActivitySection } from './StockDetail';
import TabNavigation, { Tab } from './TabNavigation';
import { InsiderData, OwnershipData, MovingAverageData, PriceHistoryPoint } from '../types';

interface StockDataSectionsProps {
  ticker: string;
  priceHistory: PriceHistoryPoint[];
  loadingPriceHistory: boolean;
  ownershipData: OwnershipData | null;
  loadingOwnership: boolean;
  movingAverageData: MovingAverageData | null;
  loadingMA: boolean;
  insiderData: InsiderData | null;
  loadingInsiders: boolean;
}

export function StockDataSections({
  ticker,
  priceHistory,
  loadingPriceHistory,
  ownershipData,
  loadingOwnership,
  movingAverageData,
  loadingMA,
  insiderData,
  loadingInsiders,
}: StockDataSectionsProps) {
  const [activeTab, setActiveTab] = useState<string>('overview');

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analysis', label: 'Analysis', icon: '📈' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Price History Chart */}
            <div className="price-history-section">
              {loadingPriceHistory ? (
                <div className="loading-state">Loading price history...</div>
              ) : priceHistory.length > 0 ? (
                <PriceLineChart data={priceHistory} ticker={ticker} />
              ) : (
                <div className="no-data">Price history not available for this ticker.</div>
              )}
            </div>

            {/* Ownership Distribution Section */}
            <div className="section-divider"></div>
            <h2>Ownership Distribution</h2>
            <div className="ownership-section">
              {loadingOwnership ? (
                <div className="loading-state">Loading ownership data...</div>
              ) : ownershipData ? (
                <OwnershipPieChart ownershipData={ownershipData} />
              ) : (
                <div className="no-data">Ownership data not available for this ticker.</div>
              )}
            </div>

            <MovingAverageSection loading={loadingMA} data={movingAverageData} />

            <InsiderActivitySection loading={loadingInsiders} data={insiderData} />
          </>
        );

      case 'analysis':
        return (
          <>
            {/* CANSLIM Score Section */}
            <div className="section-divider"></div>
            <h2>CANSLIM Analysis</h2>
            <div className="canslim-section">
              <CANSLIMScoreComponent ticker={ticker} />
            </div>

            {/* RS Rating Section */}
            <div className="section-divider"></div>
            <h2>Relative Strength</h2>
            <div className="rs-section">
              <RSIndicator ticker={ticker} />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="stock-detail">
      <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {renderTabContent()}
    </div>
  );
}