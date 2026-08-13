import React, { useState } from 'react';
import { ProductionItem, SetBreakdownSummary } from '../../types/production';
import { Upload, FileSpreadsheet, Eye, EyeOff, Save, RefreshCw, Printer, AlertTriangle, Package, Sparkles } from 'lucide-react';
import axios from 'axios';
import { ProductCatalogModal } from './ProductCatalogModal';
import { recalculateItem, calculateCombinedSconeRows, roundHalf } from '../../utils/productionDoughCalculator';
import { ProductionTableRow } from './ProductionTableRow';

const API_BASE = import.meta.env.VITE_VAT_API_BASE?.replace(/\/api$/, '') || 'http://127.0.0.1:8005';

interface ProductionCalculatorProps {
  onTriggerPrint?: (items: ProductionItem[], recordDate: string) => void;
}

export const ProductionCalculator: React.FC<ProductionCalculatorProps> = ({
  onTriggerPrint,
}) => {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [recordDate, setRecordDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [showRequiredQty, setShowRequiredQty] = useState<boolean>(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [setBreakdowns, setSetBreakdowns] = useState<SetBreakdownSummary[]>([]);

  const handleQtyChange = (
    index: number,
    field: 'extra_qty' | 'carryover_qty',
    value: number
  ) => {
    const updated = [...items];
    updated[index] = recalculateItem({
      ...updated[index],
      [field]: isNaN(value) ? 0 : value,
    });
    setItems(updated);
  };

  const handleBumperChange = (
    index: number,
    value: number
  ) => {
    const updated = [...items];
    updated[index] = recalculateItem({
      ...updated[index],
      min_bumper_qty: isNaN(value) ? 0 : value,
    });
    setItems(updated);
  };

  const handleFileUpload = async (file: File) => {
    setCurrentFile(file);
    setLoading(true);
    setError(null);
    setSaveSuccessMsg(null);
    setSetBreakdowns([]);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE}/api/production/parse-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        const parsedItems: ProductionItem[] = res.data.items.map((i: ProductionItem) => recalculateItem(i));
        setItems(parsedItems);
        if (res.data.set_breakdowns) {
          setSetBreakdowns(res.data.set_breakdowns);
        }
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      setError(err.response?.data?.detail || '엑셀 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshCatalog = () => {
    if (currentFile) {
      handleFileUpload(currentFile);
    } else if (items.length > 0) {
      setItems(items.map((i) => recalculateItem(i)));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSaveToDB = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setSaveSuccessMsg(null);
    setError(null);
    try {
      const payload = {
        record_date: recordDate,
        items: items,
      };

      const res = await axios.post(`${API_BASE}/api/production/save-summary`, payload);
      if (res.data.status === 'success') {
        setSaveSuccessMsg(`'${recordDate}' 생산 정리 내역이 DB에 성공적으로 저장되었습니다!`);
      }
    } catch (err: any) {
      console.error('DB save error:', err);
      setError(err.response?.data?.detail || 'DB 저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const unconfirmedCount = items.filter(
    (i) => i.is_confirmed === false || (i.category === '미니큐브' && (!i.parent_scone_name || !i.is_confirmed))
  ).length;

  const {
    combinedTriangleRows,
    combinedBarRows,
    grandTotalAllPanels,
    halfpackItems,
  } = calculateCombinedSconeRows(items);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center text-2xl font-black shadow-lg">
            🥐
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              생산팀 일별 주문 정리 & 통합 판수 계산기
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              단품 필요 판수(범퍼 포함)와 하프팩 판수의 더하기 합산(50.5 + 4.5 = 55판)이 직관적으로 표기됩니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 shadow-sm"
          >
            <Package className="w-4 h-4 text-amber-500" />
            <span>제품 & 세트 마스터 관리</span>
          </button>

          {items.length > 0 && (
            <>
              <button
                onClick={() => onTriggerPrint && onTriggerPrint(items, recordDate)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-amber-500/30 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>현장 A4 인쇄</span>
              </button>

              <button
                onClick={handleSaveToDB}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>DB 저장</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Unconfirmed Items Notification Banner */}
      {unconfirmedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                🔔 신규 감지 품목 ({unconfirmedCount}건) 확인 및 승인 필요
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                엑셀에서 새로 발견된 품목이 있습니다. 하프팩 매칭 및 승인을 진행해 주세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition whitespace-nowrap shadow"
          >
            신규 품목 매칭 및 승인하기
          </button>
        </div>
      )}

      {/* Success / Error Messages */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
          <span>✅ {saveSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Excel Upload Area */}
      {items.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="glass-panel p-12 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-amber-500 transition text-center space-y-4 shadow-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl mx-auto border border-amber-500/20">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">EasyAdmin 주문 엑셀 파일 업로드</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              드래그 앤 드롭 하거나 아래 버튼을 눌러 엑셀(.xlsx) 파일을 선택해 주세요.
            </p>
          </div>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
            className="hidden"
            id="excel-file-input"
          />
          <label
            htmlFor="excel-file-input"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl text-sm transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" /> 엑셀 파일 선택
          </label>
        </div>
      ) : (
        <>
          {/* Registered Set Product Breakdown Summary Card */}
          {setBreakdowns.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-amber-500/30 space-y-3 shadow-lg">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
                <Sparkles className="w-4 h-4" />
                <span>📦 세트 상품 주문 분해 반영 내역 요약 ({setBreakdowns.length}건 감지)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {setBreakdowns.map((sb, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                      <span>{sb.set_name}</span>
                      <span className="text-amber-600 dark:text-amber-400 font-mono">주문 {sb.set_order_qty}세트</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {sb.components.map((c) => (
                        <span
                          key={c.product_name}
                          className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 text-[11px]"
                        >
                          {c.product_name} +{c.quantity * sb.set_order_qty}개
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table Control Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
              <span>📋 전체 제품 통합 생산 정리 표 (삼각 · 하프팩 · 바스콘)</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRequiredQty(!showRequiredQty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 ${
                  showRequiredQty
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {showRequiredQty ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                {showRequiredQty ? '필요량 열 노출 중' : '필요량 열 숨김 중'}
              </button>

              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-bold">
                <span>생산일자:</span>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-bold"
                />
              </div>

              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                className="hidden"
                id="reupload-excel-input"
              />
              <label
                htmlFor="reupload-excel-input"
                className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition flex items-center gap-1 border border-slate-300 dark:border-slate-700 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 엑셀 교체
              </label>
            </div>
          </div>

          {/* Interactive Calculation Table (All Products in One Table) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-bold border-b border-slate-300 dark:border-slate-800">
                    <th className="py-3.5 px-3">구분</th>
                    <th className="py-3.5 px-3">제품명</th>
                    <th className="py-3.5 px-3 text-right">주문량</th>
                    <th className="py-3.5 px-3 text-right">추가량</th>
                    {showRequiredQty && (
                      <th className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-300">
                        필요량
                      </th>
                    )}
                    <th className="py-3.5 px-3 text-right">이월재고</th>
                    <th className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-400">필요생산량</th>
                    <th className="py-3.5 px-3 text-right text-amber-700 dark:text-amber-400 font-extrabold">단품 필요 판수</th>
                    <th className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-bold">최소 범퍼</th>
                    
                    {/* Halfpack Section Header */}
                    <th className="py-3.5 px-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-center border-x border-purple-500/20">
                      연결 하프팩 품목명
                    </th>
                    <th className="py-3.5 px-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-right border-r border-purple-500/20">
                      하프팩 주문량 (봉)
                    </th>
                    <th className="py-3.5 px-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-right border-r border-purple-500/20">
                      하프팩 판수
                    </th>

                    <th className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-400 font-extrabold">
                      통합 최종 필요 판수
                    </th>
                    <th className="py-3.5 px-3 text-right">생산 후 남음</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {/* SECTION 1: Triangle Scones + Matched Halfpacks */}
                  {combinedTriangleRows.map((row) => (
                    <ProductionTableRow
                      key={row.sconeItem.product_name}
                      row={row}
                      categoryTag="삼각 (8개)"
                      categoryColorClass="bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20"
                      showRequiredQty={showRequiredQty}
                      onQtyChange={handleQtyChange}
                      onBumperChange={handleBumperChange}
                    />
                  ))}

                  {/* SECTION 2: Bar Scones + Matched Halfpacks */}
                  {combinedBarRows.map((row) => (
                    <ProductionTableRow
                      key={row.sconeItem.product_name}
                      row={row}
                      categoryTag="바 (10개)"
                      categoryColorClass="bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-500/20"
                      showRequiredQty={showRequiredQty}
                      onQtyChange={handleQtyChange}
                      onBumperChange={handleBumperChange}
                    />
                  ))}
                </tbody>

                {/* Grand Summary Footer */}
                <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                  <tr>
                    <td colSpan={2} className="py-4 px-3 text-center font-extrabold">
                      전체 총 합계 ({items.length}개 제품)
                    </td>
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.order_qty, 0)}개</td>
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.extra_qty, 0)}개</td>
                    {showRequiredQty && (
                      <td className="py-4 px-3 text-right text-amber-600 dark:text-amber-300">
                        {items.reduce((a, i) => a + i.required_qty, 0)}개
                      </td>
                    )}
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.carryover_qty, 0)}개</td>
                    <td className="py-4 px-3 text-right text-amber-600 dark:text-amber-400 text-base">
                      {items.reduce((a, i) => a + i.production_qty, 0)}개
                    </td>
                    <td className="py-4 px-3 text-right text-amber-700 dark:text-amber-400 font-mono font-bold">
                      {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                    </td>
                    <td className="py-4 px-3 text-center text-slate-400">-</td>
                    <td className="py-4 px-3 text-center text-purple-700 dark:text-purple-300 font-bold">
                      {halfpackItems.length}개 하프팩
                    </td>
                    <td className="py-4 px-3 text-right text-purple-700 dark:text-purple-300 font-mono font-bold">
                      {halfpackItems.reduce((a, i) => a + i.order_qty, 0)}봉
                    </td>
                    <td className="py-4 px-3 text-right text-purple-700 dark:text-purple-300 font-mono font-bold">
                      {roundHalf(halfpackItems.reduce((a, i) => a + i.order_qty, 0) / 2.0)}판
                    </td>
                    <td className="py-4 px-3 text-right text-amber-600 dark:text-amber-400 text-xl font-black">
                      {grandTotalAllPanels} 판
                    </td>
                    <td className="py-4 px-3 text-right text-blue-600 dark:text-blue-400">
                      {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Catalog Modal */}
      <ProductCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        onRefreshCatalog={handleRefreshCatalog}
      />
    </div>
  );
};
