import React, { useState } from 'react';
import { 
  Upload, Download, Edit2, Check, X, CheckCircle, 
  Loader2, Copy, Trash2, Plus, Store, Tag, DollarSign
} from 'lucide-react';
import axios from 'axios';
import { VatReport, VatReportRow } from '../../types/vat';

const API_BASE = import.meta.env.VITE_VAT_API_BASE || 'http://127.0.0.1:8005/api';

interface VatReportTableProps {
  reports: VatReport[];
  currentReport: VatReport | null;
  rows: VatReportRow[];
  onSelectReport: (reportId: string) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  onRefreshRows: () => void;
  hasApiKey: boolean;
}

export const VatReportTable: React.FC<VatReportTableProps> = ({
  reports,
  currentReport,
  rows,
  onSelectReport,
  onOpenCreateModal,
  onOpenSettingsModal,
  onRefreshRows,
  hasApiKey,
}) => {
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingMemoRowId, setEditingMemoRowId] = useState<string | null>(null);
  const [editingMemoValue, setEditingMemoValue] = useState<string>('');

  const [uploadingGroup, setUploadingGroup] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleInlineSave = async (rowId: string, field: 'amount' | 'memo' = 'amount') => {
    try {
      if (field === 'amount') {
        const numericVal = parseInt(editingValue.replace(/,/g, ''));
        if (isNaN(numericVal)) {
          alert('올바른 숫자를 입력해주세요.');
          return;
        }
        await axios.put(`${API_BASE}/rows/${rowId}`, { amount: numericVal });
      } else {
        await axios.put(`${API_BASE}/rows/${rowId}`, { memo: editingMemoValue });
      }
      onRefreshRows();
    } catch (err: any) {
      console.error('Failed to update row:', err);
      alert('저장 실패: ' + (err.response?.data?.detail || err.message));
    } finally {
      setEditingRowId(null);
      setEditingMemoRowId(null);
    }
  };

  // Group upload: uploads single consolidated file to all rows in a PG/Store group
  const handleGroupUpload = async (brand: string, pgStore: string, file: File) => {
    if (!hasApiKey) {
      alert('Gemini API 키를 먼저 설정해주세요. (우측 상단 톱니바퀴 버튼 클릭)');
      onOpenSettingsModal();
      return;
    }

    const targetRows = rows.filter(
      (r) => r.brand === brand && r.pg_store === pgStore && r.status !== 'formula' && r.classification !== '무통장입금'
    );

    if (targetRows.length === 0) return;

    const groupKey = `${brand}_${pgStore}`;
    setUploadingGroup(groupKey);

    try {
      for (const r of targetRows) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', 'standard');
        await axios.post(`${API_BASE}/rows/${r.id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onRefreshRows();
    } catch (err: any) {
      alert(`파일 분석 실패: ${err.response?.data?.detail || err.message}`);
      onRefreshRows();
    } finally {
      setUploadingGroup(null);
    }
  };

  // Bank transfer file upload (Income/Expense excel)
  const handleBankFileUpload = async (rowId: string, file: File, fileType: 'bank_income' | 'bank_expense') => {
    if (!hasApiKey) {
      alert('Gemini API 키를 먼저 설정해주세요.');
      onOpenSettingsModal();
      return;
    }

    setUploadingGroup(`bank_${rowId}_${fileType}`);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    try {
      await axios.post(`${API_BASE}/rows/${rowId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onRefreshRows();
    } catch (err: any) {
      alert(`무통장입금 엑셀 분석 실패: ${err.response?.data?.detail || err.message}`);
      onRefreshRows();
    } finally {
      setUploadingGroup(null);
    }
  };

  // Delete Group Uploaded Files
  const handleGroupDelete = async (brand: string, pgStore: string) => {
    if (!confirm(`${pgStore} 채널의 모든 증빙 파일을 삭제하고 데이터를 초기화하시겠습니까?`)) {
      return;
    }

    const targetRows = rows.filter(
      (r) => r.brand === brand && r.pg_store === pgStore && r.status !== 'formula'
    );

    try {
      for (const r of targetRows) {
        if (r.classification === '무통장입금') {
          await axios.delete(`${API_BASE}/rows/${r.id}/file?file_type=bank_income`);
          await axios.delete(`${API_BASE}/rows/${r.id}/file?file_type=bank_expense`);
        } else {
          await axios.delete(`${API_BASE}/rows/${r.id}/file?file_type=standard`);
        }
      }
      onRefreshRows();
    } catch (err: any) {
      alert('파일 삭제 실패: ' + err.message);
    }
  };

  const handleExport = async () => {
    if (!currentReport) return;
    setExporting(true);
    try {
      const response = await axios.get(`${API_BASE}/reports/${currentReport.id}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `머드스콘 부가세신고 매출자료 정리(${currentReport.year}년 ${currentReport.quarter}분기).xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('엑셀 다운로드 실패');
    } finally {
      setExporting(false);
    }
  };

  // Separate Hometax row and standard Brand groups
  const hometaxRow = rows.find((r) => r.brand === '홈택스 현금영수증');

  interface GroupedData {
    [brand: string]: {
      [pgStore: string]: VatReportRow[];
    };
  }

  const groupedData: GroupedData = {};
  rows.forEach((r) => {
    // Exclude Hometax and Sales Total from standard brand card rendering
    if (r.brand === '홈택스 현금영수증' || r.brand === '판매금액 총합') return;

    const brandKey = r.brand || '기타';
    const pgKey = r.pg_store || '일반';
    if (!groupedData[brandKey]) {
      groupedData[brandKey] = {};
    }
    if (!groupedData[brandKey][pgKey]) {
      groupedData[brandKey][pgKey] = [];
    }
    groupedData[brandKey][pgKey].push(r);
  });

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString();
  };

  // Helper to calculate brand total dynamically
  const getBrandTotal = (brandName: string, pgGroups: { [pgStore: string]: VatReportRow[] }) => {
    let sum = 0;
    Object.values(pgGroups).forEach((rowsList) => {
      rowsList.forEach((r) => {
        if (r.classification !== '합계' && r.brand !== '판매금액 총합' && r.amount) {
          sum += r.amount;
        }
      });
    });
    return sum;
  };

  // Compute Grand Total of all sales brands (excluding Hometax and total sum row)
  const grandTotal = Object.entries(groupedData).reduce((total, [bName, pgGroups]) => {
    return total + getBrandTotal(bName, pgGroups);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400">보고서 선택:</label>
          <select
            value={currentReport?.id || ''}
            onChange={(e) => onSelectReport(e.target.value)}
            className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-500 transition"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.year}년 {r.quarter}분기 보고서
              </option>
            ))}
          </select>
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            새 보고서
          </button>
        </div>

        {/* Overall Grand Total Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">총 매출 합계:</span>
            <span className="text-sm font-mono font-black">{grandTotal.toLocaleString()}원</span>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || !currentReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            엑셀 파일 내보내기
          </button>
        </div>
      </div>

      {/* Grouped Brand Cards */}
      {Object.keys(groupedData).length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-500 shadow-xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
          보고서 데이터를 로딩 중이거나 선택된 보고서가 없습니다.
        </div>
      ) : (
        Object.entries(groupedData).map(([brand, pgGroups]) => {
          const brandTotal = getBrandTotal(brand, pgGroups);

          return (
            <div
              key={brand}
              className="glass-panel rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl space-y-0.5"
            >
              {/* Brand Header Banner */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-sm text-white shadow-md">
                    {brand.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                      <span>{brand}</span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {Object.keys(pgGroups).length}개 결제채널
                      </span>
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-medium text-slate-400 block">브랜드 총 매출</span>
                  <span className="text-sm font-mono font-black text-amber-400">
                    {brandTotal.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* PG / Store Sub-Groups */}
              <div className="p-4 space-y-5">
                {Object.entries(pgGroups).map(([pgStore, pRows]) => {
                  const groupKey = `${brand}_${pgStore}`;
                  const isGroupUploading = uploadingGroup === groupKey;
                  const isBankTransferGroup = pgStore === '무통장입금';
                  const isUploaded = pRows.some((r) => (r as any).file_path || r.status === 'success');
                  const cleanPgName = pgStore.replace(/\n/g, ' ');
                  const recFileName = cleanPgName.includes('큐텐')
                    ? '우리은행_오터수입.xlsx'
                    : cleanPgName === '페이팔'
                    ? '페이팔'
                    : `${brand}_${cleanPgName}`;

                  return (
                    <div
                      key={pgStore}
                      className="bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden shadow-sm"
                    >
                      {/* PG / Store Subgroup Header & Consolidated File Upload Dropzone */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-3 bg-slate-900/90 border-b border-slate-800/80">
                        <div className="flex items-center gap-2.5">
                          <Store className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-slate-100">{pgStore}</span>
                          <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                            {pRows.length}개 항목
                          </span>
                        </div>

                        {/* Consolidated File Upload Area per PG Channel */}
                        {!isBankTransferGroup && (
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="font-medium text-slate-400">권장 파일명:</span>
                              <code className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-amber-300 font-mono text-[10px]">
                                {recFileName}
                              </code>
                              <button
                                onClick={() => handleCopy(recFileName)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                                title="파일명 복사"
                              >
                                {copiedText === recFileName ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {isGroupUploading ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                AI 통폐합 분석 중...
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-amber-600/20">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{isUploaded ? '통합 파일 재업로드' : '채널 통합 파일 업로드'}</span>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx, .xls, .png, .jpg, .jpeg, .webp, .pdf"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleGroupUpload(brand, pgStore, e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>

                                {isUploaded && (
                                  <button
                                    onClick={() => handleGroupDelete(brand, pgStore)}
                                    className="p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/50 rounded-xl transition"
                                    title="증빙 삭제 및 초기화"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Inner Rows Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-950/40 text-slate-400 font-semibold border-b border-slate-800/60">
                              <th className="py-2.5 px-4 w-1/4">구분</th>
                              <th className="py-2.5 px-4 w-1/4 text-right">공급가액 (금액)</th>
                              <th className="py-2.5 px-4 w-1/3">메모 / 특이사항</th>
                              <th className="py-2.5 px-4 text-center">상태</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {pRows.map((r) => {
                              const isEditing = editingRowId === r.id;
                              const isEditingMemo = editingMemoRowId === r.id;
                              const isFormula = r.status === 'formula';
                              const isTotalRow = r.classification === '합계';
                              const isBankTransfer = r.classification === '무통장입금';

                              // Dynamically calculate sum amount for '합계' (Total) rows
                              let displayAmount = r.amount;
                              if (isTotalRow) {
                                displayAmount = pRows
                                  .filter((item) => item.id !== r.id && item.classification !== '합계' && item.amount)
                                  .reduce((sum, item) => sum + (item.amount || 0), 0);
                              }

                              return (
                                <tr
                                  key={r.id}
                                  className={`transition ${
                                    isTotalRow
                                      ? 'bg-amber-500/10 font-bold text-amber-300'
                                      : 'hover:bg-slate-800/40 text-slate-300'
                                  }`}
                                >
                                  {/* Classification */}
                                  <td className="py-2.5 px-4 font-medium flex items-center gap-2">
                                    <Tag className="w-3 h-3 text-slate-500" />
                                    <span>{r.classification}</span>
                                  </td>

                                  {/* Supply Amount */}
                                  <td className="py-2.5 px-4 text-right font-mono font-bold">
                                    {isEditing ? (
                                      <div className="flex items-center justify-end gap-1">
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          className="w-28 px-2 py-1 bg-slate-950 border border-amber-500 rounded text-right text-xs text-amber-300 font-mono font-bold"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => handleInlineSave(r.id, 'amount')}
                                          className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingRowId(null)}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-end gap-2 group">
                                        <span
                                          className={
                                            isTotalRow
                                              ? 'text-amber-300 font-extrabold text-sm'
                                              : displayAmount
                                              ? 'text-slate-100 font-bold'
                                              : 'text-slate-500 font-normal'
                                          }
                                        >
                                          {formatNumber(displayAmount)}원
                                        </span>
                                        {!isFormula && !isTotalRow && !isBankTransfer && (
                                          <button
                                            onClick={() => {
                                              setEditingRowId(r.id);
                                              setEditingValue(r.amount ? r.amount.toString() : '');
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Memo & Special bank uploads */}
                                  <td className="py-2.5 px-4">
                                    {isBankTransfer ? (
                                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                        <label className="cursor-pointer px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg text-[10px] font-semibold transition flex items-center gap-1">
                                          <Upload className="w-3 h-3" />
                                          <span>입금 내역 엑셀</span>
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                handleBankFileUpload(r.id, e.target.files[0], 'bank_income');
                                              }
                                            }}
                                          />
                                        </label>

                                        <label className="cursor-pointer px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg text-[10px] font-semibold transition flex items-center gap-1">
                                          <Upload className="w-3 h-3" />
                                          <span>출금 내역 엑셀</span>
                                          <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                handleBankFileUpload(r.id, e.target.files[0], 'bank_expense');
                                              }
                                            }}
                                          />
                                        </label>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        {isEditingMemo ? (
                                          <div className="flex items-center gap-1 w-full">
                                            <input
                                              type="text"
                                              value={editingMemoValue}
                                              onChange={(e) => setEditingMemoValue(e.target.value)}
                                              className="w-full px-2 py-1 bg-slate-950 border border-amber-500 rounded text-xs text-slate-100"
                                              autoFocus
                                            />
                                            <button
                                              onClick={() => handleInlineSave(r.id, 'memo')}
                                              className="p-1 bg-emerald-600 text-white rounded"
                                            >
                                              <Check className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            className="cursor-pointer hover:underline text-slate-400 hover:text-slate-200 text-[11px] truncate max-w-[260px] flex items-center gap-1 group"
                                            onClick={() => {
                                              if (!isFormula && !isTotalRow) {
                                                setEditingMemoRowId(r.id);
                                                setEditingMemoValue(r.memo || '');
                                              }
                                            }}
                                          >
                                            <span>{r.memo || r.reference || '-'}</span>
                                            {!isFormula && !isTotalRow && (
                                              <Edit2 className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100" />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td className="py-2.5 px-4 text-center">
                                    {r.status === 'success' || (r as any).file_path ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                        <CheckCircle className="w-3 h-3" />
                                        완료
                                      </span>
                                    ) : isFormula ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                                        자동 계산
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
                                        대기
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Dedicated Hometax Cash Receipt Reference Section at Bottom */}
      {hometaxRow && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                📌
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <span>{currentReport?.year}년 {currentReport?.quarter}분기 홈택스 현금영수증 발행 금액</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  (이 수치는 총 매출 합계에 가산되지 않으며, 신고용 참고 자료로 엑셀에 포함됩니다.)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="금액 직접 입력..."
                className="w-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-right font-mono font-bold text-xs text-amber-300 focus:outline-none focus:border-amber-500 transition"
                value={hometaxRow.amount !== null && hometaxRow.amount !== undefined ? hometaxRow.amount.toLocaleString() : ''}
                onChange={(e) => {
                  const rawVal = e.target.value.replace(/,/g, '');
                  if (rawVal === '') {
                    axios.put(`${API_BASE}/rows/${hometaxRow.id}`, { amount: null }).then(onRefreshRows);
                  } else {
                    const num = parseInt(rawVal, 10);
                    if (!isNaN(num)) {
                      axios.put(`${API_BASE}/rows/${hometaxRow.id}`, { amount: num }).then(onRefreshRows);
                    }
                  }
                }}
              />
              <span className="text-xs font-bold text-slate-400">원</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
