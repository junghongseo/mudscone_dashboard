import React from 'react';
import { ProductionItem } from '../../types/production';
import { Printer, ArrowLeft } from 'lucide-react';
import { calculateCombinedSconeRows, roundHalf } from '../../utils/productionDoughCalculator';

interface ProductionPrintViewProps {
  items: ProductionItem[];
  recordDate: string;
  showRequiredQty?: boolean;
  shipmentCount?: number;
  onBack: () => void;
}

export const ProductionPrintView: React.FC<ProductionPrintViewProps> = ({
  items,
  recordDate,
  showRequiredQty = true,
  shipmentCount = 0,
  onBack,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const {
    combinedTriangleRows,
    combinedBarRows,
    combinedMiniShakeRows,
    unifiedRows,
    ovenBakingRows,
    grandTotalAllPanels,
    halfpackItems,
    miniShakeItems,
  } = calculateCombinedSconeRows(items);

  const totalTrianglePanels = combinedTriangleRows.reduce((a, r) => a + r.finalPanels, 0);
  const totalBarPanels = combinedBarRows.reduce((a, r) => a + r.finalPanels, 0);
  const totalMiniShakePanels = combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0);
  const sconeItemsOnly = items.filter((i) => i.category === '삼각' || i.category === '바');

  // Service Scones Calculation - STRICT: ONLY items explicitly confirmed as category '서비스'
  const serviceItems = items.filter(
    (i) => i.category === '서비스' && i.is_confirmed === true
  );
  const serviceRequiredQty = serviceItems.reduce((a, i) => a + i.required_qty, 0);

  const leftoverTriangles = combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0);
  const leftoverSticks = combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0);
  const totalLeftoverStock = leftoverTriangles + leftoverSticks;

  const shortageServiceCount = serviceRequiredQty > totalLeftoverStock ? (serviceRequiredQty - totalLeftoverStock) : 0;
  const excessServiceCount = totalLeftoverStock > serviceRequiredQty ? (totalLeftoverStock - serviceRequiredQty) : 0;

  // Other Auxiliary Items Aggregation - Checks parent_scone_name AND product_name
  const getMiscItemQty = (targetNames: string[]) => {
    const matched = items.filter(
      (i) =>
        i.category === '기타' &&
        i.is_confirmed === true &&
        targetNames.some((tn) =>
          (i.parent_scone_name && i.parent_scone_name.trim().toLowerCase() === tn.trim().toLowerCase()) ||
          (i.product_name && i.product_name.trim().toLowerCase() === tn.trim().toLowerCase())
        )
    );
    return matched.reduce((a, i) => a + i.order_qty, 0);
  };

  const sconeHeavyCreamTotalGrams = combinedTriangleRows.reduce(
    (sum, r) => sum + ((r.sconeItem.heavy_cream_per_panel || 0) * r.finalPanels),
    0
  ) + combinedBarRows.reduce(
    (sum, r) => sum + ((r.sconeItem.heavy_cream_per_panel || 0) * r.finalPanels),
    0
  );

  const greekYogurtQty = getMiscItemQty(['그릭요거트', '요거트']);
  const oppQty = getMiscItemQty(['opp', 'opp비닐']);
  const greenOnionQty = getMiscItemQty(['대파분태', '대파']);
  const peanutSmoothQty = getMiscItemQty(['피넛스무스']);
  const peanutCrunchQty = getMiscItemQty(['피넛크런치']);
  const starterPackQty = getMiscItemQty(['스타터팩']);
  const imagineQty = getMiscItemQty(['이매진']);
  const manualHeavyCreamMisc = getMiscItemQty(['필요 유크림', '유크림']);
  const totalHeavyCreamGrams = sconeHeavyCreamTotalGrams + manualHeavyCreamMisc;
  const heavyCreamDisplayStr = totalHeavyCreamGrams > 0 ? (totalHeavyCreamGrams / 1000.0).toFixed(1) : '0';
  const yoffMatchaQty = getMiscItemQty(['요프 (말차)', '요프말차', '말차 요프', '요프 말차']);
  const yoffKinakoQty = getMiscItemQty(['요프 (콩가루)', '요프콩가루', '콩가루 요프', '요프 콩가루']);
  const yoff6Qty = getMiscItemQty(['요프 (6종)', '요프6종', '요프 6종']);

  const formatOvenNumber = (baseOven?: string, secOven?: string) => {
    const primary = baseOven || '1';
    if (secOven) {
      return `${primary}(삼각&바) / ${secOven}(스틱&큐브)`;
    }
    return `${primary}(삼각&바)`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 print:p-0 print:bg-white print:text-black">
      {/* CSS for A4 Landscape Printing */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
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
            border: none !important;
            outline: none !important;
          }
          .page-break-before {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0.5rem !important;
          }
        }
      `}</style>

      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-6xl mx-auto mb-4 flex justify-between items-center print:hidden">
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
      <div className="print-container max-w-6xl mx-auto bg-white text-black p-4 rounded-lg print:p-0 print:border-none shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-300 pb-2 mb-3 flex justify-between items-end">
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase text-gray-900">머드스콘 일별 생산 요약표</h1>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-gray-500 block">생산 일자</span>
            <span className="text-base font-bold text-gray-900">{recordDate}</span>
          </div>
        </div>

        {/* Top 2 Cards for Service Scones & Auxiliary Materials (Included in print on Page 1) */}
        <div className="grid grid-cols-12 gap-2.5 mb-3 border border-gray-300 p-2 rounded-lg bg-gray-50 text-xs">
          {/* Service Scone Table */}
          <div className="col-span-4 border-r border-gray-300 pr-2.5">
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

        {/* Main Production Table */}
        <table className="w-full border-collapse text-xs mb-3 border border-gray-300">
          <thead>
            <tr className="bg-gray-100 text-gray-900 font-bold text-center border-b border-gray-300">
              <th colSpan={2} className="border border-gray-300 p-1 text-gray-800">오븐</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-left">제품명</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">주문량</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right">추가량</th>
              {showRequiredQty && <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-gray-50 text-gray-800">필요량</th>}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right text-gray-600">이월재고</th>
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-amber-50 text-amber-950 font-bold">필요생산량</th>
              
              {/* 1. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-amber-100 text-amber-950 font-extrabold text-xs">삼각&바 필요 판수</th>
              
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-purple-50 text-purple-900">하프팩/쉐이크 (봉)</th>
              
              {/* 2. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-purple-100 text-purple-950 font-extrabold text-xs">하프팩/쉐이크 판수</th>
              
              {/* 3. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-blue-100 text-blue-950 font-extrabold text-xs">스틱 판수</th>
              
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-sky-50 text-sky-900">미니쉐이크 남는 수량 (봉)</th>
              
              {/* 4. Key Panel Header */}
              <th rowSpan={2} className="border border-gray-300 p-1 text-right bg-emerald-200 text-emerald-950 font-black text-sm">통합 최종 필요 판수</th>
              
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
                    <td colSpan={showRequiredQty ? 16 : 15} className="border border-gray-400 py-3 bg-white"></td>
                  </tr>
                );
              } else if (uRow.type === 'scone') {
                const row = uRow.row;
                const secOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number;
                const isBar = row.sconeItem.category === '바';
                return (
                  <tr key={`scone-${idx}`} className="bg-white hover:bg-gray-50 border-b border-gray-300">
                    <td className="border border-gray-300 p-1 text-center font-bold text-gray-800">{row.sconeItem.oven_number || '1'}</td>
                    <td className="border border-gray-300 p-1 text-center font-bold text-purple-900">{secOven || '-'}</td>
                    <td className="border border-gray-300 p-1 font-bold text-gray-900">
                      <span className={`inline-block px-1 py-0.2 rounded text-[10px] mr-1 ${isBar ? 'bg-orange-100 text-orange-900' : 'bg-amber-100 text-amber-900'}`}>
                        {isBar ? '바' : '삼각'}
                      </span>
                      {row.sconeItem.product_name}
                    </td>
                    <td className="border border-gray-300 p-1 text-right">{row.sconeItem.order_qty}개</td>
                    <td className="border border-gray-300 p-1 text-right text-gray-600">{row.sconeItem.extra_qty ? `${row.sconeItem.extra_qty}개` : '-'}</td>
                    {showRequiredQty && <td className="border border-gray-300 p-1 text-right text-gray-800 bg-gray-50">{row.sconeItem.required_qty}개</td>}
                    <td className="border border-gray-300 p-1 text-right text-gray-600">{row.sconeItem.carryover_qty ? `${row.sconeItem.carryover_qty}개` : '-'}</td>
                    <td className="border border-gray-300 p-1 text-right font-bold text-gray-900 bg-amber-50">{row.sconeItem.production_qty}개</td>
                    
                    {/* 1. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-sm text-amber-950 bg-amber-50">{row.sconeDoughPanels}판</td>
                    
                    <td className="border border-gray-300 p-1 text-right text-purple-900">{row.hpOrderBags > 0 ? `${row.hpOrderBags}봉` : '-'}</td>
                    
                    {/* 2. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-sm text-purple-950 bg-purple-50">{row.hpPanels > 0 ? `${row.hpPanels}판` : '-'}</td>
                    
                    {/* 3. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-sm text-blue-950 bg-blue-50">{row.stickPanels > 0 ? `${row.stickPanels}판` : '-'}</td>
                    
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                    
                    {/* 4. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-base text-emerald-950 bg-emerald-100">{row.finalPanels}판</td>
                    
                    <td className={`border border-gray-300 p-1 text-right font-bold ${row.excessQty > 0 ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
                      {row.excessQty > 0 ? `${row.excessQty}개` : '-'}
                    </td>
                    <td className={`border border-gray-300 p-1 text-right font-bold ${row.stickExcessPacks > 0 ? 'text-indigo-700 bg-indigo-50' : 'text-gray-400'}`}>
                      {row.stickExcessPacks > 0 ? `${row.stickExcessPacks}팩` : '-'}
                    </td>
                  </tr>
                );
              } else {
                const row = uRow.row;
                return (
                  <tr key={`shake-${idx}`} className="bg-sky-50/40 hover:bg-sky-50 border-b border-gray-300">
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                    <td className="border border-gray-300 p-1 text-center font-bold text-purple-900">{row.shakeItem.oven_number || '1'}</td>
                    <td className="border border-gray-300 p-1 font-bold text-gray-900">
                      <span className="inline-block px-1 py-0.2 rounded text-[10px] mr-1 bg-sky-200 text-sky-950 font-bold">
                        쉐이크
                      </span>
                      {row.shakeItem.product_name}
                    </td>
                    <td className="border border-gray-300 p-1 text-right">{row.orderBags}봉</td>
                    <td className="border border-gray-300 p-1 text-right text-gray-600">{row.extraBags ? `${row.extraBags}봉` : '-'}</td>
                    {showRequiredQty && <td className="border border-gray-300 p-1 text-right text-gray-800 bg-gray-50">{row.orderBags + row.extraBags}봉</td>}
                    <td className="border border-gray-300 p-1 text-right text-gray-600">{row.carryoverBags ? `${row.carryoverBags}봉` : '-'}</td>
                    <td className="border border-gray-300 p-1 text-right font-bold text-gray-900 bg-amber-50">{row.prodBags}봉</td>
                    
                    {/* 1. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                    
                    <td className="border border-gray-300 p-1 text-right text-purple-900">{row.prodBags}봉</td>
                    
                    {/* 2. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-sm text-purple-950 bg-purple-50">{row.panels}판</td>
                    
                    {/* 3. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                    
                    <td className={`border border-gray-300 p-1 text-right font-bold ${row.excessBags > 0 ? 'text-sky-700 bg-sky-100' : 'text-gray-400'}`}>
                      {row.excessBags > 0 ? `${row.excessBags}봉` : '-'}
                    </td>
                    
                    {/* 4. Key Panel Cell */}
                    <td className="border border-gray-300 p-1 text-right font-black text-base text-emerald-950 bg-emerald-100">{row.panels}판</td>
                    
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                    <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
                  </tr>
                );
              }
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400">
              <td colSpan={3} className="border border-gray-300 p-1 text-center font-black">전체 총 합계</td>
              <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
              <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
              {showRequiredQty && <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>}
              <td className="border border-gray-300 p-1 text-center text-gray-400">-</td>
              <td className="border border-gray-300 p-1 text-right font-bold">{sconeItemsOnly.reduce((acc, i) => acc + i.production_qty, 0)}개</td>
              <td className="border border-gray-300 p-1 text-right font-black text-sm text-amber-950 bg-amber-100">
                {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
              </td>
              <td className="border border-gray-300 p-1 text-right font-bold">
                {items.filter(i => i.category === '미니큐브' || i.category === '미니쉐이크').reduce((a, i) => a + i.order_qty, 0)}봉
              </td>
              <td className="border border-gray-300 p-1 text-right font-black text-sm text-purple-950 bg-purple-100">
                {roundHalf(items.filter(i => i.category === '미니큐브').reduce((a, i) => a + i.order_qty, 0) / 2.0 + totalMiniShakePanels)}판
              </td>
              <td className="border border-gray-300 p-1 text-right font-black text-sm text-blue-950 bg-blue-100">
                {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
              </td>
              <td className="border border-gray-300 p-1 text-right font-bold text-sky-950">
                {combinedMiniShakeRows.reduce((a, r) => a + r.excessBags, 0)}봉
              </td>
              <td className="border border-gray-300 p-1 text-right font-black text-lg text-emerald-950 bg-emerald-200">
                {grandTotalAllPanels} 판
              </td>
              <td className="border border-gray-300 p-1 text-right font-bold text-gray-900">
                {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
              </td>
              <td className="border border-gray-300 p-1 text-right font-bold text-indigo-900">
                {combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0)}팩
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Oven Baking Dedicated Table for Print */}
        <div className="mt-6 page-break-before">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-extrabold text-sm text-gray-900 border-b border-gray-300 pb-0.5">
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
