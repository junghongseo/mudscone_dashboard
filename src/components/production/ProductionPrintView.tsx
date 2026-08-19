import React from 'react';
import { CombinedSconeRow, CombinedMiniShakeRow } from '../../types/production';
import { calculateOvenBakingInfo } from '../../utils/productionDoughCalculator';
import { Printer, ArrowLeft } from 'lucide-react';

interface ProductionPrintViewProps {
  recordDate: string;
  shipmentCount: number;
  combinedTriangleRows: CombinedSconeRow[];
  combinedBarRows: CombinedSconeRow[];
  miniShakeRows: CombinedMiniShakeRow[];
  serviceRequiredQty: number;
  excessServiceCount: number;
  shortageServiceCount: number;
  totalLeftoverStock: number;
  heavyCreamDisplayStr: string;
  greekYogurtQty: number;
  oppQty: number;
  greenOnionQty: number;
  peanutSmoothQty: number;
  peanutCrunchQty: number;
  starterPackQty: number;
  imagineQty: number;
  yoffMatchaQty: number;
  yoffKinakoQty: number;
  yoff6Qty: number;
  onBack: () => void;
}

export const ProductionPrintView: React.FC<ProductionPrintViewProps> = ({
  recordDate,
  shipmentCount,
  combinedTriangleRows,
  combinedBarRows,
  miniShakeRows,
  serviceRequiredQty,
  excessServiceCount,
  shortageServiceCount,
  totalLeftoverStock,
  heavyCreamDisplayStr,
  greekYogurtQty,
  oppQty,
  greenOnionQty,
  peanutSmoothQty,
  peanutCrunchQty,
  starterPackQty,
  imagineQty,
  yoffMatchaQty,
  yoffKinakoQty,
  yoff6Qty,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const showRequiredQty =
    combinedTriangleRows.some((r) => (r.sconeItem.extra_qty || 0) > 0 || (r.sconeItem.rollover_qty || 0) > 0) ||
    combinedBarRows.some((r) => (r.sconeItem.extra_qty || 0) > 0 || (r.sconeItem.rollover_qty || 0) > 0);

  const totalTrianglePanels = combinedTriangleRows.reduce((a, r) => a + r.finalRequiredPanels, 0);
  const totalBarPanels = combinedBarRows.reduce((a, r) => a + r.finalRequiredPanels, 0);
  const totalMiniShakePanels = miniShakeRows.reduce((a, r) => a + r.requiredPanels, 0);

  const grandTotalAllPanels = totalTrianglePanels + totalBarPanels + totalMiniShakePanels;

  // Build unified table rows
  const unifiedRows: (
    | { type: 'scone'; categoryTag: string; categoryColorClass: string; row: CombinedSconeRow }
    | { type: 'shake'; row: CombinedMiniShakeRow }
    | { type: 'separator' }
  )[] = [];

  combinedTriangleRows.forEach((row) => {
    if (row.sconeItem.is_separator) {
      unifiedRows.push({ type: 'separator' });
    } else {
      unifiedRows.push({
        type: 'scone',
        categoryTag: '삼각',
        categoryColorClass: 'bg-amber-100 text-amber-900 font-black',
        row,
      });
    }
  });

  combinedBarRows.forEach((row) => {
    if (row.sconeItem.is_separator) {
      unifiedRows.push({ type: 'separator' });
    } else {
      unifiedRows.push({
        type: 'scone',
        categoryTag: '바',
        categoryColorClass: 'bg-orange-100 text-orange-900 font-black',
        row,
      });
    }
  });

  miniShakeRows.forEach((row) => {
    unifiedRows.push({
      type: 'shake',
      row,
    });
  });

  // Oven Baking Rows (Triangle & Bar Scones)
  const ovenBakingRows: {
    product_name: string;
    oven_number: string;
    total_panels: number;
    full_pans: number;
    remainder_panels: number;
    is_separator?: boolean;
  }[] = [];

  combinedTriangleRows.forEach((row) => {
    if (row.sconeItem.is_separator) {
      ovenBakingRows.push({
        product_name: '',
        oven_number: '',
        total_panels: 0,
        full_pans: 0,
        remainder_panels: 0,
        is_separator: true,
      });
    } else {
      const baking = calculateOvenBakingInfo(row.triDoughPanels);
      ovenBakingRows.push({
        product_name: row.sconeItem.name,
        oven_number: row.sconeItem.oven_number || '-',
        total_panels: row.triDoughPanels,
        full_pans: baking.full_pans,
        remainder_panels: baking.remainder_panels,
      });
    }
  });

  combinedBarRows.forEach((row) => {
    if (row.sconeItem.is_separator) {
      ovenBakingRows.push({
        product_name: '',
        oven_number: '',
        total_panels: 0,
        full_pans: 0,
        remainder_panels: 0,
        is_separator: true,
      });
    } else {
      const baking = calculateOvenBakingInfo(row.triDoughPanels);
      ovenBakingRows.push({
        product_name: row.sconeItem.name,
        oven_number: row.sconeItem.oven_number || '-',
        total_panels: row.triDoughPanels,
        full_pans: baking.full_pans,
        remainder_panels: baking.remainder_panels,
      });
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 print:p-0 print:bg-white print:text-black">
      {/* CSS for A4 Landscape Printing */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 6mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 1rem !important;
          }
        }
      `}</style>

      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center gap-2 font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> 메인 화면으로 돌아가기
        </button>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 font-extrabold text-slate-950 rounded-lg text-sm transition flex items-center gap-2 shadow-lg shadow-amber-500/20"
        >
          <Printer className="w-4 h-4" /> A4 가로 인쇄하기
        </button>
      </div>

      {/* Printable Area */}
      <div className="print-container max-w-6xl mx-auto bg-white text-black p-6 rounded-xl shadow-xl print:p-2">
        {/* Header */}
        <div className="border-b border-gray-400 pb-2 mb-3 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase text-gray-900">머드스콘 일별 생산 요약표</h1>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-gray-500 block">생산 일자</span>
            <span className="text-base font-bold text-gray-900">{recordDate}</span>
          </div>
        </div>

        {/* Top 2 Cards for Service Scones & Auxiliary Materials (Included in print on Page 1) */}
        <div className="grid grid-cols-12 gap-3 mb-3 border border-gray-300 p-2.5 rounded-lg bg-gray-50 text-xs">
          {/* Service Scone Table */}
          <div className="col-span-4 border-r border-gray-300 pr-3">
            <div className="text-xs font-bold text-purple-900 mb-1 flex justify-between">
              <span>🎁 서비스스콘 현황 표</span>
              <span className="text-[10px] font-normal text-gray-600">삼각+스틱 남음</span>
            </div>
            <table className="w-full text-center border-collapse text-xs border border-gray-300">
              <thead className="bg-purple-100 text-purple-950 font-bold">
                <tr>
                  <th className="border border-gray-300 p-1">필요량</th>
                  <th className="border border-gray-300 p-1">남는량</th>
                  <th className="border border-gray-300 p-1">부족</th>
                  <th className="border border-gray-300 p-1">남는</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-1 font-bold">{serviceRequiredQty}개</td>
                  <td className="border border-gray-300 p-1 font-bold">{totalLeftoverStock}개</td>
                  <td className="border border-gray-300 p-1 font-bold text-red-700">
                    {shortageServiceCount > 0 ? `${shortageServiceCount}개` : '없음'}
                  </td>
                  <td className="border border-gray-300 p-1 font-bold text-green-700">
                    {excessServiceCount > 0 ? `${excessServiceCount}개` : '없음'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Auxiliary & Raw Material Table */}
          <div className="col-span-8 pl-1">
            <div className="text-xs font-bold text-sky-950 mb-1 flex justify-between">
              <span>📦 기타 부자재 & 원재료 집계</span>
              <span className="text-xs font-black text-amber-900">발송건수: {shipmentCount}건</span>
            </div>
            <table className="w-full text-center border-collapse text-xs border border-gray-300">
              <thead className="bg-sky-100 text-sky-950 font-bold">
                <tr>
                  <th className="border border-gray-300 p-1 text-[9px] bg-amber-100 text-amber-950 font-black">필요 유크림</th>
                  <th className="border border-gray-300 p-1 text-[9px]">그릭요거트</th>
                  <th className="border border-gray-300 p-1 text-[9px]">OPP</th>
                  <th className="border border-gray-300 p-1 text-[9px]">대파분태</th>
                  <th className="border border-gray-300 p-1 text-[9px]">피넛스무스</th>
                  <th className="border border-gray-300 p-1 text-[9px]">피넛크런치</th>
                  <th className="border border-gray-300 p-1 text-[9px]">스타터팩</th>
                  <th className="border border-gray-300 p-1 text-[9px]">이매진</th>
                  <th className="border border-gray-300 p-1 text-[9px]">요프 (말차)</th>
                  <th className="border border-gray-300 p-1 text-[9px]">요프 (콩가루)</th>
                  <th className="border border-gray-300 p-1 text-[9px]">요프 (6종)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-bold">
                  <td className="border border-gray-300 p-1 bg-amber-50 text-amber-950 font-black">{heavyCreamDisplayStr}</td>
                  <td className="border border-gray-300 p-1">{greekYogurtQty}</td>
                  <td className="border border-gray-300 p-1">{oppQty}</td>
                  <td className="border border-gray-300 p-1">{greenOnionQty}</td>
                  <td className="border border-gray-300 p-1">{peanutSmoothQty}</td>
                  <td className="border border-gray-300 p-1">{peanutCrunchQty}</td>
                  <td className="border border-gray-300 p-1">{starterPackQty}</td>
                  <td className="border border-gray-300 p-1">{imagineQty}</td>
                  <td className="border border-gray-300 p-1">{yoffMatchaQty}</td>
                  <td className="border border-gray-300 p-1">{yoffKinakoQty}</td>
                  <td className="border border-gray-300 p-1">{yoff6Qty}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Card Banner (Hidden when printing) */}
        <div className="grid grid-cols-4 gap-3 mb-3 bg-gray-100 p-2.5 rounded-lg border border-gray-300 print:hidden">
          <div className="text-center border-r border-gray-300">
            <span className="text-xs text-gray-600 font-semibold block">총 필요 반죽 판수</span>
            <span className="text-2xl font-black text-amber-700">
              {grandTotalAllPanels} <span className="text-sm font-normal">판</span>
            </span>
          </div>
          <div className="text-center border-r border-gray-300">
            <span className="text-xs text-gray-600 font-semibold block">삼각스콘 통합</span>
            <span className="text-xl font-bold text-gray-900">{totalTrianglePanels} 판</span>
          </div>
          <div className="text-center border-r border-gray-300">
            <span className="text-xs text-gray-600 font-semibold block">바스콘 통합</span>
            <span className="text-xl font-bold text-gray-900">{totalBarPanels} 판</span>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-600 font-semibold block">미니쉐이크 (4봉/판)</span>
            <span className="text-xl font-bold text-sky-800">{totalMiniShakePanels} 판</span>
          </div>
        </div>

        {/* Main Production Table */}
        <table className="w-full border-collapse text-xs mb-3 border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold text-center border-b border-gray-300">
              <th colSpan={2} className="border border-gray-300 p-1 text-amber-800">오븐</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-left">제품명</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">주문량</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">추가량</th>
              {showRequiredQty && <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-amber-100 text-amber-950 font-bold">필요량</th>}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right text-gray-600">이월재고</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-amber-100 text-amber-950 font-black">필요생산량</th>
              
              {/* 1. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-amber-700 text-white font-extrabold">삼각&바 필요 판수</th>
              
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-purple-950 text-purple-200">하프팩/쉐이크 (봉)</th>
              
              {/* 2. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-purple-800 text-white font-extrabold">하프팩/쉐이크 판수</th>
              
              {/* 3. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-indigo-800 text-white font-extrabold">스틱 판수</th>
              
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-sky-950 text-sky-200 font-bold">미니쉐이크 남는 수량 (봉)</th>
              
              {/* 4. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-emerald-700 text-white font-black text-sm">통합 최종 필요 판수</th>
              
              {/* Separate Excess Headers */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">삼각/바 남음</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">스틱 남음</th>
            </tr>
            <tr className="bg-gray-100 text-gray-900 font-bold text-[10px] text-center border-b border-gray-300">
              <th className="border border-gray-300 p-0.5">삼각 / 바</th>
              <th className="border border-gray-300 p-0.5 text-purple-900">스틱 / 큐브</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {unifiedRows.map((uRow, idx) => {
              if (uRow.type === 'separator') {
                return (
                  <tr key={`sep-${idx}`} className="bg-white">
                    <td colSpan={showRequiredQty ? 16 : 15} className="border border-gray-300 py-3 bg-white"></td>
                  </tr>
                );
              } else if (uRow.type === 'scone') {
                const row = uRow.row;
                const secOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number;
                const isBar = row.sconeItem.category === '바';

                return (
                  <tr key={`scone-${row.sconeItem.name}-${idx}`} className="bg-white hover:bg-gray-50">
                    <td className="border border-gray-300 p-1 text-center font-bold text-amber-900">
                      {row.sconeItem.oven_number || '-'}
                    </td>
                    <td className="border border-gray-300 p-1 text-center font-bold text-purple-900">
                      {secOven || '-'}
                    </td>
                    <td className="border border-gray-300 p-1 font-bold text-gray-900 text-left">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 ${uRow.categoryColorClass}`}>
                        {uRow.categoryTag}
                      </span>
                      {row.sconeItem.name}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-700">
                      {row.sconeItem.order_qty}개
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-700">
                      {row.sconeItem.extra_qty ? `${row.sconeItem.extra_qty}개` : '-'}
                    </td>

                    {showRequiredQty && (
                      <td className="border border-gray-300 p-1 text-right font-bold text-amber-950 bg-amber-50">
                        {row.sconeItem.required_qty}개
                      </td>
                    )}

                    <td className="border border-gray-300 p-1 text-right text-gray-500 font-medium">
                      {row.sconeItem.rollover_qty ? `${row.sconeItem.rollover_qty}개` : '-'}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-black text-amber-950 bg-amber-100">
                      {row.sconeItem.production_qty}개
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-black text-amber-950 bg-amber-50">
                      {row.triDoughPanels}판
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-purple-900">
                      {row.hpOrderBags ? `${row.hpOrderBags}봉` : '-'}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-bold text-purple-950 bg-purple-50">
                      {row.hpPanels ? `${row.hpPanels}판` : '-'}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-bold text-indigo-950 bg-indigo-50">
                      {row.stickPanels ? `${row.stickPanels}판` : '-'}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-sky-900">-</td>

                    <td className="border border-gray-300 p-1 text-right font-black text-emerald-950 bg-emerald-100 text-sm">
                      {row.finalRequiredPanels}판
                    </td>

                    <td className={`border border-gray-300 p-1 text-right font-bold ${row.excessQty > 0 ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
                      {row.excessQty}개
                    </td>

                    <td className={`border border-gray-300 p-1 text-right font-bold ${row.stickExcessPacks > 0 ? 'text-indigo-700 bg-indigo-50' : 'text-gray-400'}`}>
                      {row.stickExcessPacks}팩
                    </td>
                  </tr>
                );
              } else if (uRow.type === 'shake') {
                const sRow = uRow.row;
                return (
                  <tr key={`shake-${sRow.name}-${idx}`} className="bg-sky-50/40 hover:bg-sky-50">
                    <td className="border border-gray-300 p-1 text-center font-bold text-gray-400">-</td>
                    <td className="border border-gray-300 p-1 text-center font-bold text-purple-900">
                      {sRow.oven_number || '-'}
                    </td>
                    <td className="border border-gray-300 p-1 font-bold text-gray-900 text-left">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 bg-sky-200 text-sky-950 font-black">
                        쉐이크
                      </span>
                      {sRow.name}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-700">
                      {sRow.order_bags}봉
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-700">
                      {sRow.extra_qty ? `${sRow.extra_qty}봉` : '-'}
                    </td>

                    {showRequiredQty && (
                      <td className="border border-gray-300 p-1 text-right font-bold text-sky-950 bg-sky-100">
                        {sRow.required_bags}봉
                      </td>
                    )}

                    <td className="border border-gray-300 p-1 text-right text-gray-500 font-medium">
                      {sRow.rollover_qty ? `${sRow.rollover_qty}봉` : '-'}
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-black text-sky-950 bg-sky-100">
                      {sRow.production_bags}봉
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-400">-</td>

                    <td className="border border-gray-300 p-1 text-right font-bold text-purple-950 bg-purple-50">
                      {sRow.production_bags}봉
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-bold text-purple-950 bg-purple-50">
                      {sRow.requiredPanels}판
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-medium text-gray-400">-</td>

                    <td className={`border border-gray-300 p-1 text-right font-bold ${sRow.remainderBags > 0 ? 'text-sky-700 bg-sky-100' : 'text-gray-400'}`}>
                      {sRow.remainderBags}봉
                    </td>

                    <td className="border border-gray-300 p-1 text-right font-black text-emerald-950 bg-emerald-100 text-sm">
                      {sRow.requiredPanels}판
                    </td>

                    <td className="border border-gray-300 p-1 text-right text-gray-400">-</td>

                    <td className="border border-gray-300 p-1 text-right text-gray-400">-</td>
                  </tr>
                );
              }
            })}
          </tbody>

          {/* Table Footer Totals */}
          <tfoot>
            <tr className="bg-gray-100 font-black text-gray-900 border-t border-gray-300 text-right">
              <td colSpan={showRequiredQty ? 8 : 7} className="border border-gray-300 p-1.5 text-center text-xs">
                합계 (총 {grandTotalAllPanels} 판)
              </td>
              <td className="border border-gray-300 p-1.5 bg-amber-100 text-amber-950">
                {totalTrianglePanels + totalBarPanels}판
              </td>
              <td className="border border-gray-300 p-1.5">
                {combinedTriangleRows.reduce((a, r) => a + r.hpOrderBags, 0) +
                  combinedBarRows.reduce((a, r) => a + r.hpOrderBags, 0)}봉
              </td>
              <td className="border border-gray-300 p-1.5 bg-purple-100 text-purple-950">
                {combinedTriangleRows.reduce((a, r) => a + r.hpPanels, 0) +
                  combinedBarRows.reduce((a, r) => a + r.hpPanels, 0) +
                  totalMiniShakePanels}판
              </td>
              <td className="border border-gray-300 p-1.5 bg-indigo-100 text-indigo-950">
                {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0) +
                  combinedBarRows.reduce((a, r) => a + r.stickPanels, 0)}판
              </td>
              <td className="border border-gray-300 p-1.5 bg-sky-100 text-sky-950">
                {miniShakeRows.reduce((a, r) => a + r.remainderBags, 0)}봉
              </td>
              <td className="border border-gray-300 p-1.5 bg-emerald-200 text-emerald-950 text-sm font-black">
                {grandTotalAllPanels}판
              </td>
              <td className="border border-gray-300 p-1.5 bg-blue-100 text-blue-950">
                {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) +
                  combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
              </td>
              <td className="border border-gray-300 p-1.5 bg-indigo-100 text-indigo-950">
                {combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0)}팩
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Oven Baking Dedicated Table for Print */}
        <div className="mt-6 page-break-before">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-400 pb-0.5">
              🔥 삼각 & 바 스콘 오븐 굽기 작업표 (풀팬 3판 기준)
            </h3>
          </div>
          <table className="w-full text-xs text-center border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100 font-extrabold border-b border-gray-300">
                <th className="border border-gray-300 p-1 text-left">상품명</th>
                <th className="border border-gray-300 p-1 w-20">오븐번호</th>
                <th className="border border-gray-300 p-1 w-24 bg-amber-100">삼각(바)판수</th>
                <th className="border border-gray-300 p-1 w-24 bg-indigo-100">풀팬(3판)</th>
                <th className="border border-gray-300 p-1 w-28 bg-sky-100">남는 반죽 판수</th>
              </tr>
            </thead>
            <tbody>
              {ovenBakingRows.map((obRow, obIdx) => {
                if (obRow.is_separator) {
                  return (
                    <tr key={`ob-print-sep-${obIdx}`} className="bg-white">
                      <td colSpan={5} className="border border-gray-300 py-3 bg-white"></td>
                    </tr>
                  );
                }
                return (
                  <tr key={`ob-print-${obRow.product_name}-${obIdx}`} className="bg-white">
                    <td className="border border-gray-300 p-1.5 text-left font-bold text-gray-900">
                      {obRow.product_name}
                    </td>
                    <td className="border border-gray-300 p-1.5 font-bold text-gray-800">
                      {obRow.oven_number}
                    </td>
                    <td className="border border-gray-300 p-1.5 font-black text-amber-950 bg-amber-50">
                      {obRow.total_panels}
                    </td>
                    <td className="border border-gray-300 p-1.5 font-black text-indigo-950 bg-indigo-50 text-sm">
                      {obRow.full_pans}
                    </td>
                    <td className="border border-gray-300 p-1.5 font-black text-sky-950 bg-sky-50 text-sm">
                      {obRow.remainder_panels}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
