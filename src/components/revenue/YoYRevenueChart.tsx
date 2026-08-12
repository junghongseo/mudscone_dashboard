import React, { useState, useMemo } from 'react';
import { REVENUE_HISTORY_DATA } from '../../data/revenueHistoryData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, PieChart as PieIcon, Calendar, Activity } from 'lucide-react';

interface YoYRevenueChartProps {
  brandId?: 'all' | 'mudscone' | 'oatter' | 'wysh';
  brandName?: string;
  showChannels?: boolean;
}

type ModeType = 'all' | 'year' | 'quarter' | 'month';

const CHANNEL_COLORS = ['#f97316', '#38bdf8', '#22c55e', '#a855f7', '#eab308', '#ec4899'];

export const YoYRevenueChart: React.FC<YoYRevenueChartProps> = ({
  brandId = 'all',
  brandName = '전체 브랜드 (머드상회 포함)',
  showChannels = false,
}) => {
  // Available Years in dataset
  const availableYears = [2026, 2025, 2024, 2023, 2022, 2021];

  // Dynamically compute the LAST REAL REVENUE DATE in 2026 (Guaranteed correct max date)
  const maxRealDateStr = useMemo(() => {
    const validDates = REVENUE_HISTORY_DATA
      .filter((r) => r.year === 2026 && r.total > 0)
      .map((r) => r.date)
      .sort();
    
    if (validDates.length === 0) return '2026-08-05';
    return validDates[validDates.length - 1]; // Latest date e.g. '2026-08-05'
  }, []);

  // Default States: Year 2026, Mode 'year' (연간 디폴트)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [mode, setMode] = useState<ModeType>('year'); // 'all' | 'year' | 'quarter' | 'month'
  const [selectedQuarter, setSelectedQuarter] = useState<number>(3); // 1, 2, 3, 4
  const [selectedMonth, setSelectedMonth] = useState<number>(8); // 1 ~ 12

  // YoY & Multi-year Trend Analysis Computation
  const chartAnalysisData = useMemo(() => {
    // ----------------------------------------------------
    // MODE 1: Multi-year Full Trend ('all' mode: 2020 ~ 2026)
    // ----------------------------------------------------
    if (mode === 'all') {
      const validRecords = REVENUE_HISTORY_DATA
        .filter((r) => r.date <= maxRealDateStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      
      const monthGroupMap = new Map<string, { label: string; current: number }>();
      let allPeriodTotalSum = 0;
      const channelSums: Record<string, number> = {};

      validRecords.forEach((rec) => {
        let curVal = 0;
        if (brandId === 'all') curVal = rec.total;
        else if (brandId === 'mudscone') curVal = rec.mudscone;
        else if (brandId === 'oatter') curVal = rec.oatter;
        else if (brandId === 'wysh') curVal = rec.wysh;

        allPeriodTotalSum += curVal;

        // Channel breakdown sums
        if (brandId !== 'all' && rec.channels[brandId as 'mudscone' | 'oatter' | 'wysh']) {
          const ch = rec.channels[brandId as 'mudscone' | 'oatter' | 'wysh'];
          Object.entries(ch).forEach(([k, v]) => {
            channelSums[k] = (channelSums[k] || 0) + v;
          });
        }

        // Group Key: 'YY-MM' e.g. '20-01', '21-05'
        const monthKey = rec.date.slice(2, 7);

        if (!monthGroupMap.has(monthKey)) {
          monthGroupMap.set(monthKey, { label: monthKey, current: 0 });
        }

        const grp = monthGroupMap.get(monthKey)!;
        grp.current += curVal;
      });

      const chartPoints = Array.from(monthGroupMap.values());

      const channelPieData = Object.entries(channelSums)
        .map(([name, value]) => ({ name, value }))
        .filter((item) => item.value > 0);

      return {
        isAllMode: true,
        selectedYear: 2026,
        prevYear: 2025,
        currentTotalSum: allPeriodTotalSum,
        prevTotalSum: 0,
        diffSum: 0,
        diffPercent: 0,
        chartPoints,
        channelPieData,
      };
    }

    // ----------------------------------------------------
    // MODE 2: YoY Comparison Mode ('year', 'quarter', 'month')
    // ----------------------------------------------------
    const prevYear = selectedYear - 1;

    // Filter Current Year Records & Prev Year Records
    const curYearRecords = REVENUE_HISTORY_DATA
      .filter((r) => r.year === selectedYear)
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const prevYearRecords = REVENUE_HISTORY_DATA.filter((r) => r.year === prevYear);

    // Map for exact previous year date lookup
    const prevDateValueMap = new Map<string, number>();
    prevYearRecords.forEach((r) => {
      let val = 0;
      if (brandId === 'all') val = r.total;
      else if (brandId === 'mudscone') val = r.mudscone;
      else if (brandId === 'oatter') val = r.oatter;
      else if (brandId === 'wysh') val = r.wysh;

      prevDateValueMap.set(r.date, val);
    });

    let filteredCurrentRecords = curYearRecords;

    if (mode === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3 + 1;
      const endMonth = selectedQuarter * 3;
      filteredCurrentRecords = curYearRecords.filter((r) => {
        const m = parseInt(r.date.slice(5, 7), 10);
        return m >= startMonth && m <= endMonth;
      });
    } else if (mode === 'month') {
      filteredCurrentRecords = curYearRecords.filter((r) => {
        const m = parseInt(r.date.slice(5, 7), 10);
        return m === selectedMonth;
      });
    }

    let currentTotalSum = 0;
    let prevTotalSum = 0;

    const channelSums: Record<string, number> = {};
    const groupMap = new Map<string, { label: string; current: number | null; previous: number }>();

    filteredCurrentRecords.forEach((rec) => {
      // Check if date is in the future relative to 2026 max real date
      const isFuture = selectedYear === 2026 && rec.date > maxRealDateStr;

      let curVal = 0;
      if (brandId === 'all') curVal = rec.total;
      else if (brandId === 'mudscone') curVal = rec.mudscone;
      else if (brandId === 'oatter') curVal = rec.oatter;
      else if (brandId === 'wysh') curVal = rec.wysh;

      if (!isFuture) {
        currentTotalSum += curVal;

        // Channel breakdown sums
        if (brandId !== 'all' && rec.channels[brandId as 'mudscone' | 'oatter' | 'wysh']) {
          const ch = rec.channels[brandId as 'mudscone' | 'oatter' | 'wysh'];
          Object.entries(ch).forEach(([k, v]) => {
            channelSums[k] = (channelSums[k] || 0) + v;
          });
        }
      }

      // Calculate YoY date string
      const curDt = new Date(rec.date);
      const prevDt = new Date(curDt);
      prevDt.setFullYear(selectedYear - 1);
      const prevDateStr = prevDt.toISOString().slice(0, 10);

      const prevVal = prevDateValueMap.get(prevDateStr) || 0;
      prevTotalSum += prevVal;

      // Group Key Definition
      let groupKey = '';
      if (mode === 'year') {
        const monthNum = parseInt(rec.date.slice(5, 7), 10);
        groupKey = `${monthNum}월`;
      } else {
        groupKey = rec.date.slice(5, 10);
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, { label: groupKey, current: isFuture ? null : 0, previous: 0 });
      }

      const grp = groupMap.get(groupKey)!;
      if (!isFuture) {
        grp.current = ((grp.current as number) || 0) + curVal;
      }
      grp.previous += prevVal;
    });

    // In 'year' mode, if a month is in the future (e.g. Sep~Dec in 2026), set its current to null
    if (mode === 'year' && selectedYear === 2026) {
      const maxRealMonth = parseInt(maxRealDateStr.slice(5, 7), 10);
      groupMap.forEach((val, key) => {
        const monthNum = parseInt(key.replace('월', ''), 10);
        if (monthNum > maxRealMonth) {
          val.current = null;
        }
      });
    }

    const chartPoints = Array.from(groupMap.values());

    const diffSum = currentTotalSum - prevTotalSum;
    const diffPercent = prevTotalSum > 0 ? (diffSum / prevTotalSum) * 100 : 0;

    const channelPieData = Object.entries(channelSums)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);

    return {
      isAllMode: false,
      selectedYear,
      prevYear,
      currentTotalSum,
      prevTotalSum,
      diffSum,
      diffPercent,
      chartPoints,
      channelPieData,
    };
  }, [selectedYear, mode, selectedQuarter, selectedMonth, brandId, maxRealDateStr]);

  const formatKRW = (num: number) => {
    if (Math.abs(num) >= 100000000) {
      return `${(num / 100000000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억원`;
    }
    if (Math.abs(num) >= 10000) {
      return `${(num / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}만원`;
    }
    return `${num.toLocaleString('ko-KR')}원`;
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-xl border border-slate-700 shadow-2xl text-xs space-y-1.5 min-w-[200px]">
          <div className="font-bold text-amber-400 border-b border-slate-800 pb-1">
            구분: {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-white">
                {entry.value === null || entry.value === undefined ? '실적 없음' : formatKRW(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom Dot component to suppress rendering dots on null points
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.current === null || payload.current === undefined) return null;
    return (
      <circle cx={cx} cy={cy} r={3} fill="#f97316" stroke="#fff" strokeWidth={1} />
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5 shadow-2xl">
      {/* Top Filter Bar Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              {brandName} {chartAnalysisData.isAllMode ? '2020~2026년 연속 매출 추이' : '전년 동기(YoY) 매출 비교'}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {chartAnalysisData.isAllMode
              ? '2020년부터 2026년 현재까지의 전 기간 월별 누적 매출 흐름을 연속 곡선으로 조회합니다.'
              : `${selectedYear}년 당해 실적과 전년도(${selectedYear - 1}년) 동일 기간 매출을 비교합니다.`}
          </p>
        </div>

        {/* Filter Controls: Mode Pills + Year Select */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Tabs (전체 추이 / 연간 / 분기별 / 월별) */}
          <div className="flex items-center p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                mode === 'all' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>전체 추이</span>
            </button>
            <button
              onClick={() => setMode('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'year' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              연간
            </button>
            <button
              onClick={() => setMode('quarter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'quarter' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              분기별
            </button>
            <button
              onClick={() => setMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                mode === 'month' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              월별
            </button>
          </div>

          {/* Year Select (Hidden in 'all' mode) */}
          {mode !== 'all' && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}년
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sub-select for Quarter */}
          {mode === 'quarter' && (
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              <option value={1} className="bg-slate-900">1분기 (1~3월)</option>
              <option value={2} className="bg-slate-900">2분기 (4~6월)</option>
              <option value={3} className="bg-slate-900">3분기 (7~9월)</option>
              <option value={4} className="bg-slate-900">4분기 (10~12월)</option>
            </select>
          )}

          {/* Sub-select for Month */}
          {mode === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}월
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium">
            {chartAnalysisData.isAllMode ? '2020~2026 전 기간 누적 매출액' : `${chartAnalysisData.selectedYear}년 당해 누적 매출`}
          </span>
          <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
            {formatKRW(chartAnalysisData.currentTotalSum)}
          </div>
        </div>

        {chartAnalysisData.isAllMode ? (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">집계 연월 수</span>
            <div className="text-xl font-black text-slate-300 font-mono mt-0.5">
              {chartAnalysisData.chartPoints.length} 개월
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">
              {chartAnalysisData.prevYear}년 전년 동기 매출
            </span>
            <div className="text-xl font-black text-slate-300 font-mono mt-0.5">
              {formatKRW(chartAnalysisData.prevTotalSum)}
            </div>
          </div>
        )}

        {!chartAnalysisData.isAllMode && (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">전년 동기 대비 증감</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xl font-black font-mono ${chartAnalysisData.diffSum >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {chartAnalysisData.diffSum >= 0 ? '+' : ''}{formatKRW(chartAnalysisData.diffSum)}
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                chartAnalysisData.diffSum >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {chartAnalysisData.diffSum >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {chartAnalysisData.diffPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Chart Grid: YoY Line Chart (70%) + Optional Channel Pie Breakdown (30%) */}
      <div className={`grid grid-cols-1 ${showChannels ? 'lg:grid-cols-10' : ''} gap-6 items-center`}>
        
        {/* YoY Line Chart Area */}
        <div className={`${showChannels ? 'lg:col-span-7' : 'w-full'} bg-slate-950/80 p-4 rounded-xl border border-slate-800`}>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartAnalysisData.chartPoints} margin={{ top: 15, right: 25, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(val) => formatKRW(val)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />

                {/* Main Trend Line */}
                <Line
                  type="monotone"
                  dataKey="current"
                  name={chartAnalysisData.isAllMode ? "2020~2026 연속 매출액" : `${chartAnalysisData.selectedYear}년 당해 매출액`}
                  stroke="#f97316"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={chartAnalysisData.isAllMode ? false : <CustomDot />}
                />

                {/* Previous Year YoY Revenue Line (Hidden in 'all' mode) */}
                {!chartAnalysisData.isAllMode && (
                  <Line
                    type="monotone"
                    dataKey="previous"
                    name={`${chartAnalysisData.prevYear}년 전년 동기 매출액`}
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 30% Area: Sales Channel Breakdown */}
        {showChannels && (
          <div className="lg:col-span-3 glass-panel p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between h-[345px]">
            <div className="border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-amber-400" />
                매출 채널별 비중
              </h4>
              <p className="text-[11px] text-slate-400">
                {mode === 'all'
                  ? '2020~2026 전 기간 채널 점유율'
                  : `${selectedYear}년 ${mode === 'year' ? '연간' : mode === 'quarter' ? `${selectedQuarter}분기` : `${selectedMonth}월`} 채널 점유율`}
              </p>
            </div>

            {chartAnalysisData.channelPieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-500">
                채널 매출 데이터가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Donut Chart */}
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartAnalysisData.channelPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartAnalysisData.channelPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatKRW(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend List */}
                <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                  {chartAnalysisData.channelPieData.map((item, idx) => {
                    const chPercent = chartAnalysisData.currentTotalSum > 0
                      ? ((item.value / chartAnalysisData.currentTotalSum) * 100).toFixed(1)
                      : '0';
                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-900/60 border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: CHANNEL_COLORS[idx % CHANNEL_COLORS.length] }}
                          />
                          <span className="font-semibold text-slate-200">{item.name}</span>
                        </div>
                        <div className="font-mono text-[11px]">
                          <span className="text-amber-300 font-bold mr-1.5">{chPercent}%</span>
                          <span className="text-slate-400">{formatKRW(item.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
