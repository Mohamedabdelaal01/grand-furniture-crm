/**
 * Contracts — purchases viewed as signed contracts.
 * Scoped server-side by role: sales see their own, branch managers see their
 * branch, admin sees all. Editing/deleting is admin / branch-manager only.
 */
import { useState, useEffect, useCallback, Fragment } from 'react';
import toast from 'react-hot-toast';
import { FileText, RefreshCw, Pencil, Trash2, Check, X, FileSpreadsheet, ShoppingBag } from 'lucide-react';
import { fetchContracts, updateContract, deleteContract, formatBranch, exportContractsCsv, customerName } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ProductMultiSelect from '../components/ProductMultiSelect';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);
const fmtDate = (iso) => (iso ? String(iso).split(' ')[0].split('T')[0] : '—');

export default function Contracts() {
  const { user } = useAuth();
  const canEdit  = ['admin', 'branch_manager'].includes(user?.role);

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [editId, setEditId]   = useState(null);
  const [editBuf, setEditBuf] = useState({ price: '', contract_number: '', productIds: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchContracts());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (c) => {
    setEditId(c.id);
    setEditBuf({
      price: c.price ?? '',
      contract_number: c.contract_number ?? '',
      productIds: (c.products || []).map((p) => p.id),
    });
  };

  const saveEdit = async (id) => {
    if (!editBuf.productIds.length) {
      toast.error('لازم تختار منتج واحد على الأقل');
      return;
    }
    setBusy(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      await updateContract(id, {
        price: editBuf.price,
        contract_number: editBuf.contract_number,
        product_ids: editBuf.productIds,
      });
      setEditId(null);
      toast.success('تم حفظ التعاقد', { id: tId });
      await load(); // refresh so the updated products show
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحفظ', { id: tId });
    }
    setBusy(false);
  };

  const remove = async (c) => {
    if (!window.confirm(`متأكد من حذف تعاقد ${c.first_name || c.user_id}؟`)) return;
    setBusy(true);
    const tId = toast.loading('جاري الحذف...');
    try {
      const res = await deleteContract(c.id);
      setRows((prev) => prev.filter((r) => r.id !== c.id));
      toast.success(
        res?.reverted
          ? 'اتحذف التعاقد — العميل رجع لقائمة المتابعة'
          : 'اتحذف التعاقد',
        { id: tId }
      );
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحذف', { id: tId });
    }
    setBusy(false);
  };

  const colCount = canEdit ? 7 : 6;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-accent rounded-full" />
            <span className="text-accent font-black text-[10px] uppercase tracking-[0.2em]">إدارة المبيعات</span>
          </div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
            <FileText className="w-7 h-7 text-accent" />
            التعاقدات
          </h1>
          {!loading && (
            <p className="text-muted text-sm mt-1">
              {rows.length} تعاقد
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={() => { toast.promise(exportContractsCsv(), { loading: 'جاري التصدير...', success: 'تم تنزيل الملف', error: 'فشل التصدير' }); }}
              className="btn-secondary"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              تصدير إلى Excel
            </button>
          )}
          <button onClick={load} disabled={loading} className="btn-secondary">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted font-bold">لا توجد تعاقدات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-surface-secondary/60 text-muted text-right font-black uppercase tracking-wider">
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الفرع</th>
                  <th className="py-3 px-4">السيلز</th>
                  <th className="py-3 px-4">المنتجات</th>
                  <th className="py-3 px-4">رقم التعاقد</th>
                  {canEdit && <th className="py-3 px-4 text-center">إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const editing = editId === c.id;
                  return (
                    <Fragment key={c.id}>
                    <tr className={`border-t border-border/60 ${editing ? 'bg-surface-secondary/30' : 'hover:bg-surface-secondary/20'}`}>
                      <td className="py-3 px-4 text-foreground">{fmtDate(c.created_at)}</td>
                      <td className="py-3 px-4 text-foreground font-bold">
                        {customerName(c)}
                        {c.phone && (
                          <span className="text-muted font-mono mr-2" dir="ltr">{c.phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-foreground">{formatBranch(c.branch) || '—'}</td>
                      <td className="py-3 px-4 text-foreground">{c.rep || '—'}</td>
                      <td className="py-3 px-4">
                        {c.products && c.products.length ? (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {c.products.map((p) => (
                              <span key={p.id} className="text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                {p.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted">— مفيش —</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {editing ? (
                          <input
                            value={editBuf.contract_number}
                            onChange={(e) => setEditBuf((b) => ({ ...b, contract_number: e.target.value }))}
                            placeholder="رقم التعاقد"
                            className="input-field text-xs py-1.5 w-32"
                          />
                        ) : (
                          <span className="text-foreground font-mono">{c.contract_number || '—'}</span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-2">
                            {editing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(c.id)}
                                  disabled={busy}
                                  className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                  title="حفظ"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditId(null)}
                                  className="p-1.5 rounded-lg bg-surface-tertiary text-muted hover:text-foreground transition-colors"
                                  title="إلغاء"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(c)}
                                  className="p-1.5 rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                                  title="تعديل"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => remove(c)}
                                  disabled={busy}
                                  className="p-1.5 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {editing && (
                      <tr className="bg-surface/50 border-t border-border/60">
                        <td colSpan={colCount} className="px-4 pb-4 pt-1">
                          <div className="flex items-center gap-2 mb-2 text-foreground text-xs font-bold">
                            <ShoppingBag className="w-4 h-4 text-accent" />
                            عدّل المنتجات اللي العميل خدها ({editBuf.productIds.length} مختار)
                          </div>
                          <div className="max-w-xl">
                            <ProductMultiSelect
                              compact
                              selectedIds={editBuf.productIds}
                              onChange={(ids) => setEditBuf((b) => ({ ...b, productIds: ids }))}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
