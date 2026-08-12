import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Award, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

const API_BASE = import.meta.env.VITE_VAT_API_BASE || 'http://127.0.0.1:8005/api';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export const VatAnalyticsView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/analytics`);
      setData(res.data);
      if (res.data && res.data.trends && res.data.trends.length > 0) {
        setSelectedReportId(res.data.trends[res.data.trends.length - 1].report_id);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-400" />
        <span>분기별 부가세 매출 데이터 분석 중...</span>
      </div>
    );
  }

  if (!data || !data.trends || data.trends.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
        분석할 부가세 보고서 데이터가 존재하지 않습니다. 매출자료 정리 메뉴에서 먼저 보고서를 생성해 주세요.
      </div>
    );
  }

  const trendsData = data.trends || [];
  const currentBreakdown = selectedReportId && data.breakdowns ? data.breakdowns[selectedReportId] : null;

  return (
    <div className="space-y-6">
      {/* Quarterly Trend Overview Chart */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">분기별 총 매출 (공급가액) 추이</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">전체 {trendsData.length}개 분기 데이터 분석</span>
        </div>

        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendsData}>
              <defs>
                <linearGradient id="vatAnalyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="quarter_label" stroke="#94a3b8" fontSize={12} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) => `${(val / 100000000).toFixed(1)}억`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  color: '#f8fafc',
                }}
                formatter={(val: number) => [`${val.toLocaleString()}원`, '총 공급가액']}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#f59e0b"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#vatAnalyticsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Quarter Detail Breakdown */}
      {currentBreakdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brand Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-slate-100">브랜드별 매출 비중</h4>
              </div>
              {currentBreakdown.topBrand && (
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                  1위: {currentBreakdown.topBrand.name} ({currentBreakdown.topBrand.percentage}%)
                </span>
              )}
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentBreakdown.brandBreakdown || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v/10000).toLocaleString()}만`} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={12} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: number) => [`${val.toLocaleString()}원`, '매출']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {(currentBreakdown.brandBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PG/Store Breakdown */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-100">결제 채널 (PG/가맹점) 비중</h4>
              </div>
              {currentBreakdown.topPg && (
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  주 결제: {currentBreakdown.topPg.name} ({currentBreakdown.topPg.percentage}%)
                </span>
              )}
            </div>

            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(currentBreakdown.pgBreakdown || []).slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v/10000).toLocaleString()}만`} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem' }}
                    formatter={(val: number) => [`${val.toLocaleString()}원`, '결제액']}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
