import React, { useState } from 'react';
import { BrandStrategyData, BusinessItem } from '../../types/strategy';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface StrategyTableProps {
  data: BrandStrategyData;
  onUpdateScore: (businessId: string, errcItemId: string, score: number) => void;
  onAddBusiness: (biz: Omit<BusinessItem, 'id'>) => void;
  onUpdateBusiness: (biz: BusinessItem) => void;
  onDeleteBusiness: (id: string) => void;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({
  data,
  onUpdateScore,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
}) => {
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [bizName, setBizName] = useState('');
  const [bizColor, setBizColor] = useState('#38bdf8');

  const handleOpenAddBiz = () => {
    setEditingBizId(null);
    setBizName('');
    setBizColor('#38bdf8');
    setBizModalOpen(true);
  };

  const handleOpenEditBiz = (biz: BusinessItem) => {
    setBizName(biz.name);
    setBizColor(biz.color || '#38bdf8');
    setEditingBizId(biz.id);
    setBizModalOpen(true);
  };

  const handleSaveBiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;

    if (editingBizId) {
      const existing = (data.businesses || []).find((b) => b.id === editingBizId);
      if (existing) {
        onUpdateBusiness({
          ...existing,
          name: bizName.trim(),
          color: bizColor,
        });
      }
    } else {
      onAddBusiness({
        name: bizName.trim(),
        color: bizColor,
        isSelf: false,
        lineStyle: 'dashed',
      });
    }

    setBizModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <span>📊 전략 요소별 점수 평가표 (1.0 ~ 5.0점)</span>
        </h4>
        <button
          onClick={handleOpenAddBiz}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>비즈니스 추가</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-xs text-left border-collapse bg-slate-950">
          <thead>
            <tr className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
              <th className="py-2.5 px-3 border-r border-slate-800">전략 요소 (ERRC 연동)</th>
              <th className="py-2.5 px-3 border-r border-slate-800 text-center w-24">사분면</th>
              {(data.businesses || []).map((biz) => (
                <th
                  key={biz.id}
                  className="py-2.5 px-3 border-r border-slate-800 text-center font-bold"
                  style={{ color: biz.color || '#38bdf8' }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{biz.name}</span>
                    {!biz.isSelf && (
                      <div className="flex items-center">
                        <button
                          onClick={() => handleOpenEditBiz(biz)}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`'${biz.name}' 비즈니스를 삭제하시겠습니까?`)) {
                              onDeleteBusiness(biz.id);
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {(data.errcItems || []).map((item) => (
              <tr key={item.id} className="hover:bg-slate-900/40">
                <td className="py-2 px-3 border-r border-slate-800 font-medium">
                  {item.title}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.quadrant === 'E' ? 'bg-rose-500/20 text-rose-300' :
                    item.quadrant === 'R_reduce' ? 'bg-amber-500/20 text-amber-300' :
                    item.quadrant === 'R_raise' ? 'bg-sky-500/20 text-sky-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {item.quadrant === 'E' ? 'ELIMINATE' :
                     item.quadrant === 'R_reduce' ? 'REDUCE' :
                     item.quadrant === 'R_raise' ? 'RAISE' : 'CREATE'}
                  </span>
                </td>
                {(data.businesses || []).map((biz) => {
                  const scoreKey = `${biz.id}_${item.id}`;
                  const score = data.scores[scoreKey] ?? (biz.isSelf ? 4.5 : 2.5);
                  return (
                    <td key={biz.id} className="py-2 px-3 border-r border-slate-800 text-center">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={score}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateScore(biz.id, item.id, Math.max(0, Math.min(5, val)));
                          }
                        }}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-center text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white">
              {editingBizId ? '비즈니스 정보 수정' : '신규 비즈니스 추가'}
            </h4>
            <form onSubmit={handleSaveBiz} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  비즈니스/경쟁사 명칭
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  그래프 색상
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bizColor}
                    onChange={(e) => setBizColor(e.target.value)}
                    className="w-10 h-10 rounded bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={bizColor}
                    onChange={(e) => setBizColor(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setBizModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
