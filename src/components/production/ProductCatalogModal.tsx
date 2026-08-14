import React, { useState, useEffect } from 'react';
import { ProductCatalogItem, SetCatalogItem, SetItemComponent } from '../../types/production';
import { Tag, Layers, Package, X, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { SingleCatalogTab } from './SingleCatalogTab';

const API_BASE = import.meta.env.VITE_VAT_API_BASE?.replace(/\/api$/, '') || 'http://127.0.0.1:8005';

interface ProductCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCatalog: () => void;
}

export const ProductCatalogModal: React.FC<ProductCatalogModalProps> = ({
  isOpen,
  onClose,
  onRefreshCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'set'>('single');
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [setList, setSetList] = useState<SetCatalogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // New Single Form State
  const [newName, setNewName] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타'>('삼각');
  const [newParentSconeName, setNewParentSconeName] = useState<string>('');
  const [newBatchSize, setNewBatchSize] = useState<number>(8);
  const [newMinBumperQty, setNewMinBumperQty] = useState<number>(2);

  // New/Edit Set Modal State
  const [isSetEditOpen, setIsSetEditOpen] = useState<boolean>(false);
  const [editingSetName, setEditingSetName] = useState<string>('');
  const [setComponents, setSetComponents] = useState<{ product_name: string; quantity: number }[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchData(true);
    }
  }, [isOpen]);

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const [singleRes, setRes] = await Promise.all([
        axios.get(`${API_BASE}/api/production/catalog`),
        axios.get(`${API_BASE}/api/production/sets`),
      ]);
      if (singleRes.data.status === 'success') {
        setCatalog(singleRes.data.data);
      }
      if (setRes.data.status === 'success') {
        setSetList(setRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch product and set catalog:', err);
    } font-medium {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  // Single Product Actions
  const handleAddOrUpdateSingle = async (item: ProductCatalogItem) => {
    try {
      await axios.post(`${API_BASE}/api/production/catalog`, {
        ...item,
        batch_size: item.category === '바' ? 10 : item.category === '미니큐브' ? 2 : 8,
      });
      fetchData(false);
      onRefreshCatalog();
    } catch (err) {
      alert('단품 저장 실패: ' + err);
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await handleAddOrUpdateSingle({
      name: newName.trim(),
      category: newCategory,
      parent_scone_name: newCategory === '미니큐브' ? newParentSconeName : undefined,
      batch_size: newBatchSize,
      min_bumper_qty: newMinBumperQty,
      is_confirmed: true,
    });

    setNewName('');
    setNewParentSconeName('');
    setNewMinBumperQty(2);
  };

  const handleDeleteSingle = async (name: string) => {
    if (!confirm(`'${name}' 단품을 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/production/catalog/${encodeURIComponent(name)}`);
      fetchData(false);
      onRefreshCatalog();
    } catch (err) {
      alert('단품 삭제 실패: ' + err);
    }
  };

  const handleConvertToSet = (singleName: string) => {
    setEditingSetName(singleName);
    setSetComponents([{ product_name: '', quantity: 1 }]);
    setIsSetEditOpen(true);
  };

  // Set Product Actions
  const handleOpenNewSetModal = () => {
    setEditingSetName('');
    setSetComponents([{ product_name: '', quantity: 1 }]);
    setIsSetEditOpen(true);
  };

  const handleOpenEditSetModal = (setItem: SetCatalogItem) => {
    setEditingSetName(setItem.set_name);
    setSetComponents([...setItem.components]);
    setIsSetEditOpen(true);
  };

  const handleSaveSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetName.trim()) {
      alert('세트 상품명을 입력해주세요.');
      return;
    }

    const validComponents = setComponents.filter(
      (c) => c.product_name.trim() && c.quantity > 0
    );

    if (validComponents.length === 0) {
      alert('최소 1개 이상의 구성 단품 품목을 선택해주세요.');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/production/sets`, {
        name: editingSetName.trim(),
        set_name: editingSetName.trim(),
        items: validComponents,
        components: validComponents,
      });

      const matchedSingle = catalog.find((c) => c.name === editingSetName.trim());
      if (matchedSingle) {
        await axios.delete(`${API_BASE}/api/production/catalog/${encodeURIComponent(editingSetName.trim())}`);
      }

      setIsSetEditOpen(false);
      fetchData(false);
      onRefreshCatalog();
    } catch (err) {
      alert('세트 상품 저장 실패: ' + err);
    }
  };

  const handleDeleteSet = async (setName: string) => {
    if (!confirm(`'${setName}' 세트 상품을 삭제하시겠습니까?`)) return;
    try {
      await axios.delete(`${API_BASE}/api/production/sets/${encodeURIComponent(setName)}`);
      fetchData(false);
      onRefreshCatalog();
    } catch (err) {
      alert('세트 삭제 실패: ' + err);
    }
  };

  const addComponentRow = () => {
    setSetComponents([...setComponents, { product_name: '', quantity: 1 }]);
  };

  const removeComponentRow = (index: number) => {
    setSetComponents(setComponents.filter((_, i) => i !== index));
  };

  const updateComponentRow = (index: number, field: 'product_name' | 'quantity', value: any) => {
    const updated = [...setComponents];
    updated[index] = { ...updated[index], [field]: value };
    setSetComponents(updated);
  };

  if (!isOpen) return null;

  const unconfirmedSingle = catalog.filter((i) => i.is_confirmed === false);
  const confirmedSingle = catalog.filter((i) => i.is_confirmed !== false);
  const confirmedScones = confirmedSingle.filter((i) => i.category === '삼각' || i.category === '바');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header & Tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-100">제품 & 세트 마스터 관리</h3>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 단품 스콘 마스터 ({catalog.length})
              </button>
              <button
                onClick={() => setActiveTab('set')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'set'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> 세트 상품 마스터 ({setList.length})
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm animate-pulse">
              마스터 데이터 불러오는 중...
            </div>
          ) : activeTab === 'single' ? (
            <SingleCatalogTab
              catalog={catalog}
              setList={setList}
              fetchData={fetchData}
              onRefreshCatalog={onRefreshCatalog}
              onConvertToSet={handleConvertToSet}
            />
          ) : (
            /* Set Products Tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-200">세트 상품 분해 구성 마스터</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    EasyAdmin 엑셀에서 세트 상품명으로 주문된 건을 단품 구성 요소 수량으로 자동 분해합니다.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewSetModal}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> 신규 세트 상품 등록
                </button>
              </div>

              {/* Set Product Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {setList.map((setItem) => (
                  <div
                    key={setItem.set_name}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-slate-100 text-sm">{setItem.set_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditSetModal(setItem)}
                          className="text-xs text-amber-400 hover:underline font-medium"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDeleteSet(setItem.set_name)}
                          className="text-xs text-slate-500 hover:text-rose-400 transition"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <span className="text-slate-400 font-medium">포함 단품 구성:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {setItem.components.map((c: SetItemComponent, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 font-medium"
                          >
                            {c.product_name} <span className="text-amber-400 font-bold">x {c.quantity}개</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Set Product Edit/Create Modal Popup */}
      {isSetEditOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span>세트 상품 정보 {editingSetName ? '수정' : '등록'}</span>
              </h4>
              <button
                onClick={() => setIsSetEditOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSet} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">
                    세트 상품명 (EasyAdmin 엑셀에 나오는 품목명)
                  </label>
                  {unconfirmedSingle.length > 0 && (
                    <span className="text-[11px] text-amber-400 font-medium">
                      💡 엑셀 감지 품목 목록에서 바로 선택
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="예: [스틱]더티너티밤스틱 3팩"
                    value={editingSetName}
                    onChange={(e) => setEditingSetName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                  {unconfirmedSingle.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingSetName(e.target.value);
                        }
                      }}
                      className="w-56 px-2 py-2 bg-slate-900 border border-amber-500/50 rounded-lg text-xs text-amber-300 font-bold focus:outline-none"
                    >
                      <option value="">(엑셀 감지 품목 선택)</option>
                      {unconfirmedSingle.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">구성 단품 및 수량</label>
                  <button
                    type="button"
                    onClick={addComponentRow}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Plus className="w-3 h-3" /> 구성 품목 추가
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {setComponents.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 flex gap-1">
                        <input
                          type="text"
                          placeholder="구성 품목명 직접 입력 또는 선택"
                          value={comp.product_name}
                          onChange={(e) => updateComponentRow(idx, 'product_name', e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              updateComponentRow(idx, 'product_name', e.target.value);
                            }
                          }}
                          className="w-36 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-amber-400 focus:outline-none font-bold"
                        >
                          <option value="">(단품 마스터에서 선택)</option>
                          {confirmedSingle.map((p) => (
                            <option key={p.name} value={p.name}>
                              {p.name} ({p.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="number"
                        min="1"
                        value={comp.quantity}
                        onChange={(e) =>
                          updateComponentRow(idx, 'quantity', parseInt(e.target.value) || 1)
                        }
                        className="w-20 px-2 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-right font-bold text-amber-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">개</span>

                      {setComponents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeComponentRow(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSetEditOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
