import React, { useState } from 'react';
import { RevenueGoal } from '../../types/strategy';
import { Target, TrendingUp, Edit2, Check, RefreshCw } from 'lucide-react';

interface RevenueTrackerProps {
  brandName: string;
  revenue: RevenueGoal;
  onUpdateRevenue: (revenue: RevenueGoal) => void;
}

export const RevenueTracker: React.FC<RevenueTrackerProps> = ({
  brandName,
  revenue,
  onUpdateRevenue,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [targetInput, setTargetInput] = useState(revenue.targetAmount.toString());

  const currentAmount = revenue.currentAmount;
  const percentage = Math.min(
    100,
    Math.round((currentAmount / (revenue.targetAmount || 1)) * 100 * 10) / 10
  );

  const handleSave = () => {
    const newTarget = parseFloat(targetInput) || revenue.targetAmount;
    onUpdateRevenue({
      ...revenue,
      targetAmount: newTarget,
    });
    setIsEditing(false);
  };

  const formatKRW = (num: number) => {
    if (num >= 100000000) {
      return `${(num / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
    }
    return `${(num / 10000).toLocaleString('ko-KR')}만원`;
  };

  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Target className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <span>{revenue.year}년 {brandName} 매출 목표 & 실시간 달성률</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                매출 장부 실시간 연동 중
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              매출 데이터 장부에 기록된 {revenue.year}년 실제 누적 매출액이 실시간 자동 동기화됩니다.
            </p>
          </div>
        </div>

        {/* Goal Setting Trigger */}
        {!isEditing ? (
          <button
            onClick={() => {
              setTargetInput(revenue.targetAmount.toString());
              setIsEditing(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
            <span>목표 금액 수정</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-amber-500">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="w-32 bg-transparent text-xs font-mono font-bold text-white focus:outline-none"
                placeholder="목표 금액 (원)"
              />
              <span className="text-xs text-slate-400">원</span>
            </div>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition"
              title="저장"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Metric Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target Amount */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">2026년 목표 매출액</span>
          <div className="text-xl font-black text-white font-mono mt-1">
            {formatKRW(revenue.targetAmount)}
          </div>
        </div>

        {/* Current Amount (Auto Synced) */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
            <span>매출 장부 누적 실적</span>
            <span className="text-[10px] text-emerald-400 font-bold">자동 합산</span>
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {formatKRW(currentAmount)}
          </div>
        </div>

        {/* Achievement Rate */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">목표 달성률</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-black text-amber-400 font-mono">
              {percentage}%
            </span>
            <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
