import React, { useState } from 'react';
import { BrandStrategyData, BusinessItem, ERRCItem, ERRCQuadrant } from '../../types/strategy';
import { StrategyTable } from './StrategyTable';
import { ERRCGrid } from '../errc/ERRCGrid';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SlidersHorizontal, Layers, LayoutGrid, Plus, Edit2, Trash2 } from 'lucide-react';

interface StrategyCanvasChartProps {
  data: BrandStrategyData;
  onUpdateScore: (businessId: string, errcItemId: string, score: number) => void;
  onAddBusiness: (biz: Omit<BusinessItem, 'id'>) => void;
  onUpdateBusiness: (biz: BusinessItem) => void;
  onDeleteBusiness: (id: string) => void;
  // ERRC Handlers for Collapsible ERRC Grid
  onAddERRCItem: (item: Omit<ERRCItem, 'id'>) => void;
  onUpdateERRCItem: (item: ERRCItem) => void;
  onDeleteERRCItem: (id: string) => void;
  onReorderERRCItems: (quadrant: ERRCQuadrant, reorderedItems: ERRCItem[]) => void;
}

export const StrategyCanvasChart: React.FC<StrategyCanvasChartProps> = ({
  data,
  onUpdateScore,
  onAddBusiness,
  onUpdateBusiness,
  onDeleteBusiness,
  onAddERRCItem,
  onUpdateERRCItem,
  onDeleteERRCItem,
  onReorderERRCItems,
}) => {
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isErrcOpen, setIsErrcOpen] = useState(false);
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [bizNameInput, setBizNameInput] = useState('');
  const [bizColorInput, setBizColorInput] = useState('#f97316');
  const [editingBizId, setEditingBizId] = useState<string | null>(null);

  // Map ERRC items to chart X-axis categories 1:1 in exact order
  const chartData = (data.errcItems || []).map((item) => {
    const point: Record<string, any> = {
      factorName: item.title,
      quadrant: item.quadrant,
      id: item.id,
    };

    (data.businesses || []).forEach((biz) => {
      const scoreKey = `${biz.id}_${item.id}`;
      point[biz.id] = data.scores[scoreKey] ?? (biz.isSelf ? 4.5 : 2.5);
    });

    return point;
  });

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizNameInput.trim()) return;

    if (editingBizId) {
      const existing = (data.businesses || []).find((b) => b.id === editingBizId);
      if (existing) {
        onUpdateBusiness({
          ...existing,
          name: bizNameInput.trim(),
          color: bizColorInput,
        });
      }
    } else {
      onAddBusiness({
        name: bizNameInput.trim(),
        color: bizColorInput,
        isSelf: false,
        lineStyle: 'dashed',
      });
    }

    setBizNameInput('');
    setEditingBizId(null);
    setIsBizModalOpen(false);
  };

  const handleOpenEditBiz = (biz: BusinessItem) => {
    setEditingBizId(biz.id);
    setBizNameInput(biz.name);
    setBizColorInput(biz.color || '#38bdf8');
    setIsBizModalOpen(true);
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
            전략 요소: {label}
          </div>
          {payload.map((entry: any, index: number) => {
            const biz = (data.businesses || []).find((b) => b.id === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-3 text-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="font-medium text-slate-300">{biz?.name || entry.name}:</span>
                </div>
                <span className="font-mono font-bold text-white">
                  {entry.value}점 / 5.0
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
      {/* Top Header Controls: Title + ERRC Toggle + Strategy Table Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              {data.name} 전략 캔버스 (Strategy Canvas)
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              ERRC 1:1 연동
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ERRC 그리드에 정의한 수평 축 항목별로 비즈니스 수준(1~5점)을 직선 그래프로 평가 비교합니다.
          </p>
        </div>

        {/* Dual Toggle Buttons & Business Add */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* ERRC Grid Toggle Button */}
          <button
            onClick={() => setIsErrcOpen(!isErrcOpen)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow ${
              isErrcOpen
                ? 'bg-amber-600 text-white border-amber-500 shadow-amber-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-400" />
            <span>{isErrcOpen} ⚙️ ERRC 그리드 {isErrcOpen ? '접기' : '편집'}</span>
          </button>

          {/* Strategy Table Toggle Button */}
          <button
            onClick={() => setIsTableOpen(!isTableOpen)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow ${
              isTableOpen
                ? 'bg-sky-600 text-white border-sky-500 shadow-sky-600/30'
                : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-sky-400" />
            <span>⚙️ 수치 평가표 {isTableOpen ? '접기' : '편집'}</span>
          </button>

          {/* Add Business Competition Button */}
          <button
            onClick={() => {
              setEditingBizId(null);
              setBizNameInput('');
              setBizColorInput('#38bdf8');
              setIsBizModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>비즈니스 추가</span>
          </button>
        </div>
      </div>

      {/* Collapsible ERRC Grid Section */}
      {isErrcOpen && (
        <div className="pt-2 pb-4 border-b border-slate-800/80 animate-fadeIn">
          <ERRCGrid
            data={data}
            onAddItem={onAddERRCItem}
            onUpdateItem={onUpdateERRCItem}
            onDeleteItem={onDeleteERRCItem}
            onReorderItems={onReorderERRCItems}
          />
        </div>
      )}

      {/* Collapsible Strategy Evaluation Table Section */}
      {isTableOpen && (
        <div className="pt-2 pb-4 border-b border-slate-800/80 animate-fadeIn">
          <StrategyTable
            data={data}
            onUpdateScore={onUpdateScore}
            onAddBusiness={onAddBusiness}
            onUpdateBusiness={onUpdateBusiness}
            onDeleteBusiness={onDeleteBusiness}
          />
        </div>
      )}

      {/* Strategy Canvas Straight Line Chart Area */}
      <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-4">
        {/* Business Legend Badges & Edit Modals */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold mr-1">비즈니스 범례:</span>
            {(data.businesses || []).map((biz) => (
              <div
                key={biz.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: biz.color || '#38bdf8' }} />
                <span className={`font-bold ${biz.isSelf ? 'text-amber-400' : 'text-slate-300'}`}>
                  {biz.name} {biz.isSelf ? '(당사)' : ''}
                </span>
                {!biz.isSelf && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={() => handleOpenEditBiz(biz)}
                      className="text-slate-500 hover:text-amber-400 p-0.5"
                      title="이름/색상 수정"
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
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Line Type: Straight (Linear)
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis
                dataKey="factorName"
                stroke="#94a3b8"
                tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                interval={0}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val}점`}
              />
              <Tooltip content={<CustomChartTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />

              {/* Render Lines with Straight Segments (type="linear") */}
              {(data.businesses || []).map((biz) => (
                <Line
                  key={biz.id}
                  type="linear"
                  dataKey={biz.id}
                  name={biz.name}
                  stroke={biz.color || '#38bdf8'}
                  strokeWidth={biz.isSelf ? 3 : 2}
                  strokeDasharray={biz.lineStyle === 'dashed' ? '5 5' : undefined}
                  dot={{ r: biz.isSelf ? 5 : 4, fill: biz.color || '#38bdf8' }}
                  activeDot={{ r: 7 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business Add/Edit Modal */}
      {isBizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-700 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
              {editingBizId ? '비즈니스 정보 수정' : '신규 비즈니스 추가'}
            </h4>

            <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  비즈니스/경쟁사 명칭
                </label>
                <input
                  type="text"
                  placeholder="예: 기존 시장 표준, 경쟁사 A"
                  value={bizNameInput}
                  onChange={(e) => setBizNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  그래프 라인 색상
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bizColorInput}
                    onChange={(e) => setBizColorInput(e.target.value)}
                    className="w-10 h-10 rounded bg-transparent cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={bizColorInput}
                    onChange={(e) => setBizColorInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBizModalOpen(false)}
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
