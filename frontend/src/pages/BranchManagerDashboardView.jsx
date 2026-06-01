/**
 * BranchManagerDashboardView — for the "branch_manager" role.
 * Locked to the manager's branch. Four views (driven by the `view` prop):
 *   overview  — branch KPIs + per-salesperson performance (incl. follow-up)
 *   pending   — distribute customers to sales reps (manager can also follow up)
 *   done      — customers followed up (who + call summary + visited)
 *   settings  — manage the branch's sales accounts (add/edit/disable/delete)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2, RefreshCw, Users, MapPin, ShoppingBag, Percent, Wallet, UserCheck,
  CheckCircle2, Star, Clock, RotateCcw, Plus, Pencil, Trash2, X,
  Power, ShieldCheck, UserPlus, PhoneCall, BarChart3, TrendingUp, SlidersHorizontal,
  Sparkles, ChevronRight, ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SectionHeader from '../components/SectionHeader';
import RevisitAnalytics from '../components/RevisitAnalytics';
import TargetProgress, { arabicMonthLabel } from '../components/TargetProgress';
import CrossBranchTags from '../components/CrossBranchTags';
import {
  fetchBranchOverview, fetchBranchCustomers, updateCustomerFollowup,
  assignCustomerToSales,
  fetchBranchSales, createBranchSales, updateBranchSales, toggleUserActive,
  formatBranch,
} from '../services/api';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

const leadClassLabel = { cold: 'بارد', warm: 'دافئ', hot: 'ساخن', visited: 'زار', purchased: 'اشترى' };
const leadClassColor = { cold: 'text-dark-400', warm: 'text-amber-400', hot: 'text-rose-400', visited: 'text-sky-400', purchased: 'text-emerald-400' };
const leadClassBg    = { cold: 'bg-dark-700', warm: 'bg-amber-500/10', hot: 'bg-rose-500/10', visited: 'bg-sky-500/10', purchased: 'bg-emerald-500/10' };

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return 'اليوم';
  if (d === 1) return 'أمس';
  return `${d} يوم`;
}

const KPI = ({ icon: Icon, label, value, tone = 'primary' }) => {
  const tones = {
    primary: 'text-primary-400 bg-primary-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber:   'text-amber-400 bg-amber-500/10',
    sky:     'text-sky-400 bg-sky-500/10',
  };
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-dark-500 text-xs mt-1">{label}</p>
    </div>
  );
};

// Modal: the manager records his own follow-up call + summary.
function CallSummaryModal({ customer, onConfirm, onClose }) {
  const [summary, setSummary] = useState('');
  const [saving, setSaving]   = useState(false);

  const confirm = async () => {
    setSaving(true);
    await onConfirm(summary.trim());
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black">متابعة العميل</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-dark-400 text-xs mb-3">{customer.first_name || customer.user_id}</p>
        <label className="block text-dark-400 text-xs mb-1">ملخص المكالمة (اختياري)</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={4}
          placeholder="اكتب اللي حصل في المكالمة..."
          className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm mb-5 focus:outline-none focus:border-primary-500 resize-none"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
          <button onClick={confirm} disabled={saving} className="btn-primary flex-1">
            {saving ? '...' : 'تأكيد المتابعة'}
          </button>
        </div>
      </div>
    </div>
  );
}

// One customer row in the "distribute" (pending) view.
function AssignRow({ c, salesNames, busy, onAssign, onSelfFollow }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-dark-800/20 transition-colors flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{c.first_name || c.user_id}</span>
          <CrossBranchTags c={c} />
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${leadClassBg[c.lead_class] || 'bg-dark-700'} ${leadClassColor[c.lead_class] || 'text-dark-400'}`}>
            {leadClassLabel[c.lead_class] || c.lead_class}
          </span>
          {c.visited ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400">زار المعرض</span>
          ) : null}
          {c.assigned_sales ? (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              c.auto_assigned
                ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30'
                : 'bg-primary-500/10 text-primary-400'
            }`}>
              مسنود لـ {c.assigned_sales}
            </span>
          ) : (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-dark-700 text-dark-400">
              مش متوزّع
            </span>
          )}
          {c.auto_assigned ? (
            <span
              title="السيلز ده وقف مع العميل في المعرض — السيستم سند العميل ليه تلقائياً"
              className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30"
            >
              <Sparkles className="w-3 h-3" />
              اسناد تلقائي
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-dark-400 flex-wrap">
          {c.phone && (
            <span dir="ltr" className="font-mono font-bold text-emerald-400">📱 {c.phone}</span>
          )}
          {c.last_product && <span>🛋️ {c.last_product}</span>}
          {c.last_category && <span>{c.last_category}</span>}
          {c.session_count != null && <span>جلسات: {c.session_count}</span>}
          {c.product_view_count != null && <span>مشاهدات: {c.product_view_count}</span>}
          {c.campaign_source && <span>📣 {c.campaign_source}</span>}
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(c.last_activity)}</span>
          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{c.total_score}</span>
        </div>
        {c.last_input_text && (
          <p className="mt-1 text-[11px] text-dark-300 leading-snug">💬 {c.last_input_text}</p>
        )}
      </div>

      <select
        value={c.assigned_sales || ''}
        disabled={busy}
        onChange={e => e.target.value && onAssign(c, e.target.value)}
        className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-primary-500 max-w-[150px]"
      >
        <option value="" disabled>اسند لـ سيلز…</option>
        {salesNames.map(n => <option key={n} value={n}>{n}</option>)}
      </select>

      <button
        onClick={() => onSelfFollow(c)}
        disabled={busy}
        title="تابعت العميل بنفسي"
        className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full px-3 py-1.5 transition-colors"
      >
        {busy ? (
          <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        ) : <PhoneCall className="w-4 h-4" />}
        تابعت أنا
      </button>
    </div>
  );
}

// One customer row in the "done" view.
function DoneRow({ c, busy, onRevert }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-dark-800/20 transition-colors">
      <button
        onClick={() => onRevert(c)}
        disabled={busy}
        title="رجّعه لـ لسه متمش متابعته"
        className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-full px-3 py-1.5 transition-colors mt-0.5"
      >
        {busy ? (
          <div className="w-3.5 h-3.5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
        ) : <RotateCcw className="w-4 h-4" />}
        إرجاع
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{c.first_name || c.user_id}</span>
          <CrossBranchTags c={c} />
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${leadClassBg[c.lead_class] || 'bg-dark-700'} ${leadClassColor[c.lead_class] || 'text-dark-400'}`}>
            {leadClassLabel[c.lead_class] || c.lead_class}
          </span>
          {c.visited ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">تمت الزيارة</span>
          ) : (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">لسه مزارش</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-dark-400 flex-wrap">
          {c.phone && (
            <span dir="ltr" className="font-mono font-bold text-emerald-400">📱 {c.phone}</span>
          )}
          {c.last_product && <span>🛋️ {c.last_product}</span>}
          {c.last_category && <span>{c.last_category}</span>}
          <span className="text-emerald-500">تابع: <b>{c.followed_up_by || '—'}</b></span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(c.followed_up_at)}</span>
        </div>
        {c.call_summary && (
          <p className="mt-1.5 text-[12px] text-dark-200 bg-dark-800/60 rounded-lg px-3 py-2 leading-relaxed">
            {c.call_summary}
          </p>
        )}
      </div>
    </div>
  );
}

// Client-side paginator over an already-loaded list. Keeps the tab counts and
// filters working on the full set while only rendering one page at a time.
const PAGE_SIZE = 50;
function usePaged(rows) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // Clamp when the list shrinks (e.g. a customer gets followed up / filtered out).
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const start = (page - 1) * PAGE_SIZE;
  return { page, setPage, totalPages, pageRows: rows.slice(start, start + PAGE_SIZE), start };
}

function Pager({ page, totalPages, setPage, start, count }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 p-3 border-t border-dark-800 text-xs">
      <button
        onClick={() => setPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-colors"
      >
        <ChevronRight className="w-4 h-4" /> السابق
      </button>
      <span className="text-dark-400 font-bold">
        صفحة <b className="text-white">{page}</b> من {totalPages}
        <span className="text-dark-600"> · عرض {start + 1}–{start + count}</span>
      </span>
      <button
        onClick={() => setPage(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-800/60 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold transition-colors"
      >
        التالي <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}

function PendingView({ customers, loading, salesNames, busy, onAssign, onSelfFollow }) {
  const rows = customers.filter(c => !c.followed_up);
  const { page, setPage, totalPages, pageRows, start } = usePaged(rows);
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b border-dark-800">
        <UserPlus className="w-4 h-4 text-amber-400" />
        <h4 className="text-white font-black text-sm">توزيع المتابعات</h4>
        <span className="text-xs text-dark-400 font-bold">({rows.length})</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : salesNames.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-12">
          لازم تضيف سيلز الأول من <b className="text-dark-300">إعدادات الفرع</b> علشان توزّع عليهم
        </p>
      ) : rows.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-16">مفيش عملاء مستنيين توزيع 🎉</p>
      ) : (
        <>
          <div className="divide-y divide-dark-800/60">
            {pageRows.map(c => (
              <AssignRow
                key={c.user_id}
                c={c}
                salesNames={salesNames}
                busy={!!busy[c.user_id]}
                onAssign={onAssign}
                onSelfFollow={onSelfFollow}
              />
            ))}
          </div>
          <Pager page={page} totalPages={totalPages} setPage={setPage} start={start} count={pageRows.length} />
        </>
      )}
    </div>
  );
}

function DoneView({ customers, loading, busy, onRevert }) {
  const rows = customers.filter(c => !!c.followed_up);
  const { page, setPage, totalPages, pageRows, start } = usePaged(rows);
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b border-dark-800">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <h4 className="text-white font-black text-sm">عملاء تمت متابعتهم</h4>
        <span className="text-xs text-dark-400 font-bold">({rows.length})</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-16">لسه محدش اتمتابع</p>
      ) : (
        <>
          <div className="divide-y divide-dark-800/60">
            {pageRows.map(c => (
              <DoneRow key={c.user_id} c={c} busy={!!busy[c.user_id]} onRevert={onRevert} />
            ))}
          </div>
          <Pager page={page} totalPages={totalPages} setPage={setPage} start={start} count={pageRows.length} />
        </>
      )}
    </div>
  );
}

// ── Sales account create/edit modal ──────────────────────────────────────────
function SalesModal({ editing, onSave, onClose }) {
  const [name, setName]     = useState(editing?.name  || '');
  const [email, setEmail]   = useState(editing?.email || '');
  const [password, setPass] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name || !email || (!editing && !password)) {
      toast.error('املا كل الخانات');
      return;
    }
    setSaving(true);
    const ok = await onSave({ name, email, ...(password ? { password } : {}) });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl" onClick={onClose}>
      <form className="card p-6 w-full max-w-sm" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-black">{editing ? 'تعديل سيلز' : 'إضافة سيلز جديد'}</h3>
          <button type="button" onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-dark-400 text-xs mb-1">الاسم</label>
        <input value={name} onChange={e => setName(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm mb-4 focus:outline-none focus:border-primary-500" />
        <label className="block text-dark-400 text-xs mb-1">الإيميل</label>
        <input value={email} type="email" onChange={e => setEmail(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm mb-4 focus:outline-none focus:border-primary-500" dir="ltr" />
        <label className="block text-dark-400 text-xs mb-1">
          {editing ? 'باسورد جديد (سيبه فاضي لو مش هتغيّره)' : 'الباسورد'}
        </label>
        <input value={password} type="text" onChange={e => setPass(e.target.value)}
          className="w-full bg-dark-800 border border-dark-700 rounded-xl px-3 py-2.5 text-white text-sm mb-5 focus:outline-none focus:border-primary-500" dir="ltr" />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">إلغاء</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? '...' : 'حفظ'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsView() {
  const [sales, setSales]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | { editing? }
  const [busy, setBusy]       = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBranchSales();
      setSales(res.sales || []);
    } catch (_) {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form) => {
    const tId = toast.loading('جاري الحفظ...');
    try {
      if (modal?.editing) {
        await updateBranchSales(modal.editing.id, form);
      } else {
        await createBranchSales(form);
      }
      toast.success('تم الحفظ', { id: tId });
      await load();
      return true;
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحفظ', { id: tId });
      return false;
    }
  };

  // Soft offboarding — the only way a branch manager can "remove" a rep.
  const toggleActive = async (s) => {
    setBusy(b => ({ ...b, [s.id]: true }));
    try {
      const res = await toggleUserActive(s.id);
      setSales(prev => prev.map(x => x.id === s.id ? { ...x, active: res.active } : x));
      toast.success(res.active ? 'تم تنشيط الحساب' : 'تم تعطيل الحساب');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التعديل');
    }
    setBusy(b => ({ ...b, [s.id]: false }));
  };

  return (
    <>
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center justify-between gap-3 border-b border-dark-800 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-400" />
          <h4 className="text-white font-black text-sm">سيلز الفرع</h4>
          <span className="text-xs text-dark-400 font-bold">({sales.length})</span>
        </div>
        <button onClick={() => setModal({})} className="btn-primary text-xs py-2 px-3 flex items-center gap-1">
          <Plus className="w-4 h-4" /> إضافة سيلز
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-16">لسه مفيش سيلز — اضغط "إضافة سيلز"</p>
      ) : (
        <div className="divide-y divide-dark-800/60">
          {sales.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-sm truncate">{s.name}</span>
                  {s.active ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">نشِط</span>
                  ) : (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400">موقوف</span>
                  )}
                </div>
                <p className="text-dark-400 text-[11px] mt-0.5" dir="ltr">{s.email}</p>
              </div>
              <button onClick={() => toggleActive(s)} disabled={busy[s.id]}
                title={s.active ? 'إيقاف' : 'تفعيل'}
                className={`p-2 rounded-lg transition-colors ${s.active ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}>
                <Power className="w-4 h-4" />
              </button>
              <button onClick={() => setModal({ editing: s })}
                title="تعديل"
                className="p-2 rounded-lg text-sky-400 hover:bg-sky-500/10 transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>

    {modal && (
      <SalesModal editing={modal.editing} onSave={handleSave} onClose={() => setModal(null)} />
    )}
    </>
  );
}

export default function BranchManagerDashboardView({ view = 'overview' }) {
  const { user } = useAuth();
  const branch   = user?.branch || null;

  const [searchParams] = useSearchParams();
  const [data, setData]           = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [sales, setSales]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [custLoading, setCustLoading] = useState(true);
  const [error, setError]         = useState(null);
  const [busy, setBusy]           = useState({});
  const [callFor, setCallFor]     = useState(null); // customer awaiting manager's call summary

  // Customer filters — registration type is seeded from the URL so the
  // sidebar "عملاء الاستقبال" link lands pre-filtered.
  const [phoneFilter, setPhoneFilter] = useState('');
  const [regFilter,   setRegFilter]   = useState(searchParams.get('registration') || '');
  useEffect(() => {
    setRegFilter(searchParams.get('registration') || '');
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await fetchBranchOverview());
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'تعذّر التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustLoading(true);
    try {
      const res = await fetchBranchCustomers();
      setCustomers(res.customers || []);
      setCustomerTotal(res.total ?? (res.customers || []).length);
    } catch (_) {
      setCustomers([]);
    } finally {
      setCustLoading(false);
    }
  }, []);

  const loadSales = useCallback(async () => {
    try {
      const res = await fetchBranchSales();
      setSales(res.sales || []);
    } catch (_) {
      setSales([]);
    }
  }, []);

  useEffect(() => {
    if (!branch) return;
    if (view === 'overview') load();
    if (view === 'pending' || view === 'done') { loadCustomers(); loadSales(); }
  }, [branch, view, load, loadCustomers, loadSales]);

  const patchCustomer = (userId, patch) =>
    setCustomers(prev => prev.map(c => c.user_id === userId ? { ...c, ...patch } : c));

  const onAssign = async (cust, salesName) => {
    setBusy(b => ({ ...b, [cust.user_id]: true }));
    try {
      await assignCustomerToSales(cust.user_id, salesName);
      patchCustomer(cust.user_id, { assigned_sales: salesName });
      toast.success(`اتسند لـ ${salesName}`);
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التوزيع');
    }
    setBusy(b => ({ ...b, [cust.user_id]: false }));
  };

  const onSelfFollow = (cust) => setCallFor(cust);

  const confirmSelfFollow = async (summary) => {
    const cust = callFor;
    setCallFor(null);
    setBusy(b => ({ ...b, [cust.user_id]: true }));
    try {
      await updateCustomerFollowup(cust.user_id, true, user?.name || 'المدير', summary || null);
      patchCustomer(cust.user_id, {
        followed_up: 1,
        followed_up_by: user?.name || 'المدير',
        followed_up_at: new Date().toISOString(),
        call_summary: summary || null,
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التعديل');
    }
    setBusy(b => ({ ...b, [cust.user_id]: false }));
  };

  const onRevert = async (cust) => {
    setBusy(b => ({ ...b, [cust.user_id]: true }));
    try {
      await updateCustomerFollowup(cust.user_id, false, null, null);
      patchCustomer(cust.user_id, {
        followed_up: 0, followed_up_by: null, followed_up_at: null, call_summary: null,
      });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التعديل');
    }
    setBusy(b => ({ ...b, [cust.user_id]: false }));
  };

  if (!branch) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center" dir="rtl">
        <div className="card p-10 border-amber-500/20 bg-amber-500/5">
          <Building2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-black mb-1">الحساب ده مش مربوط بفرع</p>
          <p className="text-dark-400 text-sm">كلّم مدير النظام يحدّد فرع لحساب مدير الفرع ده.</p>
        </div>
      </div>
    );
  }

  const k = data?.kpis || {};
  const bySales = data?.bySales || [];
  const activeSalesNames = sales.filter(s => s.active !== 0).map(s => s.name);

  // Apply the customer filters (phone left? / registration type)
  const filteredCustomers = useMemo(() => customers.filter(c => {
    if (phoneFilter === 'yes' && !c.phone) return false;
    if (phoneFilter === 'no'  &&  c.phone) return false;
    if (regFilter === 'manual' && c.manychat_source !== 'walkin') return false;
    if (regFilter === 'online' && c.manychat_source === 'walkin') return false;
    return true;
  }), [customers, phoneFilter, regFilter]);
  const viewLabel = {
    overview: 'نظرة عامة',
    pending:  'توزيع المتابعات',
    done:     'عملاء تمت متابعتهم',
    settings: 'إعدادات الفرع',
  }[view];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
              مدير فرع · {viewLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-400" />
            فرع {formatBranch(branch)}
          </h1>
        </div>
        <div className="flex gap-2">
          {(view === 'pending' || view === 'done') && (
            <button onClick={loadCustomers} disabled={custLoading} className="btn-secondary">
              <RefreshCw className={`w-4 h-4 ${custLoading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          )}
          {view === 'overview' && (
            <button onClick={load} disabled={loading} className="btn-secondary">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          )}
        </div>
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {view === 'overview' && (
        error ? (
          <div className="card p-10 text-center border-rose-500/20 bg-rose-500/5">
            <p className="text-white font-black mb-1">تعذّر التحميل</p>
            <p className="text-dark-400 text-sm mb-5">{error}</p>
            <button onClick={load} className="btn-primary">إعادة المحاولة</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-4">
              <SectionHeader
                icon={BarChart3}
                title="أرقام الفرع"
                subtitle="نظرة سريعة على أداء الفرع ده"
                accent="primary"
              />
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <KPI icon={Users}       label="عملاء طلبوا الفرع" value={fmt(k.requested)}    tone="primary" />
                <KPI icon={MapPin}      label="زاروا المعرض"      value={fmt(k.visited)}      tone="sky" />
                <KPI icon={ShoppingBag} label="اشتروا"            value={fmt(k.bought)}       tone="emerald" />
                <KPI icon={Percent}     label="نسبة التقفيل"      value={`${k.close_rate || 0}%`} tone="amber" />
                <div className="card p-5">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-white">{fmt(k.contracts_count)}</p>
                  <p className="text-dark-500 text-xs mt-1">عدد تعاقدات الفرع</p>
                  <TargetProgress
                    target={k.target}
                    percent={k.target_pct}
                    label={`مستهدف الفرع — ${arabicMonthLabel()}`}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionHeader
                icon={TrendingUp}
                title="أداء السيلز"
                subtitle="مقارنة بين سيلز الفرع — كل واحد بأرقامه"
                accent="violet"
              />
              <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                      <th className="py-3 px-4">السيلز</th>
                      <th className="py-3 px-4 text-center">مسنود له</th>
                      <th className="py-3 px-4 text-center">تمت متابعتهم</th>
                      <th className="py-3 px-4 text-center">نسبة المتابعة</th>
                      <th className="py-3 px-4 text-center">وقف مع</th>
                      <th className="py-3 px-4 text-center">اشترى</th>
                      <th className="py-3 px-4 text-center">نسبة التقفيل</th>
                      <th className="py-3 px-4 text-center">تابع + زار</th>
                      <th className="py-3 px-4 text-center">تابع + لسه</th>
                      <th className="py-3 px-4 text-center">عدد التعاقدات</th>
                      <th className="py-3 px-4 text-center">المستهدف</th>
                      <th className="py-3 px-4 text-center">نسبة التحقيق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bySales.length === 0 ? (
                      <tr><td colSpan={12} className="py-10 text-center text-dark-500">لسه مفيش بيانات سيلز للفرع ده</td></tr>
                    ) : bySales.map((r, i) => (
                      <tr key={`${r.sales_rep}-${i}`} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                        <td className="py-3 px-4 text-white font-bold">{r.sales_rep}</td>
                        <td className="py-3 px-4 text-center text-sky-400 font-black">{r.assigned || 0}</td>
                        <td className="py-3 px-4 text-center text-primary-400 font-bold">{r.followed_up || 0}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-black ${r.followup_rate >= 70 ? 'text-emerald-400' : r.followup_rate >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {r.followup_rate || 0}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-dark-200 font-bold">{r.served}</td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.bought}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-black ${r.close_rate >= 30 ? 'text-emerald-400' : r.close_rate >= 10 ? 'text-amber-400' : 'text-dark-500'}`}>
                            {r.close_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.fu_visited || 0}</td>
                        <td className="py-3 px-4 text-center text-amber-400 font-bold">{r.fu_not_visited || 0}</td>
                        <td className="py-3 px-4 text-center text-primary-400 font-black">{r.contracts || 0}</td>
                        <td className="py-3 px-4 text-center text-dark-300 font-bold">
                          {r.target ? `${fmt(r.target)} تعاقد` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {r.target ? (
                            <span className={`font-black ${
                              r.target_pct >= 100 ? 'text-emerald-400'
                              : r.target_pct >= 60 ? 'text-primary-400'
                              : r.target_pct >= 30 ? 'text-amber-400'
                              : 'text-rose-400'
                            }`}>
                              {r.target_pct}%
                            </span>
                          ) : <span className="text-dark-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>
            </section>

            {/* Re-visit follow-up analytics for this branch */}
            <section className="space-y-4">
              <SectionHeader
                icon={TrendingUp}
                title="متابعة الزيارات"
                subtitle="العملاء اللي زاروا الفرع — مين اشترى، مين بيتتابع، ومين اتقفل"
                accent="emerald"
              />
              <RevisitAnalytics />
            </section>
          </div>
        )
      )}

      {/* ── Customer filters (pending/done) ──────────────────────────────── */}
      {(view === 'pending' || view === 'done') && (
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <SlidersHorizontal className="w-4 h-4 text-dark-500 flex-shrink-0" />
          <select
            value={phoneFilter}
            onChange={e => setPhoneFilter(e.target.value)}
            className="input-field text-sm py-2 pr-3 min-w-[140px]"
          >
            <option value="">كل العملاء</option>
            <option value="yes">ساب رقمه</option>
            <option value="no">مساب رقمش</option>
          </select>
          <select
            value={regFilter}
            onChange={e => setRegFilter(e.target.value)}
            className="input-field text-sm py-2 pr-3 min-w-[150px]"
          >
            <option value="">كل طرق التسجيل</option>
            <option value="online">تسجيل أونلاين</option>
            <option value="manual">تسجيل يدوي (استقبال)</option>
          </select>
          <span className="text-dark-500 text-xs font-bold mr-auto">
            {filteredCustomers.length} من {customers.length} عميل
            {customerTotal > customers.length && (
              <span className="text-amber-400"> · إجمالي الفرع {customerTotal} (بيتعرض أحدث {customers.length})</span>
            )}
          </span>
        </div>
      )}

      {/* ── Pending (distribute) ─────────────────────────────────────────── */}
      {view === 'pending' && (
        <PendingView
          customers={filteredCustomers}
          loading={custLoading}
          salesNames={activeSalesNames}
          busy={busy}
          onAssign={onAssign}
          onSelfFollow={onSelfFollow}
        />
      )}

      {/* ── Done ─────────────────────────────────────────────────────────── */}
      {view === 'done' && (
        <DoneView
          customers={filteredCustomers}
          loading={custLoading}
          busy={busy}
          onRevert={onRevert}
        />
      )}

      {/* ── Settings ─────────────────────────────────────────────────────── */}
      {view === 'settings' && <SettingsView />}

      {callFor && (
        <CallSummaryModal
          customer={callFor}
          onConfirm={confirmSelfFollow}
          onClose={() => setCallFor(null)}
        />
      )}
    </div>
  );
}
