import React from 'react';
import { BrandId } from '../../types/strategy';
import { RotateCcw, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: BrandId;
  onTabChange: (tab: BrandId) => void;
  onReset: () => void;
  isCloudSynced?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onReset,
  isCloudSynced = false,
}) => {
  const tabs: { id: BrandId; name: string }[] = [
    { id: 'overview', name: '통합 대시보드' },
    { id: 'mudscone', name: '머드스콘' },
    { id: 'oatter', name: '오터' },
    { id: 'wysh', name: '위시' },
    { id: 'ledger', name: '매출 장부' },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-xl font-black">
            🧁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-orange-100 to-white">
                Mud Scone, Inc.
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                전략 대시보드
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">ERRC 그리드 · 전략 캔버스 · 매출 통합 관리</p>
          </div>
        </div>

        {/* Clean Korean Brand Tabs without Scroll */}
        <nav className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800/90">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-amber-600 text-white shadow-md`
                    : `text-slate-400 hover:text-slate-200 hover:bg-slate-800/50`
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </nav>

        {/* Cloud Status & Reset */}
        <div className="flex items-center gap-2">
          {isCloudSynced ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              <span>클라우드 자동 저장</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>실시간 동기화 완료</span>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-xs font-medium border border-slate-800 hover:border-red-900/50 transition"
            title="초기 엑셀 데이터로 되돌리기"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
