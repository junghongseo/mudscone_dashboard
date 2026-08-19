import React, { useState } from 'react';
import { BrandStrategyData, BusinessItem, StrategyFactor } from '../../types/strategy';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface StrategyTableProps {
  data: BrandStrategyData;
  onUpdateStrategy: (data: BrandStrategyData) => void;
}

export const StrategyTable: React.FC<StrategyTableProps> = ({ data, onUpdateStrategy }) => {
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [bizName, setBizName] = useState('');
  const [bizColor, setBizColor] = useState('#3b82f6');
  const [isSelf, setIsSelf] = useState(false);

  const [factorModalOpen, setFactorModalOpen] = useState(false);
  const [factorName, setFactorName] = useState('');

  const handleOpenAddBiz = () => {
    setEditingBizId(null);
    setBizName('');
    setBizColor('#ec4899');
    setIsSelf(false);
    setBizModalOpen(true);
  };

  const handleOpenEditBiz = (biz: BusinessItem) => {
    setBizName(biz.name);
    setBizColor(biz.color || '#3b82f6');
    setIsSelf(biz.isSelf);
    setEditingBizId(biz.id);
    setBizModalOpen(true);
  };

  const handleScoreChange = (bizId: string, factorId: string, newScore: number) => {
    const updatedScores = {
      ...data.scores,
      [`${bizId}_${factorId}`]: Math.max(1, Math.min(10, newScore)),
    };
    onUpdateStrategy({
      ...data,
      scores: updatedScores,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-100">가치 요소 점수 상세 매트릭스</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse border border-slate-800">
          <thead>
            <tr className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
              <th className="p-3 border border-slate-800">경쟁 요인 (Factors)</th>
              {data.businesses.map((biz) => (
                <th key={biz.id} className="p-3 border border-slate-800 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: biz.color }} />
                    <span className="font-bold">{biz.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {data.factors.map((factor) => (
              <tr key={factor.id} className="hover:bg-slate-800/30 transition">
                <td className="p-3 border border-slate-800 font-bold text-slate-200">{factor.name}</td>
                {data.businesses.map((biz) => {
                  const score = data.scores[`${biz.id}_${factor.id}`] ?? 5;
                  return (
                    <td key={biz.id} className="p-2 border border-slate-800 text-center">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={score}
                        onChange={(e) =>
                          handleScoreChange(biz.id, factor.id, parseInt(e.target.value) || 1)
                        }
                        className="w-14 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-center font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
