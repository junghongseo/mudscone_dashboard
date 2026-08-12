import React, { useState } from 'react';
import { BrandStrategyData, BusinessItem, ERRCQuadrant } from '../../types/strategy';
import { Plus, Trash2, Edit2, X, HelpCircle } from 'lucide-react';

interface StrategyTableProps {
  data: BrandStrategyData;
  onUpdateScore: (businessId: string, errcItemId: string, score: number) => void;
  onAddBusiness: (business: Omit<BusinessItem, 'id'>) => void;
  onUpdateBusiness: (business: BusinessItem) => void;
  onDeleteBusiness: (id: string) => void;
}

const COLOR_PRESETS = [
  '#f97316', '#eab308', '#22c55e', '#38bdf8', '#a855f7',
  '#ec4899', '#f43f5e', '#64748b', '#94a3b8', '#334155'
];

export const StrategyTable: React.FC<StrategyTableProps> = ({
  data,
  onUpdateScore,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
}) => {
  // Use data.errcItems order directly as maintained by user's drag & drop actions
  const errcItems = data.errcItems;

  // Business Modal state
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [bizName, setBizName] = useState('');
  const [bizColor, setBizColor] = useState(COLOR_PRESETS[0]);
  const [isSelf, setIsSelf] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);

  const handleOpenAddBiz = () => {
    setBizName('');
    setBizColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
    setIsSelf(false);
    setEditingBizId(null);
    setBizModalOpen(true);
  };

  const handleOpenEditBiz = (biz: BusinessItem) => {
    setBizName(biz.name);
    setBizColor(biz.color);
    setIsSelf(biz.isSelf);
    setEditingBizId(biz.id);
    setBizModalOpen(true);
  };

  const handleSaveBiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;

    if (editingBizId) {
      onUpdateBusiness({
        id: editingBizId,
        name: bizName.trim(),
        color: bizColor,
        isSelf,
      });
    } else {
      onAddBusiness({
        name: bizName.trim(),
        color: bizColor,
        isSelf,
      });
    }
    setBizModalOpen(false);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 4) {
      return { text: '높음', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    } else if (score >= 3) {
      return { text: '보통', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    } else {
      return { text: '낮음', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  const getQuadrantTag = (quad: ERRCQuadrant) => {
    switch (quad) {
      case 'E':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">E(제거)</span>;
      case 'R_reduce':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">R(감소)</span>;
      case 'R_raise':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">R(증가)</span>;
      case 'C':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">C(창조)</span>;
    }
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-5 rounded-full bg-sky-500"></span>
            전략 캔버스 수치 평가표 (드래그 정렬 순서 실시간 연동)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            ERRC 그리드에서 마우스 드래그로 바꾼 항목 순서대로 평가표 컬럼이 즉시 업데이트됩니다.
          </p>
        </div>

        <button
          onClick={handleOpenAddBiz}
          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>비즈니스/경쟁사 추가</span>
        </button>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950/90 text-slate-300 border-b border-slate-800">
            <tr>
              <th className="p-3 font-bold min-w-[160px] border-r border-slate-800">
                비즈니스 / 브랜드
              </th>
              {errcItems.length === 0 ? (
                <th className="p-3 font-semibold text-slate-500 text-center">
                  ERRC 그리드 요소가 없습니다. 위 ERRC 그리드에서 항목을 추가해 주세요.
                </th>
              ) : (
                errcItems.map((item) => (
                  <th key={item.id} className="p-3 font-semibold min-w-[140px] border-r border-slate-800/80 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {getQuadrantTag(item.quadrant)}
                      <span className="text-slate-200 font-bold mt-0.5">{item.title}</span>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.businesses.map((biz) => (
              <tr key={biz.id} className="hover:bg-slate-800/30 transition">
                {/* Business Info Header */}
                <td className="p-3 border-r border-slate-800 bg-slate-950/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: biz.color }}
                      ></span>
                      <div>
                        <span className={`font-bold ${biz.isSelf ? 'text-amber-400' : 'text-slate-200'}`}>
                          {biz.name}
                        </span>
                        {biz.isSelf && (
                          <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            자사
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditBiz(biz)}
                        className="text-slate-500 hover:text-slate-300 p-1"
                        title="비즈니스 정보 수정"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {!biz.isSelf && (
                        <button
                          onClick={() => onDeleteBusiness(biz.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="비즈니스 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* Scores for Each ERRC Item in User Order */}
                {errcItems.map((item) => {
                  const key = `${biz.id}_${item.id}`;
                  const currentScore = data.scores[key] ?? 3;
                  const badge = getScoreBadge(currentScore);

                  return (
                    <td key={item.id} className="p-2 border-r border-slate-800/60 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={5}
                          step={0.1}
                          value={currentScore}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              onUpdateScore(biz.id, item.id, Math.min(5, Math.max(1, val)));
                            }
                          }}
                          className="w-14 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-center text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium hidden lg:inline-block ${badge.bg}`}>
                          {badge.text}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>점수 가이드라인: 1 ~ 2점 (낮음) | 3점 (보통/업계 평균) | 4 ~ 5점 (높음)</span>
        </div>
        <span className="text-amber-400 font-medium">드래그 앤 드롭 순서 100% 실시간 연동 중</span>
      </div>

      {/* Business Modal */}
      {bizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm p-6 rounded-2xl border border-slate-700 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingBizId ? '비즈니스 정보 수정' : '비즈니스/경쟁사 추가'}
              </h3>
              <button onClick={() => setBizModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBiz} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">비즈니스 명칭</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="예: 대표 경쟁사 A, 신규 웰니스 브랜드"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">표시 라인 색상</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBizColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        bizColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSelfCheck"
                  checked={isSelf}
                  onChange={(e) => setIsSelf(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500"
                />
                <label htmlFor="isSelfCheck" className="text-xs text-slate-300 cursor-pointer">
                  머드스콘 자사 브랜드 여부 (강조 라인 표시)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBizModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
