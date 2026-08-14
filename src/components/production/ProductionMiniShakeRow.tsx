import React from 'react';
import { CombinedMiniShakeRow } from '../../utils/productionDoughCalculator';

interface ProductionMiniShakeRowProps {
  row: CombinedMiniShakeRow;
  showRequiredQty: boolean;
  onQtyChange: (index: number, field: 'extra_qty' | 'carryover_qty', value: number) => void;
  itemIndex: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const ProductionMiniShakeRow: React.FC<ProductionMiniShakeRowProps> = ({
  row,
  showRequiredQty,
  onQtyChange,
  itemIndex,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const item = row.shakeItem;

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

      {/* 1. Oven Column: Triangle / Bar (N/A for Mini Shake) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* 2. Oven Column: Stick / Cube / Mini Shake */}
      <td className="py-3.5 px-3 text-center font-extrabold text-sky-400">
        {item.oven_number || '1'}
      </td>

      {/* Product Name (Clean & Uncluttered) */}
      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-slate-100">
        {item.product_name}
      </td>

      {/* Order Qty (Bags) */}
      <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-medium">
        {row.orderBags}봉
      </td>

      {/* Extra Qty Input (Bags) */}
      <td className="py-3.5 px-3 text-right">
        <input
          type="number"
          min="0"
          value={row.extraBags}
          onChange={(e) => onQtyChange(row.itemIndex, 'extra_qty', parseInt(e.target.value))}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Required Qty (Optional Column) */}
      {showRequiredQty && (
        <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-300 bg-amber-500/5">
          {row.orderBags + row.extraBags} 봉
        </td>
      )}

      {/* Carryover Inventory Input (Bags) */}
      <td className="py-3.5 px-3 text-right">
        <input
          type="number"
          min="0"
          value={row.carryoverBags}
          onChange={(e) => onQtyChange(row.itemIndex, 'carryover_qty', parseInt(e.target.value))}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Calculated Production Qty (N/A for Mini Shake) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* 1. Key Panel Column: Triangle & Bar Required Panels (N/A) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* Extra Panels Input (N/A for Mini Shake) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* Halfpack Bags */}
      <td className="py-3.5 px-3 bg-purple-500/5 text-right font-bold text-purple-700 dark:text-purple-300">
        {row.prodBags} 봉
      </td>

      {/* 2. Key Panel Column: Halfpack & Mini Shake Panels */}
      <td className="py-3.5 px-3 bg-purple-500/5 text-right">
        <span className="inline-block px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-extrabold font-mono rounded-lg text-xs">
          {row.panels} 판
        </span>
      </td>

      {/* 3. Key Panel Column: Stick Panels (N/A for Mini Shake) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* Dedicated Mini Shake Excess Bags Column */}
      <td className="py-3.5 px-3 text-right font-bold text-sky-700 dark:text-sky-300 bg-sky-500/5 border-r border-sky-500/10">
        {row.excessBags} 봉
      </td>

      {/* 4. Key Panel Column: Integrated Total Required Panels */}
      <td className="py-3.5 px-3 text-right">
        <span className="inline-block px-3 py-1.5 bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 font-black text-sm rounded-xl shadow-sm">
          {row.panels} 판
        </span>
      </td>

      {/* Separate Excess Column 1: Triangle / Bar Excess (N/A) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>

      {/* Separate Excess Column 2: Stick Excess (N/A) */}
      <td className="py-3.5 px-3 text-center text-slate-400">
        -
      </td>
    </tr>
  );
};
