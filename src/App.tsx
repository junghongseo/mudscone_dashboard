import React, { useState, useEffect, useMemo } from 'react';
import { BrandId, BrandStrategyData, ERRCItem, ERRCQuadrant, BusinessItem, RevenueGoal } from './types/strategy';
import { INITIAL_BRAND_DATA } from './data/initialData';
import { REVENUE_HISTORY_DATA, DailyRevenueRecord } from './data/revenueHistoryData';
import { Navbar } from './components/layout/Navbar';
import { StrategyCanvasChart } from './components/strategy/StrategyCanvasChart';
import { RevenueTracker } from './components/revenue/RevenueTracker';
import { YoYRevenueChart } from './components/revenue/YoYRevenueChart';
import { RevenueLedger } from './components/revenue/RevenueLedger';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { isSupabaseConfigured } from './lib/supabase';

const STRATEGY_STORAGE_KEY = 'mudscone_dashboard_strategy_v5';
const REVENUE_RECORDS_KEY = 'mudscone_revenue_records_v1';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<BrandId>('overview');

  // Initialize Brand Data State
  const [brandDataMap, setBrandDataMap] = useState<Record<'mudscone' | 'oatter' | 'wysh', BrandStrategyData>>(() => {
    const saved = localStorage.getItem(STRATEGY_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage strategy data:', e);
      }
    }
    return INITIAL_BRAND_DATA;
  });

  // Initialize Revenue History Records State
  const [revenueRecords, setRevenueRecords] = useState<DailyRevenueRecord[]>(() => {
    const saved = localStorage.getItem(REVENUE_RECORDS_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse local storage revenue records:', e);
      }
    }
    return REVENUE_HISTORY_DATA;
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(brandDataMap));
  }, [brandDataMap]);

  useEffect(() => {
    localStorage.setItem(REVENUE_RECORDS_KEY, JSON.stringify(revenueRecords));
  }, [revenueRecords]);

  // Dynamically Sync currentAmount from revenueRecords for target year
  const syncedBrandDataMap = useMemo(() => {
    const result = { ...brandDataMap };

    (['mudscone', 'oatter', 'wysh'] as const).forEach((bId) => {
      const brand = result[bId];
      const targetYear = brand.revenue.year;

      // Sum from ledger records for targetYear
      const sum = revenueRecords
        .filter((r) => r.year === targetYear)
        .reduce((acc, r) => acc + (r[bId] || 0), 0);

      result[bId] = {
        ...brand,
        revenue: {
          ...brand.revenue,
          currentAmount: sum,
        },
      };
    });

    return result;
  }, [brandDataMap, revenueRecords]);

  // Current active brand data helper
  const currentBrandId = activeTab === 'overview' || activeTab === 'ledger' ? 'mudscone' : activeTab;
  const currentBrandData = syncedBrandDataMap[currentBrandId];

  // Handler: Save or Update Revenue Record
  const handleSaveRevenueRecord = (record: DailyRevenueRecord) => {
    setRevenueRecords((prev) => {
      const idx = prev.findIndex((r) => r.date === record.date);
      let updated: DailyRevenueRecord[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = record;
      } else {
        updated = [...prev, record];
        updated.sort((a, b) => a.date.localeCompare(b.date));
      }
      return updated;
    });
  };

  // Handler: Delete Revenue Record
  const handleDeleteRevenueRecord = (date: string) => {
    setRevenueRecords((prev) => prev.filter((r) => r.date !== date));
  };

  // Handler: Add ERRC Item
  const handleAddERRCItem = (newItem: Omit<ERRCItem, 'id'>) => {
    const id = `errc-${Date.now()}`;
    const item: ERRCItem = { ...newItem, id };

    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedERRC = [...brand.errcItems, item];
      const updatedScores = { ...brand.scores };

      brand.businesses.forEach((biz) => {
        const defaultScore = biz.isSelf
          ? item.quadrant === 'E' || item.quadrant === 'R_raise' || item.quadrant === 'C'
            ? 5
            : 3
          : 2.5;
        updatedScores[`${biz.id}_${id}`] = defaultScore;
      });

      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          errcItems: updatedERRC,
          scores: updatedScores,
        },
      };
    });
  };

  // Handler: Update ERRC Item
  const handleUpdateERRCItem = (updatedItem: ERRCItem) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedERRC = brand.errcItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          errcItems: updatedERRC,
        },
      };
    });
  };

  // Handler: Delete ERRC Item
  const handleDeleteERRCItem = (id: string) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedERRC = brand.errcItems.filter((item) => item.id !== id);
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          errcItems: updatedERRC,
        },
      };
    });
  };

  // Handler: Drag and Drop Reorder
  const handleReorderItems = (quadrant: ERRCQuadrant, reorderedQuadrantItems: ERRCItem[]) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const otherItems = brand.errcItems.filter((item) => item.quadrant !== quadrant);
      
      const quadrantsOrder: ERRCQuadrant[] = ['E', 'R_raise', 'R_reduce', 'C'];
      let newErrcList: ERRCItem[] = [];

      quadrantsOrder.forEach((q) => {
        if (q === quadrant) {
          newErrcList.push(...reorderedQuadrantItems);
        } else {
          newErrcList.push(...otherItems.filter((item) => item.quadrant === q));
        }
      });

      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          errcItems: newErrcList,
        },
      };
    });
  };

  // Handler: Update Strategy Score
  const handleUpdateScore = (businessId: string, errcItemId: string, score: number) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const key = `${businessId}_${errcItemId}`;
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          scores: {
            ...brand.scores,
            [key]: score,
          },
        },
      };
    });
  };

  // Handler: Add Business
  const handleAddBusiness = (newBiz: Omit<BusinessItem, 'id'>) => {
    const id = `biz-${Date.now()}`;
    const biz: BusinessItem = { ...newBiz, id };

    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedBizs = [...brand.businesses, biz];
      const updatedScores = { ...brand.scores };

      brand.errcItems.forEach((item) => {
        updatedScores[`${id}_${item.id}`] = 3;
      });

      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          businesses: updatedBizs,
          scores: updatedScores,
        },
      };
    });
  };

  // Handler: Update Business
  const handleUpdateBusiness = (updatedBiz: BusinessItem) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedBizs = brand.businesses.map((b) => (b.id === updatedBiz.id ? updatedBiz : b));
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          businesses: updatedBizs,
        },
      };
    });
  };

  // Handler: Delete Business
  const handleDeleteBusiness = (id: string) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      const updatedBizs = brand.businesses.filter((b) => b.id !== id);
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          businesses: updatedBizs,
        },
      };
    });
  };

  // Handler: Update Revenue Goal
  const handleUpdateRevenue = (updatedRevenue: RevenueGoal) => {
    setBrandDataMap((prev) => {
      const brand = prev[currentBrandId];
      return {
        ...prev,
        [currentBrandId]: {
          ...brand,
          revenue: updatedRevenue,
        },
      };
    });
  };

  const handleReset = () => {
    if (confirm('모든 변경사항을 초기화하고 기본 엑셀 데이터 및 데모로 되돌리시겠습니까?')) {
      setBrandDataMap(INITIAL_BRAND_DATA);
      setRevenueRecords(REVENUE_HISTORY_DATA);
      localStorage.removeItem(STRATEGY_STORAGE_KEY);
      localStorage.removeItem(REVENUE_RECORDS_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-16">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onReset={handleReset}
        isCloudSynced={isSupabaseConfigured}
      />

      {/* Main Workspace Content */}
      <main className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6 flex-1 space-y-6">
        {activeTab === 'overview' ? (
          <OverviewDashboard
            brands={syncedBrandDataMap}
            revenueRecords={revenueRecords}
            onSelectBrand={(brandId) => setActiveTab(brandId)}
          />
        ) : activeTab === 'ledger' ? (
          <RevenueLedger
            records={revenueRecords}
            onSaveRecord={handleSaveRevenueRecord}
            onDeleteRecord={handleDeleteRevenueRecord}
          />
        ) : (
          <div className="space-y-6">
            {/* Brand Header Banner */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shadow-lg"
                  style={{ backgroundColor: `${currentBrandData.themeColor}30`, color: currentBrandData.themeColor, border: `1px solid ${currentBrandData.themeColor}60` }}
                >
                  {activeTab === 'mudscone' ? '🧁' : activeTab === 'oatter' ? '🌾' : '✨'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-white">
                      {currentBrandData.name} ({currentBrandData.englishName})
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {currentBrandData.tagline}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Row: Revenue Goal & Realtime Progress */}
            <RevenueTracker
              brandName={currentBrandData.name}
              revenue={currentBrandData.revenue}
              onUpdateRevenue={handleUpdateRevenue}
            />

            {/* Brand Daily YoY Revenue Comparison & Channel Breakdown Chart */}
            <YoYRevenueChart
              brandId={activeTab}
              brandName={`${currentBrandData.name}`}
              showChannels={true}
            />

            {/* Strategy Canvas Straight Line Chart with Integrated Collapsible ERRC Grid & Collapsible Strategy Table */}
            <StrategyCanvasChart
              data={currentBrandData}
              onUpdateScore={handleUpdateScore}
              onAddBusiness={handleAddBusiness}
              onUpdateBusiness={handleUpdateBusiness}
              onDeleteBusiness={handleDeleteBusiness}
              onAddERRCItem={handleAddERRCItem}
              onUpdateERRCItem={handleUpdateERRCItem}
              onDeleteERRCItem={handleDeleteERRCItem}
              onReorderERRCItems={handleReorderItems}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-500 py-6 border-t border-slate-900">
        <p>© 2026 Mud Scone, Inc. All rights reserved. Strategic Business Unit Dashboard.</p>
      </footer>
    </div>
  );
};

export default App;
