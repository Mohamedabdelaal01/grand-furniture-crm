/**
 * BranchLeadsView — "عملاء الفرع" for the branch_manager role.
 *
 * One screen that lists every lead tied to the manager's branch — both ONLINE
 * leads who requested the branch (branch_selected) and WALK-INS who visited —
 * and gives the manager four powers per lead:
 *   1) Mark / un-mark as Duplicate — instantly removes the lead from the sales
 *      rep's queues + KPIs (enforced server-side), reversible.
 *   2) Reassign the Pre-visit follow-up rep (branch_customer_followups.assigned_sales).
 *   3) Reassign the Post-visit follow-up rep (latest lead_visits.sales_rep).
 *   4) Inline-edit the lead's Name and Phone.
 * Plus a flexible Name/Phone search bar (server-side LIKE).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, RefreshCw, Search, Check, X, Pencil, Copy, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SectionHeader from '../components/SectionHeader';
import {
  fetchBranchLeads, fetchSalesReps, setLeadDuplicate, assignCustomerToSales,
  assignPostVisitRep, editBranchCustomerContact, customerName,
} from '../services/api';

const leadClassLabel = { cold: 'بارد', warm: 'دافئ', hot: 'ساخن', visited: 'زار', purchased: 'اشترى' };
const leadClassBg = {
  cold: 'bg-dark-700 text-dark-300', warm: 'bg-amber-500/10 text-amber-400',
  hot: 'bg-rose-500/10 text-rose-400', visited: 'bg-sky-500/10 text-sky-400',
  purchased: 'bg-emerald-500/10 text-emerald-400',
};

// A single inline-editable text cell. Click the pencil to edit; Enter / blur
// saves, Esc cancels.
function InlineEdit({ value, placeholder, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value ?? ''); }, [value]);

  const commit = async () => {
    const next = String(draft).trim();
    setEditing(false);
    if (next === String(value ?? '').trim()) return; // unchanged
    await onSave(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1.5 text-right hover:text-primary-400 transition-colors"
      >
        <span className={value ? '' : 'text-dark-500'}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
      </button>
    );
  }
  return (
    <div className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value ?? ''); setEditing(false); }
        }}
        onBlur={commit}
        className="w-32 bg-dark-900 border border-dark-600 rounded-lg px-2 py-1 text-sm text-white focus:border-primary-500 outline-none"
      />
      <Check className="w-4 h-4 text-emerald-400 cursor-pointer" onMouseDown={commit} />
    </div>
  );
}

// A rep <select>. `value` is the current rep name (or '' for unassigned).
function RepSelect({ value, reps, disabled, onChange }) {
  return (
    <select
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="bg-dark-900 border border-dark-600 rounded-lg px-2 py-1 text-xs text-white focus:border-primary-500 outline-none disabled:opacity-40 max-w-[8.5rem]"
    >
      <option value="">— غير مسند —</option>
      {value && !reps.some((r) => r.name === value) && (
        <option value={value}>{value}</option>
      )}
      {reps.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
    </select>
  );
}

export default function BranchLeadsView() {
  const { user } = useAuth();
  const branch = user?.branch || null;

  const [rows, setRows]       = useState([]);
  const [reps, setReps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');

  // Patch one row in place (optimistic UI after an action succeeds).
  const patchRow = (userId, fields) =>
    setRows((prev) => prev.map((r) => (r.user_id === userId ? { ...r, ...fields } : r)));

  const load = useCallback(async (query) => {
    setLoading(true);
    try {
      const data = await fetchBranchLeads(branch, query);
      setRows(data.customers || []);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل تحميل العملاء');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  // Initial load + reps for the dropdowns.
  useEffect(() => {
    load('');
    fetchSalesReps(branch).then(setReps).catch(() => setReps([]));
  }, [load, branch]);

  // Debounced server-side search as the manager types.
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q, load]);

  // ── actions ────────────────────────────────────────────────────────────────
  const toggleDuplicate = async (row) => {
    const next = row.is_duplicate ? 0 : 1;
    const tId = toast.loading(next ? 'بيتشال من قوائم السيلز...' : 'بيرجع للقوائم...');
    try {
      await setLeadDuplicate(row.user_id, !!next, branch);
      patchRow(row.user_id, { is_duplicate: next });
      toast.success(next ? 'اتسجل كتكرار — اتشال من متابعات السيلز' : 'رجع عميل عادي', { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التعديل', { id: tId });
    }
  };

  const changePre = async (row, sales) => {
    if (!sales) return;
    const tId = toast.loading('جاري الإسناد...');
    try {
      await assignCustomerToSales(row.user_id, sales, branch);
      patchRow(row.user_id, { pre_visit_rep: sales, pre_auto_assigned: 0 });
      toast.success(`اتسند قبل الزيارة لـ ${sales}`, { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الإسناد', { id: tId });
    }
  };

  const changePost = async (row, sales) => {
    if (!sales) return;
    const tId = toast.loading('جاري الإسناد...');
    try {
      await assignPostVisitRep(row.user_id, sales, branch);
      patchRow(row.user_id, { post_visit_rep: sales });
      toast.success(`اتسند بعد الزيارة لـ ${sales}`, { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الإسناد', { id: tId });
    }
  };

  const saveContact = async (row, patch) => {
    try {
      const res = await editBranchCustomerContact(row.user_id, patch);
      patchRow(row.user_id, {
        ...(res.first_name != null ? { first_name: res.first_name } : {}),
        ...(res.phone != null ? { phone: res.phone } : {}),
      });
      toast.success('اتعدّل');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التعديل');
    }
  };

  const dupCount = rows.filter((r) => r.is_duplicate).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={Users}
        title="عملاء الفرع"
        subtitle={`كل عملاء فرعك — أونلاين وزيارات مباشرة${dupCount ? ` · ${dupCount} متكرر` : ''}`}
      />

      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-dark-500 absolute top-1/2 -translate-y-1/2 right-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو رقم التليفون..."
            className="w-full bg-dark-800 border border-dark-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white focus:border-primary-500 outline-none"
          />
          {q && (
            <X className="w-4 h-4 text-dark-500 absolute top-1/2 -translate-y-1/2 left-3 cursor-pointer hover:text-white"
               onClick={() => setQ('')} />
          )}
        </div>
        <button
          onClick={() => load(q.trim())}
          className="flex items-center gap-2 text-sm text-dark-300 bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 hover:text-white hover:border-dark-600"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-500 text-xs border-b border-dark-700">
              <th className="text-right font-medium px-4 py-3">العميل</th>
              <th className="text-right font-medium px-4 py-3">التليفون</th>
              <th className="text-right font-medium px-4 py-3">التصنيف</th>
              <th className="text-right font-medium px-4 py-3">متابعة قبل الزيارة</th>
              <th className="text-right font-medium px-4 py-3">متابعة بعد الزيارة</th>
              <th className="text-center font-medium px-4 py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-dark-500 py-10">جاري التحميل...</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-dark-500 py-10">
                {q ? 'مفيش نتائج للبحث ده' : 'مفيش عملاء في الفرع ده'}
              </td></tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.user_id}
                className={`border-b border-dark-800 hover:bg-dark-800/40 ${r.is_duplicate ? 'opacity-60' : ''}`}
              >
                {/* Name (inline-edit) */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <InlineEdit
                      value={r.first_name || ''}
                      placeholder={customerName(r) || '— بدون اسم —'}
                      onSave={(v) => saveContact(r, { first_name: v })}
                    />
                    {r.is_duplicate ? (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded-md">
                        <Copy className="w-3 h-3" /> متكرر
                      </span>
                    ) : null}
                  </div>
                </td>

                {/* Phone (inline-edit) */}
                <td className="px-4 py-3 font-mono text-dark-200" dir="ltr">
                  <InlineEdit
                    value={r.phone || ''}
                    placeholder="—"
                    type="tel"
                    onSave={(v) => saveContact(r, { phone: v })}
                  />
                </td>

                {/* Class */}
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-lg ${leadClassBg[r.lead_class] || leadClassBg.cold}`}>
                    {leadClassLabel[r.lead_class] || r.lead_class}
                  </span>
                </td>

                {/* Pre-visit rep */}
                <td className="px-4 py-3">
                  <RepSelect value={r.pre_visit_rep} reps={reps} onChange={(v) => changePre(r, v)} />
                  {r.pre_auto_assigned ? (
                    <span className="block text-[10px] text-dark-500 mt-1">اسناد تلقائي</span>
                  ) : null}
                </td>

                {/* Post-visit rep — only meaningful once they visited */}
                <td className="px-4 py-3">
                  {r.visited ? (
                    <RepSelect value={r.post_visit_rep} reps={reps} onChange={(v) => changePost(r, v)} />
                  ) : (
                    <span className="text-xs text-dark-600">لسه مزارش</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleDuplicate(r)}
                    title={r.is_duplicate ? 'رجّعه عميل عادي' : 'علّمه كتكرار'}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                      r.is_duplicate
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-dark-700 text-dark-300 hover:bg-rose-500/15 hover:text-rose-400'
                    }`}
                  >
                    {r.is_duplicate
                      ? (<><RefreshCw className="w-3.5 h-3.5" /> رجوع</>)
                      : (<><ShieldAlert className="w-3.5 h-3.5" /> تكرار</>)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
