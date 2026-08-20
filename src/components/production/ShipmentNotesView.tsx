import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer, Plus, Trash2, RotateCcw, CheckCircle2, FileSpreadsheet, Copy, Check } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_VAT_API_BASE?.replace(/\/api$/, '') || 'http://127.0.0.1:8005';

interface ListItem {
  id: string;
  name: string;
  info: string;
  note: string;
}

export interface CombinedShipmentItem {
  id: string;
  tracking_number: string;
  buyer_name: string;
  buyer_phone: string;
  order_count: number;
  order_ids?: string[];
  checked?: boolean;
}

interface ServiceSconeData {
  vip: number;
  accident: number;
  freeShipping: number;
  staff: number;
}

interface ShipmentNotesViewProps {
  recordDate: string;
  initialShipmentCount?: number;
  onShipmentCountChange?: (count: number) => void;
  onBack: () => void;
}

export const ShipmentNotesView: React.FC<ShipmentNotesViewProps> = ({
  recordDate,
  initialShipmentCount = 0,
  onShipmentCountChange,
  onBack,
}) => {
  // Clear any legacy persisted data from previous versions
  useEffect(() => {
    try {
      localStorage.removeItem('mudscone_shipment_notes_v1');
    } catch (e) {
      // ignore
    }
  }, []);

  // 1. Service Scone
  const [serviceScone, setServiceScone] = useState<ServiceSconeData>({
    vip: 0,
    accident: 0,
    freeShipping: 0,
    staff: 0,
  });

  // 2. Special notes (특이사항)
  const [specialNotes, setSpecialNotes] = useState<ListItem[]>([
    { id: '1', name: '', info: '', note: '' },
  ]);

  // 3. Pickup customers (픽업)
  const [pickupList, setPickupList] = useState<ListItem[]>([
    { id: '1', name: '', info: '', note: '' },
  ]);

  // 4. Jeju Island customers (제주도 >> 로젠택배)
  const [jejuList, setJejuList] = useState<ListItem[]>([
    { id: '1', name: '', info: '', note: '' },
  ]);

  // 5. Local In-district customers (관내)
  const [localList, setLocalList] = useState<ListItem[]>([
    { id: '1', name: '', info: '', note: '' },
  ]);

  // 6. Greek Yogurt counts (1 to 10)
  const [greekCounts, setGreekCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0,
  });

  // 7. YOF counts (1 to 3)
  const [yofCounts, setYofCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 3: 0,
  });

  // 8. Total Shipment Count
  const [shipmentCount, setShipmentCount] = useState<number>(initialShipmentCount);

  // 9. Combined Shipments (합배송 - 동일 송장 다중 주문 목록)
  const [combinedShipments, setCombinedShipments] = useState<CombinedShipmentItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Status & loading
  const [loadingExcel, setLoadingExcel] = useState<boolean>(false);
  const [excelSuccessMsg, setExcelSuccessMsg] = useState<string | null>(null);

  // Sync shipment count with parent
  const handleShipmentCountChange = (val: number) => {
    setShipmentCount(val);
    if (onShipmentCountChange) {
      onShipmentCountChange(val);
    }
  };

  // Format Date for Title: e.g. "발송 특이사항 0820(목)"
  const getFormattedHeaderTitle = () => {
    try {
      const parts = recordDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const dayOfWeek = days[d.getDay()];
        return `발송 특이사항 ${month}${day}(${dayOfWeek})`;
      }
    } catch {
      // fallback
    }
    return `발송 특이사항 ${recordDate}`;
  };

  // List management helpers
  const handleAddRow = (setter: React.Dispatch<React.SetStateAction<ListItem[]>>) => {
    setter((prev) => [...prev, { id: Date.now().toString() + Math.random().toString(), name: '', info: '', note: '' }]);
  };

  const handleRemoveRow = (setter: React.Dispatch<React.SetStateAction<ListItem[]>>, index: number) => {
    setter((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.length === 0 ? [{ id: Date.now().toString(), name: '', info: '', note: '' }] : filtered;
    });
  };

  const handleUpdateRow = (
    setter: React.Dispatch<React.SetStateAction<ListItem[]>>,
    index: number,
    field: 'name' | 'info' | 'note',
    value: string
  ) => {
    setter((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  // Service Scone total
  const serviceTotal = (serviceScone.vip || 0) + (serviceScone.accident || 0) + (serviceScone.freeShipping || 0) + (serviceScone.staff || 0);

  // Greek Yogurt calculations
  const greekTotalOrders = Object.values(greekCounts).reduce((a, b) => a + (b || 0), 0);
  const greekTotalQuantity = Object.entries(greekCounts).reduce((sum, [qty, orders]) => sum + (parseInt(qty, 10) * (orders || 0)), 0);

  // YOF calculations
  const yofTotalOrders = Object.values(yofCounts).reduce((a, b) => a + (b || 0), 0);

  // Handle Excel upload
  const handleExcelUpload = async (file: File) => {
    setLoadingExcel(true);
    setExcelSuccessMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE}/api/production/parse-shipment-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        if (res.data.greek_yogurt) {
          const newGreek: Record<number, number> = {};
          for (let i = 1; i <= 10; i++) {
            newGreek[i] = res.data.greek_yogurt[i] || 0;
          }
          setGreekCounts(newGreek);
        }

        if (res.data.yof) {
          const newYof: Record<number, number> = {};
          for (let i = 1; i <= 3; i++) {
            newYof[i] = res.data.yof[i] || 0;
          }
          setYofCounts(newYof);
        }

        if (res.data.jeju_candidates && Array.isArray(res.data.jeju_candidates) && res.data.jeju_candidates.length > 0) {
          setJejuList(res.data.jeju_candidates.map((name: string, idx: number) => ({
            id: `jeju-${idx}-${Date.now()}`,
            name,
            info: '',
            note: '자동감지',
          })));
        }

        if (res.data.combined_shipments && Array.isArray(res.data.combined_shipments)) {
          setCombinedShipments(res.data.combined_shipments.map((item: any, idx: number) => ({
            id: `cs-${idx}-${Date.now()}`,
            tracking_number: item.tracking_number,
            buyer_name: item.buyer_name,
            buyer_phone: item.buyer_phone,
            order_count: item.order_count,
            order_ids: item.order_ids,
            checked: false,
          })));
        }

        const combinedCount = (res.data.combined_shipments || []).length;
        setExcelSuccessMsg(`엑셀 분석 완료: 총 ${res.data.total_orders || 0}건 주문 중 그릭요거트/YOF 통계 및 합배송 ${combinedCount}건이 감지되었습니다.`);
      }
    } catch (e: any) {
      console.error('Shipment Excel Parse Error:', e);
      alert(e.response?.data?.detail || '엑셀 분석 중 오류가 발생했습니다.');
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleCopyBuyerInfo = (item: CombinedShipmentItem) => {
    const textToCopy = `${item.buyer_name} ${item.buyer_phone}`.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleToggleCombinedCheck = (index: number) => {
    setCombinedShipments((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], checked: !next[index].checked };
      }
      return next;
    });
  };

  const handleResetAll = () => {
    if (confirm('발송 특이사항의 모든 입력값을 초기화하시겠습니까?')) {
      setServiceScone({ vip: 0, accident: 0, freeShipping: 0, staff: 0 });
      setSpecialNotes([{ id: '1', name: '', info: '', note: '' }]);
      setPickupList([{ id: '1', name: '', info: '', note: '' }]);
      setJejuList([{ id: '1', name: '', info: '', note: '' }]);
      setLocalList([{ id: '1', name: '', info: '', note: '' }]);
      setGreekCounts({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 });
      setYofCounts({ 1: 0, 2: 0, 3: 0 });
      setCombinedShipments([]);
      setExcelSuccessMsg(null);
      try {
        localStorage.removeItem('mudscone_shipment_notes_v1');
      } catch (e) {
        // ignore
      }
    }
  };


  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 print:p-0 print:m-0 print:bg-white print:text-black">
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 6mm 10mm 6mm 10mm;
          }
          *, *:before, *:after {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, .min-h-screen, div {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          input {
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
            outline: none !important;
          }
          /* High contrast print grid */
          .shipment-print-table th, .shipment-print-table td {
            border-color: #000000 !important;
            color: #000000 !important;
            line-height: 1.25 !important;
          }
        }
      `}</style>

      {/* Sticky Screen Top Toolbar */}
      <div className="no-print sticky top-2 z-50 max-w-4xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-3 bg-slate-800/95 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-2xl">
        <button
          onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition flex items-center gap-1.5 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 생산 정리 화면으로
        </button>

        <div className="flex items-center gap-2">
          {/* Excel Upload Input */}
          <input
            type="file"
            accept=".xlsx, .xls"
            id="shipment-excel-file-input"
            className="hidden"
            onChange={(e) => e.target.files && e.target.files[0] && handleExcelUpload(e.target.files[0])}
          />
          <label
            htmlFor="shipment-excel-file-input"
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{loadingExcel ? '분석 중...' : '📁 주문건별 엑셀 업로드'}</span>
          </label>

          <button
            onClick={handleResetAll}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
            title="모든 내용 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 초기화
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 font-extrabold text-slate-950 rounded-lg text-xs transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" /> A4 세로 인쇄하기
          </button>
        </div>
      </div>

      {excelSuccessMsg && (
        <div className="no-print max-w-4xl mx-auto mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{excelSuccessMsg}</span>
        </div>
      )}

      {/* Screen-Only: Combined Shipping (합배송) Detection Card (no-print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-slate-800/90 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📦</span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-amber-400 flex items-center gap-2">
                합배송(동일 송장 다중 주문) 감지 목록
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40">
                  {combinedShipments.length}건
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                주문번호는 다르나 동일 송장번호로 묶인 주문자 명단입니다. (쇼핑몰 배송비 환불 등 확인용 • 인쇄 제외)
              </p>
            </div>
          </div>
        </div>

        {combinedShipments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
            상단 <span className="text-sky-400 font-bold">[📁 주문건별 엑셀 업로드]</span>로 엑셀을 올리면 동일 송장의 합배송 주문자(이름/연락처)가 자동 감지되어 표시됩니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 font-bold border-b border-slate-700">
                  <th className="py-2 px-3 w-12 text-center">확인</th>
                  <th className="py-2 px-3 w-12 text-center">No</th>
                  <th className="py-2 px-4 font-black text-amber-300">주문자 이름</th>
                  <th className="py-2 px-4 font-black text-slate-200">주문자 전화</th>
                  <th className="py-2 px-3 text-center text-slate-400">묶인 주문수</th>
                  <th className="py-2 px-4 text-slate-400 font-mono">송장번호</th>
                  <th className="py-2 px-3 w-20 text-center">복사</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {combinedShipments.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className={`transition hover:bg-slate-750 ${
                      item.checked ? 'opacity-40 bg-slate-900/40' : 'bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.checked || false}
                        onChange={() => handleToggleCombinedCheck(idx)}
                        className="rounded accent-amber-500 cursor-pointer"
                        title="확인 완료 여부 체크"
                      />
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className={`py-2 px-4 font-black text-sm text-amber-300 ${item.checked ? 'line-through text-slate-400' : ''}`}>
                      {item.buyer_name}
                    </td>
                    <td className={`py-2 px-4 font-mono font-bold text-sm text-slate-100 ${item.checked ? 'line-through text-slate-400' : ''}`}>
                      {item.buyer_phone}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded font-bold text-xs">
                        {item.order_count}건 묶음
                      </span>
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-slate-400">
                      {item.tracking_number}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleCopyBuyerInfo(item)}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto"
                        title="주문자 이름과 연락처를 클립보드에 복사"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 text-[10px]">복사됨</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>복사</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Printable Container (A4 Portrait Layout) */}
      <div className="print-container max-w-3xl mx-auto bg-white text-black p-6 sm:p-8 rounded-xl shadow-2xl border border-slate-300 print:border-none print:shadow-none print:p-0">
        
        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-black inline-block border-b-2 border-black pb-0.5">
            {getFormattedHeaderTitle()}
          </h1>
        </div>

        {/* ================= 1. [서비스스콘] ================= */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-sm sm:text-base text-black">[서비스스콘]</span>
            <span className="text-xs text-gray-800 font-bold">• 서비스스콘은 모두 선반영 완료</span>
          </div>
          <table className="shipment-print-table w-full text-center border-collapse border border-black text-xs">
            <thead className="bg-gray-100 font-extrabold">
              <tr>
                <th className="border border-black py-1 px-2 w-1/5">VIP</th>
                <th className="border border-black py-1 px-2 w-1/5">사고건</th>
                <th className="border border-black py-1 px-2 w-1/5">무배</th>
                <th className="border border-black py-1 px-2 w-1/5">직원</th>
                <th className="border border-black py-1 px-2 w-1/5 bg-gray-200">합=&gt;</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold text-sm">
                <td className="border border-black py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    value={serviceScone.vip === 0 ? '' : serviceScone.vip}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setServiceScone((prev) => ({ ...prev, vip: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="border border-black py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    value={serviceScone.accident === 0 ? '' : serviceScone.accident}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setServiceScone((prev) => ({ ...prev, accident: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="border border-black py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    value={serviceScone.freeShipping === 0 ? '' : serviceScone.freeShipping}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setServiceScone((prev) => ({ ...prev, freeShipping: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="border border-black py-1 px-2">
                  <input
                    type="number"
                    min="0"
                    value={serviceScone.staff === 0 ? '' : serviceScone.staff}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onWheel={(e) => e.currentTarget.blur()}
                    onChange={(e) => setServiceScone((prev) => ({ ...prev, staff: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </td>
                <td className="border border-black py-1 px-2 font-black text-base bg-gray-100">
                  {serviceTotal}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= 2. [특이사항] ================= */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-sm sm:text-base text-black">[특이사항]</span>
            <button
              onClick={() => handleAddRow(setSpecialNotes)}
              className="no-print text-[11px] font-bold px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded border border-amber-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 행 추가
            </button>
          </div>
          <table className="shipment-print-table w-full text-left border-collapse border border-black text-xs">
            <tbody>
              {specialNotes.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black">
                  <td className="border border-black py-1 px-2 w-10 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black py-1 px-2 w-28">
                    <input
                      type="text"
                      placeholder="이름/코드"
                      value={item.name}
                      onChange={(e) => handleUpdateRow(setSpecialNotes, idx, 'name', e.target.value)}
                      className="w-full font-bold text-black outline-none"
                    />
                  </td>
                  <td className="border border-black py-1 px-2 w-32 font-bold">
                    <input
                      type="text"
                      placeholder="차수/주문 (예: 3차-32)"
                      value={item.info}
                      onChange={(e) => handleUpdateRow(setSpecialNotes, idx, 'info', e.target.value)}
                      className="w-full text-black outline-none"
                    />
                  </td>
                  <td className="border border-black py-1 px-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="사유 및 내용 (예: 사고건1)"
                        value={item.note}
                        onChange={(e) => handleUpdateRow(setSpecialNotes, idx, 'note', e.target.value)}
                        className="w-full font-medium text-black outline-none"
                      />
                      {specialNotes.length > 1 && (
                        <button
                          onClick={() => handleRemoveRow(setSpecialNotes, idx)}
                          className="no-print text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= 3. [픽업] ================= */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-sm sm:text-base text-black">[픽업]</span>
            <button
              onClick={() => handleAddRow(setPickupList)}
              className="no-print text-[11px] font-bold px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded border border-purple-300 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> 행 추가
            </button>
          </div>
          <table className="shipment-print-table w-full text-left border-collapse border border-black text-xs">
            <tbody>
              {pickupList.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black">
                  <td className="border border-black py-1 px-2 w-10 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black py-1 px-2 w-28">
                    <input
                      type="text"
                      placeholder="고객명 (예: 김현수)"
                      value={item.name}
                      onChange={(e) => handleUpdateRow(setPickupList, idx, 'name', e.target.value)}
                      className="w-full font-bold text-black outline-none"
                    />
                  </td>
                  <td className="border border-black py-1 px-2 w-32 font-bold">
                    <input
                      type="text"
                      placeholder="차수/주문 (예: 3차-29)"
                      value={item.info}
                      onChange={(e) => handleUpdateRow(setPickupList, idx, 'info', e.target.value)}
                      className="w-full text-black outline-none"
                    />
                  </td>
                  <td className="border border-black py-1 px-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="상세내용 (예: 무배1, 무배1+직원1)"
                        value={item.note}
                        onChange={(e) => handleUpdateRow(setPickupList, idx, 'note', e.target.value)}
                        className="w-full font-medium text-black outline-none"
                      />
                      {pickupList.length > 1 && (
                        <button
                          onClick={() => handleRemoveRow(setPickupList, idx)}
                          className="no-print text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                          title="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= 4. [제주도 >> 로젠택배] & [관내] ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* 제주도 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-sm sm:text-base text-black">[제주도 &gt;&gt; 로젠택배]</span>
              <button
                onClick={() => handleAddRow(setJejuList)}
                className="no-print text-[10px] font-bold px-1.5 py-0.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded border border-sky-300 flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> 추가
              </button>
            </div>
            <table className="shipment-print-table w-full text-left border-collapse border border-black text-xs">
              <tbody>
                {jejuList.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-black">
                    <td className="border border-black py-1 px-2 w-8 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black py-1 px-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          placeholder="고객명 (예: 김규리)"
                          value={item.name}
                          onChange={(e) => handleUpdateRow(setJejuList, idx, 'name', e.target.value)}
                          className="w-full font-bold text-black outline-none"
                        />
                        {jejuList.length > 1 && (
                          <button
                            onClick={() => handleRemoveRow(setJejuList, idx)}
                            className="no-print text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 관내 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-sm sm:text-base text-black">[관내]</span>
              <button
                onClick={() => handleAddRow(setLocalList)}
                className="no-print text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded border border-emerald-300 flex items-center gap-0.5"
              >
                <Plus className="w-2.5 h-2.5" /> 추가
              </button>
            </div>
            <table className="shipment-print-table w-full text-left border-collapse border border-black text-xs">
              <tbody>
                {localList.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-black">
                    <td className="border border-black py-1 px-2 w-8 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black py-1 px-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          placeholder="고객명"
                          value={item.name}
                          onChange={(e) => handleUpdateRow(setLocalList, idx, 'name', e.target.value)}
                          className="w-full font-bold text-black outline-none"
                        />
                        {localList.length > 1 && (
                          <button
                            onClick={() => handleRemoveRow(setLocalList, idx)}
                            className="no-print text-rose-500 hover:text-rose-700 p-0.5 ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= 5. [그릭요거트] & [YoF-6] Side-by-Side ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mb-4">
          
          {/* [그릭요거트] Table */}
          <div className="sm:col-span-7">
            <div className="mb-1">
              <span className="font-extrabold text-sm sm:text-base text-black">[그릭요거트]</span>
            </div>
            <table className="shipment-print-table w-full text-center border-collapse border border-black text-xs">
              <thead className="bg-gray-100 font-extrabold">
                <tr>
                  <th className="border border-black py-0.5 px-1.5 w-1/3">수량</th>
                  <th className="border border-black py-0.5 px-1.5 w-1/3">주문건수</th>
                  <th className="border border-black py-0.5 px-1.5 w-1/3">주문수량</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((qty) => {
                  const orders = greekCounts[qty] || 0;
                  const totalForQty = qty * orders;
                  return (
                    <tr key={`greek-${qty}`} className="border-b border-black">
                      <td className="border border-black py-0.5 px-1.5 font-bold">{qty}</td>
                      <td className="border border-black py-0.5 px-1.5">
                        <input
                          type="number"
                          min="0"
                          value={orders === 0 ? '' : orders}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setGreekCounts((prev) => ({ ...prev, [qty]: val }));
                          }}
                          className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                      <td className="border border-black py-0.5 px-1.5 font-bold">
                        {totalForQty}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-black text-sm">
                  <td className="border border-black py-1 px-1.5">합계</td>
                  <td className="border border-black py-1 px-1.5">{greekTotalOrders}</td>
                  <td className="border border-black py-1 px-1.5">{greekTotalQuantity}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* [YoF-6] Table */}
          <div className="sm:col-span-5">
            <div className="mb-1">
              <span className="font-extrabold text-sm sm:text-base text-black">[YoF-6]</span>
            </div>
            <table className="shipment-print-table w-full text-center border-collapse border border-black text-xs">
              <thead className="bg-gray-100 font-extrabold">
                <tr>
                  <th className="border border-black py-0.5 px-1.5 w-1/2">수량</th>
                  <th className="border border-black py-0.5 px-1.5 w-1/2">주문건</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((qty) => {
                  const orders = yofCounts[qty] || 0;
                  return (
                    <tr key={`yof-${qty}`} className="border-b border-black">
                      <td className="border border-black py-0.5 px-1.5 font-bold">{qty}개</td>
                      <td className="border border-black py-0.5 px-1.5">
                        <input
                          type="number"
                          min="0"
                          value={orders === 0 ? '' : orders}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setYofCounts((prev) => ({ ...prev, [qty]: val }));
                          }}
                          className="w-full text-center font-bold text-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-black text-sm">
                  <td className="border border-black py-1 px-1.5">합계</td>
                  <td className="border border-black py-1 px-1.5">{yofTotalOrders}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= 6. [발송건수] ================= */}
        <div className="mt-6 pt-3 border-t border-black flex items-center gap-4 text-base sm:text-lg font-black">
          <span>발송건수 :</span>
          <div className="inline-flex items-center gap-1">
            <input
              type="number"
              min="0"
              value={shipmentCount === 0 ? '' : shipmentCount}
              placeholder="0"
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => handleShipmentCountChange(parseInt(e.target.value, 10) || 0)}
              className="w-24 text-right font-black text-black border-b border-black pb-0.5 text-base sm:text-lg outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="font-bold text-base">건</span>
          </div>
        </div>

      </div>
    </div>
  );
};
