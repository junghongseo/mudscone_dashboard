import React, { useState } from 'react';
import { ERRCItem, ERRCQuadrant, BrandStrategyData } from '../../types/strategy';
import { Trash2, Plus, Edit2, Check, X, ShieldAlert, ArrowDownRight, ArrowUpRight, Lightbulb, GripVertical } from 'lucide-react';

interface ERRCGridProps {
  data: BrandStrategyData;
  onAddItem: (item: Omit<ERRCItem, 'id'>) => void;
  onUpdateItem: (item: ERRCItem) => void;
  onDeleteItem: (id: string) => void;
  onReorderItems: (quadrant: ERRCQuadrant, reorderedItems: ERRCItem[]) => void;
}

const QUADRANTS: {
  key: ERRCQuadrant;
  title: string;
  englishTitle: string;
  subtitle: string;
  icon: React.ReactNode;
  borderColor: string;
  textColor: string;
}[] = [
  {
    key: 'E',
    title: 'E (제거)',
    englishTitle: 'Eliminate',
    subtitle: '업계에서 당연하게 여기지만 제거해야 할 요소',
    icon: <ShieldAlert className="w-5 h-5 text-red-400" />,
    borderColor: 'border-red-900/40 hover:border-red-700/60',
    textColor: 'text-red-300',
  },
  {
    key: 'R_raise',
    title: 'R (증가)',
    englishTitle: 'Raise',
    subtitle: '업계 표준보다 과감하게 높여야 할 요소',
    icon: <ArrowUpRight className="w-5 h-5 text-emerald-400" />,
    borderColor: 'border-emerald-900/40 hover:border-emerald-700/60',
    textColor: 'text-emerald-300',
  },
  {
    key: 'R_reduce',
    title: 'R (감소)',
    englishTitle: 'Reduce',
    subtitle: '업계 표준보다 대폭 줄여야 할 요소',
    icon: <ArrowDownRight className="w-5 h-5 text-amber-400" />,
    borderColor: 'border-amber-900/40 hover:border-amber-700/60',
    textColor: 'text-amber-300',
  },
  {
    key: 'C',
    title: 'C (창조)',
    englishTitle: 'Create',
    subtitle: '업계가 한 번도 제공하지 않은 창조할 요소',
    icon: <Lightbulb className="w-5 h-5 text-sky-400" />,
    borderColor: 'border-sky-900/40 hover:border-sky-700/60',
    textColor: 'text-sky-300',
  },
];

export const ERRCGrid: React.FC<ERRCGridProps> = ({
  data,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuadrant, setSelectedQuadrant] = useState<ERRCQuadrant>('E');
  const [titleInput, setTitleInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Drag & Drop State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedQuadrant, setDraggedQuadrant] = useState<ERRCQuadrant | null>(null);

  const handleOpenAddModal = (quadrant: ERRCQuadrant) => {
    setSelectedQuadrant(quadrant);
    setTitleInput('');
    setDescInput('');
    setEditingItemId(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: ERRCItem) => {
    setSelectedQuadrant(item.quadrant);
    setTitleInput(item.title);
    setDescInput(item.description || '');
    setEditingItemId(item.id);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;

    if (editingItemId) {
      onUpdateItem({
        id: editingItemId,
        quadrant: selectedQuadrant,
        title: titleInput.trim(),
        description: descInput.trim() || undefined,
      });
    } else {
      onAddItem({
        quadrant: selectedQuadrant,
        title: titleInput.trim(),
        description: descInput.trim() || undefined,
      });
    }

    setModalOpen(false);
  };

  // Drag and drop handlers within the same quadrant
  const handleDragStart = (quadrant: ERRCQuadrant, index: number) => {
    setDraggedQuadrant(quadrant);
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = (quadrant: ERRCQuadrant, targetIndex: number) => {
    if (draggedQuadrant !== quadrant || draggedItemIndex === null) return;
    if (draggedItemIndex === targetIndex) return;

    const itemsInQuadrant = data.errcItems.filter((item) => item.quadrant === quadrant);
    const updated = [...itemsInQuadrant];
    const [movedItem] = updated.splice(draggedItemIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    onReorderItems(quadrant, updated);
    setDraggedItemIndex(null);
    setDraggedQuadrant(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-6 rounded-full bg-gradient-to-b from-amber-400 to-orange-600"></span>
            {data.name} ERRC 그리드 (2x2 Matrix)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            마우스로 <GripVertical className="w-3 h-3 inline text-amber-400" /> 아이콘을 드래그해 순서를 변경하면, 전략 캔버스 평가표와 차트 X축에도 즉시 반영됩니다.
          </p>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((quad) => {
          const items = data.errcItems.filter((item) => item.quadrant === quad.key);
          return (
            <div
              key={quad.key}
              className={`glass-panel p-4 rounded-xl border ${quad.borderColor} transition-all duration-300 flex flex-col justify-between`}
            >
              <div>
                {/* Quadrant Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                      {quad.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm ${quad.textColor}`}>{quad.title}</h3>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">
                          {quad.englishTitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{quad.subtitle}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenAddModal(quad.key)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs font-medium border border-slate-700"
                    title="항목 추가"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>추가</span>
                  </button>
                </div>

                {/* Item List with Drag & Drop */}
                <div className="space-y-2 min-h-[120px]">
                  {items.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                      <span>등록된 요소가 없습니다.</span>
                      <button
                        onClick={() => handleOpenAddModal(quad.key)}
                        className="mt-2 text-amber-400 hover:underline font-medium text-[11px]"
                      >
                        + 요소 추가하기
                      </button>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(quad.key, index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(quad.key, index)}
                        className="group relative p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/80 hover:border-amber-500/50 transition cursor-grab active:cursor-grabbing flex items-start gap-2"
                      >
                        {/* Drag Handle Icon */}
                        <div className="text-slate-600 group-hover:text-amber-400 pt-0.5 cursor-grab">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white">
                              {item.title}
                            </h4>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Item Actions */}
                        <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-700"
                            title="수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom count badge */}
              <div className="mt-3 pt-2 border-t border-slate-800/50 flex justify-end">
                <span className="text-[10px] font-medium text-slate-500">
                  드래그하여 순서 변경 가능 (총 {items.length}개)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editingItemId ? 'ERRC 요소 수정' : '새 ERRC 요소 추가'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ERRC 영역</label>
                <select
                  value={selectedQuadrant}
                  onChange={(e) => setSelectedQuadrant(e.target.value as ERRCQuadrant)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {QUADRANTS.map((q) => (
                    <option key={q.key} value={q.key}>
                      {q.title} ({q.englishTitle})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  요소 명칭 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="예: 정제 설탕 배제, 단백질 함량 극대화"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">상세 설명 (선택)</label>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="요소에 대한 구체적인 배경 및 이유 작성"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingItemId ? '수정 완료' : '저장'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
