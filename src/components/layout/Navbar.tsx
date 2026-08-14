import React from 'react';
import { BrandId } from '../../types/strategy';
import { RotateCcw, Database, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  activeTab: BrandId;
  onTabChange: (tab: BrandId) => void;
  onReset: () => void;
  isCloudSynced?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onReset,
  isCloudSynced = false,
  theme = 'dark',
  onToggleTheme,
}) => {
  const tabs: { id: BrandId; name: string }[] = [
    { id: 'overview', name: '통합 대시보드' },
    { id: 'mudscone', name: '머드스콘' },
    { id: 'oatter', name: '오터' },
    { id: 'wysh', name: '위시' },
    { id: 'ledger', name: '매출 장부' },
    { id: 'production', name: '생산팀 주문 정리' },
    { id: 'vat', name: '부가세 신고' },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Logo & Title */}
        <button
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-amber-500/40 rounded-xl p-1 -m-1 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-xl font-black">
            🧁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-orange-500 to-amber-400">
                Mud Scone Dashboard
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                전략 대시보드
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">ERRC 그리드 · 전략 캔버스 · 매출 통합 관리</p>
          </div>
        </button>

        {/* Clean Korean Brand Tabs without Scroll */}
        <nav className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800/90 shadow-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? `bg-amber-500 text-slate-950 shadow-md font-extrabold`
                    : `text-slate-400 hover:text-slate-200 hover:bg-slate-800/50`
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </nav>

        {/* Cloud Status, Theme Toggle & Reset */}
        <div className="flex items-center gap-2">
          {/* Sun / Moon Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
              }`}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                  <span className="hidden sm:inline">라이트 모드</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-amber-600" />
                  <span className="hidden sm:inline">다크 모드</span>
                </>
              )}
            </button>
          )}

          {isCloudSynced ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">클라우드 저장</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">동기화 완료</span>
            </div>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-medium border border-slate-800 hover:border-rose-500/30 transition"
            title="초기 엑셀 데이터로 되돌리기"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
};
