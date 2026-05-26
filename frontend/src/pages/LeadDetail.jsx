import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight, MapPin, Package, Calendar, TrendingUp,
  User, Activity, Clock, Megaphone, ShoppingBag, X, Check, AlertCircle, Trash2,
  PhoneCall, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  fetchLeadDetail, fetchLeadPurchases, recordPurchase, deleteLead,
  formatLeadClass, getLeadBadgeClass, formatBranch, formatEventType,
} from '../services/api';
import LeadTasks from '../components/LeadTasks';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────
const parseSqliteDate = (str) => {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
};

// ── Platform Badge (Instagram / Facebook) ──────────────────────────────────
// Shows which ManyChat channel brought the lead in. Set once on first event
// via the `platform` field in the ManyChat External Request body.
const PlatformBadge = ({ platform }) => {
  if (platform === 'instagram') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
        title="جاء من إنستاجرام"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
        Instagram
      </span>
    );
  }
  if (platform === 'facebook') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white"
        style={{ background: '#1877F2' }}
        title="جاء من فيسبوك"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Facebook
      </span>
    );
  }
  return null;
};

// ── Purchase Modal ─────────────────────────────────────────────────────────
const PurchaseModal = ({ userId, onClose, onSuccess }) => {
  const [form, setForm]     = useState({ product_id: '', price: '', branch: '', notes: '', contract_number: '' });
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await recordPurchase({
        user_id:         userId,
        product_id:      form.product_id || undefined,
        price:           form.price ? parseFloat(form.price) : undefined,
        branch:          form.branch || undefined,
        notes:           form.notes || undefined,
        contract_number: form.contract_number ? form.contract_number.trim() : undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'فشل تسجيل الشراء');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            تسجيل عملية شراء
          </h3>
          <button onClick={onClose} className="text-dark-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1.5">المنتج</label>
            <input
              value={form.product_id}
              onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              placeholder="e.g. sofa_berlin"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1.5">السعر (جنيه)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0.00"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1.5">الفرع</label>
            <select
              value={form.branch}
              onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
              className="input-field w-full"
            >
              <option value="">اختر الفرع</option>
              <option value="nasr_city">نصر سيتي</option>
              <option value="maadi">المعادي</option>
              <option value="helwan">حلوان</option>
              <option value="faisal">فيصل</option>
              <option value="ain_shams">عين شمس</option>
            </select>
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1.5">رقم العقد</label>
            <input
              value={form.contract_number}
              onChange={(e) => setForm((f) => ({ ...f, contract_number: e.target.value }))}
              placeholder="CNT-2026-…"
              dir="ltr"
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1.5">ملاحظات</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="أي تفاصيل إضافية..."
              className="input-field w-full resize-none"
            />
          </div>

          {error && (
            <p className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {busy ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {busy ? 'جاري التسجيل...' : 'تأكيد الشراء'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const LeadDetail = () => {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isAdmin    = user?.role === 'admin';

  const [data,      setData]      = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLead(userId);
      navigate('/leads');
    } catch (_) {
      setDeleting(false);
      setConfirmDel(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const [leadData, purchaseData] = await Promise.all([
        fetchLeadDetail(userId),
        fetchLeadPurchases(userId).catch(() => ({ purchases: [] })),
      ]);
      setData(leadData);
      setPurchases(purchaseData.purchases || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="w-16 h-16 border-4 border-primary-900/20 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-dark-400 mt-6 font-bold tracking-widest uppercase text-xs">
          جاري تحميل ملف العميل...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="card p-10 text-center max-w-md border-rose-500/20">
          <h3 className="text-xl font-black text-white mb-3">خطأ في تحميل البيانات</h3>
          <p className="text-dark-400 mb-8 text-sm leading-relaxed">{error || 'لم يتم العثور على العميل'}</p>
          <button onClick={() => navigate('/')} className="btn-primary w-full">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  const profile = data.profile;
  const history = data.history;
  const phones  = data.phones || [];
  const visits  = data.visits || [];
  const requestedBranches = data.requestedBranches || [];
  const followups   = data.followups || [];
  const followupLog = data.followupLog || [];

  const handlePurchaseSuccess = () => {
    setShowModal(false);
    load(); // refresh everything
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/')}
            className="w-12 h-12 flex items-center justify-center bg-dark-900 hover:bg-primary-600 text-dark-400 hover:text-white rounded-2xl border border-dark-800 transition-all active:scale-95 group"
          >
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-1 bg-primary-600 rounded-full" />
              <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
                تفاصيل العميل
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">ملف العميل</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-dark-900 rounded-xl border border-dark-800">
            <Clock className="w-4 h-4 text-dark-500" />
            <span className="text-dark-400 text-xs font-bold">
              آخر نشاط:{' '}
              {profile.last_activity
                ? format(parseSqliteDate(profile.last_activity), 'd MMM yyyy', { locale: ar })
                : 'غير متوفر'}
            </span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setConfirmDel(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors"
              title="حذف العميل نهائياً"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">حذف العميل</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Profile Card ───────────────────────────────────────────────── */}
      <div className="card overflow-hidden relative">
        <div className="p-8 md:p-10 relative z-10">
          <div className="flex flex-col md:flex-row items-start gap-8">

            <div className="w-28 h-28 rounded-3xl bg-dark-800 border border-dark-700 flex items-center justify-center text-white text-4xl font-black">
              {profile.first_name?.charAt(0) || <User className="w-12 h-12" />}
            </div>

            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-3xl font-black text-white mb-1">
                    {profile.first_name || 'غير معروف'}
                  </h2>
                  <div className="flex items-center gap-2 text-dark-500 font-bold text-xs uppercase tracking-wider">
                    <span>المعرف: {profile.user_id}</span>
                    <span className="w-1 h-1 rounded-full bg-dark-700" />
                    <span>
                      تاريخ الانضمام:{' '}
                      {profile.created_at
                        ? format(parseSqliteDate(profile.created_at), 'MMM yyyy', { locale: ar })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {profile.platform && <PlatformBadge platform={profile.platform} />}
                  <span className={`badge ${getLeadBadgeClass(profile.lead_class)}`}>
                    {formatLeadClass(profile.lead_class)}
                  </span>
                  {profile.lead_class !== 'purchased' && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 text-xs font-bold transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      تسجيل شراء
                    </button>
                  )}
                </div>
              </div>

              {/* Core stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-dark-500 text-xs">النقاط</p>
                  <p className="text-white font-bold">{profile.total_score}</p>
                </div>
                <div>
                  <p className="text-dark-500 text-xs">مشاهدات</p>
                  <p className="text-white font-bold">{profile.product_view_count}</p>
                </div>
                <div>
                  <p className="text-dark-500 text-xs">جلسات</p>
                  <p className="text-white font-bold">{profile.session_count}</p>
                </div>
                <div>
                  <p className="text-dark-500 text-xs">الفرع</p>
                  <p className="text-white font-bold">
                    {profile.preferred_branch ? formatBranch(profile.preferred_branch) : '—'}
                  </p>
                </div>
              </div>

              {/* O2O Attribution + phone row */}
              {(profile.campaign_source || profile.ad_id || profile.phone || profile.visit_code) && (
                <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-dark-900/60 border border-dark-800">
                  <div>
                    <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 mb-1">
                      <Megaphone className="w-3 h-3" />
                      الحملة
                    </p>
                    <p className="text-primary-300 text-sm font-bold">
                      {profile.campaign_source || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold mb-1">
                      Ad ID
                    </p>
                    <p className="text-dark-300 text-sm font-mono">
                      {profile.ad_id || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold mb-1">
                      📱 أرقام التليفون
                    </p>
                    {phones.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {phones.map((ph) => (
                          <span key={ph} className="text-emerald-400 text-sm font-mono font-bold tracking-wider" dir="ltr">
                            {ph}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-emerald-400 text-sm font-mono font-bold tracking-wider" dir="ltr">
                        {profile.phone || profile.visit_code || '—'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Every branch the customer asked about (compares branches) */}
              {requestedBranches.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                  <p className="text-primary-400 text-[10px] uppercase tracking-wider font-bold mb-2">
                    📍 الفروع اللي طلبها
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {requestedBranches.map((b) => (
                      <span key={b.branch}
                        className="text-xs bg-primary-500/10 border border-primary-500/25 text-primary-300 px-3 py-1 rounded-full font-bold">
                        {formatBranch(b.branch)}
                        {b.last_at && (
                          <span className="text-primary-400/60 font-normal mr-1">
                            • {String(b.last_at).split(' ')[0]}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Branches actually visited (separate per branch — never erased) */}
              {visits.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold mb-2">
                    🏬 الفروع اللي زارها
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visits.map((v) => (
                      <span key={v.branch || v.visited_at}
                        className="text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 px-3 py-1 rounded-full font-bold">
                        {v.branch ? formatBranch(v.branch) : 'فرع'}
                        {v.visited_at && (
                          <span className="text-emerald-500/70 font-normal mr-1">
                            • {String(v.visited_at).split(' ')[0]}
                          </span>
                        )}
                        {v.sales_rep && (
                          <span className="text-sky-300 font-normal mr-1">
                            • سيلز: {v.sales_rep}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Extra flags */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-dark-500 text-xs">آخر منتج</p>
              <p className="text-white">{profile.last_product || '—'}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs">الفئة المهتم بيها</p>
              <p className="text-white">{profile.last_category || '—'}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs">طلب موقع</p>
              <p className="text-white">{profile.location_requested ? '✔' : '—'}</p>
            </div>
            <div>
              <p className="text-dark-500 text-xs">زيارة</p>
              <p className="text-white">
                {profile.visit_confirmed ? (
                  profile.visit_at
                    ? format(parseSqliteDate(profile.visit_at), 'd MMM yyyy', { locale: ar })
                    : '✔'
                ) : '—'}
              </p>
            </div>
          </div>

          {/* Last message the customer typed in chat */}
          {profile.last_input_text && (
            <div className="mt-4 p-3 rounded-xl bg-dark-900/60 border border-dark-800">
              <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold mb-1">
                💬 آخر رسالة كتبها العميل
              </p>
              <p className="text-dark-200 text-sm leading-relaxed">{profile.last_input_text}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Purchases ──────────────────────────────────────────────────── */}
      {purchases.length > 0 && (
        <div className="card p-8">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-violet-400" />
            سجل المشتريات
          </h3>
          <div className="space-y-3">
            {purchases.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div>
                  <p className="text-white font-bold">
                    {p.product_id ? p.product_id.replace(/_/g, ' ') : 'منتج غير محدد'}
                  </p>
                  <p className="text-dark-400 text-xs">
                    {p.branch ? formatBranch(p.branch) : ''}{p.rep ? ` • ${p.rep}` : ''}
                  </p>
                </div>
                <div className="text-left">
                  {p.price && (
                    <p className="text-violet-400 font-black tabular-nums">
                      {p.price.toLocaleString()} ج
                    </p>
                  )}
                  <p className="text-dark-500 text-xs">
                    {format(parseSqliteDate(p.created_at), 'd MMM yyyy', { locale: ar })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Follow-up activity (manager assignment + sales call log) ────── */}
      {(followups.length > 0 || followupLog.length > 0) && (
        <div className="card p-8">
          <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-amber-400" />
            متابعة العميل
          </h3>

          {followups.map((f, i) => (
            <div key={`fu-${i}`} className="mb-4 p-4 rounded-xl bg-dark-800/50 border border-dark-700">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-dark-400">الفرع:
                  <b className="text-white mr-1">{f.branch ? formatBranch(f.branch) : '—'}</b>
                </span>
                {f.assigned_sales && (
                  <span className="text-dark-400">مسنود لـ:
                    <b className="text-primary-400 mr-1">{f.assigned_sales}</b>
                  </span>
                )}
                {f.followed_up ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> تمت المتابعة
                    {f.followed_up_by ? ` — ${f.followed_up_by}` : ''}
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold">لسه متمش متابعته</span>
                )}
              </div>
              {f.call_summary && (
                <p className="mt-3 text-sm text-dark-200 bg-dark-900/60 rounded-lg px-3 py-2 leading-relaxed">
                  {f.call_summary}
                </p>
              )}
            </div>
          ))}

          {followupLog.length > 0 && (
            <>
              <p className="text-dark-500 text-[11px] uppercase tracking-wider font-bold mb-3 mt-2">
                سجل المكالمات
              </p>
              <div className="space-y-3">
                {followupLog.map((l, i) => (
                  <div key={`log-${i}`} className="border-b border-dark-800 pb-3 last:border-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold">{l.sales || '—'}</span>
                      <span className="text-dark-500">
                        {l.followed_up_at
                          ? format(parseSqliteDate(l.followed_up_at), 'd MMM yyyy', { locale: ar })
                          : ''}
                        {l.branch ? ` • ${formatBranch(l.branch)}` : ''}
                      </span>
                    </div>
                    {l.call_summary && (
                      <p className="mt-1.5 text-sm text-dark-300 leading-relaxed">{l.call_summary}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tasks & Reminders ──────────────────────────────────────────── */}
      <LeadTasks userId={userId} />

      {/* ── Activity Timeline ───────────────────────────────────────────── */}
      <div className="card p-8">
        <h3 className="text-xl font-black text-white mb-6">سجل النشاط</h3>

        {history?.length > 0 ? (
          <div className="space-y-4">
            {history.map((event, index) => (
              <div key={index} className="border-b border-dark-800 pb-4">
                <div className="flex justify-between">
                  <span className="text-white font-bold">
                    {formatEventType(event.event_type)}
                  </span>
                  <span className="text-dark-400 text-xs">
                    {format(
                      parseSqliteDate(event.created_at),
                      'd MMMM yyyy، hh:mm a',
                      { locale: ar }
                    )}
                  </span>
                </div>
                {(() => {
                  // product_details → "المنتج • الفئة" ; category_request → "الفئة"
                  const detail = event.event_value && event.category
                    ? `${event.event_value} • ${event.category}`
                    : (event.event_value || event.category);
                  return detail
                    ? <p className="text-dark-300 text-sm mt-1">{detail}</p>
                    : null;
                })()}
                <p className="text-emerald-400 text-xs mt-1">
                  +{event.score_delta} نقطة
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-400">لا يوجد نشاط</p>
        )}
      </div>

      {/* ── Purchase Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <PurchaseModal
          userId={profile.user_id}
          onClose={() => setShowModal(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────── */}
      {confirmDel && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
             role="dialog" aria-modal="true">
          <div className="bg-dark-900 border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center" dir="rtl">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-white font-black text-lg mb-2">تأكيد حذف العميل</h3>
            <p className="text-dark-400 text-sm mb-1">
              هتمسح <span className="text-white font-bold">{profile.first_name || 'العميل'}</span> وكل
              داتاه (الأحداث، التليفونات، الزيارات، المهام، المشتريات).
            </p>
            <p className="text-rose-400 text-xs font-bold mb-6">ده نهائي ومش هينفع يترجع.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? 'جاري الحذف...' : 'احذف نهائياً'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                disabled={deleting}
                className="flex-1 btn-secondary py-3"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetail;
