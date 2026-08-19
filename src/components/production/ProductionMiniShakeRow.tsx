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
      {/* 0. Drag & Drop Handle (Very Left End - ONLY draggable element) */}
      <td
        draggable={true}
        onDragStart={(e) => onDragStart && onDragStart(e, itemIndex)}
        className="py-3 px-2 text-center text-slate-400 hover:text-amber-500 font-black text-base cursor-grab active:cursor-grabbing select-none whitespace-nowrap print:hidden"
        title="드래그하여 위치 변경"
      >
        ⠿
      </td>

      {/* 1. Oven Column: Triangle / Bar (N/A for Mini Shake) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* 2. Oven Column: Stick / Cube / Mini Shake */}
      <td className="py-3 px-3 text-center font-extrabold text-sky-400 whitespace-nowrap">
        {item.oven_number || '1'}
      </td>

      {/* Product Name (Clean & Uncluttered) */}
      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
        {item.product_name}
      </td>

      {/* 3. Integrated Total Required Panels (Moved right next to Product Name) */}
      <td className="py-3 px-3 text-right bg-emerald-500/5 whitespace-nowrap">
        <span className="inline-block px-3 py-1.5 bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 font-black text-sm rounded-xl shadow-sm">
          {row.panels} 판
        </span>
      </td>

      {/* Order Qty (Bags) */}
      <td className="py-3 px-3 text-right text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
        {row.orderBags}봉
      </td>

      {/* Extra Qty Input (Bags - Auto-clears on 0 / select on focus) */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <input
          type="number"
          min="0"
          value={row.extraBags === 0 ? '' : row.extraBags}
          placeholder="0"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
            onQtyChange(row.itemIndex, 'extra_qty', isNaN(val) ? 0 : val);
          }}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Required Qty (Optional Column) */}
      {showRequiredQty && (
        <td className="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-300 bg-amber-500/5 whitespace-nowrap">
          {row.orderBags + row.extraBags} 봉
        </td>
      )}

      {/* Carryover Inventory Input (Bags - Auto-clears on 0 / select on focus) */}
      <td className="py-3 px-3 text-right whitespace-nowrap">
        <input
          type="number"
          min="0"
          value={row.carryoverBags === 0 ? '' : row.carryoverBags}
          placeholder="0"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
            onQtyChange(row.itemIndex, 'carryover_qty', isNaN(val) ? 0 : val);
          }}
          className="w-16 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-slate-900 dark:text-slate-100 text-xs font-bold"
        />
      </td>

      {/* Calculated Production Qty (N/A for Mini Shake) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* Key Panel Column: Triangle & Bar Required Panels (N/A) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* Extra Panels Input (N/A for Mini Shake) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* Halfpack Bags */}
      <td className="py-3 px-3 bg-purple-500/5 text-right font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
        {row.prodBags} 봉
      </td>

      {/* Key Panel Column: Halfpack & Mini Shake Panels */}
      <td className="py-3 px-3 bg-purple-500/5 text-right whitespace-nowrap">
        <span className="inline-block px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 font-extrabold font-mono rounded-lg text-xs">
          {row.panels} 판
        </span>
      </td>

      {/* Key Panel Column: Stick Panels (N/A for Mini Shake) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* Dedicated Mini Shake Excess Bags Column */}
      <td className="py-3 px-3 text-right font-bold text-sky-700 dark:text-sky-300 bg-sky-500/5 border-r border-sky-500/10 whitespace-nowrap">
        {row.excessBags} 봉
      </td>

      {/* Separate Excess Column 1: Triangle / Bar Excess (N/A) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>

      {/* Separate Excess Column 2: Stick Excess (N/A) */}
      <td className="py-3 px-3 text-center text-slate-400 whitespace-nowrap">
        -
      </td>
    </tr>
  );
};
