import React, { useState, useEffect } from 'react';
import { 
  FileText, BarChart2, Settings, Plus, Key, CheckCircle, Database 
} from 'lucide-react';
import axios from 'axios';
import { VatReport, VatReportRow } from '../../types/vat';
import { VatReportTable } from './VatReportTable';
import { VatAnalyticsView } from './VatAnalyticsView';
import { VatSettingsModal } from './VatSettingsModal';
import { CreateReportModal } from './CreateReportModal';

const API_BASE = import.meta.env.VITE_VAT_API_BASE || 'http://127.0.0.1:8005/api';

export const VatReportApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'report' | 'analytics'>('report');
  
  const [reports, setReports] = useState<VatReport[]>([]);
  const [currentReport, setCurrentReport] = useState<VatReport | null>(null);
  const [rows, setRows] = useState<VatReportRow[]>([]);
  const [settings, setSettings] = useState<{ gemini_api_key?: string }>({});

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    loadReports(true);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSettings(res.data || {});
    } catch (err) {
      console.error('Failed to load VAT settings:', err);
    }
  };

  const loadReports = async (selectLatest = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/reports`);
      setReports(res.data || []);
      if (res.data && res.data.length > 0) {
        const targetReport = selectLatest ? res.data[0] : (currentReport || res.data[0]);
        await selectReport(targetReport.id);
      }
    } catch (err) {
      console.error('Failed to load VAT reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectReport = async (reportId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/reports/${reportId}`);
      setCurrentReport(res.data.report);
      setRows(res.data.rows);
    } catch (err) {
      console.error('Failed to fetch report details:', err);
    }
  };

  const handleRefreshRows = () => {
    if (currentReport) {
      selectReport(currentReport.id);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 lg:px-8 py-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-100">부가세 신고 통합 시스템</h2>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Supabase & AI 자동화
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              분기별 매출자료 정리 · 홈택스 제출 엑셀 자동 생성 · 매출 분석 시각화
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-800"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>Gemini API 설정</span>
            {settings.gemini_api_key && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>새 분기 보고서</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80 max-w-xs">
        <button
          onClick={() => setActiveTab('report')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'report'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>매출자료 정리</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition ${
            activeTab === 'analytics'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>매출 분석</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'report' && (
        <VatReportTable
          reports={reports}
          currentReport={currentReport}
          rows={rows}
          onSelectReport={selectReport}
          onOpenCreateModal={() => setShowCreateModal(true)}
          onOpenSettingsModal={() => setShowSettingsModal(true)}
          onRefreshRows={handleRefreshRows}
          hasApiKey={Boolean(settings.gemini_api_key)}
        />
      )}

      {activeTab === 'analytics' && <VatAnalyticsView />}

      {/* Modals */}
      <VatSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentKey={settings.gemini_api_key}
        onSaved={loadSettings}
      />

      <CreateReportModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadReports(true)}
      />
    </div>
  );
};
