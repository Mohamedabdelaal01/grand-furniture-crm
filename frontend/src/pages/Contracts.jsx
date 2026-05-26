/**
 * Contracts — purchases viewed as signed contracts.
 * Scoped server-side by role: sales see their own, branch managers see their
 * branch, admin sees all. Editing/deleting is admin / branch-manager only.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FileText, RefreshCw, Pencil, Trash2, Check, X } from 'lucide-react';
import { fetchContracts, updateContract, deleteContract, formatBranch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);
const fmtDate = (iso) => (iso ? String(iso).split(' ')[0].split('T')[0] : '—');

export default function Contracts() {
  const { user } = useAuth();
  const canEdit  = ['admin', 'branch_manager'].includes(user?.role);

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [editId, setEditId]   = useState(null);
  const [editBuf, setEditBuf] = useState({ price: '', contract_number: '' });

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
    setEditBuf({ price: c.price ?? '', contract_number: c.contract_number ?? '' });
  };

  const saveEdit = async (id) => {
    setBusy(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      await updateContract(id, {
        price: editBuf.price,
        contract_number: editBuf.contract_number,
      });
      setRows((prev) => prev.map((r) =>
        r.id === id
          ? { ...r, price: editBuf.price === '' ? null : Number(editBuf.price),
              contract_number: editBuf.contract_number.trim() || null }
          : r
      ));
      setEditId(null);
      toast.success('تم حفظ التعاقد', { id: tId });
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

  const totalValue = rows.reduce((s, r) => s + (Number(r.price) || 0), 0);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">إدارة المبيعات</span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-400" />
            التعاقدات
          </h1>
          {!loading && (
            <p className="text-dark-400 text-sm mt-1">
              {rows.length} تعاقد · إجمالي {fmt(totalValue)} ج.م
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 font-bold">لا توجد تعاقدات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">العميل</th>
                  <th className="py-3 px-4">الفرع</th>
                  <th className="py-3 px-4">السيلز</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4">رقم التعاقد</th>
                  {canEdit && <th className="py-3 px-4 text-center">إجراء</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const editing = editId === c.id;
                  return (
                    <tr key={c.id} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                      <td className="py-3 px-4 text-dark-300">{fmtDate(c.created_at)}</td>
                      <td className="py-3 px-4 text-white font-bold">
                        {c.first_name || c.user_id}
                        {c.phone && (
                          <span className="text-dark-500 font-mono mr-2" dir="ltr">{c.phone}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-dark-300">{formatBranch(c.branch) || '—'}</td>
                      <td className="py-3 px-4 text-dark-300">{c.rep || '—'}</td>
                      <td className="py-3 px-4">
                        {editing ? (
                          <input
                            type="number"
                            inputMode="numeric"
                            dir="ltr"
                            value={editBuf.price}
                            onChange={(e) => setEditBuf((b) => ({ ...b, price: e.target.value }))}
                            className="input-field text-xs py-1.5 w-28"
                          />
                        ) : (
                          <span className="text-emerald-400 font-black">{fmt(c.price)} ج.م</span>
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
                          <span className="text-dark-200 font-mono">{c.contract_number || '—'}</span>
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
                                  className="p-1.5 rounded-lg bg-dark-700 text-dark-400 hover:text-white transition-colors"
                                  title="إلغاء"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(c)}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                                  title="تعديل"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => remove(c)}
                                  disabled={busy}
                                  className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
