import React, { useState, useEffect } from 'react';
import { ProductionItem, SetBreakdownSummary, ProductCatalogItem, SetCatalogItem } from '../../types/production';
import { Upload, FileSpreadsheet, Eye, EyeOff, Save, RefreshCw, Printer, AlertTriangle, Package, Sparkles, Gift, Layers, PlusCircle, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { ProductCatalogModal } from './ProductCatalogModal';
import { recalculateItem, calculateCombinedSconeRows, calculateDoughPortions, roundHalf } from '../../utils/productionDoughCalculator';
import { ProductionTableRow } from './ProductionTableRow';
import { ProductionMiniShakeRow } from './ProductionMiniShakeRow';
import { ProductionPrintView } from './ProductionPrintView';
import { ShipmentNotesView } from './ShipmentNotesView';

const API_BASE = import.meta.env.VITE_VAT_API_BASE?.replace(/\/api$/, '') || 'http://127.0.0.1:8005';
// Default column widths in pixels (compact sizing so 100% fits on screen without horizontal scroll)
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  drag: 28,
  oven_base: 44,
  oven_sec: 44,
  name: 130,
  finalPanels: 70,
  orderQty: 54,
  extraQty: 54,
  reqQty: 54,
  carryover: 54,
  prodQty: 58,
  sconePanels: 64,
  bumperPanels: 66,
  sconeExcess: 68,
  hpOrder: 64,
  hpPanels: 58,
  shakeExcess: 68,
  stickPanels: 58,
  stickExcess: 66,
};

const DEFAULT_ROW_HEIGHT = 38;
const DEFAULT_FONT_SIZE = 11;
const COL_WIDTHS_STORAGE_KEY = 'mudscone_prod_col_widths_v1';
const ROW_HEIGHT_STORAGE_KEY = 'mudscone_prod_row_height_v1';
const FONT_SIZE_STORAGE_KEY = 'mudscone_prod_font_size_v1';

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
  const [isShipmentNotesOpen, setIsShipmentNotesOpen] = useState<boolean>(false);
  const [shipmentCount, setShipmentCount] = useState<number>(0);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  const [rowHeight, setRowHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(ROW_HEIGHT_STORAGE_KEY);
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch {
      // fallback
    }
    return DEFAULT_ROW_HEIGHT;
  });

  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
      if (saved) {
        return parseInt(saved, 10);
      }
    } catch {
      // fallback
    }
    return DEFAULT_FONT_SIZE;
  });

  const [fieldOverrides, setFieldOverrides] = useState<Record<string, { four?: number; one?: number; frozenFour?: number; frozenOne?: number }>>({});

  const handleFieldOverrideChange = (key: string, field: 'four' | 'one' | 'frozenFour' | 'frozenOne', val: number) => {
    setFieldOverrides(prev => {
      const existing = prev[key] || {};
      if (field === 'frozenFour') {
        const { four, ...rest } = existing;
        return {
          ...prev,
          [key]: { ...rest, frozenFour: val }
        };
      }
      if (field === 'frozenOne') {
        const { one, ...rest } = existing;
        return {
          ...prev,
          [key]: { ...rest, frozenOne: val }
        };
      }
      return {
        ...prev,
        [key]: {
          ...existing,
          [field]: val
        }
      };
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(colWidths));
    } catch (e) {
      console.error('Failed to save colWidths to localStorage', e);
    }
  }, [colWidths]);

  useEffect(() => {
    try {
      localStorage.setItem(ROW_HEIGHT_STORAGE_KEY, rowHeight.toString());
    } catch (e) {
      console.error('Failed to save rowHeight to localStorage', e);
    }
  }, [rowHeight]);

  useEffect(() => {
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize.toString());
    } catch (e) {
      console.error('Failed to save fontSize to localStorage', e);
    }
  }, [fontSize]);

  const handleResetTableSizes = () => {
    setColWidths(DEFAULT_COLUMN_WIDTHS);
    setRowHeight(DEFAULT_ROW_HEIGHT);
    setFontSize(DEFAULT_FONT_SIZE);
    localStorage.removeItem(COL_WIDTHS_STORAGE_KEY);
    localStorage.removeItem(ROW_HEIGHT_STORAGE_KEY);
    localStorage.removeItem(FONT_SIZE_STORAGE_KEY);
  };

  const handleColResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 80;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(30, startWidth + delta);
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleRowResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = rowHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newH = Math.max(32, Math.min(120, startH + delta));
      setRowHeight(newH);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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

  if (isShipmentNotesOpen) {
    return (
      <ShipmentNotesView
        recordDate={recordDate}
        initialShipmentCount={shipmentCount}
        onShipmentCountChange={setShipmentCount}
        onBack={() => setIsShipmentNotesOpen(false)}
      />
    );
  }

  if (isPrintViewOpen) {
    return (
      <ProductionPrintView
        items={items}
        recordDate={recordDate}
        showRequiredQty={showRequiredQty}
        shipmentCount={shipmentCount}
        fieldOverrides={fieldOverrides}
        fontSize={fontSize}
        rowHeight={rowHeight}
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

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => setIsShipmentNotesOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sky-600 dark:text-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-sky-400/40 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-sky-500" />
            <span>📦 발송 특이사항</span>
          </button>

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
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-lg text-xs border border-slate-700 text-slate-300">
                  <span className="text-[11px] text-slate-400">글자 크기:</span>
                  <input
                    type="range"
                    min="9"
                    max="15"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-14 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    title="글자 크기 조절 슬라이더 (9px~15px)"
                  />
                  <span className="font-mono text-amber-400 font-bold text-[11px] w-6 text-right">{fontSize}px</span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-lg text-xs border border-slate-700 text-slate-300">
                  <span className="text-[11px] text-slate-400">행 높이:</span>
                  <input
                    type="range"
                    min="28"
                    max="60"
                    value={rowHeight}
                    onChange={(e) => setRowHeight(parseInt(e.target.value, 10))}
                    className="w-14 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    title="행 높이 조절 슬라이더 (28px~60px)"
                  />
                  <span className="font-mono text-amber-400 font-bold text-[11px] w-6 text-right">{rowHeight}px</span>
                </div>

                <button
                  onClick={handleResetTableSizes}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-700 shadow-sm"
                  title="열 너비, 행 높이, 글자 크기를 기본값으로 초기화합니다."
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>크기 초기화</span>
                </button>

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
              <table
                style={{ fontSize: `${fontSize}px` }}
                className="w-full text-left border-collapse"
              >
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 text-xs font-bold border-b border-slate-300 dark:border-slate-800 text-center select-none">
                    <th
                      rowSpan={2}
                      style={{ width: colWidths.drag, minWidth: colWidths.drag }}
                      className="relative py-2 px-1 text-center text-slate-400 font-normal whitespace-nowrap print:hidden"
                    >
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'drag')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      colSpan={2}
                      className="py-1.5 px-2 border-r border-slate-300 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-900 text-amber-500 dark:text-amber-400 font-black whitespace-nowrap text-center"
                    >
                      오븐 번호
                    </th>
                    <th
                      rowSpan={2}
                      style={{ width: colWidths.name, minWidth: colWidths.name }}
                      className="relative py-2 px-2 text-left whitespace-nowrap group select-none"
                    >
                      제품명
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'name')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>

                    {/* Total Required Panels (총 판수) */}
                    <th
                      rowSpan={2}
                      style={{ width: colWidths.finalPanels, minWidth: colWidths.finalPanels }}
                      className="relative py-2 px-2 text-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black whitespace-nowrap group select-none"
                    >
                      총 판수
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'finalPanels')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>

                    {/* Category Group 1: 삼각&바스콘 */}
                    <th
                      colSpan={showRequiredQty ? 8 : 7}
                      className="py-1.5 px-2 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-black border-r border-slate-300 dark:border-slate-800 whitespace-nowrap text-center"
                    >
                      삼각&바스콘
                    </th>

                    {/* Category Group 2: 하프팩&미니쉐이크 */}
                    <th
                      colSpan={3}
                      className="py-1.5 px-2 bg-purple-500/15 text-purple-700 dark:text-purple-300 font-black border-r border-slate-300 dark:border-slate-800 whitespace-nowrap text-center"
                    >
                      하프팩&미니쉐이크
                    </th>

                    {/* Category Group 3: 스틱스콘 */}
                    <th
                      colSpan={2}
                      className="py-1.5 px-2 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-black border-r border-slate-300 dark:border-slate-800 whitespace-nowrap text-center"
                    >
                      스틱스콘
                    </th>
                  </tr>
                  <tr className="bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-extrabold border-b border-slate-300 dark:border-slate-800 text-center select-none">
                    {/* Sub-headers for 오븐 */}
                    <th
                      style={{ width: colWidths.oven_base, minWidth: colWidths.oven_base }}
                      className="relative py-1 px-1.5 text-center text-amber-500 dark:text-amber-400 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap group"
                    >
                      삼각 / 바
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'oven_base')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.oven_sec, minWidth: colWidths.oven_sec }}
                      className="relative py-1 px-1.5 text-center text-purple-400 dark:text-purple-300 border-r border-slate-300 dark:border-slate-800 whitespace-nowrap group"
                    >
                      스틱 / 큐브
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'oven_sec')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>

                    {/* Sub-headers for 삼각&바스콘 */}
                    <th
                      style={{ width: colWidths.orderQty, minWidth: colWidths.orderQty }}
                      className="relative py-1 px-1.5 text-center whitespace-nowrap group select-none"
                    >
                      주문량
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'orderQty')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.extraQty, minWidth: colWidths.extraQty }}
                      className="relative py-1 px-1.5 text-center whitespace-nowrap group select-none"
                    >
                      추가량
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'extraQty')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    {showRequiredQty && (
                      <th
                        style={{ width: colWidths.reqQty, minWidth: colWidths.reqQty }}
                        className="relative py-1 px-1.5 text-center text-amber-600 dark:text-amber-300 whitespace-nowrap group select-none"
                      >
                        필요량
                        <div
                          onMouseDown={(e) => handleColResizeMouseDown(e, 'reqQty')}
                          className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                          title="드래그하여 열 너비 조절"
                        />
                      </th>
                    )}
                    <th
                      style={{ width: colWidths.carryover, minWidth: colWidths.carryover }}
                      className="relative py-1 px-1.5 text-center whitespace-nowrap group select-none"
                    >
                      이월재고
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'carryover')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.prodQty, minWidth: colWidths.prodQty }}
                      className="relative py-1 px-1.5 text-center text-amber-600 dark:text-amber-400 whitespace-nowrap group select-none"
                    >
                      생산량
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'prodQty')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.sconePanels, minWidth: colWidths.sconePanels }}
                      className="relative py-1 px-1.5 text-center bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black whitespace-nowrap group select-none"
                    >
                      판수
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'sconePanels')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.bumperPanels, minWidth: colWidths.bumperPanels }}
                      className="relative py-1 px-1.5 text-center text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap group select-none"
                    >
                      판수 추가
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'bumperPanels')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    {/* Category 1 Excess: 남는량(개) */}
                    <th
                      style={{ width: colWidths.sconeExcess, minWidth: colWidths.sconeExcess }}
                      className="relative py-1 px-1.5 text-center text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap group select-none border-r border-slate-300 dark:border-slate-800"
                    >
                      남는량(개)
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'sconeExcess')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>

                    {/* Sub-headers for 하프팩&미니쉐이크 */}
                    <th
                      style={{ width: colWidths.hpOrder, minWidth: colWidths.hpOrder }}
                      className="relative py-1 px-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-center whitespace-nowrap group select-none"
                    >
                      주문량(봉)
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'hpOrder')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    <th
                      style={{ width: colWidths.hpPanels, minWidth: colWidths.hpPanels }}
                      className="relative py-1 px-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-center font-black whitespace-nowrap group select-none"
                    >
                      판수
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'hpPanels')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    {/* Category 2 Excess: 남는량(봉) */}
                    <th
                      style={{ width: colWidths.shakeExcess, minWidth: colWidths.shakeExcess }}
                      className="relative py-1.5 px-2 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-center border-r border-sky-500/20 font-bold whitespace-nowrap group select-none"
                    >
                      남는량(봉)
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'shakeExcess')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>

                    {/* Sub-headers for 스틱스콘 */}
                    <th
                      style={{ width: colWidths.stickPanels, minWidth: colWidths.stickPanels }}
                      className="relative py-1.5 px-2 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-center font-black whitespace-nowrap group select-none"
                    >
                      판수
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'stickPanels')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
                    {/* Category 3 Excess: 남는량(팩) */}
                    <th
                      style={{ width: colWidths.stickExcess, minWidth: colWidths.stickExcess }}
                      className="relative py-1.5 px-2 text-center text-indigo-500 dark:text-indigo-400 font-bold whitespace-nowrap group select-none"
                    >
                      남는량(팩)
                      <div
                        onMouseDown={(e) => handleColResizeMouseDown(e, 'stickExcess')}
                        className="absolute top-0 right-0 bottom-0 w-2 cursor-col-resize hover:bg-amber-500 active:bg-amber-600 transition-colors z-30"
                        title="드래그하여 열 너비 조절"
                      />
                    </th>
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
                          style={{ height: `${rowHeight}px` }}
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
                          <td
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, itemIdx)}
                            className="py-2.5 px-2 text-center text-slate-400 hover:text-amber-500 font-black text-base cursor-grab active:cursor-grabbing select-none print:hidden"
                            title="드래그하여 위치 변경"
                          >
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
                          rowHeight={rowHeight}
                          onRowResizeStart={handleRowResizeMouseDown}
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
                          rowHeight={rowHeight}
                          onRowResizeStart={handleRowResizeMouseDown}
                        />
                      );
                    }
                  })}
                </tbody>

                {/* Grand Summary Footer */}
                <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                  <tr>
                    <td colSpan={4} className="py-4 px-3 text-center font-extrabold whitespace-nowrap">
                      전체 총 합계 ({items.length}개 제품)
                    </td>
                    <td className="py-4 px-3 text-right text-emerald-400 text-xl font-black bg-emerald-500/10 whitespace-nowrap">
                      {grandTotalAllPanels} 판
                    </td>
                    {/* 삼각스콘 합계 */}
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    {showRequiredQty && (
                      <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    )}
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    <td className="py-4 px-3 text-right text-amber-700 dark:text-amber-400 font-mono font-bold whitespace-nowrap">
                      {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                    </td>
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    <td className="py-4 px-3 text-right text-amber-300 font-bold whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                      {combinedTriangleRows.reduce((a, r) => a + r.excessQty, 0) + combinedBarRows.reduce((a, r) => a + r.excessQty, 0)}개
                    </td>

                    {/* 미니큐브 합계 */}
                    <td className="py-4 px-3 text-center text-slate-400 whitespace-nowrap">-</td>
                    <td className="py-4 px-3 text-right text-purple-700 dark:text-purple-300 font-mono font-bold whitespace-nowrap">
                      {roundHalf(halfpackItems.reduce((a, i) => a + i.order_qty, 0) / 2.0 + combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0))}판
                    </td>
                    <td className="py-4 px-3 text-right text-sky-700 dark:text-sky-300 font-mono font-bold whitespace-nowrap border-r border-sky-500/20">
                      {combinedMiniShakeRows.reduce((a, r) => a + r.excessBags, 0)}봉
                    </td>

                    {/* 스틱스콘 합계 */}
                    <td className="py-4 px-3 text-right text-indigo-700 dark:text-indigo-300 font-mono font-bold whitespace-nowrap">
                      {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
                    </td>
                    <td className="py-4 px-3 text-right text-indigo-300 font-bold whitespace-nowrap">
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

          {/* Field Dough Production Record Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  생산 정리 표(디스트리뷰터)
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  (소분반죽 4판/1판 단위 자동 산출 및 냉동생지 차감 현장 연동)
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse" style={{ fontSize: `${fontSize}px` }}>
                <thead>
                  <tr className="bg-slate-200/70 dark:bg-slate-800/70 text-slate-900 dark:text-slate-200 font-black border-b border-slate-300 dark:border-slate-700">
                    <th colSpan={2} className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700">오븐</th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700 text-left min-w-[140px]">제품명</th>
                    <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-300 dark:border-slate-700 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-black text-sm">총 판수</th>
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-black w-24">소분반죽(4판)</th>
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-black w-24">소분반죽(1판)</th>
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 w-24">냉동생지(4판)</th>
                    <th rowSpan={2} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 w-24">냉동생지(1판)</th>
                    <th colSpan={1} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black">
                      삼각&바스콘
                    </th>
                    <th colSpan={1} className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black">
                      하프팩&미니쉐이크
                    </th>
                    <th colSpan={1} className="py-2 px-2 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-black">
                      스틱스콘
                    </th>
                  </tr>
                  <tr className="bg-slate-200/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-300 text-[11px] font-bold border-b border-slate-300 dark:border-slate-700">
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 w-16">삼각/바</th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 w-16 text-purple-700 dark:text-purple-300">스틱/큐브</th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-black w-20">판수</th>
                    <th className="py-2 px-2 border-r border-slate-300 dark:border-slate-700 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-black w-20">판수</th>
                    <th className="py-2 px-2 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-black w-20">판수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {unifiedRows.map((uRow, idx) => {
                    if (uRow.type === 'separator') {
                      return (
                        <tr key={`field-sep-${idx}`} className="bg-slate-100/90 dark:bg-slate-950/90 border-y-2 border-slate-300 dark:border-slate-700">
                          <td colSpan={11} className="py-2.5 px-4 text-center">
                            <span className="font-extrabold text-xs text-amber-500 dark:text-amber-400">
                              ───────── 생산팀 구분 공백 영역 ─────────
                            </span>
                          </td>
                        </tr>
                      );
                    } else if (uRow.type === 'scone') {
                      const row = uRow.row;
                      const secOven = row.matchedHp?.oven_number || row.matchedStick?.oven_number;
                      const isBar = row.sconeItem.category === '바';
                      const defaultDough = calculateDoughPortions(row.finalPanels);
                      const rowKey = `scone_${row.sconeItem.product_name}`;
                      const currentOverrides = fieldOverrides[rowKey] || {};
                      const frozenFourVal = currentOverrides.frozenFour !== undefined ? currentOverrides.frozenFour : 0;
                      const frozenOneVal = currentOverrides.frozenOne !== undefined ? currentOverrides.frozenOne : 0;
                      const fourVal = currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, defaultDough.fourPanels - frozenFourVal);
                      const oneVal = currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, defaultDough.onePanels - frozenOneVal);

                      return (
                        <tr key={`field-${row.sconeItem.product_name}-${idx}`} style={{ height: `${rowHeight}px` }} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-1 px-2 font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                            {row.sconeItem.oven_number || '1'}
                          </td>
                          <td className="py-1 px-2 font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-slate-200 dark:border-slate-800">
                            {secOven || '-'}
                          </td>
                          <td className="py-1 px-3 text-left font-extrabold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold ${
                              isBar ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {isBar ? '바' : '삼각'}
                            </span>
                            {row.sconeItem.product_name}
                          </td>
                          <td className="py-1 px-3 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-r border-slate-200 dark:border-slate-800 text-sm">
                            {row.finalPanels}판
                          </td>
                          <td className="py-1 px-2 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={fourVal}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'four', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="py-1 px-2 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={oneVal}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'one', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={frozenFourVal === 0 ? '' : frozenFourVal}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'frozenFour', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={frozenOneVal === 0 ? '' : frozenOneVal}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'frozenOne', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-1 px-2 font-black text-amber-700 dark:text-amber-400 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                            {row.sconeDoughPanels}판
                          </td>
                          <td className="py-1 px-2 font-black text-purple-700 dark:text-purple-400 bg-purple-500/5 border-r border-slate-200 dark:border-slate-800">
                            {row.hpPanels > 0 ? `${row.hpPanels}판` : '-'}
                          </td>
                          <td className="py-1 px-2 font-black text-blue-700 dark:text-blue-400 bg-blue-500/5">
                            {row.stickPanels > 0 ? `${row.stickPanels}판` : '-'}
                          </td>
                        </tr>
                      );
                    } else {
                      const row = uRow.row;
                      const defaultDough = calculateDoughPortions(row.panels);
                      const rowKey = `shake_${row.shakeItem.product_name}`;
                      const currentOverrides = fieldOverrides[rowKey] || {};
                      const frozenFourVal = currentOverrides.frozenFour !== undefined ? currentOverrides.frozenFour : 0;
                      const frozenOneVal = currentOverrides.frozenOne !== undefined ? currentOverrides.frozenOne : 0;
                      const fourVal = currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, defaultDough.fourPanels - frozenFourVal);
                      const oneVal = currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, defaultDough.onePanels - frozenOneVal);

                      return (
                        <tr key={`field-shake-${row.shakeItem.product_name}-${idx}`} style={{ height: `${rowHeight}px` }} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-sky-500/5">
                          <td className="py-1 px-2 font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                            -
                          </td>
                          <td className="py-1 px-2 font-mono font-bold text-purple-700 dark:text-purple-300 border-r border-slate-200 dark:border-slate-800">
                            {row.shakeItem.oven_number || '1'}
                          </td>
                          <td className="py-1 px-3 text-left font-extrabold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                              쉐이크
                            </span>
                            {row.shakeItem.product_name}
                          </td>
                          <td className="py-1 px-3 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-r border-slate-200 dark:border-slate-800 text-sm">
                            {row.panels}판
                          </td>
                          <td className="py-1 px-2 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={fourVal}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'four', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="py-1 px-2 bg-amber-500/5 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={oneVal}
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'one', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={frozenFourVal === 0 ? '' : frozenFourVal}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'frozenFour', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-1 px-2 border-r border-slate-200 dark:border-slate-800">
                            <input
                              type="number"
                              value={frozenOneVal === 0 ? '' : frozenOneVal}
                              placeholder="0"
                              onWheel={(e) => e.currentTarget.blur()}
                              onChange={(e) => handleFieldOverrideChange(rowKey, 'frozenOne', parseInt(e.target.value, 10) || 0)}
                              style={{ fontSize: `${fontSize}px` }}
                              className="w-16 py-1 px-1.5 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-amber-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-slate-400"
                            />
                          </td>
                          <td className="py-1 px-2 font-mono text-slate-400 border-r border-slate-200 dark:border-slate-800">
                            -
                          </td>
                          <td className="py-1 px-2 font-black text-purple-700 dark:text-purple-400 bg-purple-500/5 border-r border-slate-200 dark:border-slate-800">
                            {row.panels}판
                          </td>
                          <td className="py-1 px-2 font-mono text-slate-400">
                            -
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
                {/* Summary Footer */}
                {(() => {
                  let sumFour = 0;
                  let sumOne = 0;
                  let sumFrozenFour = 0;
                  let sumFrozenOne = 0;

                  unifiedRows.forEach((uRow) => {
                    if (uRow.type === 'scone') {
                      const row = uRow.row;
                      const rowKey = `scone_${row.sconeItem.product_name}`;
                      const currentOverrides = fieldOverrides[rowKey] || {};
                      const def = calculateDoughPortions(row.finalPanels);
                      const frozenFour = currentOverrides.frozenFour || 0;
                      const frozenOne = currentOverrides.frozenOne || 0;
                      sumFour += currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, def.fourPanels - frozenFour);
                      sumOne += currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, def.onePanels - frozenOne);
                      sumFrozenFour += frozenFour;
                      sumFrozenOne += frozenOne;
                    } else if (uRow.type === 'shake') {
                      const row = uRow.row;
                      const rowKey = `shake_${row.shakeItem.product_name}`;
                      const currentOverrides = fieldOverrides[rowKey] || {};
                      const def = calculateDoughPortions(row.panels);
                      const frozenFour = currentOverrides.frozenFour || 0;
                      const frozenOne = currentOverrides.frozenOne || 0;
                      sumFour += currentOverrides.four !== undefined ? currentOverrides.four : Math.max(0, def.fourPanels - frozenFour);
                      sumOne += currentOverrides.one !== undefined ? currentOverrides.one : Math.max(0, def.onePanels - frozenOne);
                      sumFrozenFour += frozenFour;
                      sumFrozenOne += frozenOne;
                    }
                  });

                  return (
                    <tfoot className="bg-slate-100 dark:bg-slate-950 border-t-2 border-slate-300 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                      <tr>
                        <td colSpan={3} className="py-3 px-3 text-center font-extrabold whitespace-nowrap">
                          전체 총 합계 ({items.length}개 제품)
                        </td>
                        <td className="py-3 px-3 text-emerald-700 dark:text-emerald-400 text-lg font-black bg-emerald-500/10 whitespace-nowrap border-r border-slate-300 dark:border-slate-800">
                          {grandTotalAllPanels} 판
                        </td>
                        <td className="py-3 px-2 text-amber-700 dark:text-amber-300 font-mono font-black text-sm bg-amber-500/15 border-r border-slate-300 dark:border-slate-800">
                          {sumFour}
                        </td>
                        <td className="py-3 px-2 text-amber-700 dark:text-amber-300 font-mono font-black text-sm bg-amber-500/15 border-r border-slate-300 dark:border-slate-800">
                          {sumOne}
                        </td>
                        <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-mono font-bold border-r border-slate-300 dark:border-slate-800">
                          {sumFrozenFour > 0 ? sumFrozenFour : '-'}
                        </td>
                        <td className="py-3 px-2 text-slate-800 dark:text-slate-200 font-mono font-bold border-r border-slate-300 dark:border-slate-800">
                          {sumFrozenOne > 0 ? sumFrozenOne : '-'}
                        </td>
                        <td className="py-3 px-2 text-amber-700 dark:text-amber-400 font-mono font-bold bg-amber-500/10 border-r border-slate-300 dark:border-slate-800">
                          {roundHalf(combinedTriangleRows.reduce((a, r) => a + r.sconeDoughPanels, 0) + combinedBarRows.reduce((a, r) => a + r.sconeDoughPanels, 0))}판
                        </td>
                        <td className="py-3 px-2 text-purple-700 dark:text-purple-300 font-mono font-bold bg-purple-500/10 border-r border-slate-300 dark:border-slate-800">
                          {roundHalf(halfpackItems.reduce((a, i) => a + i.order_qty, 0) / 2.0 + combinedMiniShakeRows.reduce((a, r) => a + r.panels, 0))}판
                        </td>
                        <td className="py-3 px-2 text-indigo-700 dark:text-indigo-300 font-mono font-bold bg-blue-500/10">
                          {combinedTriangleRows.reduce((a, r) => a + r.stickPanels, 0)}판
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
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
