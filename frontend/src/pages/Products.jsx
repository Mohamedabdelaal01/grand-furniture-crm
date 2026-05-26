import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Package, Plus, Edit2, Trash2, Check, X, Tag, ChevronLeft,
} from 'lucide-react';
import {
  fetchProductCategories, createProductCategory, updateProductCategory, deleteProductCategory,
  fetchProducts, createProduct, updateProduct, deleteProduct,
} from '../services/api';

const Products = () => {
  const [categories, setCategories]       = useState([]);
  const [products, setProducts]           = useState([]);
  const [activeCatId, setActiveCatId]     = useState(null);
  const [loading, setLoading]             = useState(true);

  // Inline edit/add state
  const [newCatName, setNewCatName]       = useState('');
  const [editingCatId, setEditingCatId]   = useState(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [editingProdId, setEditingProdId] = useState(null);
  const [editingProdName, setEditingProdName] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const data = await fetchProductCategories();
      setCategories(data.categories || []);
      if (!activeCatId && data.categories?.length) {
        setActiveCatId(data.categories[0].id);
      }
    } catch (e) {
      toast.error('فشل تحميل الكاتيجوري');
    }
  }, [activeCatId]);

  const loadProducts = useCallback(async (catId) => {
    if (!catId) { setProducts([]); return; }
    try {
      const data = await fetchProducts(catId);
      setProducts(data.products || []);
    } catch (e) {
      toast.error('فشل تحميل المنتجات');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadCategories();
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    loadProducts(activeCatId);
  }, [activeCatId, loadProducts]);

  // ── Category actions ──────────────────────────────────────────────────
  const handleAddCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await createProductCategory(name);
      setNewCatName('');
      toast.success('تم إضافة الكاتيجوري');
      await loadCategories();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الإضافة');
    }
  };

  const handleUpdateCategory = async (id) => {
    const name = editingCatName.trim();
    if (!name) return;
    try {
      await updateProductCategory(id, name);
      setEditingCatId(null);
      toast.success('تم التعديل');
      await loadCategories();
    } catch (e) {
      toast.error('فشل التعديل');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!confirm(`تأكيد حذف الكاتيجوري "${name}" وكل منتجاتها؟`)) return;
    try {
      await deleteProductCategory(id);
      toast.success('تم الحذف');
      if (activeCatId === id) setActiveCatId(null);
      await loadCategories();
    } catch (e) {
      toast.error('فشل الحذف');
    }
  };

  // ── Product actions ───────────────────────────────────────────────────
  const handleAddProduct = async () => {
    const name = newProductName.trim();
    if (!name || !activeCatId) return;
    try {
      await createProduct({ category_id: activeCatId, name });
      setNewProductName('');
      toast.success('تم إضافة المنتج');
      await loadProducts(activeCatId);
      await loadCategories(); // refresh product_count badges
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الإضافة');
    }
  };

  const handleUpdateProduct = async (id) => {
    const name = editingProdName.trim();
    if (!name) return;
    try {
      await updateProduct(id, { name });
      setEditingProdId(null);
      toast.success('تم التعديل');
      await loadProducts(activeCatId);
    } catch (e) {
      toast.error('فشل التعديل');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!confirm(`تأكيد حذف المنتج "${name}"؟`)) return;
    try {
      await deleteProduct(id);
      toast.success('تم الحذف');
      await loadProducts(activeCatId);
      await loadCategories();
    } catch (e) {
      toast.error('فشل الحذف');
    }
  };

  const activeCat = categories.find(c => c.id === activeCatId);

  return (
    <div className="max-w-[1400px] mx-auto pb-12" dir="rtl">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Package className="w-7 h-7 text-primary-400" />
          إدارة المنتجات
        </h1>
        <p className="text-dark-400 text-sm mt-1">
          أضف الكاتيجوري والمنتجات اللي بيختار منها السيلز عند تسجيل العقد
        </p>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-dark-400">جاري التحميل…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Categories pane ───────────────────────────────────── */}
          <div className="card p-5">
            <h3 className="text-white font-black text-base mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary-400" />
              الكاتيجوري ({categories.length})
            </h3>

            {/* Add category */}
            <div className="flex gap-2 mb-4">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="اسم كاتيجوري جديدة"
                className="input-field flex-1 text-sm"
              />
              <button
                onClick={handleAddCategory}
                disabled={!newCatName.trim()}
                className="px-3 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 text-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Category list */}
            <div className="space-y-2">
              {categories.length === 0 ? (
                <p className="text-dark-500 text-xs text-center py-6">
                  لسه مفيش كاتيجوري — أضف واحدة
                </p>
              ) : (
                categories.map(cat => (
                  <div
                    key={cat.id}
                    className={`group flex items-center gap-2 p-3 rounded-xl border transition-colors cursor-pointer
                      ${activeCatId === cat.id
                        ? 'bg-primary-500/10 border-primary-500/40'
                        : 'bg-dark-900/40 border-dark-800 hover:border-dark-700'}`}
                    onClick={() => editingCatId !== cat.id && setActiveCatId(cat.id)}
                  >
                    {editingCatId === cat.id ? (
                      <>
                        <input
                          autoFocus
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateCategory(cat.id);
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="input-field flex-1 text-sm py-1"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateCategory(cat.id); }}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingCatId(null); }}
                          className="text-dark-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-white font-bold text-sm">{cat.name}</span>
                        <span className="text-dark-500 text-[10px] font-bold bg-dark-900 px-2 py-0.5 rounded-md">
                          {cat.product_count}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-white transition-opacity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }}
                          className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-rose-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronLeft className={`w-4 h-4 transition-transform ${activeCatId === cat.id ? 'text-primary-400' : 'text-dark-600'}`} />
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── Products pane ─────────────────────────────────────── */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-white font-black text-base mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-400" />
              المنتجات
              {activeCat && (
                <span className="text-dark-500 text-xs font-bold">
                  في {activeCat.name}
                </span>
              )}
            </h3>

            {!activeCatId ? (
              <p className="text-dark-500 text-sm text-center py-12">
                اختار كاتيجوري من اليمين الأول
              </p>
            ) : (
              <>
                {/* Add product */}
                <div className="flex gap-2 mb-4">
                  <input
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
                    placeholder="اسم منتج جديد"
                    className="input-field flex-1 text-sm"
                  />
                  <button
                    onClick={handleAddProduct}
                    disabled={!newProductName.trim()}
                    className="px-4 rounded-xl bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/40 text-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة
                  </button>
                </div>

                {/* Product list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {products.length === 0 ? (
                    <p className="col-span-full text-dark-500 text-xs text-center py-6">
                      لسه مفيش منتجات في الكاتيجوري دي
                    </p>
                  ) : (
                    products.map(prod => (
                      <div
                        key={prod.id}
                        className="group flex items-center gap-2 p-3 rounded-xl bg-dark-900/40 border border-dark-800 hover:border-dark-700 transition-colors"
                      >
                        {editingProdId === prod.id ? (
                          <>
                            <input
                              autoFocus
                              value={editingProdName}
                              onChange={(e) => setEditingProdName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateProduct(prod.id);
                                if (e.key === 'Escape') setEditingProdId(null);
                              }}
                              className="input-field flex-1 text-sm py-1"
                            />
                            <button
                              onClick={() => handleUpdateProduct(prod.id)}
                              className="text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProdId(null)}
                              className="text-dark-500 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-white text-sm">{prod.name}</span>
                            <button
                              onClick={() => {
                                setEditingProdId(prod.id);
                                setEditingProdName(prod.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-white transition-opacity"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id, prod.name)}
                              className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-rose-400 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Products;
