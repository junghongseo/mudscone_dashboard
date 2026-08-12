import React, { useState, useMemo } from 'react';
import { DailyRevenueRecord } from '../../data/revenueHistoryData';
import { FileSpreadsheet, Plus, Edit2, Trash2, Search, Download, Check, Calendar, DollarSign } from 'lucide-react';

interface RevenueLedgerProps {
  records: DailyRevenueRecord[];
  onSaveRecord: (record: DailyRevenueRecord) => void;
  onDeleteRecord: (date: string) => void;
}

export const RevenueLedger: React.FC<RevenueLedgerProps> = ({
  records,
  onSaveRecord,
  onDeleteRecord,
}) => {
  // Form State
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 10));
  const [msMall, setMsMall] = useState<number>(0);
  const [msNaver, setMsNaver] = useState<number>(0);
  const [msSmart, setMsSmart] = useState<number>(0);
  const [otMall, setOtMall] = useState<number>(0);
  const [otCoupang, setOtCoupang] = useState<number>(0);
  const [wyMall, setWyMall] = useState<number>(0);
  const [mshAmount, setMshAmount] = useState<number>(0);

  // Default Filter: Current Year '2026', Current Month '8'
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('8');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Fill form when selecting record to edit
  const handleEditRecord = (rec: DailyRevenueRecord) => {
    setDateInput(rec.date);
    setMsMall(rec.channels.mudscone?.자사몰 || 0);
    setMsNaver(rec.channels.mudscone?.네이버페이 || 0);
    setMsSmart(rec.channels.mudscone?.스마트스토어 || 0);
    setOtMall(rec.channels.oatter?.자사몰 || 0);
    setOtCoupang(rec.channels.oatter?.쿠팡 || 0);
    setWyMall(rec.channels.wysh?.자사몰 || rec.wysh || 0);
    setMshAmount(rec.mudsanghoe || 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateInput) return;

    const dtYear = parseInt(dateInput.slice(0, 4), 10);
    const msTot = msMall + msNaver + msSmart;
    const otTot = otMall + otCoupang;
    const wyTot = wyMall;
    const mshTot = mshAmount;
    const tot = msTot + otTot + wyTot + mshTot;

    const newRecord: DailyRevenueRecord = {
      date: dateInput,
      year: dtYear,
      mudscone: msTot,
      oatter: otTot,
      wysh: wyTot,
      mudsanghoe: mshTot,
      total: tot,
      channels: {
        mudscone: {
          자사몰: msMall,
          네이버페이: msNaver,
          스마트스토어: msSmart,
        },
        oatter: {
          자사몰: otMall,
          쿠팡: otCoupang,
        },
        wysh: {
          자사몰: wyMall,
        },
      },
    };

    onSaveRecord(newRecord);
    alert(`${dateInput} 매출 기록이 저장되었습니다.`);
  };

  // Filtered & ASCENDING Sorted Records
  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      const recordYearStr = String(r.year);
      if (!r.date.startsWith(recordYearStr)) return false;

      if (selectedYear !== 'all' && r.year !== parseInt(selectedYear, 10)) return false;
      if (selectedMonth !== 'all') {
        const m = parseInt(r.date.slice(5, 7), 10);
        if (m !== parseInt(selectedMonth, 10)) return false;
      }
      if (searchQuery.trim() && !r.date.includes(searchQuery.trim())) return false;
      return true;
    });

    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [records, selectedYear, selectedMonth, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, currentPage]);

  // Total summary of filtered records
  const filteredTotalSum = useMemo(() => {
    return filteredRecords.reduce((acc, r) => acc + r.total, 0);
  }, [filteredRecords]);

  const formatKRW = (num: number) => {
    if (Math.abs(num) >= 100000000) {
      return `${(num / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
    }
    if (Math.abs(num) >= 10000) {
      return `${(num / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`;
    }
    return `${num.toLocaleString('ko-KR')}원`;
  };

  const currentFormTotal = msMall + msNaver + msSmart + otMall + otCoupang + wyMall + mshAmount;

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['날짜', '연도', '머드스콘 자사몰', '머드스콘 네이버', '머드스콘 스마트스토어', '머드스콘 합계', '오터 자사몰', '오터 쿠팡', '오터 합계', '위시', '머드상회', '총합계'];
    const rows = filteredRecords.map((r) => [
      r.date,
      r.year,
      r.channels.mudscone?.자사몰 || 0,
      r.channels.mudscone?.네이버페이 || 0,
      r.channels.mudscone?.스마트스토어 || 0,
      r.mudscone,
      r.channels.oatter?.자사몰 || 0,
      r.channels.oatter?.쿠팡 || 0,
      r.oatter,
      r.wysh,
      r.mudsanghoe,
      r.total,
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MudScone_Revenue_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-2xl font-black shadow-lg">
            📊
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              매출 데이터 장부 (Revenue Ledger System)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              현재 {selectedYear === 'all' ? '' : `${selectedYear}년 `}{selectedMonth === 'all' ? '' : `${selectedMonth}월 `}매출 내역을 날짜 오름차순으로 조회 및 관리합니다.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          <span>매출 장부 엑셀(CSV) 다운로드</span>
        </button>
      </div>

      {/* 1. Entry & Editing Form (Top Section) */}
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-5 shadow-xl">
        {/* Form Title Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            일별 매출 신규 기록 및 수정
          </h3>
          <span className="text-[11px] text-amber-400 font-medium">
            저장 시 대시보드 YoY 차트와 실적 게이지에 실시간 1:1 반영됩니다.
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          {/* Top Control Bar: Date Selector & Live Total Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 whitespace-nowrap">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>매출 기록 일자:</span>
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500 transition"
                required
              />
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 w-full sm:w-auto justify-between sm:justify-end">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold">해당 일자 입력 총합계:</span>
              <span className="text-sm font-mono font-black">{currentFormTotal.toLocaleString()}원</span>
            </div>
          </div>

          {/* Structured Brand Cards Grid (Equal Card Height + Top Aligned Content) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Brand Card 1: Mud Scone */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/30 space-y-3 flex flex-col justify-start h-full">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>🧁</span> 머드스콘
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {(msMall + msNaver + msSmart).toLocaleString()}원
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">자사몰 (원)</label>
                  <input
                    type="number"
                    value={msMall}
                    onChange={(e) => setMsMall(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">네이버페이 (원)</label>
                  <input
                    type="number"
                    value={msNaver}
                    onChange={(e) => setMsNaver(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">스마트스토어 (원)</label>
                  <input
                    type="number"
                    value={msSmart}
                    onChange={(e) => setMsSmart(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Brand Card 2: Oatter */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-yellow-500/30 space-y-3 flex flex-col justify-start h-full">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <span>🌾</span> 오터 (Oatter)
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {(otMall + otCoupang).toLocaleString()}원
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">자사몰 (원)</label>
                  <input
                    type="number"
                    value={otMall}
                    onChange={(e) => setOtMall(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">쿠팡 (원)</label>
                  <input
                    type="number"
                    value={otCoupang}
                    onChange={(e) => setOtCoupang(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Brand Card 3: Wysh */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30 space-y-3 flex flex-col justify-start h-full">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>✨</span> 위시 (Wysh)
                </span>
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {wyMall.toLocaleString()}원
                </span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">자사몰 D2C (원)</label>
                  <input
                    type="number"
                    value={wyMall}
                    onChange={(e) => setWyMall(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Action Footer Bar */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
            >
              <Check className="w-4 h-4" />
              <span>{dateInput} 매출 기록 저장 및 업데이트</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Historical Data Search & Filter Table (Bottom Section - ASCENDING Sort) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">연도:</label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="all">전체 연도</option>
                <option value="2026">2026년</option>
                <option value="2025">2025년</option>
                <option value="2024">2024년</option>
                <option value="2023">2023년</option>
              </select>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">월:</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
              >
                <option value="all">전체 월</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {i + 1}월
                  </option>
                ))}
              </select>
            </div>

            {/* Date Search Input */}
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="날짜 검색 (예: 08-01)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">선택 조건 총 매출액</span>
            <span className="text-sm font-mono font-black text-emerald-400">{formatKRW(filteredTotalSum)}</span>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-semibold">
                <th className="py-3 px-3">날짜</th>
                <th className="py-3 px-3 text-right">머드스콘 (자사몰)</th>
                <th className="py-3 px-3 text-right">머드스콘 (네이버)</th>
                <th className="py-3 px-3 text-right">머드스콘 (스마트스토어)</th>
                <th className="py-3 px-3 text-right font-bold text-amber-400">머드스콘 합계</th>
                <th className="py-3 px-3 text-right">오터 (자사몰)</th>
                <th className="py-3 px-3 text-right">오터 (쿠팡)</th>
                <th className="py-3 px-3 text-right font-bold text-yellow-400">오터 합계</th>
                <th className="py-3 px-3 text-right font-bold text-emerald-400">위시</th>
                <th className="py-3 px-3 text-right font-bold text-sky-400">머드상회</th>
                <th className="py-3 px-3 text-right font-black text-white">일일 총 매출</th>
                <th className="py-3 px-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-500 font-sans">
                    조회된 매출 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.date} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{r.date}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{(r.channels.mudscone?.자사몰 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{(r.channels.mudscone?.네이버페이 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{(r.channels.mudscone?.스마트스토어 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">{r.mudscone.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{(r.channels.oatter?.자사몰 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{(r.channels.oatter?.쿠팡 || 0).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-yellow-400">{r.oatter.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{r.wysh.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-sky-400">{r.mudsanghoe.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-black text-white">{r.total.toLocaleString()}원</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditRecord(r)}
                          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition"
                          title="수정하기"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`${r.date} 매출 기록을 삭제하시겠습니까?`)) {
                              onDeleteRecord(r.date);
                            }
                          }}
                          className="p-1 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded transition"
                          title="삭제하기"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <span className="text-xs text-slate-400 font-medium">
              총 {filteredRecords.length}개 기록 중 {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, filteredRecords.length)}개 표시
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                이전
              </button>
              <span className="px-3 text-xs text-amber-400 font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
