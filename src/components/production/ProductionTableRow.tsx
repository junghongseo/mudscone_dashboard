import React from 'react';
import { CombinedSconeRow } from '../../utils/productionDoughCalculator';

interface ProductionTableRowProps {
  row: CombinedSconeRow;
  categoryTag: '삼각 (8개)' | '바 (10개)';
  categoryColorClass: string;
  showRequiredQty: boolean;
  onQtyChange: (index: number, field: 'extra_qty' | 'carryover_qty', value: number) => void;
  onBumperChange: (index: number, value: number) => void;
}

export const ProductionTableRow: React.FC<ProductionTableRowProps> = ({
  row,
  categoryTag,
  categoryColorClass,
  showRequiredQty,
  onQtyChange,
  onBumperChange,
}) => {
  const item = row.sconeItem;

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
      {/* Category Badge */}
      <td className="py-3.5 px-3">
        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${categoryColorClass}`}>
          {categoryTag}
        </span>
      </td>

      {/* Product Name */}
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
        <td className="py-3.5 px-3 text-right font-bold text-amber-600 dark:text-amber-300 bg-amber-50/5">
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

      {/* Base Dough Panels (Includes Bumper Extra Panels) */}
      <td className="py-3.5 px-3 text-right font-mono font-bold text-amber-800 dark:text-amber-300">
        {row.sconeDoughPanels} 판
      </td>

      {/* Min Bumper Qty Input */}
      <td className="py-3.5 px-3 text-right">
        <input
          type="number"
          min="0"
          value={item.min_bumper_qty ?? 2}
          onChange={(e) => onBumperChange(row.itemIndex, parseInt(e.target.value))}
          className="w-14 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 focus:border-amber-500 rounded text-right text-amber-600 dark:text-amber-400 font-bold text-xs focus:outline-none"
        />
      </td>

      {/* Matched Halfpack Name */}
      <td className="py-3.5 px-3 bg-purple-500/5 border-x border-purple-500/10 text-slate-800 dark:text-purple-200 text-center font-medium">
        {row.matchedHp ? row.matchedHp.product_name : '-'}
      </td>

      {/* Halfpack Order Bags */}
      <td className="py-3.5 px-3 bg-purple-500/5 border-r border-purple-500/10 text-right font-bold text-purple-700 dark:text-purple-300">
        {row.hpOrderBags > 0 ? `${row.hpOrderBags} 봉` : '0 봉'}
      </td>

      {/* Halfpack Panels */}
      <td className="py-3.5 px-3 bg-purple-500/5 border-r border-purple-500/10 text-right font-mono font-bold text-purple-700 dark:text-purple-300">
        {row.hpPanels} 판
      </td>

      {/* Combined Total Dough Panels */}
      <td className="py-3.5 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-base">
        <div className="flex flex-col items-end">
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            {row.finalPanels} 판
          </span>
          {row.isBumper && (
            <span className="mt-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
              +1판 범퍼
            </span>
          )}
        </div>
      </td>

      {/* Excess Qty After Production */}
      <td className="py-3.5 px-3 text-right text-slate-600 dark:text-slate-400 font-medium">
        {row.excessQty} 개
      </td>
    </tr>
  );
};
