import React from 'react';
import { ProductCatalogItem } from '../../types/production';
import { AlertCircle, Tag, Plus, CheckCircle, Package } from 'lucide-react';

interface SingleCatalogTabProps {
  catalog: ProductCatalogItem[];
  unconfirmedSingle: ProductCatalogItem[];
  confirmedScones: ProductCatalogItem[];
  newName: string;
  setNewName: (val: string) => void;
  newCategory: '삼각' | '바' | '미니큐브';
  setNewCategory: (val: '삼각' | '바' | '미니큐브') => void;
  newParentSconeName: string;
  setNewParentSconeName: (val: string) => void;
  newMinBumperQty: number;
  setNewMinBumperQty: (val: number) => void;
  setNewBatchSize: (val: number) => void;
  handleAddOrUpdateSingle: (item: ProductCatalogItem) => void;
  handleCreateSingle: (e: React.FormEvent) => void;
  handleDeleteSingle: (name: string) => void;
  handleConvertToSet: (name: string) => void;
}

export const SingleCatalogTab: React.FC<SingleCatalogTabProps> = ({
  catalog,
  unconfirmedSingle,
  confirmedScones,
  newName,
  setNewName,
  newCategory,
  setNewCategory,
  newParentSconeName,
  setNewParentSconeName,
  newMinBumperQty,
  setNewMinBumperQty,
  setNewBatchSize,
  handleAddOrUpdateSingle,
  handleCreateSingle,
  handleDeleteSingle,
  handleConvertToSet,
}) => {
  return (
    <div className="space-y-6">
      {/* Unconfirmed Items Section */}
      {unconfirmedSingle.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>🔔 신규 감지된 항목 ({unconfirmedSingle.length}건)</span>
            </div>
            <p className="text-xs text-amber-300/80">
              엑셀에서 처음 발견된 항목입니다. 형태(삼각/바/미니큐브) 및 연결 삼각스콘을 매칭 후 승인해주세요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {unconfirmedSingle.map((item) => (
              <div
                key={item.name}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-slate-900/90 border border-amber-500/20 gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-bold text-slate-100 text-sm">{item.name}</span>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <select
                    value={item.category}
                    onChange={(e) => {
                      const cat = e.target.value as '삼각' | '바' | '미니큐브';
                      handleAddOrUpdateSingle({
                        ...item,
                        category: cat,
                        batch_size: cat === '바' ? 10 : cat === '미니큐브' ? 2 : 8,
                        is_confirmed: false,
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 focus:outline-none"
                  >
                    <option value="삼각">삼각스콘 (8개/판)</option>
                    <option value="바">바스콘 (10개/판)</option>
                    <option value="미니큐브">미니큐브/하프팩 (2봉/판)</option>
                  </select>

                  {item.category === '미니큐브' && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-amber-400 font-semibold">↳ 삼각매칭:</span>
                      <select
                        value={item.parent_scone_name || ''}
                        onChange={(e) => {
                          handleAddOrUpdateSingle({
                            ...item,
                            parent_scone_name: e.target.value,
                            is_confirmed: false,
                          });
                        }}
                        className="px-2 py-1 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-slate-100"
                      >
                        <option value="">(베이스 스콘 선택)</option>
                        {confirmedScones.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.category}스콘)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {item.category !== '미니큐브' && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span>범퍼:</span>
                      <input
                        type="number"
                        min="0"
                        value={item.min_bumper_qty ?? 2}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          handleAddOrUpdateSingle({
                            ...item,
                            min_bumper_qty: val,
                            is_confirmed: false,
                          });
                        }}
                        className="w-14 px-1.5 py-1 bg-slate-900 border border-slate-700 rounded text-right text-slate-100 text-xs font-bold"
                      />
                      <span>개</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleAddOrUpdateSingle({ ...item, is_confirmed: true })}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-slate-950 rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> 승인 및 등록
                  </button>

                  <button
                    onClick={() => handleConvertToSet(item.name)}
                    className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-lg text-xs transition flex items-center gap-1"
                  >
                    <Package className="w-3.5 h-3.5" /> 세트로 전환 등록
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Single Form */}
      <form onSubmit={handleCreateSingle} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
        <div className="text-sm font-medium text-amber-400 flex items-center gap-1">
          <Plus className="w-4 h-4" /> 수동 단품 / 하프팩 스콘 직접 등록
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
          <input
            type="text"
            placeholder="제품명 (예: 단호박하프팩)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-slate-100"
          />
          <select
            value={newCategory}
            onChange={(e) => {
              const cat = e.target.value as '삼각' | '바' | '미니큐브';
              setNewCategory(cat);
              setNewBatchSize(cat === '바' ? 10 : cat === '미니큐브' ? 2 : 8);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:border-amber-500 text-slate-100"
          >
            <option value="삼각">삼각스콘 (8개)</option>
            <option value="바">바스콘 (10개)</option>
            <option value="미니큐브">미니큐브/하프팩 (2봉)</option>
          </select>

          {newCategory === '미니큐브' ? (
            <select
              value={newParentSconeName}
              onChange={(e) => setNewParentSconeName(e.target.value)}
              className="px-2 py-2 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-slate-100"
            >
              <option value="">(연결 베이스 스콘)</option>
              {confirmedScones.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.category}스콘)
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 whitespace-nowrap">범퍼:</span>
              <input
                type="number"
                min="0"
                value={newMinBumperQty}
                onChange={(e) => setNewMinBumperQty(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-right focus:outline-none focus:border-amber-500 text-slate-100"
              />
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-lg text-sm transition flex items-center justify-center gap-1 shadow"
          >
            <Plus className="w-4 h-4" /> 등록
          </button>
        </div>
      </form>

      {/* Catalog List */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-300 flex items-center justify-between">
          <span>마스터 등록 제품 목록 ({catalog.length}개)</span>
          <span className="text-xs text-slate-400">카테고리/범퍼 수정 시 자동 저장됩니다.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalog.map((item) => (
            <div
              key={item.name}
              className={`p-3 rounded-xl border flex flex-col justify-between gap-3 ${
                item.is_confirmed === false
                  ? 'bg-amber-500/5 border-amber-500/30'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block text-[10px] px-2 py-0.5 rounded font-semibold border ${
                        item.category === '삼각'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : item.category === '바'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}
                    >
                      {item.category === '미니큐브'
                        ? '하프팩 (2봉/판)'
                        : `${item.category}스콘 (${item.batch_size}개/판)`}
                    </span>

                    {item.is_confirmed === false && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/30 font-bold">
                        미승인
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleConvertToSet(item.name)}
                    title="세트 상품으로 전환"
                    className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition"
                  >
                    <Package className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteSingle(item.name)}
                    className="text-slate-500 hover:text-rose-400 text-xs transition px-1 py-0.5"
                  >
                    삭제
                  </button>
                </div>
              </div>

              {/* Item Edit Row */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-700/40 text-xs gap-2">
                <select
                  value={item.category}
                  onChange={(e) => {
                    const cat = e.target.value as '삼각' | '바' | '미니큐브';
                    handleAddOrUpdateSingle({
                      ...item,
                      category: cat,
                      batch_size: cat === '바' ? 10 : cat === '미니큐브' ? 2 : 8,
                    });
                  }}
                  className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                >
                  <option value="삼각">삼각스콘 (8개)</option>
                  <option value="바">바스콘 (10개)</option>
                  <option value="미니큐브">미니큐브/하프팩 (2봉)</option>
                </select>

                {item.category === '미니큐브' ? (
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-amber-400">↳ 연결:</span>
                    <select
                      value={item.parent_scone_name || ''}
                      onChange={(e) => {
                        handleAddOrUpdateSingle({
                          ...item,
                          parent_scone_name: e.target.value,
                        });
                      }}
                      className="px-1.5 py-1 bg-slate-900 border border-amber-500/40 rounded text-[11px] text-slate-200 max-w-[110px] truncate"
                    >
                      <option value="">(베이스 스콘)</option>
                      {confirmedScones.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-slate-400">
                    <span>범퍼:</span>
                    <input
                      type="number"
                      min="0"
                      value={item.min_bumper_qty ?? 2}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        handleAddOrUpdateSingle({
                          ...item,
                          min_bumper_qty: val,
                        });
                      }}
                      className="w-12 px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right text-slate-200 text-xs font-bold"
                    />
                    <span>개</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
