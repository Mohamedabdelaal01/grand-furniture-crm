/**
 * RevisitView — re-engagement funnel for customers who VISITED the showroom
 * but did NOT buy. Driven by the `status` prop:
 *   pending → still being followed up
 *   bought  → visited and later purchased (success)
 *   lost    → sales closed them ("won't buy" — e.g. bought elsewhere)
 *
 * Shown to admin / branch_manager / sales — the API scopes rows by role.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  MapPin, ShoppingBag, XCircle, RefreshCw, Star, Clock, RotateCcw,
  Check, X, Phone, UserCheck, PhoneCall, ChevronDown,
} from 'lucide-react';
import {
  fetchRevisitCustomers, closeRevisitCustomer, reopenRevisitCustomer,
  recordPurchase, formatBranch, logRevisitFollowup, fetchRevisitFollowups,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return 'اليوم';
  if (d === 1) return 'أمس';
  return `${d} يوم`;
}

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

const META = {
  pending: {
    tab: 'محتاجين متابعة',
    title: 'زاروا ومحتاجين متابعة',
    subtitle: 'عملاء زاروا المعرض ولسه مشتروش — تابعهم لحد ما يشتروا أو يتقفلوا',
    icon: MapPin, accent: 'text-amber-400', empty: 'مفيش عملاء محتاجين متابعة 🎉',
  },
  bought: {
    tab: 'اشتروا',
    title: 'زاروا واشتروا',
    subtitle: 'عملاء رجعوا واشتروا بعد المتابعة 🎉',
    icon: ShoppingBag, accent: 'text-emerald-400', empty: 'لسه محدش اشترى بعد المتابعة',
  },
  lost: {
    tab: 'اتقفلوا',
    title: 'زاروا واتقفلوا',
    subtitle: 'عملاء مش هيشتروا (اشتروا من برا / مش مهتمين)',
    icon: XCircle, accent: 'text-rose-400', empty: 'مفيش عملاء متقفلين',
  },
};

const TAB_ORDER = ['pending', 'bought', 'lost'];

// ── One customer card ────────────────────────────────────────────────────────
function CustomerCard({ c, status, busy, onBuy, onClose, onReopen, onFollowup }) {
  const navigate = useNavigate();
  const [panel,    setPanel]    = useState(null);   // 'buy' | 'close' | 'followup' | null
  const [amount,   setAmount]   = useState('');
  const [contract, setContract] = useState('');
  const [note,     setNote]     = useState('');
  const [fuNote, setFuNote] = useState('');

  // Follow-up history (loaded on demand)
  const [histOpen,    setHistOpen]    = useState(false);
  const [history,     setHistory]     = useState(null);
  const [histLoading, setHistLoading] = useState(false);

  const followupCount = c.followup_count || 0;

  const toggleHistory = async () => {
    if (histOpen) { setHistOpen(false); return; }
    setHistOpen(true);
    if (history === null) {
      setHistLoading(true);
      try {
        const res = await fetchRevisitFollowups(c.user_id);
        setHistory(res.followups || []);
      } catch {
        setHistory([]);
      } finally {
        setHistLoading(false);
      }
    }
  };

  return (
    <div className="card p-4 space-y-3">
      {/* Identity */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button
            onClick={() => navigate(`/leads/${c.user_id}`)}
            className="text-white font-black text-sm hover:text-primary-400 transition-colors"
          >
            {c.first_name || c.user_id}
          </button>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-dark-400 flex-wrap">
            {c.phone && (
              <span dir="ltr" className="font-mono font-bold text-emerald-400">📱 {c.phone}</span>
            )}
            {c.branch && <span>🏬 {formatBranch(c.branch)}</span>}
            {c.sales_rep && (
              <span className="flex items-center gap-0.5"><UserCheck className="w-3 h-3" />{c.sales_rep}</span>
            )}
            <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />زار {timeAgo(c.visit_at)}</span>
            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400" />{c.total_score}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-dark-500 flex-wrap">
            {c.last_product && <span>🛋️ {c.last_product}</span>}
            {c.last_category && <span>{c.last_category}</span>}
            {c.campaign_source && <span>📣 {c.campaign_source}</span>}
            {c.manychat_source === 'walkin' && (
              <span className="text-primary-400 font-bold">عميل استقبال</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {status === 'bought' && (
            <span className="text-emerald-400 font-black text-sm whitespace-nowrap">
              {fmt(c.purchase_total)} ج.م
            </span>
          )}
          {/* Follow-up counter badge */}
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${
              followupCount > 0
                ? 'bg-primary-500/15 text-primary-300'
                : 'bg-dark-700 text-dark-400'
            }`}
          >
            {followupCount > 0 ? `تابعها ${followupCount} مرة` : 'لسه متتابعش'}
          </span>
        </div>
      </div>

      {/* Last follow-up summary + history */}
      {followupCount > 0 && (
        <div className="bg-dark-900/60 border border-dark-800 rounded-lg p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-dark-300 font-bold flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-primary-400" />
              آخر متابعة {timeAgo(c.last_followup_at)}
              {c.last_followup_by ? ` · ${c.last_followup_by}` : ''}
            </p>
            <button
              onClick={toggleHistory}
              className="text-[10px] text-primary-400 font-bold flex items-center gap-0.5 hover:text-primary-300"
            >
              السجل
              <ChevronDown className={`w-3 h-3 transition-transform ${histOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {c.last_followup_note && (
            <p className="text-dark-200 text-xs mt-1 leading-relaxed">💬 {c.last_followup_note}</p>
          )}
          {histOpen && (
            <div className="mt-2 pt-2 border-t border-dark-800 space-y-1.5">
              {histLoading ? (
                <p className="text-dark-500 text-[11px]">جاري التحميل…</p>
              ) : (history && history.length > 0) ? (
                history.map((h) => (
                  <div key={h.id} className="text-[11px]">
                    <span className="text-dark-400 font-bold">
                      {timeAgo(h.created_at)}{h.followed_up_by ? ` · ${h.followed_up_by}` : ''}
                    </span>
                    {h.note && <span className="text-dark-300"> — {h.note}</span>}
                  </div>
                ))
              ) : (
                <p className="text-dark-500 text-[11px]">مفيش سجل</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Closed reason */}
      {status === 'lost' && (
        <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-2.5">
          <p className="text-rose-300 text-[11px] font-bold">
            اتقفل بواسطة {c.revisit_updated_by || '—'} · {timeAgo(c.revisit_updated_at)}
          </p>
          {c.revisit_note && (
            <p className="text-dark-200 text-xs mt-1 leading-relaxed">{c.revisit_note}</p>
          )}
        </div>
      )}

      {/* Actions — pending only */}
      {status === 'pending' && (
        <>
          {panel === 'followup' && (
            <div className="bg-primary-500/5 border border-primary-500/20 rounded-lg p-3 space-y-2">
              <label className="text-primary-300 text-xs font-bold">ملاحظة المتابعة (اختياري)</label>
              <textarea
                value={fuNote}
                onChange={(e) => setFuNote(e.target.value)}
                rows={2}
                placeholder="مثال: كلّمته وقالّي هيعدّي الأسبوع الجاي"
                className="input-field w-full text-sm py-2 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onFollowup(c, fuNote, () => {
                    setFuNote(''); setPanel(null);
                    setHistory(null); setHistOpen(false); // force history refetch
                  })}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-300 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <PhoneCall className="w-4 h-4" /> سجّل المتابعة
                </button>
                <button onClick={() => setPanel(null)} className="btn-secondary px-3 text-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {panel === 'buy' && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="text-emerald-300 text-xs font-bold">مبلغ الشراء (ج.م)</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    dir="ltr"
                    className="input-field w-full text-sm py-2"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-emerald-300 text-xs font-bold">رقم العقد</label>
                  <input
                    value={contract}
                    onChange={(e) => setContract(e.target.value)}
                    placeholder="CNT-2026-…"
                    dir="ltr"
                    className="input-field w-full text-sm py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => onBuy(c, amount, contract)}
                  disabled={busy}
                  className="btn-primary px-4 text-sm disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> تأكيد
                </button>
                <button onClick={() => setPanel(null)} className="btn-secondary px-3 text-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {panel === 'close' && (
            <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-3 space-y-2">
              <label className="text-rose-300 text-xs font-bold">سبب إن العميل مش هيشتري</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="مثال: اشترى من محل تاني / السعر مش مناسب ليه"
                className="input-field w-full text-sm py-2 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => onClose(c, note)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> قفل العميل
                </button>
                <button onClick={() => setPanel(null)} className="btn-secondary px-3 text-sm">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {!panel && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { setFuNote(''); setPanel('followup'); }}
                className="flex-1 min-w-[110px] flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-300 text-sm font-bold transition-colors"
              >
                <PhoneCall className="w-4 h-4" /> سجّل متابعة
              </button>
              <button
                onClick={() => { setAmount(''); setPanel('buy'); }}
                className="flex-1 min-w-[90px] flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-sm font-bold transition-colors"
              >
                <ShoppingBag className="w-4 h-4" /> اشترى
              </button>
              <button
                onClick={() => { setNote(''); setPanel('close'); }}
                className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors"
              >
                <XCircle className="w-4 h-4" /> مش هيشتري
              </button>
            </div>
          )}
        </>
      )}

      {/* Reopen — lost only */}
      {status === 'lost' && (
        <button
          onClick={() => onReopen(c)}
          disabled={busy}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-sm font-bold transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" /> رجّعه للمتابعة
        </button>
      )}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export default function RevisitView() {
  const [status, setStatus] = useState('pending');
  const meta = META[status] || META.pending;
  const Icon = meta.icon;
  const { user } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRevisitCustomers(status);
      setCustomers(res.customers || []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const setBusyFor = (id, val) => setBusy((b) => ({ ...b, [id]: val }));

  const onBuy = async (c, amount, contract) => {
    setBusyFor(c.user_id, true);
    try {
      await recordPurchase({
        user_id:         c.user_id,
        price:           amount ? Number(amount) : null,
        branch:          c.branch || c.preferred_branch || null,
        contract_number: contract ? String(contract).trim() : undefined,
      });
      toast.success(`${c.first_name || 'العميل'} اتسجل كمشتري ✓`);
      setCustomers((prev) => prev.filter((x) => x.user_id !== c.user_id));
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل تسجيل الشراء');
    }
    setBusyFor(c.user_id, false);
  };

  const onClose = async (c, note) => {
    setBusyFor(c.user_id, true);
    try {
      await closeRevisitCustomer(c.user_id, note);
      toast.success(`${c.first_name || 'العميل'} اتقفل`);
      setCustomers((prev) => prev.filter((x) => x.user_id !== c.user_id));
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل القفل');
    }
    setBusyFor(c.user_id, false);
  };

  const onReopen = async (c) => {
    setBusyFor(c.user_id, true);
    try {
      await reopenRevisitCustomer(c.user_id);
      toast.success(`${c.first_name || 'العميل'} رجع للمتابعة`);
      setCustomers((prev) => prev.filter((x) => x.user_id !== c.user_id));
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الإرجاع');
    }
    setBusyFor(c.user_id, false);
  };

  // Log a follow-up — the customer STAYS in the list, only the counter updates.
  const onFollowup = async (c, note, done) => {
    setBusyFor(c.user_id, true);
    try {
      const res = await logRevisitFollowup(c.user_id, note);
      toast.success('اتسجلت المتابعة ✓');
      setCustomers((prev) => prev.map((x) =>
        x.user_id === c.user_id
          ? {
              ...x,
              followup_count:     res.followup_count ?? (x.followup_count || 0) + 1,
              last_followup_at:   new Date().toISOString(),
              last_followup_by:   user?.name || null,
              last_followup_note: note || null,
            }
          : x
      ));
      if (done) done();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل تسجيل المتابعة');
    }
    setBusyFor(c.user_id, false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
              متابعة ما بعد الزيارة
            </span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Icon className={`w-7 h-7 ${meta.accent}`} />
            {meta.title}
          </h1>
          <p className="text-dark-400 text-sm mt-1">{meta.subtitle}</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Tabs */}
      <div className="card p-1.5 flex gap-1">
        {TAB_ORDER.map((t) => {
          const TabIcon = META[t].icon;
          const active  = status === t;
          return (
            <button
              key={t}
              onClick={() => setStatus(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-black transition-all ${
                active
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {META[t].tab}
            </button>
          );
        })}
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-dark-500 text-sm font-bold">{customers.length} عميل</p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <Icon className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 font-bold">{meta.empty}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => (
            <CustomerCard
              key={c.user_id}
              c={c}
              status={status}
              busy={!!busy[c.user_id]}
              onBuy={onBuy}
              onClose={onClose}
              onReopen={onReopen}
              onFollowup={onFollowup}
            />
          ))}
        </div>
      )}
    </div>
  );
}
