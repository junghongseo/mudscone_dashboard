import React, { useState, useEffect } from 'react';
import { ProductionItem, SetBreakdownSummary, ProductCatalogItem, SetCatalogItem } from '../../types/production';
import { Upload, FileSpreadsheet, Eye, EyeOff, Save, RefreshCw, Printer, AlertTriangle, Package, Sparkles, Gift, Layers, PlusCircle } from 'lucide-react';
import axios from 'axios';
import { ProductCatalogModal } from './ProductCatalogModal';
import { recalculateItem, calculateCombinedSconeRows, roundHalf } from '../../utils/productionDoughCalculator';
import { ProductionTableRow } from './ProductionTableRow';
import { ProductionMiniShakeRow } from './ProductionMiniShakeRow';
import { ProductionPrintView } from './ProductionPrintView';

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
  const [isPrintViewOpen, setIsPrintViewOpen] = useState<boolean>(false);
  const [shipmentCount, setShipmentCount] = useState<number>(0);

  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [setBreakdowns, setSetBreakdowns] = useState<SetBreakdownSummary[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [setList, setSetList] = useState<SetCatalogItem[]>([]);

  const fetchCatalogAndSets = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        axios.get(`${API_BASE}/api/production/catalog`),
        axios.get(`${API_BASE}/api/production/sets`),
      ]);
      if (cRes.data.status === 'success') setCatalog(cRes.data.data);
      if (sRes.data.status === 'success') setSetList(sRes.data.data);
    } catch (e) {
      console.error('Failed to fetch catalog/sets in calculator:', e);
    }
  };

  useEffect(() => {
    fetchCatalogAndSets();
  }, []);

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

  const handleRefreshCatalog = async () => {
    await fetchCatalogAndSets();
    if (currentFile) {
      await handleFileUpload(currentFile);
    } else {
      try {
        const res = await axios.get(`${API_BASE}/api/production/catalog`);
        if (res.data.status === 'success' && res.data.data) {
          const catalogMap: Record<string, any> = {};
          res.data.data.forEach((c: any) => {
            catalogMap[c.name] = c;
          });

          setItems((prevItems) =>
            prevItems.map((item) => {
              const dbCat = catalogMap[item.product_name];
              const updatedItem: ProductionItem = dbCat
                ? {
                    ...item,
                    category: dbCat.category,
                    batch_size: dbCat.batch_size,
                    min_bumper_qty: dbCat.min_bumper_qty,
                    is_confirmed: dbCat.is_confirmed,
                    parent_scone_name: dbCat.parent_scone_name,
                  }
                : item;
              return recalculateItem(updatedItem);
            })
          );
        }
      } catch (e) {
        console.error('Failed to sync catalog with DB:', e);
        setItems((prev) => prev.map((i) => recalculateItem(i)));
      }
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropRow = (e: React.DragEvent, dropTargetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropTargetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setItems((prevItems) => {
      const updated = [...prevItems];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropTargetIndex, 0, movedItem);
      return updated;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleAddSeparatorRow = () => {
    setItems((prev) => [
      ...prev,
      {
        product_name: `--- 팀 구분선 (${prev.filter((i) => i.is_separator).length + 1}) ---`,
        category: '기타',
        batch_size: 1,
        order_qty: 0,
        extra_qty: 0,
        required_qty: 0,
        carryover_qty: 0,
        production_qty: 0,
        base_panels: 0,
        panels: 0,
        is_bumper_applied: false,
        excess_qty: 0,
        is_separator: true,
      },
    ]);
  };

  const handleDeleteSeparatorRow = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveSortOrder = async () => {
    if (items.length === 0) return;
    setLoading(true);
    setSaveSuccessMsg(null);
    setError(null);
    try {
      const orders = items.map((item, idx) => ({
        name: item.product_name,
        sort_order: idx + 1,
        is_separator: item.is_separator || false,
      }));
      const res = await axios.post(`${API_BASE}/api/production/catalog/reorder`, { orders });
      if (res.data.status === 'success') {
        setSaveSuccessMsg(`총 ${res.data.updated_count}개 제품/구분선의 순서가 DB에 성공적으로 고정 저장되었습니다!`);
      }
    } catch (err: any) {
      console.error('Failed to save sort order:', err);
      setError(err.response?.data?.detail || '순서 고정 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const setNames = new Set((setList || []).map((s) => s.set_name.trim()));
  const confirmedCatalogNames = new Set((catalog || []).filter((c) => c.is_confirmed !== false).map((c) => c.name.trim()));

  const unconfirmedCount = items.filter((i) => {
    const cleanName = i.product_name.trim();
    if (setNames.has(cleanName)) return false;

    const isConfirmedSingle = Array.from(confirmedCatalogNames).some((catName) => {
      if (catName === cleanName) return true;
      if (cleanName.startsWith(catName) || catName.startsWith(cleanName)) return true;
      return false;
    });

    if (isConfirmedSingle) {
      if ((i.category === '미니큐브' || i.category === '스틱') && !i.parent_scone_name) {
        return true;
      }
      return false;
    }

    return i.is_confirmed === false;
  }).length;

  const {
    combinedTriangleRows,
    combinedBarRows,
    combinedMiniShakeRows,
    unifiedRows,
    ovenBakingRows,
    grandTotalAllPanels,
    halfpackItems,
    miniShakeItems,
    stickItems,
  } = calculateCombinedSconeRows(items);

  const sconeItemsOnly = items.filter((i) => i.category === '삼각' || i.category === '바');

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

  if (isPrintViewOpen) {
    return (
      <ProductionPrintView
        items={items}
        recordDate={recordDate}
        showRequiredQty={showRequiredQty}
        shipmentCount={shipmentCount}
        onBack={() => setIsPrintViewOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
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
              삼각·바스콘, 하프팩, 미니쉐이크, 스틱스콘 반죽 판수가 정밀 통합집계됩니다.
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
                onClick={handleSaveSortOrder}
                disabled={loading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
              >
                <Save className="w-4 h-4" />
                <span>📌 순서 고정 저장</span>
              </button>

              <button
                onClick={() => setIsPrintViewOpen(true)}
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

      {unconfirmedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                🔔 신규 감지 품목 ({unconfirmedCount}건) 확인 및 수동 마스터 매칭 필요
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                엑셀에서 새로 발견된 품목(스틱/하프팩/기타)이 있습니다. 마스터 창에서 카테고리 지정 및 승인을 진행해 주세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition whitespace-nowrap shadow-md"
          >
            마스터 관리 이동 ➔
          </button>
        </div>
      )}

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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-slate-900/80 to-slate-900 border border-purple-500/30 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                <div className="flex items-center gap-2 text-purple-300 font-extrabold text-sm">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span>🎁 서비스스콘 현황 표</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">삼각+스틱 남는량 기준</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-slate-950/60 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block">필요량</span>
                  <span className="text-sm font-bold text-purple-300 mt-0.5 block">{serviceRequiredQty}개</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-950/60 border border-purple-500/20">
                  <span className="text-[10px] text-slate-400 block">남는량</span>
                  <span className="text-sm font-bold text-slate-200 mt-0.5 block">{totalLeftoverStock}개</span>
                </div>
                <div className={`p-2 rounded-xl border ${shortageServiceCount > 0 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-400'}`}>
                  <span className="text-[10px] block">부족</span>
                  <span className="text-sm font-black mt-0.5 block">
                    {shortageServiceCount > 0 ? `${shortageServiceCount}개` : '없음'}
                  </span>
                </div>
                <div className={`p-2 rounded-xl border ${excessServiceCount > 0 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-950/60 border-slate-800 text-slate-400'}`}>
                  <span className="text-[10px] block">남는</span>
                  <span className="text-sm font-black mt-0.5 block">
                    {excessServiceCount > 0 ? `${excessServiceCount}개` : '없음'}
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 p-5 rounded-2xl bg-gradient-to-br from-sky-500/10 via-slate-900/80 to-slate-900 border border-sky-500/30 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2.5">
                <div className="flex items-center gap-2 text-sky-400 font-extrabold text-sm">
                  <Layers className="w-4 h-4" />
                  <span>📦 기타 부자재 & 원재료 집계 표</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span className="font-bold text-amber-400">발송건수 (수기):</span>
                  <input
                    type="number"
                    min="0"
                    value={shipmentCount}
                    onChange={(e) => setShipmentCount(parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-0.5 bg-slate-950 border border-amber-500/50 rounded text-right text-amber-300 font-black text-xs"
                  />
                  <span>건</span>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-1.5 text-center text-xs">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/40 font-bold">
                  <span className="text-amber-400 text-[10px] block truncate">필요 유크림</span>
                  <span className="text-xs font-black text-amber-300 mt-0.5 block">{heavyCreamDisplayStr}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">그릭요거트</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{greekYogurtQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">OPP</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{oppQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">대파분태</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{greenOnionQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">피넛스무스</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{peanutSmoothQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">피넛크런치</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{peanutCrunchQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">스타터팩</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{starterPackQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">이매진</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{imagineQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">요프 (말차)</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{yoffMatchaQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">요프 (콩가루)</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{yoffKinakoQty}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400 text-[10px] block truncate">요프 (6종)</span>
                  <span className="text-xs font-bold text-sky-300 mt-0.5 block">{yoff6Qty}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 shadow-lg flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold block">총 필요 반죽 판수</span>
                <div className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-1">
                  {grandTotalAllPanels} <span className="text-base font-bold">판</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
                🥮
              </div>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">삼각스콘 통합</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {combinedTriangleRows.reduce((a, r) => a + r.finalPanels, 0)} 판
                </div>
              </div>
              <span className="text-xs text-amber-500 font-bold px-2 py-1 bg-amber-500/10 rounded-lg">8개/판</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">바스콘 통합</span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {combinedBarRows.reduce((a, r) => a + r.finalPanels, 0)} 판
                </div>
              </div>
              <span className="text-xs text-emerald-500 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">10개/판</span>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium block">미니쉐이크 (독립 4봉/판)</span>
                <div className="text-2xl font-extrabold text-sky-400 mt-1">
                  {combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0)} 판
                </div>
              </div>
              <span className="text-xs text-sky-500 font-bold px-2 py-1 bg-sky-500/10 rounded-lg">4봉/판</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  📋 생산 정리 표
                </span>
                <span className="text-xs text-slate-400">({items.length}개 항목)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSeparatorRow}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-sky-500/30 shadow-sm"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>➕ 팀 구분 공백 추가</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-bold border-b border-slate-300 dark:border-slate-800 text-center">
                    <th rowSpan={2} className="py-3 px-2 w-8 text-center text-slate-400 font-normal print:hidden"></th>
                    <th colSpan={2} className="py-2 px-3 border-r border-slate-300 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900 text-amber-400 font-extrabold">
                      오븐
                    </th>
                    <th rowSpan={2} className="py-3.5 px-3 text-left">제품명</th>
                    <th rowSpan={2} className="py-3.5 px-3 text-right">주문량</th>
                    <th rowSpan={2} className="py-3.5 px-3 text-right">추가량</th>
                    {showRequiredQty && (
                      <th rowSpan={2} className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-300">
                        필요량
                      </th>
                    )}
                    <th rowSpan={2} className="py-3.5 px-3 text-right">이월재고</th>
                    <th rowSpan={2} className="py-3.5 px-3 text-right text-amber-600 dark:text-amber-400">필요생산량</th>
                    
                    <th rowSpan={2} className="py-3.5 px-3 text-right bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black">
                      삼각&바 필요 판수
                    </th>
                    <th rowSpan={2} className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-bold">
                      삼각&바 판수 추가
                    </th>
                    
                    <th rowSpan={2} className="py-3.5 px-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-right border-l border-purple-500/20">
                      하프팩 & 미니쉐이크 주문량 (봉)
                    </th>
                    
                    <th rowSpan={2} className="py-3.5 px-3 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-right font-black border-r border-purple-500/20">
                      하프팩 & 미니쉐이크 판수
                    </th>

                    <th rowSpan={2} className="py-3.5 px-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-right font-black border-l border-r border-indigo-500/20">
                      스틱 판수
                    </th>

                    <th rowSpan={2} className="py-3.5 px-3 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-right border-r border-sky-500/20 font-bold">
                      미니쉐이크 남는 수량 (봉)
                    </th>

                    <th rowSpan={2} className="py-3.5 px-3 text-right bg-emerald-500/10 text-emerald-400 font-black text-sm">
                      통합 최종 필요 판수
                    </th>

                    <th rowSpan={2} className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-bold">삼각/바 남음</th>
                    <th rowSpan={2} className="py-3.5 px-3 text-right text-indigo-400 font-bold">스틱 남음</th>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-[11px] font-extrabold border-b border-slate-300 dark:border-slate-800 text-center">
                    <th className="py-1.5 px-2 text-amber-400 border-r border-slate-300 dark:border-slate-800">삼각 / 바</th>
                    <th className="py-1.5 px-2 text-purple-300 border-r border-slate-300 dark:border-slate-800">스틱 / 큐브</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unifiedRows.map((uRow) => {
                    const itemIdx = uRow.type === 'scone'
                      ? uRow.row.itemIndex
                      : uRow.type === 'shake'
                      ? uRow.row.itemIndex
                      : uRow.itemIndex;

                    const isDragging = draggedIndex === itemIdx;
                    const isDragOver = dragOverIndex === itemIdx;

                    if (uRow.type === 'separator') {
                      return (
                        <tr
                          key={`sep-${itemIdx}`}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, itemIdx)}
                          onDragOver={(e) => handleDragOver(e, itemIdx)}
                          onDrop={(e) => handleDropRow(e, itemIdx)}
                          onDragEnd={handleDragEnd}
                          className={`transition border-y-2 border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-950/90 ${
                            isDragging
                              ? 'opacity-30 bg-amber-500/20'
                              : isDragOver
                              ? 'border-t-4 border-amber-500 bg-amber-500/10'
                              : ''
                          }`}
                        >
                          <td className="py-2.5 px-2 text-center text-slate-400 hover:text-amber-500 font-black text-base cursor-grab active:cursor-grabbing select-none print:hidden" title="드래그하여 위치 변경">
                            ⠿
                          </td>
                          <td colSpan={showRequiredQty ? 16 : 15} className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">=== 팀 구분 공백선 ===</span>
                              <span className="font-extrabold text-xs text-amber-500 dark:text-amber-400">
                                ───────── 생산팀 구분 공백 영역 (1생산팀 / 2생산팀) ─────────
                              </span>
                              <button
                                onClick={() => handleDeleteSeparatorRow(itemIdx)}
                                className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded text-xs font-bold transition"
                              >
                                삭제 ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    } else if (uRow.type === 'scone') {
                      return (
                        <ProductionTableRow
                          key={uRow.row.sconeItem.product_name}
                          row={uRow.row}
                          categoryTag={uRow.categoryTag as any}
                          categoryColorClass={uRow.categoryColorClass}
                          showRequiredQty={showRequiredQty}
                          onQtyChange={handleQtyChange}
                          onBumperChange={handleBumperChange}
                          itemIndex={itemIdx}
                          isDragging={isDragging}
                          isDragOver={isDragOver}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDropRow}
                          onDragEnd={handleDragEnd}
                        />
                      );
                    } else {
                      return (
                        <ProductionMiniShakeRow
                          key={uRow.row.shakeItem.product_name}
                          row={uRow.row}
                          showRequiredQty={showRequiredQty}
                          onQtyChange={handleQtyChange}
                          itemIndex={itemIdx}
                          isDragging={isDragging}
                          isDragOver={isDragOver}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDrop={handleDropRow}
                          onDragEnd={handleDragEnd}
                        />
                      );
                    }
                  })}
                </tbody>

                {/* Grand Summary Footer */}
                <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center font-extrabold">
                      전체 총 합계 ({items.length}개 제품)
                    </td>
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.order_qty, 0)}개/봉/팩</td>
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.extra_qty, 0)}개/봉/팩</td>
                    {showRequiredQty && (
                      <td className="py-4 px-3 text-right text-amber-600 dark:text-amber-300">
                        {items.reduce((a, i) => a + i.required_qty, 0)}개/봉/팩
                      </td>
                    )}
                    <td className="py-4 px-3 text-right">{items.reduce((a, i) => a + i.carryover_qty, 0)}개/봉/팩</td>
                    <td className="py-4 px-3 text-right text-amber-600 dark:text-amber-400 text-base">
                      {sconeItemsOnly.reduce((a, i) => a + i.production_qty, 0)}개
                    </td>
                    <td className="py-4 px-3 text-right text-amber-700 dark:text-amber-400 font-mono font-bold">
                      {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                    </td>
                    <td className="py-4 px-3 text-center text-slate-400">-</td>
                    <td className="py-4 px-3 text-right text-purple-700 dark:text-purple-300 font-mono font-bold">
                      {halfpackItems.reduce((a, i) => a + i.order_qty, 0) + miniShakeItems.reduce((a, i) => a + i.order_qty, 0)}봉
                    </td>
                    <td className="py-4 px-3 text-right text-purple-700 dark:text-purple-300 font-mono font-bold">
                      {roundHalf(halfpackItems.reduce((a, i) => a + i.order_qty, 0) / 2.0 + combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0))}판
                    </td>
                    <td className="py-4 px-3 text-right text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                      {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
                    </td>
                    <td className="py-4 px-3 text-right text-sky-700 dark:text-sky-300 font-mono font-bold">
                      {combinedMiniShakeRows.reduce((a, r) => a + r.excessBags, 0)}봉
                    </td>
                    <td className="py-4 px-3 text-right text-emerald-400 text-xl font-black">
                      {grandTotalAllPanels} 판
                    </td>
                    <td className="py-4 px-3 text-right text-amber-300 font-bold">
                      {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
                    </td>
                    <td className="py-4 px-3 text-right text-indigo-300 font-bold">
                      {combinedTriangleRows.reduce((a, r) => a + r.stickExcessPacks, 0)}팩
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Oven Baking Dedicated Table Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  삼각 & 바 스콘 오븐 굽기 작업표
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (풀팬 3판 기준 / 2.5판 이하 1풀팬 자동 이관 계산)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center border-collapse">
                <thead>
                  <tr className="bg-slate-200/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-200 text-xs font-black border-b border-slate-300 dark:border-slate-700">
                    <th className="py-3 px-4 text-left">상품명</th>
                    <th className="py-3 px-3 w-28 border-x border-slate-300 dark:border-slate-700">오븐번호</th>
                    <th className="py-3 px-3 w-36 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-r border-slate-300 dark:border-slate-700">삼각(바)판수</th>
                    <th className="py-3 px-3 w-36 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-r border-slate-300 dark:border-slate-700">풀팬(3판)</th>
                    <th className="py-3 px-3 w-40 bg-sky-500/10 text-sky-700 dark:text-sky-300">남는 반죽 판수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {ovenBakingRows.map((obRow, obIdx) => {
                    if (obRow.is_separator) {
                      return (
                        <tr key={`ob-sep-${obIdx}`} className="bg-slate-100/90 dark:bg-slate-950/90 border-y-2 border-slate-300 dark:border-slate-700">
                          <td colSpan={5} className="py-2.5 px-4 text-center">
                            <span className="font-extrabold text-xs text-amber-500 dark:text-amber-400">
                              ───────── 생산팀 구분 공백 영역 ─────────
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={`ob-${obRow.product_name}-${obIdx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-left font-extrabold text-slate-900 dark:text-slate-100">
                          {obRow.product_name}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300 border-x border-slate-200 dark:border-slate-800">
                          {obRow.oven_number}
                        </td>
                        <td className="py-3 px-3 font-black text-amber-700 dark:text-amber-400 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                          {obRow.total_panels}
                        </td>
                        <td className="py-3 px-3 font-black text-indigo-700 dark:text-indigo-400 bg-indigo-500/5 border-r border-slate-200 dark:border-slate-800 text-base">
                          {obRow.full_pans}
                        </td>
                        <td className="py-3 px-3 font-black text-sky-700 dark:text-sky-400 bg-sky-500/5 text-base">
                          {obRow.remainder_panels}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
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
