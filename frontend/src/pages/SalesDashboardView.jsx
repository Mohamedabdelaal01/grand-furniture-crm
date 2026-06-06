/**
 * SalesDashboardView — for the "sales" role (showroom salesperson).
 * View-driven (the `view` prop comes from the route / sidebar):
 *   home        — KPIs + عملائي (reception-attached customers) = main page
 *   pending     — عملاء محتاجين متابعة (assigned by manager, not done yet)
 *   done        — عملاء تابعتهم خلاص (all followed up)
 *   visited     — تابعتهم + زاروا المعرض
 *   not-visited — تابعتهم + لسه مزاروش
 * Following up opens a modal to write a call summary, which the
 * manager / admin see on the customer profile.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  RefreshCw, Users, ShoppingBag, Percent, Wallet, CheckCircle2, Clock,
  PhoneCall, X, Star, MapPinned, MapPinOff, BarChart3, Search, CheckSquare, Square,
  MessageSquarePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SectionHeader from '../components/SectionHeader';
import {
  fetchMySalesCustomers, fetchSalesFollowups, submitSalesFollowup, setSalesFollowupSent,
  fetchSalesFollowupLog, addSalesFollowupLog,
  formatBranch, formatLeadClass, getLeadBadgeClass, fetchMyTarget,
  customerName,
} from '../services/api';
import TargetProgress, { arabicMonthLabel } from '../components/TargetProgress';
import CrossBranchTags from '../components/CrossBranchTags';

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

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return 'اليوم';
  if (d === 1) return 'أمس';
  return `${d} يوم`;
}

// Canonicalize an Egyptian phone to digits (mirrors the backend normalizePhone):
// strips +, spaces, the 00 intl prefix and the 20 country code, and ensures the
// leading 0. So "+201095430679", "01095430679", "0109 543 0679" all become
// "01095430679" — letting the rep search by whatever format the customer gave.
function normalizePhone(raw) {
  if (raw == null) return '';
  let d = String(raw).replace(/\D/g, '');
  if (!d) return '';
  d = d.replace(/^00/, '');
  if (d.startsWith('20') && d.length >= 11) d = d.slice(2);
  if (d.length === 10 && d[0] !== '0') d = '0' + d;
  return d;
}

// Does any phone on this customer match the (normalized) search query? A
// substring match means typing just the last few digits is enough.
function customerMatchesPhone(customer, normQuery) {
  if (!normQuery) return true;
  return String(customer.phones || '')
    .split('،')
    .some(p => normalizePhone(p).includes(normQuery));
}

// Tabs for the merged pre-visit follow-up page
const FUP_TABS = [
  { id: 'pending',     label: 'محتاجين متابعة', icon: PhoneCall, tone: 'text-amber-400',
    title: 'عملاء محتاجين متابعة',  empty: 'مفيش عملاء مسنودين ليك للمتابعة دلوقتي' },
  { id: 'visited',     label: 'تابعتهم + زاروا', icon: MapPinned, tone: 'text-emerald-400',
    title: 'تابعتهم وزاروا المعرض', empty: 'مفيش عملاء تابعتهم وزاروا المعرض لسه' },
  { id: 'not-visited', label: 'تابعتهم + لسه',  icon: MapPinOff, tone: 'text-amber-400',
    title: 'تابعتهم ولسه مزاروش',   empty: 'كل اللي تابعتهم زاروا المعرض 👌' },
];

// Sales rep writes the call summary when marking an assigned follow-up done.
function CallModal({ customer, onConfirm, onClose }) {
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
        <p className="text-dark-400 text-xs mb-3">{customerName(customer)}</p>
        <label className="block text-dark-400 text-xs mb-1">ملخص المكالمة</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          rows={4}
          placeholder="اكتب اللي حصل في المكالمة مع العميل..."
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

// Multiple pre-visit follow-ups (updates timeline) for a customer who's been
// followed up but hasn't visited yet — the rep can keep logging progress.
function FollowupHistory({ c }) {
  const [open, setOpen]       = useState(false);
  const [log, setLog]         = useState(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await fetchSalesFollowupLog(c.user_id); setLog(r.log || []); }
    catch { setLog([]); }
    setLoading(false);
  };
  const toggle = () => { const n = !open; setOpen(n); if (n && log === null) load(); };
  const submit = async () => {
    const t = note.trim();
    if (!t) return;
    setSaving(true);
    try {
      await addSalesFollowupLog(c.user_id, t);
      setNote('');
      await load();
      toast.success('اتسجّلت المتابعة');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحفظ');
    }
    setSaving(false);
  };

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="text-[11px] font-bold text-primary-400 hover:text-primary-300 flex items-center gap-1"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" />
        {open ? 'إخفاء المتابعات' : 'متابعات / أضف تحديث'}
        {log && log.length > 0 && <span className="text-dark-500">({log.length})</span>}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="اكتب تحديث المتابعة (مثال: اتصلت، قال هييجي الأسبوع الجاي)"
              className="input-field flex-1 text-xs py-1.5"
            />
            <button
              onClick={submit}
              disabled={saving || !note.trim()}
              className="btn-primary text-xs px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? '...' : 'إضافة'}
            </button>
          </div>
          {loading ? (
            <p className="text-dark-500 text-[11px]">جاري التحميل...</p>
          ) : log && log.length > 0 ? (
            <div className="space-y-1.5">
              {log.map((item) => (
                <div key={item.id} className="bg-dark-800/60 rounded-lg px-3 py-2 border-r-2 border-primary-500/30">
                  <p className="text-[12px] text-dark-100 leading-relaxed">{item.call_summary || '—'}</p>
                  <p className="text-[10px] text-dark-500 mt-1 flex items-center gap-2">
                    <span>{item.sales || '—'}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(item.followed_up_at)}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-600 text-[11px]">مفيش متابعات مسجّلة لسه — أضف أول تحديث</p>
          )}
        </div>
      )}
    </div>
  );
}

function FollowupRow({ c, mode, busy, onFollow, onToggleSent }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3 hover:bg-dark-800/20 transition-colors">
      <div className="shrink-0 flex flex-col gap-1.5 mt-0.5 w-[78px]">
        {/* "بعت" — lightweight sent marker (separate from "تابعت"); persists. */}
        {mode === 'pending' && (
          <button
            onClick={() => onToggleSent(c)}
            title="علّم إنك بعت رسالة للعميل"
            className={`flex items-center justify-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border transition-colors ${
              c.sent
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                : 'bg-dark-800/60 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'
            }`}
          >
            {c.sent ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            بعت
          </button>
        )}
        {mode === 'pending' ? (
          <button
            onClick={() => onFollow(c)}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full px-3 py-1.5 transition-colors"
          >
            {busy ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            ) : <PhoneCall className="w-4 h-4" />}
            تابعت
          </button>
        ) : (
          <span className="text-emerald-400"><CheckCircle2 className="w-5 h-5" /></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white font-bold text-sm truncate">{customerName(c)}</span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${getLeadBadgeClass(c.lead_class)}`}>
            {formatLeadClass(c.lead_class)}
          </span>
          {mode !== 'pending' && (
            c.visited
              ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">تمت الزيارة</span>
              : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">لسه مزارش</span>
          )}
          <CrossBranchTags c={c} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-dark-400 flex-wrap">
          {c.phones && <span className="font-mono" dir="ltr">{c.phones}</span>}
          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{c.total_score}</span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {mode === 'pending' ? `اتسند ${timeAgo(c.assigned_at)}` : timeAgo(c.followed_up_at)}
          </span>
        </div>
        {mode !== 'pending' && (
          <>
            {c.call_summary && (
              <p className="mt-1.5 text-[12px] text-dark-200 bg-dark-800/60 rounded-lg px-3 py-2 leading-relaxed">
                {c.call_summary}
              </p>
            )}
            {c.visited && (
              <Link
                to="/revisit"
                className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg px-3 py-2 transition-colors"
              >
                <MapPinned className="w-3.5 h-3.5 shrink-0" />
                تمت زيارته للمعرض — كمّل متابعته في «متابعة بعد الزيارة» ←
              </Link>
            )}
            <FollowupHistory c={c} />
          </>
        )}
      </div>
    </div>
  );
}

function FollowupList({ icon: Icon, tone, title, rows, loading, mode, busy, onFollow, onToggleSent, emptyText }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center gap-2 border-b border-dark-800">
        <Icon className={`w-4 h-4 ${tone}`} />
        <h4 className="text-white font-black text-sm">{title}</h4>
        <span className="text-xs text-dark-400 font-bold">({rows.length})</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-center text-dark-500 text-sm py-16">{emptyText}</p>
      ) : (
        <div className="divide-y divide-dark-800/60">
          {rows.map(c => (
            <FollowupRow key={c.user_id} c={c} mode={mode} busy={!!busy[c.user_id]} onFollow={onFollow} onToggleSent={onToggleSent} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesDashboardView({ view = 'home' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [followups, setFups]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [fupLoading, setFupLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [busy, setBusy]       = useState({});
  const [callFor, setCallFor] = useState(null);
  const [fupTab, setFupTab]   = useState('pending'); // active tab on /sales/followups
  const [phoneQuery, setPhoneQuery] = useState('');  // phone search on the follow-up page

  const loadHome = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await fetchMySalesCustomers());
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'تعذّر التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFollowups = useCallback(async () => {
    setFupLoading(true);
    try {
      const res = await fetchSalesFollowups();
      setFups(res.customers || []);
    } catch (_) {
      setFups([]);
    } finally {
      setFupLoading(false);
    }
  }, []);

  // Personal sales target + achievement
  const [myTarget, setMyTarget] = useState(null);
  useEffect(() => {
    if (view !== 'home') return;
    fetchMyTarget().then(setMyTarget).catch(() => setMyTarget(null));
  }, [view]);

  useEffect(() => {
    if (view === 'home') loadHome();
    else loadFollowups();
  }, [view, loadHome, loadFollowups]);

  const onFollow = (c) => setCallFor(c);

  // Toggle the lightweight "بعت" (sent first outreach) flag. Optimistic — flip it
  // in the list immediately, revert if the server rejects.
  const onToggleSent = async (c) => {
    const next = c.sent ? 0 : 1;
    setFups(prev => prev.map(x => x.user_id === c.user_id ? { ...x, sent: next } : x));
    try {
      await setSalesFollowupSent(c.user_id, !!next);
    } catch (e) {
      setFups(prev => prev.map(x => x.user_id === c.user_id ? { ...x, sent: c.sent } : x));
      toast.error(e?.response?.data?.error || 'فشل الحفظ');
    }
  };

  const confirmFollow = async (summary) => {
    const c = callFor;
    setCallFor(null);
    setBusy(b => ({ ...b, [c.user_id]: true }));
    try {
      await submitSalesFollowup(c.user_id, true, summary || null);
      setFups(prev => prev.map(x =>
        x.user_id === c.user_id
          ? { ...x, followed_up: 1, followed_up_at: new Date().toISOString(), call_summary: summary || null }
          : x
      ));
      toast.success('تم تسجيل المتابعة');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التسجيل');
    }
    setBusy(b => ({ ...b, [c.user_id]: false }));
  };

  const k = data?.kpis || {};
  const customers = data?.customers || [];
  const refresh = view === 'home' ? loadHome : loadFollowups;
  const refreshing = view === 'home' ? loading : fupLoading;

  const viewLabel = {
    home:      'عملائي',
    followups: 'متابعة قبل الزيارة',
  }[view] || 'المتابعات';

  const lists = {
    pending:       followups.filter(f => !f.followed_up),
    done:          followups.filter(f => !!f.followed_up),
    visited:       followups.filter(f => !!f.followed_up && f.visited),
    'not-visited': followups.filter(f => !!f.followed_up && !f.visited),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
              مبيعات · {viewLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">أهلاً، {user?.name || 'سيلز'}</h1>
          {user?.branch && (
            <p className="text-dark-400 text-sm mt-1">فرع {formatBranch(user.branch)}</p>
          )}
        </div>
        <button onClick={refresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* ── Home: KPIs + my customers ─────────────────────────────────────── */}
      {view === 'home' && (
        <div className="space-y-10">
          <section className="space-y-4">
            <SectionHeader
              icon={BarChart3}
              title="أرقامي هذا الشهر"
              subtitle="مبيعاتك وأدائك في الشهر الحالي"
              accent="primary"
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-emerald-400 bg-emerald-500/10">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-white">{myTarget?.contracts ?? (k.bought_month || 0)}</p>
                <p className="text-dark-500 text-xs mt-1">تعاقداتي هذا الشهر</p>
                <TargetProgress
                  target={myTarget?.target || 0}
                  percent={myTarget?.percent || 0}
                  label={`مستهدفي — ${arabicMonthLabel()}`}
                />
              </div>
              <KPI icon={Users}       label="عملاء وقفت معاهم"        value={k.served_month || 0} tone="primary" />
              <KPI icon={ShoppingBag} label="اشتروا"                  value={k.bought_month || 0} tone="sky" />
              <KPI icon={Percent}     label="نسبة التقفيل"            value={`${k.close_rate || 0}%`} tone="amber" />
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader
              icon={Users}
              title={`عملائي (${customers.length})`}
              subtitle="العملاء اللي الاستقبال حدّدك معاهم"
              accent="violet"
            />
            <div className="card p-5">

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-10">
                <p className="text-rose-400 font-bold mb-3">{error}</p>
                <button onClick={loadHome} className="btn-primary">إعادة المحاولة</button>
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-dark-700 mx-auto mb-3" />
                <p className="text-dark-400 font-bold">لسه مفيش عملاء متحدّدين ليك</p>
                <p className="text-dark-600 text-sm mt-1">
                  أول ما الاستقبال يحدّدك مع عميل وصل المعرض هيظهر هنا
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {customers.map((c) => {
                  const bought = c.my_purchases > 0;
                  return (
                    <button
                      key={c.user_id}
                      onClick={() => navigate(`/leads/${c.user_id}`)}
                      className={`w-full text-right flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        bought
                          ? 'bg-emerald-500/5 border-emerald-500/25'
                          : 'bg-dark-800/40 border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate">{c.first_name || 'عميل'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full border ${getLeadBadgeClass(c.lead_class)}`}>
                            {formatLeadClass(c.lead_class)}
                          </span>
                          <CrossBranchTags c={c} />
                          {c.phones && (
                            <span className="text-dark-300 font-mono" dir="ltr">{c.phones}</span>
                          )}
                          <span className="text-dark-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {c.visited_at ? String(c.visited_at).split(' ')[0] : ''}
                          </span>
                        </div>
                      </div>
                      {bought ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-black flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" /> اشترى{c.my_purchases > 1 ? ` • ${c.my_purchases} عقود` : ''}
                        </span>
                      ) : (
                        <span className="text-primary-400 text-xs font-bold flex-shrink-0">
                          سجّل البيع ←
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-dark-600 text-[11px] mt-4 text-center">
              اضغط على العميل عشان تسجّل بيع أو تضيف ملاحظة/تذكير من ملفه
            </p>
            </div>
          </section>
        </div>
      )}

      {/* ── Merged pre-visit follow-up page (tabbed) ─────────────────────── */}
      {view === 'followups' && (() => {
        const tab = FUP_TABS.find(t => t.id === fupTab) || FUP_TABS[0];
        const normQuery = normalizePhone(phoneQuery);
        // Filter the active tab by phone so the rep can jump straight to the
        // customer who just called back instead of eyeballing the whole list.
        const visibleRows = lists[tab.id].filter(c => customerMatchesPhone(c, normQuery));
        return (
          <div className="space-y-4">
            {/* Phone search — type any format / just the last digits */}
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 w-4 h-4 pointer-events-none" />
              <input
                type="tel"
                inputMode="tel"
                dir="ltr"
                value={phoneQuery}
                onChange={(e) => setPhoneQuery(e.target.value)}
                placeholder="ابحث برقم العميل... (أي صيغة)"
                className="w-full bg-dark-800/50 border border-dark-700 hover:border-dark-600 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/5 rounded-2xl py-2.5 pr-11 pl-10 text-sm text-dark-50 placeholder-dark-500 transition-all outline-none text-right"
              />
              {phoneQuery && (
                <button
                  onClick={() => setPhoneQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
                  aria-label="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="card p-1.5 flex gap-1">
              {FUP_TABS.map(t => {
                const TabIcon = t.icon;
                const active  = fupTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFupTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-black transition-all ${
                      active
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {t.label}
                    <span className="text-xs opacity-70">({lists[t.id].length})</span>
                  </button>
                );
              })}
            </div>
            {normQuery && (
              <p className="text-dark-400 text-xs px-1">
                نتائج البحث عن <span className="font-mono text-dark-200" dir="ltr">{phoneQuery}</span>: {visibleRows.length} عميل
              </p>
            )}
            <FollowupList
              icon={tab.icon} tone={tab.tone}
              title={tab.title} rows={visibleRows}
              loading={fupLoading} mode={tab.id} busy={busy} onFollow={onFollow} onToggleSent={onToggleSent}
              emptyText={normQuery ? 'مفيش عميل بالرقم ده في القايمة دي' : tab.empty}
            />
          </div>
        );
      })()}

      {callFor && (
        <CallModal
          customer={callFor}
          onConfirm={confirmFollow}
          onClose={() => setCallFor(null)}
        />
      )}
    </div>
  );
}
