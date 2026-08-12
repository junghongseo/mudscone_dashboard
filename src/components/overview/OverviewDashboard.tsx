import React from 'react';
import { BrandStrategyData } from '../../types/strategy';
import { DailyRevenueRecord } from '../../data/revenueHistoryData';
import { YoYRevenueChart } from '../revenue/YoYRevenueChart';
import { Cookie, Wheat, Sparkles, Target, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OverviewDashboardProps {
  brands: Record<'mudscone' | 'oatter' | 'wysh', BrandStrategyData>;
  revenueRecords: DailyRevenueRecord[];
  onSelectBrand: (brandId: 'mudscone' | 'oatter' | 'wysh') => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  brands,
  revenueRecords,
  onSelectBrand,
}) => {
  const brandList = [brands.mudscone, brands.oatter, brands.wysh];

  // Total 2026 Target Revenue
  const totalTarget = brandList.reduce((acc, b) => acc + b.revenue.targetAmount, 0);

  // Total 2026 Actual Sum synced from Revenue Ledger (Includes Mud Scone, Oatter, Wysh, and Mudsanghoe)
  const totalCurrentSynced = revenueRecords
    .filter((r) => r.year === 2026)
    .reduce((acc, r) => acc + r.total, 0);

  const totalPercentage = Math.min(
    100,
    Math.round((totalCurrentSynced / (totalTarget || 1)) * 100 * 10) / 10
  );

  const formatKRW = (num: number) => {
    if (num >= 100000000) {
      return `${(num / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
    }
    return `${(num / 10000).toLocaleString('ko-KR')}만원`;
  };

  return (
    <div className="space-y-6">
      {/* Group Revenue Summary Banner (Synced with Revenue Ledger) */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-slate-950 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <Target className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-black text-white tracking-tight">
                Mud Scone, Inc. 통합 브랜드 성과 대시보드
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              머드스콘(Mud Scone), 오터(Oatter), 위시(Wysh) 및 머드상회의 일자별 합산 매출 실적을 전년 동기와 실시간 비교 분석합니다.
            </p>
          </div>

          {/* Group Stat Card (Auto-Synced with Revenue Ledger) */}
          <div className="w-full lg:w-auto glass-card p-4 rounded-xl border border-slate-700 min-w-[290px] space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1">
                <span>2026년 그룹 통합 달성 현황</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">장부 자동동기화</span>
              </span>
              <span className="text-amber-400 font-mono font-bold">{totalPercentage}% 달성</span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {formatKRW(totalCurrentSynced)}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                / {formatKRW(totalTarget)}
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500 shadow-md shadow-emerald-500/20"
                style={{ width: `${totalPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Center Area: All Brands Total Daily YoY Revenue Comparison Chart */}
      <YoYRevenueChart
        brandId="all"
        brandName="전체 브랜드 합산 (머드스콘·오터·위시·머드상회)"
        showChannels={false}
      />

      {/* 3 Brands Grid Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Mud Scone Card */}
        <div
          onClick={() => onSelectBrand('mudscone')}
          className="glass-panel p-5 rounded-2xl border border-amber-900/40 hover:border-amber-500/60 transition cursor-pointer group space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white group-hover:text-amber-400 transition">
                  머드스콘 (Mud Scone)
                </h3>
                <p className="text-[11px] text-slate-400">고단백 식이섬유 시그니처 스콘</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">2026 목표 매출</span>
              <span className="font-bold text-white font-mono">{formatKRW(brands.mudscone.revenue.targetAmount)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">장부 누적 달성액</span>
              <span className="font-bold text-emerald-400 font-mono">{formatKRW(brands.mudscone.revenue.currentAmount)}</span>
            </div>
          </div>

          <button className="w-full py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold transition border border-amber-500/30 flex items-center justify-center gap-1">
            <span>브랜드 매출 & 전략 대시보드</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Oatter Card */}
        <div
          onClick={() => onSelectBrand('oatter')}
          className="glass-panel p-5 rounded-2xl border border-yellow-900/40 hover:border-yellow-500/60 transition cursor-pointer group space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                <Wheat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white group-hover:text-yellow-400 transition">
                  오터 (Oatter)
                </h3>
                <p className="text-[11px] text-slate-400">귀리 기반 락토프리 온더고 라이프</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">2026 목표 매출</span>
              <span className="font-bold text-white font-mono">{formatKRW(brands.oatter.revenue.targetAmount)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">장부 누적 달성액</span>
              <span className="font-bold text-emerald-400 font-mono">{formatKRW(brands.oatter.revenue.currentAmount)}</span>
            </div>
          </div>

          <button className="w-full py-2 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 text-xs font-bold transition border border-yellow-500/30 flex items-center justify-center gap-1">
            <span>브랜드 매출 & 전략 대시보드</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Wysh Card */}
        <div
          onClick={() => onSelectBrand('wysh')}
          className="glass-panel p-5 rounded-2xl border border-emerald-900/40 hover:border-emerald-500/60 transition cursor-pointer group space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition">
                  위시 (Wysh)
                </h3>
                <p className="text-[11px] text-slate-400">맞춤 웰니스 솔루션 & 인너뷰티</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">2026 목표 매출</span>
              <span className="font-bold text-white font-mono">{formatKRW(brands.wysh.revenue.targetAmount)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-slate-900/60">
              <span className="text-slate-400">장부 누적 달성액</span>
              <span className="font-bold text-emerald-400 font-mono">{formatKRW(brands.wysh.revenue.currentAmount)}</span>
            </div>
          </div>

          <button className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold transition border border-emerald-500/30 flex items-center justify-center gap-1">
            <span>브랜드 매출 & 전략 대시보드</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
