import React, { useState } from 'react';
import { X, Save, Key, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_VAT_API_BASE || 'http://127.0.0.1:8005/api';

interface VatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey?: string;
  onSaved: () => void;
}

export const VatSettingsModal: React.FC<VatSettingsModalProps> = ({
  isOpen,
  onClose,
  currentKey = '',
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState(currentKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await axios.post(`${API_BASE}/settings`, { gemini_api_key: apiKey });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'API 키 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-slate-100">Gemini AI 설정</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AI Studio API Key 입력"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              영수증 및 카드 명세서 자동 분석을 위해 사용됩니다.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
