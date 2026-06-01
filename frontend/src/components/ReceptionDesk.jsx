import { useState, useRef, useEffect } from 'react';
import { Phone, CheckCircle, AlertCircle, Megaphone, RotateCcw, Building2, Users, UserCheck, UserPlus } from 'lucide-react';
import { confirmVisit, formatBranch, fetchSalesReps, setVisitSales, createWalkInCustomer } from '../services/api';
import useBranches from '../hooks/useBranches';
import useInterests from '../hooks/useInterests';

const BRANCH_LS_KEY = 'reception_branch'; // remember the desk's branch

// ── State machine: idle → loading → success | error | form ───────────────

const IDLE    = 'idle';
const LOADING = 'loading';
const SUCCESS = 'success';
const ERROR   = 'error';
const FORM    = 'form';    // adding a walk-in customer not in the system

// How the customer heard about us — for walk-in form. (Interest categories
// come from the admin-managed list via useInterests.)
const SOURCE_OPTIONS = [
  'فيسبوك', 'انستجرام', 'تيك توك', 'زيارة مباشرة', 'ترشيح صديق',
];

/**
 * ReceptionDesk — fast-entry screen for showroom receptionists.
 * The receptionist types (or scans) the visit_code printed on the
 * customer's Messenger confirmation message, then hits Enter / تأكيد.
 * On success, the customer's name and campaign source are shown as a
 * welcoming confirmation so staff know who walked in and from which ad.
 */
export default function ReceptionDesk({ lockedBranch = null }) {
  const [code,   setCode]   = useState('');
  const [state,  setState]  = useState(IDLE);
  const [result, setResult] = useState(null);   // { first_name, campaign_source, lead_class }
  const [errMsg, setErrMsg] = useState('');
  const [branch, setBranch] = useState(() => {
    if (lockedBranch) return lockedBranch;
    try { return localStorage.getItem(BRANCH_LS_KEY) || ''; } catch { return ''; }
  });
  const { branches } = useBranches();
  const { interests } = useInterests();
  const inputRef = useRef(null);

  // ── Sales-rep assignment (who will serve the customer in the showroom) ───
  const [salesReps,     setSalesReps]     = useState([]);
  const [selectedSales, setSelectedSales] = useState('');
  const [salesSaved,    setSalesSaved]    = useState(false);
  const [salesBusy,     setSalesBusy]     = useState(false);
  const [salesErr,      setSalesErr]      = useState('');

  // ── Walk-in customer form (customer not in the system) ───────────────────
  const [formName,     setFormName]     = useState('');
  const [formPhone,    setFormPhone]    = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formSource,   setFormSource]   = useState('');
  const [formErr,      setFormErr]      = useState('');

  // Auto-focus the phone input when the tab opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load the branch's sales reps so reception can pick one after confirming
  useEffect(() => {
    if (!branch) { setSalesReps([]); return; }
    let cancelled = false;
    fetchSalesReps(branch)
      .then((reps) => { if (!cancelled) setSalesReps(reps || []); })
      .catch(() => { if (!cancelled) setSalesReps([]); });
    return () => { cancelled = true; };
  }, [branch]);

  // Remember the desk's branch so the receptionist doesn't re-pick every time
  const changeBranch = (val) => {
    setBranch(val);
    try { localStorage.setItem(BRANCH_LS_KEY, val); } catch { /* ignore */ }
  };

  const handleConfirm = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!branch) { setErrMsg('اختار الفرع اللي إنت فيه الأول'); setState(ERROR); return; }
    setState(LOADING);
    setResult(null);
    setErrMsg('');
    setSelectedSales('');
    setSalesSaved(false);
    setSalesErr('');
    try {
      const data = await confirmVisit(trimmed, branch);
      setResult(data);
      setState(SUCCESS);
      setCode('');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setErrMsg('الرقم ده مش موجود — تأكد إن العميل كتب رقمه في الماسنجر قبل ما يجي');
      } else if (status === 400) {
        setErrMsg('الرقم مش مكتوب صح — تأكد إنه رقم موبايل مصري صحيح');
      } else {
        setErrMsg(err?.response?.data?.error || err.message || 'فشل تأكيد الزيارة');
      }
      setState(ERROR);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
  };

  const reset = () => {
    setState(IDLE);
    setCode('');
    setResult(null);
    setErrMsg('');
    setSelectedSales('');
    setSalesSaved(false);
    setSalesErr('');
    setFormName('');
    setFormPhone('');
    setFormInterest('');
    setFormSource('');
    setFormErr('');
    inputRef.current?.focus();
  };

  // Open the walk-in form, pre-filling the phone the receptionist already typed
  const openWalkInForm = () => {
    setFormName('');
    setFormPhone(code.trim() || '');
    setFormInterest('');
    setFormSource('');
    setFormErr('');
    setState(FORM);
  };

  // Create a brand-new customer who walked in without coming through ManyChat
  const handleCreateWalkIn = async () => {
    if (!formName.trim())  { setFormErr('اكتب اسم العميل'); return; }
    if (!formPhone.trim()) { setFormErr('اكتب رقم تليفون العميل'); return; }
    if (!branch)           { setFormErr('اختار الفرع اللي إنت فيه الأول'); return; }
    setState(LOADING);
    setFormErr('');
    setSelectedSales('');
    setSalesSaved(false);
    setSalesErr('');
    try {
      const data = await createWalkInCustomer({
        first_name: formName.trim(),
        phone:      formPhone.trim(),
        interest:   formInterest || null,
        source:     formSource   || null,
        branch,
      });
      setResult(data);
      setState(SUCCESS);
      setCode('');
    } catch (err) {
      const status = err?.response?.status;
      setFormErr(
        status === 400
          ? 'الرقم مش مكتوب صح — تأكد إنه رقم موبايل مصري صحيح'
          : (err?.response?.data?.error || err.message || 'فشل إضافة العميل')
      );
      setState(FORM);
    }
  };

  // Reception links the showroom salesperson who will serve this customer
  const handleAssignSales = async () => {
    if (!selectedSales || !result?.user_id) return;
    setSalesBusy(true);
    setSalesErr('');
    try {
      await setVisitSales(result.user_id, selectedSales, branch);
      setSalesSaved(true);
    } catch (err) {
      setSalesErr(err?.response?.data?.error || err.message || 'فشل تحديد السيلز');
    } finally {
      setSalesBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/20 rounded-3xl flex items-center justify-center mx-auto">
          <Phone className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-2xl font-black text-white">استقبال الزيارات</h2>
        <p className="text-dark-400 text-sm">
          اسأل العميل عن رقم تليفونه واكتبه هنا لتأكيد وصوله للمعرض
        </p>
      </div>

      {/* Input card */}
      <div className="card p-6 space-y-4">
        {/* Branch picker — hidden & fixed for locked (reception) accounts */}
        {!lockedBranch && (
          <>
            <div>
              <label className="block text-dark-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary-400" />
                الفرع اللي إنت فيه
              </label>
              <select
                value={branch}
                onChange={(e) => changeBranch(e.target.value)}
                disabled={state === LOADING}
                className="input-field w-full text-base"
              >
                <option value="">— اختار الفرع —</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <p className="text-dark-600 text-[11px] mt-1">
                اختاره مرة واحدة — السيستم هيفتكره. الزيارة هتتسجّل للفرع ده.
              </p>
            </div>
            <div className="h-px bg-dark-800" />
          </>
        )}

        <label className="block text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
          رقم تليفون العميل
        </label>

        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="01012345678"
            type="tel"
            inputMode="numeric"
            maxLength={20}
            disabled={state === LOADING}
            className="input-field flex-1 text-lg font-mono tracking-widest text-center"
            dir="ltr"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            onClick={handleConfirm}
            disabled={!code.trim() || state === LOADING}
            className="btn-primary px-6 disabled:opacity-50"
          >
            {state === LOADING ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'تأكيد'
            )}
          </button>
        </div>

        <p className="text-dark-600 text-xs text-center">
          اضغط Enter أو انقر تأكيد — أي صيغة للرقم تشتغل (01… أو ‎+20…)
        </p>
      </div>

      {/* ── Success ─────────────────────────────── */}
      {state === SUCCESS && result && (
        <div className="card p-6 border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-[fadeIn_0.3s_ease]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                تأكيد الوصول ✓
              </p>
              <h3 className="text-2xl font-black text-white mb-1">
                أهلاً بك، {result.first_name}!
              </h3>
              {result.branch && (
                <div className="flex items-center gap-1.5 text-sm text-white font-bold mb-1">
                  <span>🏬 جاي لفرع:</span>
                  <span className="text-emerald-300">{formatBranch(result.branch)}</span>
                </div>
              )}
              {result.campaign_source && (
                <div className="flex items-center gap-1.5 text-xs text-dark-400 font-bold">
                  <Megaphone className="w-3.5 h-3.5 text-primary-400" />
                  <span>عبر حملة:</span>
                  <span className="text-primary-300">{result.campaign_source}</span>
                </div>
              )}
              {result.pre_visit_rep && (
                <div className="mt-1.5">
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25">
                    تابعه قبل الزيارة: {result.pre_visit_rep}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Lost lead resurrected — they were closed but walked back in */}
          {result.was_lost_and_returned && (
            <div className="rounded-xl border-2 border-rose-500/50 bg-rose-500/10 px-4 py-3">
              <p className="text-rose-300 font-black text-sm">
                ⚠️ العميل كان مغلق (Lost) ورجع زار المعرض تاني!
              </p>
            </div>
          )}

          {/* Cross-branch heads-up — the customer already compared other branches.
              Reception/sales see it so they handle a comparer right and nobody
              fights over "whose customer" this is. */}
          {result.prior_activity?.multi_branch && (
            <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-4 py-3 space-y-1.5">
              <p className="text-amber-300 font-black text-sm">🔀 العميل ده اتعامل مع فرع تاني قبل كده</p>
              {result.prior_activity.other_purchase && (
                <p className="text-amber-100 text-xs font-bold">
                  🛒 اشترى من فرع {formatBranch(result.prior_activity.other_purchase.branch)}
                  {result.prior_activity.other_purchase.rep ? ` — مع ${result.prior_activity.other_purchase.rep}` : ''}
                </p>
              )}
              {(result.prior_activity.other_visits || []).map((v, i) => (
                <p key={i} className="text-amber-100/90 text-xs">
                  🏬 زار فرع {formatBranch(v.branch)}{v.sales_rep ? ` — وقف مع ${v.sales_rep}` : ''}
                </p>
              ))}
              <p className="text-amber-400/70 text-[11px]">العميل بيقارن بين الفروع — خد باله من تاريخه وظبط العرض.</p>
            </div>
          )}

          {/* Sales-rep assignment — who will serve this customer */}
          <div className="border-t border-emerald-500/20 pt-4">
            {salesSaved ? (
              <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
                <UserCheck className="w-4 h-4" />
                <span>العميل هيقف مع: {selectedSales}</span>
              </div>
            ) : (
              <>
                {result.last_showroom_rep && (
                  <p className="text-[12px] text-amber-300 font-bold mb-2">
                    🧍 وقف معاه في الزيارة السابقة: {result.last_showroom_rep}
                  </p>
                )}
                <label className="text-dark-300 text-xs font-bold mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary-400" />
                  مين السيلز اللي هيقف مع العميل؟
                  <span className="text-rose-400">(مطلوب)</span>
                </label>
                <div className="flex gap-3">
                  <select
                    value={selectedSales}
                    onChange={(e) => setSelectedSales(e.target.value)}
                    disabled={salesBusy || salesReps.length === 0}
                    className="input-field flex-1"
                  >
                    <option value="">— اختار السيلز —</option>
                    {salesReps.map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignSales}
                    disabled={!selectedSales || salesBusy}
                    className="btn-primary px-5 disabled:opacity-50"
                  >
                    {salesBusy ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'تأكيد'
                    )}
                  </button>
                </div>
                {salesReps.length === 0 && (
                  <p className="text-amber-400/80 text-[11px] mt-1.5">
                    مفيش سيلز مسجّلين للفرع ده — ضيفهم من لوحة مدير الفرع الأول.
                  </p>
                )}
                {salesErr && (
                  <p className="text-rose-400 text-[11px] mt-1.5">{salesErr}</p>
                )}
              </>
            )}
          </div>

          {/* Assigning the showroom rep is REQUIRED: the receptionist can't move on
              to the next visit until they pick who stood with this customer — so no
              visit is ever left unattributed (that rep owns the post-visit follow-up
              + the commission). If the branch has no sales reps yet, we don't trap
              the receptionist (the message above tells them to add reps first). */}
          {!salesSaved && salesReps.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-amber-300 text-xs font-bold text-center">
              ⚠️ حدّد السيلز اللي هيقف مع العميل قبل ما تكمّل — عشان العميل مايضيعش
            </div>
          )}
          <button
            onClick={reset}
            disabled={!salesSaved && salesReps.length > 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-dark-800/60 disabled:hover:text-dark-300"
          >
            <RotateCcw className="w-4 h-4" />
            تسجيل زيارة أخرى
          </button>
        </div>
      )}

      {/* ── Error ───────────────────────────────── */}
      {state === ERROR && (
        <div className="card p-6 border-rose-500/30 bg-rose-500/5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-rose-400 text-xs font-black uppercase tracking-wider mb-1">
                خطأ
              </p>
              <p className="text-white font-bold">{errMsg}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              حاول مرة أخرى
            </button>
            <button
              onClick={openWalkInForm}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-300 text-sm font-bold transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              إضافة عميل جديد
            </button>
          </div>
        </div>
      )}

      {/* ── Walk-in customer form ───────────────────────── */}
      {state === FORM && (
        <div className="card p-6 border-primary-500/30 bg-primary-500/5 space-y-4 animate-[fadeIn_0.3s_ease]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-black">إضافة عميل جديد</h3>
              <p className="text-dark-400 text-xs">عميل مش مسجّل على السيستم — هيتسجل كزيارة مؤكدة</p>
            </div>
          </div>

          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">اسم العميل *</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="الاسم بالكامل"
              className="input-field w-full"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">رقم التليفون *</label>
            <input
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="01012345678"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              className="input-field w-full font-mono tracking-widest text-center"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">مهتم بإيه؟</label>
            <select
              value={formInterest}
              onChange={(e) => setFormInterest(e.target.value)}
              className="input-field w-full"
            >
              <option value="">— اختار الفئة —</option>
              {interests.map((it) => (
                <option key={it} value={it}>{it}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">عرفنا منين؟</label>
            <select
              value={formSource}
              onChange={(e) => setFormSource(e.target.value)}
              className="input-field w-full"
            >
              <option value="">— اختار المصدر —</option>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {formErr && <p className="text-rose-400 text-xs font-bold">{formErr}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleCreateWalkIn}
              disabled={!formName.trim() || !formPhone.trim()}
              className="flex-1 btn-primary justify-center disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              إضافة وتأكيد الزيارة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
