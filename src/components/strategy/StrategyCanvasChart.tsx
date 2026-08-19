import React, { useState } from 'react';
import { BrandStrategyData, BusinessItem } from '../../types/strategy';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Plus, Edit2, Trash2, X, Info } from 'lucide-react';

interface StrategyCanvasChartProps {
  data: BrandStrategyData;
  onUpdateStrategy: (data: BrandStrategyData) => void;
}

export const StrategyCanvasChart: React.FC<StrategyCanvasChartProps> = ({
  data,
  onUpdateStrategy,
}) => {
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [editingBizId, setEditingBizId] = useState<string | null>(null);
  const [bizNameInput, setBizNameInput] = useState('');
  const [bizColorInput, setBizColorInput] = useState('#3b82f6');
  const [isSelfInput, setIsSelfInput] = useState(false);

  const chartData = data.factors.map((factor) => {
    const row: Record<string, any> = {
      factorName: factor.name,
      factorId: factor.id,
    };
    data.businesses.forEach((biz) => {
      row[biz.id] = data.scores[`${biz.id}_${factor.id}`] ?? 5;
    });
    return row;
  });

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

  const handleOpenAddBiz = () => {
    setEditingBizId(null);
    setBizNameInput('');
    setBizColorInput('#ec4899');
    setIsSelfInput(false);
    setIsBizModalOpen(true);
  };

  const handleOpenEditBiz = (biz: BusinessItem) => {
    setEditingBizId(biz.id);
    setBizNameInput(biz.name);
    setBizColorInput(biz.color || '#3b82f6');
    setIsBizModalOpen(true);
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-extrabold text-slate-100">{entry.value} 점</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>캔버스 캔버스 차트 (Strategy Canvas)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              경쟁 요소별 자사 및 경쟁사의 가치 곡선을 한눈에 비교 분석합니다.
            </p>
          </div>
          <button
            onClick={handleOpenAddBiz}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" /> 비교 브랜드 추가
          </button>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="factorName" stroke="#94a3b8" fontSize={11} tick={{ fill: '#94a3b8' }} />
              <YAxis domain={[1, 10]} ticks={[1, 3, 5, 7, 9, 10]} stroke="#94a3b8" fontSize={11} />
              <Tooltip content={<CustomChartTooltip />} />
              {data.businesses.map((biz) => (
                <Line
                  key={biz.id}
                  type="monotone"
                  dataKey={biz.id}
                  name={biz.name}
                  stroke={biz.color || '#3b82f6'}
                  strokeWidth={biz.isSelf ? 3.5 : 2}
                  dot={{ r: biz.isSelf ? 6 : 4, fill: biz.color || '#3b82f6' }}
                  activeDot={{ r: 8 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
