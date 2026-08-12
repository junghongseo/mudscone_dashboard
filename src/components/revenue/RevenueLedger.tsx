import React, { useState, useMemo } from 'react';
import { DailyRevenueRecord } from '../../data/revenueHistoryData';
import { FileSpreadsheet, Plus, Edit2, Trash2, Search, Download, Check } from 'lucide-react';

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

  // Filtered & ASCENDING Sorted Records (Default: Early Date First, e.g. 2026-08-01 -> 2026-08-05)
  const filteredRecords = useMemo(() => {
    const list = records.filter((r) => {
      // Strict 1/1 ~ 12/31 year boundaries
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

    // ASCENDING sort by date
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
      <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            일별 매출 신규 기록 & 수정을 위한 입력 폼
          </h3>
          <span className="text-[11px] text-amber-400 font-medium">
            저장 시 대시보드 YoY 차트와 실적 게이지에 즉시 실시간 1:1 반영됩니다.
          </span>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Row 1: Date & Brand Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                매출 기록 일자 <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Mud Scone Section */}
            <div className="md:col-span-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-amber-400">🧁 머드스콘 (Mud Scone) 채널별 매출</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">자사몰 (원)</label>
                  <input
                    type="number"
                    value={msMall}
                    onChange={(e) => setMsMall(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">네이버페이 (원)</label>
                  <input
                    type="number"
                    value={msNaver}
                    onChange={(e) => setMsNaver(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">스마트스토어 (원)</label>
                  <input
                    type="number"
                    value={msSmart}
                    onChange={(e) => setMsSmart(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Oatter, Wysh, Mudsanghoe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Oatter */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-yellow-400">🌾 오터 (Oatter) 채널별 매출</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">자사몰 (원)</label>
                  <input
                    type="number"
                    value={otMall}
                    onChange={(e) => setOtMall(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">쿠팡 (원)</label>
                  <input
                    type="number"
                    value={otCoupang}
                    onChange={(e) => setOtCoupang(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Wysh */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400">✨ 위시 (Wysh) 매출</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">자사몰 D2C (원)</label>
                <input
                  type="number"
                  value={wyMall}
                  onChange={(e) => setWyMall(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Mudsanghoe */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-sky-400">🏬 머드상회 매출</span>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">머드상회 매출액 (원)</label>
                <input
                  type="number"
                  value={mshAmount}
                  onChange={(e) => setMshAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-amber-400">
              해당 일자 입력 총 합계: {formatKRW(msMall + msNaver + msSmart + otMall + otCoupang + wyMall + mshAmount)}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
            >
              <Check className="w-4 h-4" />
              <span>{dateInput} 매출 기록 저장 / 업데이트</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Historical Data Search & Filter Table (Bottom Section - ASCENDING Sort, Default: 2026년 8월) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              매출 기록 조회 및 수정 테이블 (오름차순)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              총 {filteredRecords.length.toLocaleString()}개 레코드 | 선택 조건 합계: {formatKRW(filteredTotalSum)}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="날짜 검색 (예: 2026-08)"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44"
              />
            </div>

            {/* Year Filter (Default: 2026년) */}
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">전체 연도</option>
              <option value="2026">2026년</option>
              <option value="2025">2025년</option>
              <option value="2024">2024년</option>
              <option value="2023">2023년</option>
              <option value="2022">2022년</option>
              <option value="2021">2021년</option>
              <option value="2020">2020년</option>
            </select>

            {/* Month Filter (Default: 8월) */}
            <select
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">전체 월</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>
                  {m}월
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-300 border-b border-slate-800 font-bold">
              <tr>
                <th className="p-3 border-r border-slate-800 text-center font-bold text-amber-400">날짜 ↑</th>
                <th className="p-3 border-r border-slate-800 text-right">머드스콘 합계</th>
                <th className="p-3 border-r border-slate-800 text-right">오터 합계</th>
                <th className="p-3 border-r border-slate-800 text-right">위시</th>
                <th className="p-3 border-r border-slate-800 text-right">머드상회</th>
                <th className="p-3 border-r border-slate-800 text-right font-black text-amber-400">일 총합계</th>
                <th className="p-3 text-center min-w-[100px]">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                    조건에 해당하는 매출 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => (
                  <tr key={rec.date} className="hover:bg-slate-800/30 transition">
                    <td className="p-3 border-r border-slate-800 font-mono font-bold text-slate-200 text-center">
                      {rec.date}
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono text-right text-slate-300">
                      {rec.mudscone.toLocaleString()}원
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono text-right text-slate-300">
                      {rec.oatter.toLocaleString()}원
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono text-right text-slate-300">
                      {rec.wysh.toLocaleString()}원
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono text-right text-slate-300">
                      {rec.mudsanghoe.toLocaleString()}원
                    </td>
                    <td className="p-3 border-r border-slate-800 font-mono text-right font-black text-amber-400 bg-amber-500/5">
                      {rec.total.toLocaleString()}원
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditRecord(rec)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition border border-slate-700 flex items-center gap-1"
                          title="수정하기"
                        >
                          <Edit2 className="w-3 h-3 text-amber-400" />
                          <span>수정</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`${rec.date} 매출 기록을 삭제하시겠습니까?`)) {
                              onDeleteRecord(rec.date);
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
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
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            페이지 {currentPage} / {totalPages} (총 {filteredRecords.length}개 항목)
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              이전
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-300 text-xs font-semibold border border-slate-700"
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
