import React, { useState, useEffect } from 'react';
import { ProductCatalogItem } from '../../types/production';
import { Tag, Plus, CheckCircle, Package } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_VAT_API_BASE?.replace(/\/api$/, '') || 'http://127.0.0.1:8005';

const MISC_MATERIAL_OPTIONS = [
  '그릭요거트',
  'OPP',
  '대파분태',
  '피넛스무스',
  '피넛크런치',
  '스타터팩',
  '이매진',
  '필요 유크림',
  '요프 (말차)',
  '요프 (콩가루)',
  '요프 (6종)',
];

interface SingleCatalogTabProps {
  catalog: ProductCatalogItem[];
  setList?: import('../../types/production').SetCatalogItem[];
  fetchData: () => void;
  onRefreshCatalog: () => void;
  onConvertToSet?: (productName: string) => void;
}

interface CatalogItemCardProps {
  item: ProductCatalogItem;
  confirmedScones: ProductCatalogItem[];
  handleAddOrUpdateSingle: (item: Partial<ProductCatalogItem>) => Promise<void>;
  handleConvertToSet: (productName: string) => void;
  handleDeleteSingle: (name: string) => void;
}

const CatalogItemCard: React.FC<CatalogItemCardProps> = ({
  item,
  confirmedScones,
  handleAddOrUpdateSingle,
  handleConvertToSet,
  handleDeleteSingle,
}) => {
  const [ovenNum, setOvenNum] = useState<string>(item.oven_number || '1');
  const [creamVal, setCreamVal] = useState<number | string>(item.heavy_cream_per_panel ?? 0);

  useEffect(() => {
    setOvenNum(item.oven_number || '1');
    setCreamVal(item.heavy_cream_per_panel ?? 0);
  }, [item.oven_number, item.heavy_cream_per_panel]);

  const handleSaveOven = () => {
    const trimmed = ovenNum.trim() || '1';
    const parsedCream = typeof creamVal === 'number' ? creamVal : (parseInt(creamVal) || 0);
    handleAddOrUpdateSingle({
      ...item,
      oven_number: trimmed,
      heavy_cream_per_panel: parsedCream,
    });
  };

  const handleSaveCream = () => {
    const trimmedOven = ovenNum.trim() || '1';
    const parsed = typeof creamVal === 'number' ? creamVal : (parseInt(creamVal) || 0);
    handleAddOrUpdateSingle({
      ...item,
      oven_number: trimmedOven,
      heavy_cream_per_panel: parsed,
    });
  };

  return (
    <div
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
                  : item.category === '미니쉐이크'
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                  : item.category === '스틱'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : item.category === '서비스'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  : 'bg-pink-500/10 text-pink-300 border-pink-500/20'
              }`}
            >
              {item.category === '미니큐브'
                ? '하프팩 (2봉/판)'
                : item.category === '미니쉐이크'
                ? '미니쉐이크 (4봉/판)'
                : item.category === '스틱'
                ? '스틱스콘 (9팩/판)'
                : item.category === '서비스'
                ? '서비스스콘'
                : item.category === '기타'
                ? `기타: ${item.parent_scone_name || '미지정'}`
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
      <div className="space-y-2 pt-2 border-t border-slate-700/40 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <select
            value={item.category}
            onChange={(e) => {
              const cat = e.target.value as '삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타';
              handleAddOrUpdateSingle({
                ...item,
                category: cat,
                batch_size: cat === '바' ? 10 : cat === '미니큐브' ? 2 : cat === '미니쉐이크' ? 4 : cat === '스틱' ? 9 : 8,
              });
            }}
            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
          >
            <option value="삼각">삼각스콘 (8개)</option>
            <option value="바">바스콘 (10개)</option>
            <option value="미니큐브">미니큐브/하프팩 (2봉)</option>
            <option value="미니쉐이크">미니쉐이크 (4봉)</option>
            <option value="스틱">스틱스콘 (9팩)</option>
            <option value="서비스">서비스스콘</option>
            <option value="기타">기타 부자재</option>
          </select>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-bold">오븐:</span>
            <input
              type="text"
              value={ovenNum}
              onChange={(e) => setOvenNum(e.target.value)}
              onBlur={handleSaveOven}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveOven()}
              placeholder="예: 1"
              className="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded text-[11px] font-extrabold text-amber-300 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-bold">유크림:</span>
            <input
              type="number"
              min="0"
              value={creamVal}
              onChange={(e) => setCreamVal(e.target.value)}
              onBlur={handleSaveCream}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCream()}
              placeholder="0"
              className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded text-[11px] font-extrabold text-sky-300 text-right focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">g/판</span>
          </div>
        </div>

        {(item.category === '미니큐브' || item.category === '스틱') && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-amber-400">↳ 베이스:</span>
            <select
              value={item.parent_scone_name || ''}
              onChange={(e) => {
                handleAddOrUpdateSingle({
                  ...item,
                  parent_scone_name: e.target.value,
                });
              }}
              className="px-1.5 py-1 bg-slate-900 border border-amber-500/40 rounded text-[11px] text-slate-200 w-full truncate font-bold"
            >
              <option value="">(베이스 삼각(바))</option>
              {confirmedScones.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>
        )}

        {item.category === '기타' && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-sky-400">↳ 매칭:</span>
            <select
              value={item.parent_scone_name || ''}
              onChange={(e) => {
                handleAddOrUpdateSingle({
                  ...item,
                  parent_scone_name: e.target.value,
                });
              }}
              className="px-1.5 py-1 bg-slate-900 border border-sky-500/40 rounded text-[11px] text-sky-200 w-full truncate font-bold"
            >
              <option value="">(기타 항목 선택)</option>
              {MISC_MATERIAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export const SingleCatalogTab: React.FC<SingleCatalogTabProps> = ({
  catalog,
  setList,
  fetchData,
  onRefreshCatalog,
  onConvertToSet,
}) => {
  const [localNewName, setLocalNewName] = useState<string>('');
  const [localNewCategory, setLocalNewCategory] = useState<'삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타'>('삼각');
  const [localNewParentSconeName, setLocalNewParentSconeName] = useState<string>('');
  const [localNewBatchSize, setLocalNewBatchSize] = useState<number>(8);
  const [localNewMinBumperQty, setLocalNewMinBumperQty] = useState<number>(0);
  const [localNewOvenNumber, setLocalNewOvenNumber] = useState<string>('1');
  const [localNewHeavyCream, setLocalNewHeavyCream] = useState<number>(0);

  const handleAddOrUpdateSingle = async (item: Partial<ProductCatalogItem>) => {
    try {
      const targetOven = item.oven_number !== undefined ? item.oven_number : '1';
      await axios.post(`${API_BASE}/api/production/catalog`, {
        name: item.name,
        category: item.category,
        batch_size: item.batch_size,
        min_bumper_qty: item.min_bumper_qty,
        is_confirmed: item.is_confirmed !== undefined ? item.is_confirmed : true,
        parent_scone_name: item.parent_scone_name || null,
        oven_number: targetOven,
        heavy_cream_per_panel: item.heavy_cream_per_panel !== undefined ? item.heavy_cream_per_panel : 0,
      });

      // Synchronize Oven Number across all Cube & Stick items sharing the same parent scone
      if ((item.category === '미니큐브' || item.category === '스틱') && item.parent_scone_name && item.oven_number !== undefined) {
        const siblings = catalog.filter(
          (c) =>
            c.name !== item.name &&
            c.parent_scone_name &&
            c.parent_scone_name.trim() === item.parent_scone_name!.trim() &&
            (c.category === '미니큐브' || c.category === '스틱')
        );
        for (const sib of siblings) {
          await axios.post(`${API_BASE}/api/production/catalog`, {
            ...sib,
            oven_number: targetOven,
          });
        }
      }

      fetchData();
      onRefreshCatalog();
    } catch (e) {
      console.error('Failed to save single catalog:', e);
      alert('등록 중 오류가 발생했습니다.');
    }
  };

  const handleConfirmItem = async (item: ProductCatalogItem) => {
    try {
      await axios.post(`${API_BASE}/api/production/catalog`, {
        ...item,
        is_confirmed: true,
      });
      fetchData();
      onRefreshCatalog();
    } catch (e) {
      console.error('Failed to confirm catalog:', e);
      alert('승인 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteSingle = async (name: string) => {
    if (!confirm(`'${name}' 제품을 마스터에서 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/production/catalog/${encodeURIComponent(name)}`);
      fetchData();
      onRefreshCatalog();
    } catch (e) {
      console.error('Failed to delete single catalog:', e);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localNewName.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }
    await handleAddOrUpdateSingle({
      name: localNewName.trim(),
      category: localNewCategory,
      batch_size: localNewBatchSize,
      min_bumper_qty: localNewMinBumperQty,
      is_confirmed: true,
      parent_scone_name: localNewParentSconeName || undefined,
      oven_number: localNewOvenNumber.trim() || '1',
      heavy_cream_per_panel: localNewHeavyCream || 0,
    });
    setLocalNewName('');
    setLocalNewParentSconeName('');
    setLocalNewOvenNumber('1');
    setLocalNewHeavyCream(0);
  };

  const handleConvertToSet = (productName: string) => {
    if (onConvertToSet) {
      onConvertToSet(productName);
    }
  };

  const setNames = new Set((setList || []).map((s) => s.set_name.trim()));

  const unconfirmedItems = catalog.filter(
    (i) =>
      !setNames.has(i.name.trim()) &&
      (i.is_confirmed === false ||
        ((i.category === '미니큐브' || i.category === '스틱') && !i.parent_scone_name))
  );

  const confirmedScones = catalog.filter(
    (i) => i.is_confirmed === true && (i.category === '삼각' || i.category === '바')
  );

  return (
    <div className="space-y-6">
      {/* Unconfirmed Items Banner */}
      {unconfirmedItems.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-400">
              ⚠️ 미승인 / 연결 필요 품목 ({unconfirmedItems.length}건)
            </span>
            <span className="text-xs text-slate-400">
              카테고리 및 매칭 항목을 지정하고 [승인 및 등록]을 눌러주세요.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {unconfirmedItems.map((item) => (
              <div
                key={item.name}
                className="p-3 rounded-lg bg-slate-900/80 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-100">{item.name}</span>
                  <select
                    value={item.category}
                    onChange={(e) => {
                      const cat = e.target.value as '삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타';
                      handleAddOrUpdateSingle({
                        ...item,
                        category: cat,
                        batch_size: cat === '바' ? 10 : cat === '미니큐브' ? 2 : cat === '미니쉐이크' ? 4 : cat === '스틱' ? 9 : 8,
                        is_confirmed: false,
                      });
                    }}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 focus:outline-none"
                  >
                    <option value="삼각">삼각스콘 (8개/판)</option>
                    <option value="바">바스콘 (10개/판)</option>
                    <option value="미니큐브">미니큐브/하프팩 (2봉/판)</option>
                    <option value="미니쉐이크">미니쉐이크 (4봉/판)</option>
                    <option value="스틱">스틱스콘 (9팩/판)</option>
                    <option value="서비스">서비스스콘</option>
                    <option value="기타">기타 부자재 / 원재료</option>
                  </select>

                  {(item.category === '미니큐브' || item.category === '스틱') && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-amber-400 font-semibold">↳ 베이스 삼각(바) 매칭:</span>
                      <select
                        value={item.parent_scone_name || ''}
                        onChange={(e) => {
                          handleAddOrUpdateSingle({
                            ...item,
                            parent_scone_name: e.target.value,
                            is_confirmed: false,
                          });
                        }}
                        className="px-2 py-1 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-slate-100 font-bold"
                      >
                        <option value="">(베이스 삼각(바)스콘 선택)</option>
                        {confirmedScones.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {item.category === '기타' && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-sky-400 font-semibold">↳ 기타 부자재/원재료 매칭:</span>
                      <select
                        value={item.parent_scone_name || ''}
                        onChange={(e) => {
                          handleAddOrUpdateSingle({
                            ...item,
                            parent_scone_name: e.target.value,
                            is_confirmed: false,
                          });
                        }}
                        className="px-2 py-1 bg-slate-900 border border-sky-500/40 rounded-lg text-xs text-sky-200 font-bold"
                      >
                        <option value="">(기타 부자재/원재료 항목 선택)</option>
                        {MISC_MATERIAL_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleConfirmItem(item)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> 승인 및 등록
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
          <Plus className="w-4 h-4" /> 수동 단품 / 하프팩 / 미니쉐이크 / 스틱 / 서비스 / 기타 직접 등록
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-8 gap-2">
          <input
            type="text"
            placeholder="제품명 (예: OXO스콘)"
            value={localNewName}
            onChange={(e) => setLocalNewName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-100"
          />
          <input
            type="text"
            placeholder="오븐 (예: 1)"
            value={localNewOvenNumber}
            onChange={(e) => setLocalNewOvenNumber(e.target.value)}
            className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-300 font-bold focus:outline-none"
          />
          <input
            type="number"
            min="0"
            placeholder="유크림(g)/판"
            value={localNewHeavyCream || ''}
            onChange={(e) => setLocalNewHeavyCream(parseInt(e.target.value) || 0)}
            className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-sky-300 font-bold focus:outline-none text-right"
          />
          <select
            value={localNewCategory}
            onChange={(e) => {
              const cat = e.target.value as '삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타';
              setLocalNewCategory(cat);
              setLocalNewBatchSize(cat === '바' ? 10 : cat === '미니큐브' ? 2 : cat === '미니쉐이크' ? 4 : cat === '스틱' ? 9 : 8);
            }}
            className="px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs focus:outline-none focus:border-amber-500 text-slate-100"
          >
            <option value="삼각">삼각스콘 (8개)</option>
            <option value="바">바스콘 (10개)</option>
            <option value="미니큐브">미니큐브/하프팩 (2봉)</option>
            <option value="미니쉐이크">미니쉐이크 (4봉)</option>
            <option value="스틱">스틱스콘 (9팩)</option>
            <option value="서비스">서비스스콘</option>
            <option value="기타">기타 부자재 / 원재료</option>
          </select>

          {localNewCategory === '미니큐브' || localNewCategory === '스틱' ? (
            <select
              value={localNewParentSconeName}
              onChange={(e) => setLocalNewParentSconeName(e.target.value)}
              className="px-2 py-2 bg-slate-900 border border-amber-500/40 rounded-lg text-xs text-slate-100 font-bold"
            >
              <option value="">(베이스 삼각(바)스콘 선택)</option>
              {confirmedScones.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          ) : localNewCategory === '기타' ? (
            <select
              value={localNewParentSconeName}
              onChange={(e) => setLocalNewParentSconeName(e.target.value)}
              className="px-2 py-2 bg-slate-900 border border-sky-500/40 rounded-lg text-xs text-sky-200 font-bold"
            >
              <option value="">(기타 매칭 항목 선택)</option>
              {MISC_MATERIAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : localNewCategory === '미니쉐이크' ? (
            <div className="flex items-center text-xs text-sky-400 font-semibold px-2 py-2">
              독립 품목 (4봉/판)
            </div>
          ) : localNewCategory === '서비스' ? (
            <div className="flex items-center text-xs text-purple-400 font-semibold px-2 py-2">
              서비스스콘 품목
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 whitespace-nowrap">범퍼:</span>
              <input
                type="number"
                min="0"
                value={localNewMinBumperQty}
                onChange={(e) => setLocalNewMinBumperQty(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-right focus:outline-none focus:border-amber-500 text-slate-100"
              />
            </div>
          )}

          <button
            type="submit"
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-lg text-xs transition flex items-center justify-center gap-1 shadow"
          >
            <Plus className="w-4 h-4" /> 등록
          </button>
        </div>
      </form>

      {/* Catalog List */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-slate-300 flex items-center justify-between">
          <span>마스터 등록 제품 목록 ({catalog.length}개)</span>
          <span className="text-xs text-slate-400">오븐번호 / 유크림 입력 후 엔터나 다른 곳 클릭 시 자동 저장됩니다.</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {catalog.map((item) => (
            <CatalogItemCard
              key={item.name}
              item={item}
              confirmedScones={confirmedScones}
              handleAddOrUpdateSingle={handleAddOrUpdateSingle}
              handleConvertToSet={handleConvertToSet}
              handleDeleteSingle={handleDeleteSingle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
