import React from 'react';
import { CombinedSconeRow } from '../../utils/productionDoughCalculator';

interface ProductionTableRowProps {
  row: CombinedSconeRow;
  categoryTag: '삼각 (8개)' | '바 (10개)';
  categoryColorClass: string;
  showRequiredQty: boolean;
  onQtyChange: (index: number, field: 'extra_qty' | 'carryover_qty', value: number) => void;
  onBumperChange: (index: number, value: number) => void;
  itemIndex: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const ProductionTableRow: React.FC<ProductionTableRowProps> = ({
  row,
  categoryTag,
  categoryColorClass,
  showRequiredQty,
  onQtyChange,
  onBumperChange,
  itemIndex,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const item = row.sconeItem;
  const baseOven = item.oven_number || '1';
  const secondaryOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number || '';

  return (
    <tr
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, itemIndex)}
      onDragOver={(e) => onDragOver && onDragOver(e, itemIndex)}
      onDrop={(e) => onDrop && onDrop(e, itemIndex)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      className={`transition ${
        isDragging
          ? 'opacity-30 bg-amber-500/20'
          : isDragOver
          ? 'border-t-4 border-amber-500 bg-amber-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
      }`}
    >
      {/* 0. Drag & Drop Handle (Very Left End) */}
      <td className="py-3.5 px-2 text-center text-slate-400 hover:text-amber-500 font-black text-base cursor-grab active:cursor-grabbing select-none print:hidden" title="드래그하여 위치 변경">
        ⠿
      </td>

      {/* 1. Oven Column: Triangle / Bar */}
      <td className="py-3.5 px-3 text-center font-extrabold text-amber-400">
        {baseOven}
      </td>

      {/* 2. Oven Column: Stick / Cube */}
      <td className="py-3.5 px-3 text-center font-extrabold text-purple-300">
        {secondaryOven || '-'}
      </td>

      {/* Product Name (Clean & Uncluttered) */}
      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-slate-100">
        {item.product_name}
      </td>

      {/* Order Qty */}
      <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-medium">
        {item.order_qty}개
      </td>

      {/* Extra Qty Input */}
      <td className="py-3.5 px-3 text-right">
        <input
          type="number"
          min="0"
          value={item.extra_qty}
          onChange={(e) => onQtyChange(row.itemIndex, 'extra_qty', parseInt(e.target.value))}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Required Qty (Optional Column) */}
      {showRequiredQty && (
        <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-300 bg-amber-500/5">
          {item.required_qty} 개
        </td>
      )}

      {/* Carryover Inventory Input */}
      <td className="py-3.5 px-3 text-right">
        <input
          type="number"
          min="0"
          value={item.carryover_qty}
          onChange={(e) => onQtyChange(row.itemIndex, 'carryover_qty', parseInt(e.target.value))}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Calculated Production Qty */}
      <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 text-sm">
        {item.production_qty} 개
      </td>

      {/* 1. Key Panel Column: Triangle & Bar Required Panels */}
      <td className="py-3.5 px-3 text-right">
        <span className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-extrabold font-mono rounded-lg text-xs">
          {row.sconeDoughPanels} 판
        </span>
      </td>

      {/* Extra Panels Input (삼각&바 판수 추가) */}
      <td className="py-3.5 px-3 text-right">
        <div className="inline-flex items-center justify-end gap-1">
          <input
            type="number"
            min="0"
            value={item.min_bumper_qty ?? 0}
            onChange={(e) => onBumperChange(row.itemIndex, parseInt(e.target.value))}
            className="w-12 px-1.5 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-amber-600 dark:text-amber-400 font-bold text-xs focus:outline-none"
          />
          <span className="text-xs text-slate-400">판</span>
        </div>
      </td>

      {/* Halfpack Order Bags */}
      <td className="py-3.5 px-3 bg-purple-500/5 text-right font-bold text-purple-700 dark:text-purple-300">
        {row.hpOrderBags > 0 ? `${row.hpOrderBags} 봉` : '0 봉'}
      </td>

      {/* 2. Key Panel Column: Halfpack & Mini Shake Panels */}
      <td className="py-3.5 px-3 bg-purple-500/5 text-right">
        <span className="inline-block px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-extrabold font-mono rounded-lg text-xs">
          {row.hpPanels} 판
        </span>
      </td>

      {/* 3. Key Panel Column: Stick Panels */}
      <td className="py-3.5 px-3 bg-indigo-500/5 text-right">
        <span className="inline-block px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-extrabold font-mono rounded-lg text-xs">
          {row.stickPanels > 0 ? `${row.stickPanels} 판` : '-'}
        </span>
      </td>

      {/* Mini Shake Excess Bags Cell (N/A for Scones) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* 4. Key Panel Column: Integrated Total Required Panels */}
      <td className="py-3.5 px-3 text-right">
        <span className="inline-block px-3 py-1.5 bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 font-black text-sm rounded-xl shadow-sm">
          {row.finalPanels} 판
        </span>
      </td>

      {/* Separate Excess Column 1: Triangle / Bar Excess (Highlighted with Warning Badge if <= 1) */}
      <td className={`py-3.5 px-3 text-right font-bold rounded-lg ${row.excessQty <= 1 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'text-slate-700 dark:text-slate-300'}`}>
        <div className="inline-flex items-center justify-end gap-1">
          <span>{row.excessQty}개</span>
          {row.excessQty <= 1 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-slate-950 font-black whitespace-nowrap shadow-sm">
              ⚠️ 판수추가 검토
            </span>
          )}
        </div>
      </td>

      {/* Separate Excess Column 2: Stick Excess */}
      <td className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-300 font-bold">
        {row.stickExcessPacks > 0 ? `${row.stickExcessPacks}팩` : '-'}
      </td>
    </tr>
  );
};
