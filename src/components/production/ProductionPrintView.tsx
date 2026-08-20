import React from 'react';
import { ProductionItem } from '../../types/production';
import { Printer, ArrowLeft } from 'lucide-react';
import { calculateCombinedSconeRows, calculateDoughPortions, roundHalf } from '../../utils/productionDoughCalculator';

interface ProductionPrintViewProps {
  items: ProductionItem[];
  recordDate: string;
  showRequiredQty?: boolean;
  shipmentCount?: number;
  fieldOverrides?: Record<string, { four?: number; one?: number; frozenFour?: number; frozenOne?: number }>;
  fontSize?: number;
  rowHeight?: number;
  onBack: () => void;
}

export const ProductionPrintView: React.FC<ProductionPrintViewProps> = ({
  items,
  recordDate,
  showRequiredQty = true,
  shipmentCount = 0,
  fieldOverrides = {},
  fontSize = 10,
  rowHeight = 24,
  onBack,
}) => {
  const [printPages, setPrintPages] = React.useState<{ p1: boolean; p2: boolean; p3: boolean }>({
    p1: true,
    p2: true,
    p3: true,
  });

  const PAGE_SAFE_HEIGHTS: Record<'p1' | 'p2' | 'p3', number> = {
    p1: 670,
    p2: 690,
    p3: 635,
  };
  const FIXED_FONT_SIZE = 13.5; // Fixed font size for all print pages

  const STORAGE_KEY = 'mudscone_print_row_heights';
  const ZEBRA_STORAGE_KEY = 'mudscone_print_zebra_style';

  const ZEBRA_PRESETS = [
    { label: '선명 블루', color: '#2563eb', opacity: 20 },
    { label: '청량 스카이', color: '#0284c7', opacity: 18 },
    { label: '쿨 그레이', color: '#475569', opacity: 16 },
    { label: '라벤더', color: '#7c3aed', opacity: 16 },
  ];

  const computeZebraRgb = (hex: string, alphaPercent: number): string => {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map((x) => x + x).join('');
      const num = parseInt(c, 16);
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      const a = Math.min(Math.max(alphaPercent, 5), 70) / 100;
      const blendedR = Math.round(r * a + 255 * (1 - a));
      const blendedG = Math.round(g * a + 255 * (1 - a));
      const blendedB = Math.round(b * a + 255 * (1 - a));
      return `rgb(${blendedR}, ${blendedG}, ${blendedB})`;
    } catch (e) {
      return 'rgb(219, 234, 254)';
    }
  };

  const [zebraConfig, setZebraConfig] = React.useState<{ baseColor: string; opacity: number }>(() => {
    try {
      const saved = localStorage.getItem(ZEBRA_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.baseColor && typeof parsed.opacity === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load saved zebra style', e);
    }
    return { baseColor: '#2563eb', opacity: 20 };
  });

  const handleZebraChange = (baseColor: string, opacity: number) => {
    const updated = { baseColor, opacity };
    setZebraConfig(updated);
    try {
      localStorage.setItem(ZEBRA_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save zebra style', e);
    }
  };

  const activeZebraRgb = computeZebraRgb(zebraConfig.baseColor, zebraConfig.opacity);

  const [activeTab, setActiveTab] = React.useState<'p1' | 'p2' | 'p3'>('p1');
  const [pageStyles, setPageStyles] = React.useState<Record<'p1' | 'p2' | 'p3', { rowHeight: number }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          p1: { rowHeight: parsed.p1?.rowHeight || 20 },
          p2: { rowHeight: parsed.p2?.rowHeight || 24 },
          p3: { rowHeight: parsed.p3?.rowHeight || 20 },
        };
      }
    } catch (e) {
      console.error('Failed to load saved print row heights', e);
    }
    return {
      p1: { rowHeight: 20 },
      p2: { rowHeight: 24 },
      p3: { rowHeight: 20 },
    };
  });

  const [contentHeights, setContentHeights] = React.useState<{ p1: number; p2: number; p3: number }>({
    p1: 0,
    p2: 0,
    p3: 0,
  });

  const p1Ref = React.useRef<HTMLDivElement>(null);
  const p2Ref = React.useRef<HTMLDivElement>(null);
  const p3Ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateHeights = () => {
      setContentHeights({
        p1: p1Ref.current?.offsetHeight || 0,
        p2: p2Ref.current?.offsetHeight || 0,
        p3: p3Ref.current?.offsetHeight || 0,
      });
    };
    updateHeights();
    const ro = new ResizeObserver(updateHeights);
    if (p1Ref.current) ro.observe(p1Ref.current);
    if (p2Ref.current) ro.observe(p2Ref.current);
    if (p3Ref.current) ro.observe(p3Ref.current);
    return () => ro.disconnect();
  }, [pageStyles, printPages, items]);

  const handleSpecificPageRowHeightChange = (pageKey: 'p1' | 'p2' | 'p3', val: number) => {
    setPageStyles((prev) => {
      const updated = {
        ...prev,
        [pageKey]: {
          rowHeight: val,
        },
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save print row heights', e);
      }
      return updated;
    });
  };

  const scrollToPage = (pageKey: 'p1' | 'p2' | 'p3') => {
    setActiveTab(pageKey);
    if (!printPages[pageKey]) {
      setPrintPages((prev) => ({ ...prev, [pageKey]: true }));
    }
    setTimeout(() => {
      const el = document.getElementById(`print-sheet-${pageKey}`);
      if (el) {
        const toolbarOffset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = el.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - toolbarOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    }, 50);
  };

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
  } = calculateCombinedSconeRows(items);

  const totalTrianglePanels = combinedTriangleRows.reduce((a, r) => a + r.finalPanels, 0);
  const totalBarPanels = combinedBarRows.reduce((a, r) => a + r.finalPanels, 0);
  const totalMiniShakePanels = combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0);

  const serviceItems = items.filter(
    (i) => i.category === '서비스' && i.is_confirmed === true
  );
  const serviceRequiredQty = serviceItems.reduce((a, i) => a + i.required_qty, 0);

  const leftoverTriangles = combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0);
  const leftoverSticks = combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0);
  const totalLeftoverStock = leftoverTriangles + leftoverSticks;

  const shortageServiceCount = serviceRequiredQty > totalLeftoverStock ? (serviceRequiredQty - totalLeftoverStock) : 0;
  const excessServiceCount = totalLeftoverStock > serviceRequiredQty ? (totalLeftoverStock - serviceRequiredQty) : 0;

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

  return (
    <div className="min-h-screen bg-slate-900 p-4 text-slate-100 font-sans print:bg-white print:p-0 print:m-0 print:text-black">
      <style>{`
        .print-table-p1 th, .print-table-p1 td,
        .print-table-p2 th, .print-table-p2 td,
        .print-table-p3 th, .print-table-p3 td {
          line-height: 1.15;
          padding-top: 1px;
          padding-bottom: 1px;
        }
        @media print {
          @page { size: landscape; margin: 3mm 4mm; }
          *, *:before, *:after { 
            box-shadow: none !important; 
            text-shadow: none !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          html, body, .min-h-screen { 
            background: #ffffff !important; 
            color: #000000 !important; 
          }
          .print-sheet { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
          .page-break-before { page-break-before: always !important; break-before: page !important; margin-top: 0 !important; }
          .no-print { display: none !important; }
          .print-table-p1, .print-table-p2, .print-table-p3 { font-size: ${FIXED_FONT_SIZE}px !important; }
          .print-table-p1 tr { height: ${pageStyles.p1.rowHeight}px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-table-p2 tr { height: ${pageStyles.p2.rowHeight}px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-table-p3 tr { height: ${pageStyles.p3.rowHeight}px !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-table-p1 th, .print-table-p1 td,
          .print-table-p2 th, .print-table-p2 td,
          .print-table-p3 th, .print-table-p3 td {
            padding-top: 0px !important;
            padding-bottom: 0px !important;
            line-height: 1.1 !important;
            vertical-align: middle !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Sticky Top Toolbar */}
      <div className="sticky top-2 z-50 max-w-6xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-2 print:hidden bg-slate-800/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-700 shadow-2xl">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition flex items-center gap-1.5 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 메인 화면으로
        </button>

        {/* Quick Jump Buttons & Target Selection */}
        <div className="flex items-center gap-3 text-xs font-bold bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">페이지 이동:</span>
            <button
              onClick={() => scrollToPage('p1')}
              className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 text-[11px] font-extrabold transition flex items-center gap-1"
            >
              📄 1P 요약표
            </button>
            <button
              onClick={() => scrollToPage('p2')}
              className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white text-[11px] font-extrabold transition flex items-center gap-1"
            >
              🔥 2P 오븐표
            </button>
            <button
              onClick={() => scrollToPage('p3')}
              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[11px] font-extrabold transition flex items-center gap-1"
            >
              📋 3P 디스트리뷰터
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">인쇄 대상:</span>
            <label className="flex items-center gap-1 cursor-pointer text-amber-300 hover:text-amber-200">
              <input
                type="checkbox"
                checked={printPages.p1}
                onChange={(e) => setPrintPages((prev) => ({ ...prev, p1: e.target.checked }))}
                className="rounded accent-amber-500"
              />
              1P
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-purple-300 hover:text-purple-200">
              <input
                type="checkbox"
                checked={printPages.p2}
                onChange={(e) => setPrintPages((prev) => ({ ...prev, p2: e.target.checked }))}
                className="rounded accent-purple-500"
              />
              2P
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-emerald-300 hover:text-emerald-200">
              <input
                type="checkbox"
                checked={printPages.p3}
                onChange={(e) => setPrintPages((prev) => ({ ...prev, p3: e.target.checked }))}
                className="rounded accent-emerald-500"
              />
              3P
            </label>
          </div>
        </div>

        {/* Zebra Row Striping Color & Opacity Control */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
          <span className="text-slate-300 font-bold text-xs flex items-center gap-1">
            🎨 줄무늬 색감:
          </span>
          <input
            type="color"
            value={zebraConfig.baseColor}
            onChange={(e) => handleZebraChange(e.target.value, zebraConfig.opacity)}
            className="w-5 h-5 rounded cursor-pointer border border-slate-600 bg-transparent p-0"
            title="색상 선택기"
          />
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px]">진하기:</span>
            <input
              type="range"
              min="5"
              max="60"
              step="1"
              value={zebraConfig.opacity}
              onChange={(e) => handleZebraChange(zebraConfig.baseColor, parseInt(e.target.value, 10))}
              className="w-16 accent-blue-500 cursor-pointer"
              title="진하기 조절"
            />
            <span className="font-mono text-blue-300 font-black text-[11px] min-w-[26px]">{zebraConfig.opacity}%</span>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            {ZEBRA_PRESETS.map((p) => {
              const isSelected = zebraConfig.baseColor === p.color && Math.abs(zebraConfig.opacity - p.opacity) <= 2;
              return (
                <button
                  key={p.label}
                  onClick={() => handleZebraChange(p.color, p.opacity)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border transition ${
                    isSelected
                      ? 'bg-blue-600/30 text-blue-300 border-blue-400 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Live Sample Swatch */}
          <div
            className="w-4 h-4 rounded border border-slate-400 shadow-inner ml-0.5"
            style={{ backgroundColor: activeZebraRgb }}
            title="현재 인쇄 줄무늬 색상 미리보기"
          />
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-extrabold text-slate-950 rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
        >
          <Printer className="w-3.5 h-3.5" /> A4 가로 인쇄하기
        </button>
      </div>

      {/* Printable Area: Individual A4 Paper Sheets */}
      <div className="max-w-6xl mx-auto">
        {/* ================= PAGE 1: 생산 요약표 ================= */}
        {printPages.p1 && (
          <div
            id="print-sheet-p1"
            className="print-sheet relative max-w-6xl mx-auto bg-white text-black p-4 rounded-xl shadow-2xl mb-12 border border-slate-300 print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none"
          >
            {/* Sheet Banner with Direct Row Height Slider + Real-time Height Status */}
            <div className="print:hidden flex flex-wrap justify-between items-center bg-amber-50/90 px-3.5 py-2 rounded-lg border border-amber-200 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-amber-950">📄 1P: 머드스콘 일별 생산 요약표</span>
                <span className="text-[11px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-300">
                  글자: {FIXED_FONT_SIZE}px (고정)
                </span>
                {contentHeights.p1 > 0 && (
                  contentHeights.p1 <= PAGE_SAFE_HEIGHTS.p1 ? (
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                      ✅ A4 1장 안전 ({contentHeights.p1}px / {PAGE_SAFE_HEIGHTS.p1}px)
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse flex items-center gap-1">
                      ⚠️ 1장 초과 (+{contentHeights.p1 - PAGE_SAFE_HEIGHTS.p1}px) — 행 높이를 줄여주세요!
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-md border border-amber-200 text-xs shadow-sm">
                <span className="text-amber-950 font-bold text-xs">행 높이 조절:</span>
                <input
                  type="range"
                  min="16"
                  max="45"
                  step="1"
                  value={pageStyles.p1.rowHeight}
                  onChange={(e) => handleSpecificPageRowHeightChange('p1', parseInt(e.target.value, 10))}
                  className="w-28 accent-amber-500 cursor-pointer"
                />
                <span className="font-mono text-amber-950 font-black text-xs min-w-[32px]">{pageStyles.p1.rowHeight}px</span>
              </div>
            </div>

            {/* Printable Content with Strict A4 Limit Line */}
            <div ref={p1Ref} className="relative">
              {/* A4 1-Page Strict Safe Limit Line (Screen Only) */}
              <div
                className="print:hidden absolute left-0 right-0 border-b-2 border-dashed border-rose-500 pointer-events-none z-20 flex justify-end pr-3"
                style={{ top: `${PAGE_SAFE_HEIGHTS.p1}px` }}
              >
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-md -mt-3 flex items-center gap-1">
                  ✂ A4 1페이지 안전 한계선 ({PAGE_SAFE_HEIGHTS.p1}px)
                </span>
              </div>

            {/* Header */}
            <div className="border-b border-gray-300 pb-1 mb-1.5 flex justify-between items-end">
              <div>
                <h1 className="text-lg font-black tracking-tight uppercase text-gray-900">머드스콘 일별 생산 요약표</h1>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 block">생산 일자</span>
                <span className="text-sm font-bold text-gray-900">{recordDate}</span>
              </div>
            </div>

            {/* Top 2 Cards for Service Scones & Auxiliary Materials */}
            <div className="grid grid-cols-12 gap-2 mb-1.5 border border-gray-300 p-1.5 rounded bg-gray-50 text-[10px]">
              {/* Service Scone Table */}
              <div className="col-span-4 border-r border-gray-300 pr-2">
                <div className="text-[10px] font-bold text-gray-900 mb-0.5 flex justify-between">
                  <span>🎁 서비스스콘 현황 표</span>
                  <span className="text-[9px] font-normal text-gray-600">삼각+스틱 남음</span>
                </div>
                <table className="w-full text-center border-collapse text-[10px] border border-gray-300 bg-white">
                  <thead className="bg-gray-100 text-gray-900 font-bold">
                    <tr>
                      <th className="border border-gray-300 py-0.5 px-1">필요량</th>
                      <th className="border border-gray-300 py-0.5 px-1">남는량</th>
                      <th className="border border-gray-300 py-0.5 px-1">부족</th>
                      <th className="border border-gray-300 py-0.5 px-1">남는</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 py-0.5 px-1 font-bold">{serviceRequiredQty}개</td>
                      <td className="border border-gray-300 py-0.5 px-1 font-bold">{totalLeftoverStock}개</td>
                      <td className="border border-gray-300 py-0.5 px-1 font-bold text-red-700">
                        {shortageServiceCount > 0 ? `${shortageServiceCount}개` : '없음'}
                      </td>
                      <td className="border border-gray-300 py-0.5 px-1 font-bold text-green-700">
                        {excessServiceCount > 0 ? `${excessServiceCount}개` : '없음'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Auxiliary & Raw Material Table */}
              <div className="col-span-8 pl-1">
                <div className="text-[10px] font-bold text-gray-900 mb-0.5 flex justify-between">
                  <span>📦 기타 부자재 & 원재료 집계</span>
                  <span className="text-[10px] font-black text-gray-900">발송건수: {shipmentCount}건</span>
                </div>
                <table className="w-full text-center border-collapse text-[9px] border border-gray-300 bg-white">
                  <thead className="bg-gray-100 text-gray-900 font-bold">
                    <tr>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px] font-black">필요 유크림</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">그릭요거트</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">OPP</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">대파분태</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">피넛스무스</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">피넛크런치</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">스타터팩</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">이매진</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">요프 (말차)</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">요프 (콩가루)</th>
                      <th className="border border-gray-300 py-0.5 px-0.5 text-[8.5px]">요프 (6종)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold">
                      <td className="border border-gray-300 py-0.5 px-0.5 font-black">{heavyCreamDisplayStr}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{greekYogurtQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{oppQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{greenOnionQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{peanutSmoothQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{peanutCrunchQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{starterPackQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{imagineQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{yoffMatchaQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{yoffKinakoQty}</td>
                      <td className="border border-gray-300 py-0.5 px-0.5">{yoff6Qty}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Main Production Table */}
            <table className="print-table-p1 w-full border-collapse mb-1.5 border border-gray-300 leading-tight" style={{ fontSize: `${FIXED_FONT_SIZE}px` }}>
              <thead>
                <tr className="bg-gray-100 text-gray-900 font-bold text-center border-b border-gray-300 text-[10px]">
                  <th colSpan={2} className="border border-gray-300 py-0.5 px-1 text-gray-800 whitespace-nowrap text-center">오븐</th>
                  <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">제품명</th>
                  <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center font-black text-xs whitespace-nowrap">총 판수</th>

                  {/* Group 1: 삼각&바스콘 */}
                  <th colSpan={showRequiredQty ? 7 : 6} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                    삼각&바스콘
                  </th>

                  {/* Group 2: 하프팩&미니쉐이크 */}
                  <th colSpan={3} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                    하프팩&미니쉐이크
                  </th>

                  {/* Group 3: 스틱스콘 */}
                  <th colSpan={2} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                    스틱스콘
                  </th>
                </tr>
                <tr className="bg-gray-100 text-gray-900 font-bold text-[9px] text-center border-b border-gray-300">
                  <th className="border border-gray-300 p-0.5 text-center whitespace-nowrap">삼각/바</th>
                  <th className="border border-gray-300 p-0.5 text-center whitespace-nowrap">스틱/큐브</th>

                  {/* Sub-headers for 삼각&바스콘 */}
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">주문량</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">추가량</th>
                  {showRequiredQty && <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">필요량</th>}
                  <th className="border border-gray-300 py-0.5 px-1 text-center text-gray-600 whitespace-nowrap">이월재고</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center font-bold whitespace-nowrap">생산량</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">남는량(개)</th>

                  {/* Sub-headers for 하프팩&미니쉐이크 */}
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">주문량(봉)</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">남는량(봉)</th>

                  {/* Sub-headers for 스틱스콘 */}
                  <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>
                  <th className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">남는량(팩)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {(() => {
                  let nonSepIdx = 0;
                  return unifiedRows.map((uRow, idx) => {
                    if (uRow.type === 'separator') {
                      return (
                        <tr key={`sep-${idx}`} className="bg-white print:bg-white">
                          <td colSpan={showRequiredQty ? 16 : 15} className="border border-gray-400 py-1.5 bg-white print:bg-white"></td>
                        </tr>
                      );
                    }
                    const isZebra = nonSepIdx % 2 === 0;
                    nonSepIdx++;
                    const rowBg = isZebra ? activeZebraRgb : '#ffffff';

                    if (uRow.type === 'scone') {
                      const row = uRow.row;
                      const secOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number;
                      const isBar = row.sconeItem.category === '바';
                      return (
                        <tr key={`scone-${idx}`} style={{ height: `${pageStyles.p1.rowHeight}px`, backgroundColor: rowBg }} className="hover:bg-gray-100/50 border-b border-gray-300">
                          <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{row.sconeItem.oven_number || '1'}</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{secOven || '-'}</td>
                          <td className="border border-gray-300 py-0.5 px-1 font-bold text-gray-900 whitespace-nowrap text-[10px]">
                            <span className="inline-block px-1 py-0 rounded text-[9px] mr-1 border border-gray-400 font-semibold text-gray-800">
                              {isBar ? '바' : '삼각'}
                            </span>
                            {row.sconeItem.product_name}
                          </td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-xs text-gray-950">{row.finalPanels}판</td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right text-[10px]">{row.sconeItem.order_qty}개</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-500 text-[10px]">{row.sconeItem.extra_qty ? `${row.sconeItem.extra_qty}개` : '-'}</td>
                          {showRequiredQty && <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-800 text-[10px]">{row.sconeItem.required_qty}개</td>}
                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-500 text-[10px]">{row.sconeItem.carryover_qty ? `${row.sconeItem.carryover_qty}개` : '-'}</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-gray-900 text-[10px]">{row.sconeItem.production_qty}개</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.sconeDoughPanels}판</td>
                          
                          <td className={`border border-gray-300 py-0.5 px-1 text-right font-bold text-[10px] ${row.excessQty > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {row.excessQty > 0 ? `${row.excessQty}개` : '-'}
                          </td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-900 text-[10px]">{row.hpOrderBags > 0 ? `${row.hpOrderBags}봉` : '-'}</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.hpPanels > 0 ? `${row.hpPanels}판` : '-'}</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.stickPanels > 0 ? `${row.stickPanels}판` : '-'}</td>
                          
                          <td className={`border border-gray-300 py-0.5 px-1 text-right font-bold text-[10px] ${row.stickExcessPacks > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {row.stickExcessPacks > 0 ? `${row.stickExcessPacks}팩` : '-'}
                          </td>
                        </tr>
                      );
                    } else {
                      const row = uRow.row;
                      return (
                        <tr key={`shake-${idx}`} style={{ height: `${pageStyles.p1.rowHeight}px`, backgroundColor: rowBg }} className="hover:bg-gray-100/50 border-b border-gray-300">
                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800 text-[10px]">{row.shakeItem.oven_number || '1'}</td>
                          <td className="border border-gray-300 py-0.5 px-1 font-bold text-gray-900 whitespace-nowrap text-[10px]">
                            <span className="inline-block px-1 py-0 rounded text-[9px] mr-1 border border-gray-400 font-semibold text-gray-800">
                              쉐이크
                            </span>
                            {row.shakeItem.product_name}
                          </td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-xs text-gray-950">{row.panels}판</td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right text-[10px]">{row.orderBags}봉</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-500 text-[10px]">{row.extraBags ? `${row.extraBags}봉` : '-'}</td>
                          {showRequiredQty && <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-800 text-[10px]">{row.orderBags + row.extraBags}봉</td>}
                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-500 text-[10px]">{row.carryoverBags ? `${row.carryoverBags}봉` : '-'}</td>
                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-gray-900 text-[10px]">{row.prodBags}봉</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>

                          <td className="border border-gray-300 py-0.5 px-1 text-right text-gray-900 text-[10px]">{row.prodBags}봉</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.panels}판</td>
                          
                          <td className={`border border-gray-300 py-0.5 px-1 text-right font-bold text-[10px] ${row.excessBags > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                            {row.excessBags > 0 ? `${row.excessBags}봉` : '-'}
                          </td>

                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>
                          
                          <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>
                        </tr>
                      );
                    }
                  });
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                  <td colSpan={3} className="border border-gray-300 py-0.5 px-1 text-center font-black">전체 총 합계</td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-sm text-gray-950">
                    {grandTotalAllPanels} 판
                  </td>
                  {/* 삼각스콘 합계 */}
                  <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                  <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                  {showRequiredQty && <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>}
                  <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                  <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                    {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                  </td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-gray-900">
                    {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
                  </td>

                  {/* 미니큐브 합계 */}
                  <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                    {roundHalf(items.filter(i => i.category === '미니큐브').reduce((a, i) => a + i.order_qty, 0) / 2.0 + totalMiniShakePanels)}판
                  </td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-gray-950">
                    {combinedMiniShakeRows.reduce((a, r) => a + r.excessBags, 0)}봉
                  </td>

                  {/* 스틱스콘 합계 */}
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                    {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
                  </td>
                  <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-gray-900">
                    {combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0)}팩
                  </td>
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )}

        {/* ================= PAGE 2: 오븐 굽기 작업표 ================= */}
        {printPages.p2 && (
          <div
            id="print-sheet-p2"
            className={`print-sheet relative max-w-6xl mx-auto bg-white text-black p-4 rounded-xl shadow-2xl mb-12 border border-slate-300 print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none ${
              printPages.p1 ? 'page-break-before' : ''
            }`}
          >
            {/* Sheet Banner with Direct Row Height Slider + Real-time Height Status */}
            <div className="print:hidden flex flex-wrap justify-between items-center bg-purple-50/90 px-3.5 py-2 rounded-lg border border-purple-200 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-purple-950">🔥 2P: 삼각 & 바 스콘 오븐 굽기 작업표</span>
                <span className="text-[11px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-bold border border-purple-300">
                  글자: {FIXED_FONT_SIZE}px (고정)
                </span>
                {contentHeights.p2 > 0 && (
                  contentHeights.p2 <= PAGE_SAFE_HEIGHTS.p2 ? (
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                      ✅ A4 1장 안전 ({contentHeights.p2}px / {PAGE_SAFE_HEIGHTS.p2}px)
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse flex items-center gap-1">
                      ⚠️ 1장 초과 (+{contentHeights.p2 - PAGE_SAFE_HEIGHTS.p2}px) — 행 높이를 줄여주세요!
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-md border border-purple-200 text-xs shadow-sm">
                <span className="text-purple-950 font-bold text-xs">행 높이 조절:</span>
                <input
                  type="range"
                  min="16"
                  max="45"
                  step="1"
                  value={pageStyles.p2.rowHeight}
                  onChange={(e) => handleSpecificPageRowHeightChange('p2', parseInt(e.target.value, 10))}
                  className="w-28 accent-purple-500 cursor-pointer"
                />
                <span className="font-mono text-purple-950 font-black text-xs min-w-[32px]">{pageStyles.p2.rowHeight}px</span>
              </div>
            </div>

            {/* Printable Content with Strict A4 Limit Line */}
            <div ref={p2Ref} className="relative">
              {/* A4 1-Page Strict Safe Limit Line (Screen Only) */}
              <div
                className="print:hidden absolute left-0 right-0 border-b-2 border-dashed border-rose-500 pointer-events-none z-20 flex justify-end pr-3"
                style={{ top: `${PAGE_SAFE_HEIGHTS.p2}px` }}
              >
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-md -mt-3 flex items-center gap-1">
                  ✂ A4 1페이지 안전 한계선 ({PAGE_SAFE_HEIGHTS.p2}px)
                </span>
              </div>

              <div className="flex items-center gap-2 mb-1.5 border-b border-gray-300 pb-1">
                <h3 className="font-extrabold text-sm text-gray-900">
                  🔥 삼각 & 바 스콘 오븐 굽기 작업표 (풀팬 3판 기준)
                </h3>
              </div>
              <table className="print-table-p2 w-full text-center border-collapse border border-gray-300" style={{ fontSize: `${FIXED_FONT_SIZE}px` }}>
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-extrabold border-b border-gray-300">
                    <th className="border border-gray-300 p-1 text-left">상품명</th>
                    <th className="border border-gray-300 p-1 w-20">오븐번호</th>
                    <th className="border border-gray-300 p-1 w-24">삼각(바)판수</th>
                    <th className="border border-gray-300 p-1 w-24">풀팬(3판)</th>
                    <th className="border border-gray-300 p-1 w-28">남는 반죽 판수</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let nonSepIdx = 0;
                    return ovenBakingRows.map((obRow, obIdx) => {
                      if (obRow.is_separator) {
                        return (
                          <tr key={`ob-print-sep-${obIdx}`} className="bg-white print:bg-white">
                            <td colSpan={5} className="border border-gray-300 py-3 bg-white print:bg-white"></td>
                          </tr>
                        );
                      }
                      const isZebra = nonSepIdx % 2 === 0;
                      nonSepIdx++;
                      const rowBg = isZebra ? activeZebraRgb : '#ffffff';

                      return (
                        <tr key={`ob-print-${obRow.product_name}-${obIdx}`} style={{ height: `${pageStyles.p2.rowHeight}px`, backgroundColor: rowBg }} className="hover:bg-gray-100/50 border-b border-gray-300">
                          <td className="border border-gray-300 py-0.5 px-1 text-left font-bold text-gray-900">
                            {obRow.product_name}
                          </td>
                          <td className="border border-gray-300 py-0.5 px-1 font-bold text-gray-800">
                            {obRow.oven_number}
                          </td>
                          <td className="border border-gray-300 py-0.5 px-1 font-black text-gray-950">
                            {obRow.total_panels}
                          </td>
                          <td className="border border-gray-300 py-0.5 px-1 font-black text-gray-950 text-sm">
                            {obRow.full_pans}
                          </td>
                          <td className="border border-gray-300 py-0.5 px-1 font-black text-gray-950 text-sm">
                            {obRow.remainder_panels}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= PAGE 3: 생산 정리 표(디스트리뷰터) ================= */}
        {printPages.p3 && (
          <div
            id="print-sheet-p3"
            className={`print-sheet relative max-w-6xl mx-auto bg-white text-black p-4 rounded-xl shadow-2xl mb-12 border border-slate-300 print:m-0 print:p-0 print:border-none print:shadow-none print:rounded-none ${
              (printPages.p1 || printPages.p2) ? 'page-break-before' : ''
            }`}
          >
            {/* Sheet Banner with Direct Row Height Slider + Real-time Height Status */}
            <div className="print:hidden flex flex-wrap justify-between items-center bg-emerald-50/90 px-3.5 py-2 rounded-lg border border-emerald-200 mb-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-emerald-950">📋 3P: 생산 정리 표(디스트리뷰터)</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold border border-emerald-300">
                  글자: {FIXED_FONT_SIZE}px (고정)
                </span>
                {contentHeights.p3 > 0 && (
                  contentHeights.p3 <= PAGE_SAFE_HEIGHTS.p3 ? (
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
                      ✅ A4 1장 안전 ({contentHeights.p3}px / {PAGE_SAFE_HEIGHTS.p3}px)
                    </span>
                  ) : (
                    <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-300 animate-pulse flex items-center gap-1">
                      ⚠️ 1장 초과 (+{contentHeights.p3 - PAGE_SAFE_HEIGHTS.p3}px) — 행 높이를 줄여주세요!
                    </span>
                  )
                )}
              </div>
              <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-md border border-emerald-200 text-xs shadow-sm">
                <span className="text-emerald-950 font-bold text-xs">행 높이 조절:</span>
                <input
                  type="range"
                  min="16"
                  max="45"
                  step="1"
                  value={pageStyles.p3.rowHeight}
                  onChange={(e) => handleSpecificPageRowHeightChange('p3', parseInt(e.target.value, 10))}
                  className="w-28 accent-emerald-500 cursor-pointer"
                />
                <span className="font-mono text-emerald-950 font-black text-xs min-w-[32px]">{pageStyles.p3.rowHeight}px</span>
              </div>
            </div>

            {/* Printable Content with Strict A4 Limit Line */}
            <div ref={p3Ref} className="relative">
              {/* A4 1-Page Strict Safe Limit Line (Screen Only) */}
              <div
                className="print:hidden absolute left-0 right-0 border-b-2 border-dashed border-rose-500 pointer-events-none z-20 flex justify-end pr-3"
                style={{ top: `${PAGE_SAFE_HEIGHTS.p3}px` }}
              >
                <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full shadow-md -mt-3 flex items-center gap-1">
                  ✂ A4 1페이지 안전 한계선 ({PAGE_SAFE_HEIGHTS.p3}px)
                </span>
              </div>

              {/* Header */}
              <div className="border-b border-gray-300 pb-1 mb-1.5 flex justify-between items-end">
                <div>
                  <h1 className="text-lg font-black tracking-tight uppercase text-gray-900">
                    생산 정리 표(디스트리뷰터)
                  </h1>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">생산 일자</span>
                  <span className="text-sm font-bold text-gray-900">{recordDate}</span>
                </div>
              </div>

              {/* Field Record Table */}
              <table className="print-table-p3 w-full border-collapse text-[10px] mb-1.5 border border-gray-300 leading-tight" style={{ fontSize: `${FIXED_FONT_SIZE}px` }}>
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold text-center border-b border-gray-300 text-[10px]">
                    <th colSpan={2} className="border border-gray-300 py-0.5 px-1 text-gray-800 whitespace-nowrap text-center">오븐</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">제품명</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center font-black text-xs whitespace-nowrap">총 판수</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center font-bold whitespace-nowrap">소분반죽(4판)</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center font-bold whitespace-nowrap">소분반죽(1판)</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">냉동생지(4판)</th>
                    <th rowSpan={2} className="border border-gray-300 py-0.5 px-1 text-center whitespace-nowrap">냉동생지(1판)</th>

                    {/* Group 1: 삼각&바스콘 (1 column) */}
                    <th colSpan={1} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                      삼각&바스콘
                    </th>

                    {/* Group 2: 하프팩&미니쉐이크 (1 column) */}
                    <th colSpan={1} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                      하프팩&미니쉐이크
                    </th>

                    {/* Group 3: 스틱스콘 (1 column) */}
                    <th colSpan={1} className="border border-gray-300 py-0.5 px-1 font-black whitespace-nowrap text-center">
                      스틱스콘
                    </th>
                  </tr>
                  <tr className="bg-gray-100 text-gray-900 font-bold text-[9px] text-center border-b border-gray-300">
                    <th className="border border-gray-300 p-0.5 text-center whitespace-nowrap">삼각/바</th>
                    <th className="border border-gray-300 p-0.5 text-center whitespace-nowrap">스틱/큐브</th>

                    {/* Sub-header for 삼각&바스콘 */}
                    <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>

                    {/* Sub-header for 하프팩&미니쉐이크 */}
                    <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>

                    {/* Sub-header for 스틱스콘 */}
                    <th className="border border-gray-300 py-0.5 px-1 text-center font-extrabold text-[10.5px] whitespace-nowrap">판수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {(() => {
                    let nonSepIdx = 0;
                    return unifiedRows.map((uRow, idx) => {
                      if (uRow.type === 'separator') {
                        return (
                          <tr key={`sep-blank-${idx}`} className="bg-white print:bg-white">
                            <td colSpan={11} className="border border-gray-400 py-1.5 bg-white print:bg-white"></td>
                          </tr>
                        );
                      }
                      const isZebra = nonSepIdx % 2 === 0;
                      nonSepIdx++;
                      const rowBg = isZebra ? activeZebraRgb : '#ffffff';

                      if (uRow.type === 'scone') {
                        const row = uRow.row;
                        const secOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number;
                        const isBar = row.sconeItem.category === '바';
                        const dough = calculateDoughPortions(row.finalPanels);
                        const rowKey = `scone_${row.sconeItem.product_name}`;
                        const currentOverrides = fieldOverrides[rowKey] || {};
                        const frozenFour = currentOverrides.frozenFour || 0;
                        const frozenOne = currentOverrides.frozenOne || 0;
                        const fourVal = currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, dough.fourPanels - frozenFour);
                        const oneVal = currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, dough.onePanels - frozenOne);

                        return (
                          <tr key={`scone-blank-${idx}`} style={{ height: `${pageStyles.p3.rowHeight}px`, backgroundColor: rowBg }} className="hover:bg-gray-100/50 border-b border-gray-300">
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{row.sconeItem.oven_number || '1'}</td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{secOven || '-'}</td>
                            <td className="border border-gray-300 py-0.5 px-1 font-bold text-gray-900 whitespace-nowrap text-[10px]">
                              <span className="inline-block px-1 py-0 rounded text-[9px] mr-1 border border-gray-400 font-semibold text-gray-800">
                                {isBar ? '바' : '삼각'}
                              </span>
                              {row.sconeItem.product_name}
                            </td>

                            {/* 총 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-xs text-gray-950">{row.finalPanels}판</td>

                            {/* 소분반죽 차감 반영값 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-[11px] text-gray-950">{fourVal}</td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-[11px] text-gray-950">{oneVal}</td>
                            
                            {/* 냉동생지 기입값 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">
                              {frozenFour > 0 ? `${frozenFour}` : '-'}
                            </td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">
                              {frozenOne > 0 ? `${frozenOne}` : '-'}
                            </td>
                            
                            {/* 삼각&바스콘 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.sconeDoughPanels}판</td>
                            
                            {/* 하프팩 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.hpPanels > 0 ? `${row.hpPanels}판` : '-'}</td>
                            
                            {/* 스틱 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.stickPanels > 0 ? `${row.stickPanels}판` : '-'}</td>
                          </tr>
                        );
                      } else {
                        const row = uRow.row;
                        const dough = calculateDoughPortions(row.panels);
                        const rowKey = `shake_${row.shakeItem.product_name}`;
                        const currentOverrides = fieldOverrides[rowKey] || {};
                        const frozenFour = currentOverrides.frozenFour || 0;
                        const frozenOne = currentOverrides.frozenOne || 0;
                        const fourVal = currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, dough.fourPanels - frozenFour);
                        const oneVal = currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, dough.onePanels - frozenOne);

                        return (
                          <tr key={`shake-blank-${idx}`} style={{ height: `${pageStyles.p3.rowHeight}px`, backgroundColor: rowBg }} className="hover:bg-gray-100/50 border-b border-gray-300">
                            <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400 text-[10px]">-</td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800 text-[10px]">{row.shakeItem.oven_number || '1'}</td>
                            <td className="border border-gray-300 py-0.5 px-1 font-bold text-gray-900 whitespace-nowrap text-[10px]">
                              <span className="inline-block px-1 py-0 rounded text-[9px] mr-1 border border-gray-400 font-semibold text-gray-800">
                                쉐이크
                              </span>
                              {row.shakeItem.product_name}
                            </td>

                            {/* 총 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-xs text-gray-950">{row.panels}판</td>

                            {/* 소분반죽 차감 반영값 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-[11px] text-gray-950">{fourVal}</td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-[11px] text-gray-950">{oneVal}</td>
                            
                            {/* 냉동생지 기입값 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">
                              {frozenFour > 0 ? `${frozenFour}` : '-'}
                            </td>
                            <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">
                              {frozenOne > 0 ? `${frozenOne}` : '-'}
                            </td>
                            
                            {/* 삼각&바스콘 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                            
                            {/* 하프팩/쉐이크 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">{row.panels}판</td>
                            
                            {/* 스틱 판수 */}
                            <td className="border border-gray-300 py-0.5 px-1 text-center text-gray-400">-</td>
                          </tr>
                        );
                      }
                    });
                  })()}
                </tbody>
                <tfoot>
                  {(() => {
                    let totalFour = 0;
                    let totalOne = 0;
                    let totalFrozenFour = 0;
                    let totalFrozenOne = 0;

                    unifiedRows.forEach((uRow) => {
                      if (uRow.type === 'scone') {
                        const row = uRow.row;
                        const rowKey = `scone_${row.sconeItem.product_name}`;
                        const currentOverrides = fieldOverrides[rowKey] || {};
                        const dough = calculateDoughPortions(row.finalPanels);
                        const frozenFour = currentOverrides.frozenFour || 0;
                        const frozenOne = currentOverrides.frozenOne || 0;
                        totalFour += currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, dough.fourPanels - frozenFour);
                        totalOne += currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, dough.onePanels - frozenOne);
                        totalFrozenFour += frozenFour;
                        totalFrozenOne += frozenOne;
                      } else if (uRow.type === 'shake') {
                        const row = uRow.row;
                        const rowKey = `shake_${row.shakeItem.product_name}`;
                        const currentOverrides = fieldOverrides[rowKey] || {};
                        const dough = calculateDoughPortions(row.panels);
                        const frozenFour = currentOverrides.frozenFour || 0;
                        const frozenOne = currentOverrides.frozenOne || 0;
                        totalFour += currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, dough.fourPanels - frozenFour);
                        totalOne += currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, dough.onePanels - frozenOne);
                        totalFrozenFour += frozenFour;
                        totalFrozenOne += frozenOne;
                      }
                    });

                    return (
                      <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                        <td colSpan={3} className="border border-gray-300 py-0.5 px-1 text-center font-black">전체 총 합계</td>
                        <td className="border border-gray-300 py-0.5 px-1 text-right font-black text-sm text-gray-950">
                          {grandTotalAllPanels} 판
                        </td>
                        <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-gray-950">{totalFour}</td>
                        <td className="border border-gray-300 py-0.5 px-1 text-center font-black text-gray-950">{totalOne}</td>
                        <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{totalFrozenFour > 0 ? totalFrozenFour : '-'}</td>
                        <td className="border border-gray-300 py-0.5 px-1 text-center font-bold text-gray-800">{totalFrozenOne > 0 ? totalFrozenOne : '-'}</td>
                        <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                          {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                        </td>
                        <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                          {roundHalf(items.filter(i => i.category === '미니큐브').reduce((a, i) => a + i.order_qty, 0) / 2.0 + totalMiniShakePanels)}판
                        </td>
                        <td className="border border-gray-300 py-0.5 px-1 text-right font-bold text-[11px] text-gray-950">
                          {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
                        </td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
