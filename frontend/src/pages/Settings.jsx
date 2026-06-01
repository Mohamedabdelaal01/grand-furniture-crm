import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Settings2, Users, Key, Building2, Eye, EyeOff,
  Save, Plus, Edit2, Check, AlertTriangle, X, Trash2, Wifi, WifiOff,
  Trophy, Power, ShieldCheck, Tag, Target,
} from 'lucide-react';
import {
  fetchSettings, updateSetting,
  fetchUsers, createUser, updateUser, cleanupOrphanReps, offboardUser,
  fetchBranches, updateBranches,
  fetchInterests, updateInterests,
  generateDemoAccounts, wipeDemoAccounts,
  fetchTargets, saveTarget,
  fetchIntegrationStatus, formatBranch,
  fetchAchievementWeights, updateAchievementWeights,
  fetchForecastWeights, updateForecastWeights,
} from '../services/api';
import useBranches from '../hooks/useBranches';

// ── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'general',      label: 'الإعدادات العامة', icon: Settings2 },
  { id: 'api',          label: 'مفاتيح API',        icon: Key       },
  { id: 'users',        label: 'المستخدمون',        icon: Users     },
  { id: 'branches',     label: 'الفروع',            icon: Building2 },
  { id: 'interests',    label: 'الاهتمامات',        icon: Tag       },
  { id: 'targets',      label: 'المستهدفات',        icon: Target    },
  { id: 'achievements', label: 'أوزان الإنجازات',   icon: Trophy    },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function SaveStatus({ status }) {
  if (status === 'saving') return <span className="text-primary-400 text-xs animate-pulse">جاري الحفظ…</span>;
  if (status === 'saved')  return <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" />تم الحفظ</span>;
  if (status === 'error')  return <span className="text-rose-400 text-xs">فشل الحفظ</span>;
  return null;
}

// ── General Settings tab ─────────────────────────────────────────────────────
function GeneralTab({ settings, onSave }) {
  const [companyName,    setCompanyName]    = useState(settings.company_name        || '');
  const [msgLimit,       setMsgLimit]       = useState(settings.weekly_message_limit || '2');
  const [expiryDays,     setExpiryDays]     = useState(settings.lead_expiry_days    || '30');
  const [hotThreshold,   setHotThreshold]   = useState(settings.scoring_hot_threshold  || '40');
  const [warmThreshold,  setWarmThreshold]  = useState(settings.scoring_warm_threshold || '15');
  const [status, setStatus] = useState('');

  const handleSave = async () => {
    setStatus('saving');
    const tId = toast.loading('جاري الحفظ...');
    try {
      await Promise.all([
        onSave('company_name',           companyName),
        onSave('weekly_message_limit',   msgLimit),
        onSave('lead_expiry_days',       expiryDays),
        onSave('scoring_hot_threshold',  hotThreshold),
        onSave('scoring_warm_threshold', warmThreshold),
      ]);
      setStatus('saved');
      toast.success('تم حفظ الإعدادات بنجاح', { id: tId });
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
      toast.error('فشل الحفظ', { id: tId });
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Field label="اسم الشركة" hint="يظهر في الرسائل والتقارير">
        <input value={companyName} onChange={e => setCompanyName(e.target.value)}
          className="input-field w-full" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="الحد الأسبوعي للرسائل" hint="أقصى رسائل لكل عميل / أسبوع">
          <input type="number" min={1} max={10} value={msgLimit}
            onChange={e => setMsgLimit(e.target.value)} className="input-field w-full" />
        </Field>
        <Field label="أيام انتهاء صلاحية العميل" hint="بعدها يُعتبر العميل غير نشط">
          <input type="number" min={7} max={365} value={expiryDays}
            onChange={e => setExpiryDays(e.target.value)} className="input-field w-full" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="حد تصنيف HOT (نقاط)" hint="فوق هذا الحد العميل ساخن">
          <input type="number" min={1} value={hotThreshold}
            onChange={e => setHotThreshold(e.target.value)} className="input-field w-full" />
        </Field>
        <Field label="حد تصنيف WARM (نقاط)" hint="فوق هذا الحد العميل دافئ">
          <input type="number" min={1} value={warmThreshold}
            onChange={e => setWarmThreshold(e.target.value)} className="input-field w-full" />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" />
          حفظ الإعدادات
        </button>
        <SaveStatus status={status} />
      </div>

      <SandboxControl />
    </div>
  );
}

// ── Cloned sandbox — interconnected demo training accounts ───────────────────
function SandboxControl() {
  const [busy, setBusy]           = useState('');
  const [confirmWipe, setConfirmWipe] = useState(false);

  const generate = async () => {
    // no window.confirm — just run directly (non-destructive to production)
    setBusy('generate');
    setConfirmWipe(false);
    const tId = toast.loading('جاري إنشاء طاقم التدريب...');
    try {
      const res = await generateDemoAccounts();
      toast.success(`اتعمل ${res.accounts?.length || 4} حسابات تجريبية — الباسورد: ${res.password}`, {
        id: tId, duration: 6000,
      });
    } catch (err) {
      toast.error(`فشل إنشاء الحسابات التجريبية — ${err?.response?.data?.error || err?.message || 'خطأ غير معروف'}`, { id: tId });
    }
    setBusy('');
  };

  const wipe = async () => {
    setBusy('wipe');
    setConfirmWipe(false);
    const tId = toast.loading('جاري حذف بيانات التدريب...');
    try {
      await wipeDemoAccounts();
      toast.success('اتمسحت قاعدة بيانات التدريب', { id: tId });
    } catch (err) {
      toast.error(`فشل الحذف — ${err?.response?.data?.error || err?.message || 'خطأ غير معروف'}`, { id: tId });
    }
    setBusy('');
  };

  return (
    <div className="card p-5 border border-amber-500/30 bg-amber-500/5">
      <h3 className="text-white font-black text-sm mb-1">🧪 الحسابات التجريبية (Sandbox)</h3>
      <p className="text-dark-400 text-xs mb-4 leading-relaxed">
        طاقم تدريب من 4 حسابات (مدير، مدير فرع، سيلز، استقبال) بيشتغلوا على نسخة منفصلة
        من البيانات — أي حاجة يعملوها <b className="text-amber-300">مش بتأثر على النظام الحقيقي</b>.
      </p>

      {/* primary action — always visible */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <button onClick={generate} disabled={!!busy}
          className="btn-primary disabled:opacity-50">
          {busy === 'generate' ? '⏳ جاري الإنشاء...' : '🚀 إنشاء / تحديث طاقم الحسابات التجريبية'}
        </button>

        {/* wipe — two-step inline confirmation (no window.confirm) */}
        {!confirmWipe ? (
          <button onClick={() => setConfirmWipe(true)} disabled={!!busy}
            className="btn-secondary disabled:opacity-50 text-rose-400 text-xs">
            🗑️ حذف حسابات الديمو
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-rose-400 text-xs">هتتمسح بيانات التدريب — متأكد؟</span>
            <button onClick={wipe} disabled={!!busy}
              className="px-3 py-1 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50">
              {busy === 'wipe' ? '⏳...' : 'نعم، امسح'}
            </button>
            <button onClick={() => setConfirmWipe(false)} disabled={!!busy}
              className="px-3 py-1 rounded text-xs bg-dark-700 hover:bg-dark-600 text-dark-300 disabled:opacity-50">
              إلغاء
            </button>
          </span>
        )}
      </div>

      <p className="text-dark-600 text-[11px]">
        إيميلات الدخول: demo_admin@demo.local · demo_manager@demo.local ·
        demo_sales@demo.local · demo_reception@demo.local — الباسورد: 123
      </p>
    </div>
  );
}

// ── API Keys tab ─────────────────────────────────────────────────────────────
// ── ManyChat integration status banner ───────────────────────────────────────
function IntegrationBanner() {
  const [st, setSt] = useState(null);
  useEffect(() => { fetchIntegrationStatus().then(setSt).catch(() => {}); }, []);
  if (!st) return null;

  const live = st.manychat === 'live';
  return (
    <div className={`card p-5 border ${live ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${live ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
          {live ? <Wifi className="w-5 h-5 text-emerald-400" /> : <WifiOff className="w-5 h-5 text-amber-400" />}
        </div>
        <div>
          <p className="text-white font-black text-sm">
            ManyChat: {live
              ? <span className="text-emerald-400">LIVE — بيبعت رسائل فعلية ✅</span>
              : <span className="text-amber-400">MOCK — مفيش رسائل بتتبعت ⚠️</span>}
          </p>
          <p className="text-dark-500 text-xs mt-0.5">
            {live ? 'الـ API Key متضبط والرسائل بتوصل العملاء.' : 'حط ManyChat API Key تحت عشان الرسائل تشتغل فعلياً.'}
          </p>
        </div>
      </div>

      {st.missing_flows?.length > 0 && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3">
          ⚠️ Flows ناقصة ({st.missing_flows.length}): الرسائل دي مش هتتبعت لحد ما تحط الـ ID بتاعها —
          <span className="font-mono"> {st.missing_flows.join(', ')}</span>
        </div>
      )}

      {st.webhook?.secret && (
        <div className="bg-dark-900/60 border border-dark-700 rounded-lg p-3">
          <p className="text-dark-400 text-[11px] font-black uppercase tracking-wider mb-1">Webhook Secret</p>
          <p className="text-dark-500 text-[11px] mb-2">
            حطه في ManyChat External Request كـ Header: <code className="text-dark-300">x-webhook-secret</code>
            {st.webhook.enforced
              ? <span className="text-emerald-400"> — التطبيق مُفعّل ✅</span>
              : <span className="text-dark-500"> — التطبيق غير مُفعّل (اختياري حالياً)</span>}
          </p>
          <code className="block text-emerald-300 text-xs font-mono bg-dark-950/60 px-3 py-2 rounded border border-dark-800 break-all" dir="ltr">
            {st.webhook.secret}
          </code>
        </div>
      )}
    </div>
  );
}

function ApiTab({ settings, onSave }) {
  const sections = [
    {
      title: 'مفاتيح ManyChat',
      fields: [
        { key: 'manychat_api_key', label: 'ManyChat API Key', hint: 'من ManyChat → Settings → API → Access Token' },
        { key: 'manychat_page_id', label: 'ManyChat Page ID', hint: 'معرّف صفحة الفيسبوك في ManyChat' },
      ],
    },
    {
      title: 'Flows — أحداث تلقائية',
      hint: 'بتتبعت تلقائياً عند حدث معيّن (زيارة / شراء / تذكير)',
      fields: [
        { key: 'manychat_visit_flow',    label: 'Visit Confirmed Flow',  hint: 'يُرسل عند تأكيد وصول العميل للمعرض' },
        { key: 'manychat_purchase_flow', label: 'Purchase Flow',         hint: 'يُرسل عند تسجيل عملية شراء' },
        { key: 'manychat_reminder_flow', label: 'Location Reminder Flow', hint: 'يُرسل للعملاء الذين طلبوا الموقع ولم يزوروا' },
      ],
    },
    {
      title: 'Flows — الذكاء الاصطناعي (Trigger Engine)',
      hint: 'بتتبعت لما المندوب يضغط "إرسال" على عميل — يختار النظام المناسب تلقائياً',
      fields: [
        { key: 'manychat_flow_immediate',   label: 'Hot Lead — Immediate Flow',  hint: 'للعملاء الساخنين النشطين في آخر 6 ساعات' },
        { key: 'manychat_flow_branch_info', label: 'Branch Info Flow',           hint: 'للعملاء اللي طلبوا موقع الفرع أو زاروا' },
        { key: 'manychat_flow_offer',       label: 'Product Offer Flow',         hint: 'للعملاء اللي شافوا تفاصيل منتج مؤخراً' },
        { key: 'manychat_flow_reengage',    label: 'Re-Engagement Flow',         hint: 'للعملاء الدافئين/الساخنين الغايبين +3 أيام' },
      ],
    },
    {
      title: 'مفاتيح أخرى',
      fields: [
        { key: 'facebook_pixel_id', label: 'Facebook Pixel ID', hint: 'لتتبع تحويلات الإعلانات' },
        { key: 'openai_api_key',    label: 'OpenAI API Key',    hint: 'للميزات المستقبلية بالذكاء الاصطناعي' },
      ],
    },
  ];

  return (
    <div className="space-y-8 max-w-xl">
      <IntegrationBanner />
      {sections.map(section => (
        <div key={section.title} className="space-y-4">
          <div>
            <h3 className="text-white font-black text-sm">{section.title}</h3>
            {section.hint && <p className="text-dark-500 text-xs mt-0.5">{section.hint}</p>}
          </div>
          <div className="space-y-3">
            {section.fields.map(f => (
              <ApiKeyField
                key={f.key}
                fieldKey={f.key}
                label={f.label}
                hint={f.hint}
                initialValue={settings[f.key] || ''}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ApiKeyField({ fieldKey, label, hint, initialValue, onSave }) {
  const [value,   setValue]   = useState(initialValue);
  const [show,    setShow]     = useState(false);
  const [status,  setStatus]  = useState('');

  const handleSave = async () => {
    setStatus('saving');
    const tId = toast.loading('جاري الحفظ...');
    try {
      await onSave(fieldKey, value);
      setStatus('saved');
      toast.success('تم الحفظ بنجاح', { id: tId });
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('error');
      toast.error('فشل الحفظ', { id: tId });
    }
  };

  const isEmpty = !initialValue;

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-bold text-sm">{label}</p>
          <p className="text-dark-500 text-xs mt-0.5">{hint}</p>
        </div>
        {isEmpty && (
          <span className="flex items-center gap-1 text-amber-400 text-[10px] font-black bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> غير مُعَيَّن
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="أدخل المفتاح..."
            className="input-field w-full pl-9 font-mono text-sm"
            dir="ltr"
          />
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={handleSave} className="btn-primary px-4">
          <Save className="w-4 h-4" />
        </button>
      </div>
      <SaveStatus status={status} />
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);  // null | { mode: 'create' | 'edit', user? }
  const [cleaning, setCleaning] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState(null); // user pending offboarding

  const handleCleanup = async () => {
    if (!window.confirm(
      'هيتم تنظيف بيانات أي سيلز / مندوب اتحذف من غير ما تتمسح بصمته (الزيارات والمتابعات والمبيعات هتفضل بس من غير اسمه). متأكد؟'
    )) return;
    setCleaning(true);
    const tId = toast.loading('جاري التنظيف...');
    try {
      const res = await cleanupOrphanReps();
      toast.success(
        res.cleaned_count
          ? `اتنظّفت بيانات ${res.cleaned_count} سيلز محذوف: ${res.cleaned.join('، ')}`
          : 'مفيش بيانات محتاجة تنظيف ✓',
        { id: tId }
      );
    } catch {
      toast.error('فشل التنظيف', { id: tId });
    }
    setCleaning(false);
  };

  const load = async () => {
    setLoading(true);
    try {
      const list = await fetchUsers();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (formData) => {
    const tId = toast.loading('جاري الحفظ...');
    try {
      if (modal.mode === 'create') {
        await createUser(formData);
        toast.success('تمت الإضافة بنجاح', { id: tId });
      } else {
        await updateUser(modal.user.id, formData);
        toast.success('تم التعديل بنجاح', { id: tId });
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error('حدث خطأ', { id: tId });
      throw err;
    }
  };

  const handleToggleActive = async (u) => {
    const goingActive = u.active === 0;
    const verb = goingActive ? 'إلغاء التجميد' : 'تجميد';
    if (!goingActive && !window.confirm(
      `هتجمّد حساب "${u.name}"؟\n` +
      `الحساب هيتسجّل خروجه فوراً ومش هيقدر يدخل تاني، بس كل تفاعلاته (متابعات، مبيعات، إلخ) هتفضل في السجل.\n` +
      `تقدر تلغي التجميد في أي وقت.`
    )) return;
    const tId = toast.loading(`جاري الـ${verb}...`);
    try {
      await updateUser(u.id, { active: goingActive ? 1 : 0 });
      toast.success(`تم الـ${verb}`, { id: tId });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: goingActive ? 1 : 0 } : x));
    } catch (err) {
      toast.error(`فشل الـ${verb}`, { id: tId });
    }
  };

  const roleLabel = (r) =>
    r === 'admin' ? 'مدير'
      : r === 'reception' ? 'استقبال'
      : r === 'sales' ? 'سيلز'
      : r === 'branch_manager' ? 'مدير فرع'
      : 'مندوب';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-dark-400 text-sm">{users.length} مستخدم</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCleanup}
            disabled={cleaning}
            className="btn-secondary text-xs disabled:opacity-50"
            title="مسح بصمة السيلز اللي اتحذفوا من قبل"
          >
            <Trash2 className="w-3.5 h-3.5" />
            تنظيف بيانات السيلز المحذوفين
          </button>
          <button onClick={() => setModal({ mode: 'create' })} className="btn-primary">
            <Plus className="w-4 h-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dark-500 border-b border-dark-800 text-right text-[11px] uppercase font-black tracking-wider">
                <th className="py-3 px-5">الاسم</th>
                <th className="py-3 px-5">البريد الإلكتروني</th>
                <th className="py-3 px-5 text-center">الدور</th>
                <th className="py-3 px-5 text-center">تاريخ الإنشاء</th>
                <th className="py-3 px-5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isInactive = u.active === 0;
                return (
                <tr key={u.id} className={`border-b border-dark-800/50 hover:bg-dark-800/20 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-5 text-white font-bold">
                    {u.name}
                    {isInactive && (
                      <span className="mr-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25">
                        موقوف
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-dark-400 font-mono text-xs">{u.email}</td>
                  <td className="py-3 px-5 text-center">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                      u.role === 'admin'
                        ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                        : u.role === 'reception'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : u.role === 'sales'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : u.role === 'branch_manager'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : 'bg-dark-700 text-dark-400 border-dark-600'
                    }`}>
                      {roleLabel(u.role)}
                    </span>
                    {['reception','sales','branch_manager'].includes(u.role) && u.branch && (
                      <span className="block text-[10px] text-dark-500 mt-1">
                        {formatBranch(u.branch)}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-5 text-center text-dark-500 text-xs">
                    {u.created_at?.split('T')[0] || u.created_at?.split(' ')[0]}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', user: u })}
                        title="تعديل"
                        className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        title={isInactive ? 'إلغاء التجميد (تفعيل)' : 'تجميد الحساب'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isInactive
                            ? 'text-emerald-400 hover:bg-emerald-500/10'
                            : 'text-amber-400 hover:bg-amber-500/10'
                        }`}
                      >
                        {isInactive ? <ShieldCheck className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => setOffboardTarget(u)}
                          title="إزالة الموظف"
                          className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          mode={modal.mode}
          user={modal.user}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {offboardTarget && (
        <OffboardModal
          user={offboardTarget}
          onClose={() => setOffboardTarget(null)}
          onDone={() => { setOffboardTarget(null); load(); }}
        />
      )}
    </div>
  );
}

// ── Offboarding warning modal — archive (safe) vs scrub (destructive) ────────
function OffboardModal({ user, onClose, onDone }) {
  const [busy, setBusy] = useState(false);

  const run = async (mode) => {
    if (mode === 'scrub' && !window.confirm(
      `حذف جذري لحساب "${user.name}"؟ ده إجراء لا رجعة فيه.`
    )) return;
    setBusy(true);
    const tId = toast.loading(mode === 'archive' ? 'جاري الأرشفة...' : 'جاري الحذف الجذري...');
    try {
      await offboardUser(user.name, mode);
      toast.success(mode === 'archive' ? 'تمت أرشفة الحساب ✓' : 'تم الحذف الجذري', { id: tId });
      onDone(mode);
    } catch (e) {
      const msg = e?.response?.data?.error;
      toast.error(msg === 'cannot_offboard_admin' ? 'مينفعش تزيل حساب أدمن' : 'فشل التنفيذ', { id: tId });
    }
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      dir="rtl"
      onClick={() => !busy && onClose()}
    >
      <div
        className="card p-6 w-full max-w-md border-amber-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-black text-lg">⚠️ خيارات إزالة الموظف</h3>
          <button onClick={() => !busy && onClose()} className="text-dark-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-dark-300 text-sm mb-3">
          الموظف: <b className="text-white">{user.name}</b>
        </p>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 mb-4">
          <p className="text-rose-300 text-xs font-bold leading-relaxed">
            تحذير: الحذف النهائي يمسح تاريخ الموظف ومبيعاته وقد يؤدي لخلل في تقارير
            الفترات السابقة.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => run('archive')}
            disabled={busy}
            className="w-full text-right rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 p-3.5 transition-colors disabled:opacity-50"
          >
            <p className="text-emerald-300 font-black text-sm">أرشفة الحساب (مستحسن)</p>
            <p className="text-dark-400 text-[11px] mt-1 leading-relaxed">
              يعطّل الحساب ويمنع دخوله ولكنه يحتفظ بمبيعاته وتاريخه القديم.
            </p>
          </button>
          <button
            onClick={() => run('scrub')}
            disabled={busy}
            className="w-full text-right rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 p-3.5 transition-colors disabled:opacity-50"
          >
            <p className="text-rose-300 font-black text-sm">حذف جذري (خطر)</p>
            <p className="text-dark-400 text-[11px] mt-1 leading-relaxed">
              يمسح الحساب بالكامل ويعيد كل عملائه لحالة "جديد".
            </p>
          </button>
        </div>

        <button
          onClick={() => !busy && onClose()}
          className="btn-secondary w-full justify-center mt-4"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function UserModal({ mode, user, onSave, onClose }) {
  const [name,     setName]     = useState(user?.name  || '');
  const [email,    setEmail]    = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState(user?.role  || 'rep');
  const [branch,   setBranch]   = useState(user?.branch || '');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const { branches } = useBranches();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const needsBranch = ['reception', 'sales', 'branch_manager'].includes(role);
    if (needsBranch && !branch) {
      setError(role === 'sales' ? 'اختار فرع للسيلز'
        : role === 'branch_manager' ? 'اختار الفرع اللي بيديره'
        : 'اختار فرع لحساب الاستقبال');
      setLoading(false);
      return;
    }
    try {
      const data = { name, email, role };
      data.branch = needsBranch ? branch : null;
      if (password) data.password = password;
      await onSave(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'فشل الحفظ');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
         role="dialog" aria-modal="true" aria-label="نموذج المستخدم">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white font-black text-lg">
            {mode === 'create' ? 'إضافة مستخدم جديد' : 'تعديل المستخدم'}
          </h3>
          <button onClick={onClose} className="text-dark-500 hover:text-white p-1 rounded-lg hover:bg-dark-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="الاسم الكامل">
            <input value={name} onChange={e => setName(e.target.value)}
              required className="input-field w-full" />
          </Field>

          <Field label="البريد الإلكتروني">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required dir="ltr" className="input-field w-full" />
          </Field>

          <Field label={mode === 'create' ? 'كلمة المرور' : 'كلمة مرور جديدة (اتركها فارغة للإبقاء على القديمة)'}>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required={mode === 'create'}
                placeholder={mode === 'edit' ? '(اختياري)' : ''}
                className="input-field w-full pl-9"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="الدور">
            <select value={role} onChange={e => setRole(e.target.value)} className="input-field w-full">
              <option value="rep">مندوب مبيعات (مكالمات)</option>
              <option value="sales">سيلز المعرض</option>
              <option value="reception">موظف استقبال</option>
              <option value="branch_manager">مدير فرع</option>
              <option value="admin">مدير النظام</option>
            </select>
          </Field>

          {['reception', 'sales', 'branch_manager'].includes(role) && (
            <Field
              label={role === 'sales' ? 'فرع السيلز'
                : role === 'branch_manager' ? 'الفرع اللي بيديره'
                : 'فرع الاستقبال'}
              hint={role === 'sales'
                ? 'السيلز ده بيشتغل في الفرع ده'
                : role === 'branch_manager'
                  ? 'مدير الفرع هيشوف تحليلات الفرع ده بس'
                  : 'موظف الاستقبال هيشوف عملاء الفرع ده بس'}
            >
              <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field w-full">
                <option value="">— اختار الفرع —</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
              {loading
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
                : 'حفظ'
              }
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Branches tab ─────────────────────────────────────────────────────────────
function BranchesTab() {
  const [branches, setBranches] = useState([]);   // [{id, name}]
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [editIdx,  setEditIdx]  = useState(null); // index being edited, or null
  const [editBuf,  setEditBuf]  = useState({ id: '', name: '' });
  const [addMode,  setAddMode]  = useState(false);
  const [newBranch, setNewBranch] = useState({ id: '', name: '' });

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Save full list to DB ───────────────────────────────────────────────────
  const persist = async (list) => {
    setSaving(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      const saved = await updateBranches(list);
      setBranches(saved);
      toast.success('تم حفظ الفروع بنجاح', { id: tId });
    } catch {
      toast.error('فشل الحفظ', { id: tId });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (idx) => {
    const updated = branches.filter((_, i) => i !== idx);
    persist(updated);
  };

  // ── Start edit ─────────────────────────────────────────────────────────────
  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditBuf({ ...branches[idx] });
  };

  // ── Confirm edit ───────────────────────────────────────────────────────────
  const confirmEdit = () => {
    if (!editBuf.id.trim() || !editBuf.name.trim()) return;
    const updated = branches.map((b, i) =>
      i === editIdx ? { id: editBuf.id.trim(), name: editBuf.name.trim() } : b
    );
    setEditIdx(null);
    persist(updated);
  };

  // ── Add new branch ─────────────────────────────────────────────────────────
  const handleAdd = () => {
    const id   = newBranch.id.trim().replace(/\s+/g, '_').toLowerCase();
    const name = newBranch.name.trim();
    if (!id || !name) {
      toast.error('أدخل معرّف واسم الفرع');
      return;
    }
    if (branches.some(b => b.id === id)) {
      toast.error('المعرّف موجود بالفعل');
      return;
    }
    const updated = [...branches, { id, name }];
    setAddMode(false);
    setNewBranch({ id: '', name: '' });
    persist(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-black text-sm">{branches.length} فرع مُعرَّف</p>
          <p className="text-dark-500 text-xs mt-0.5">
            الفروع تظهر في خيارات العملاء وفلاتر التحليلات
          </p>
        </div>
        <button
          onClick={() => { setAddMode(true); setNewBranch({ id: '', name: '' }); }}
          className="btn-primary"
          disabled={saving}
        >
          <Plus className="w-4 h-4" />
          إضافة فرع
        </button>
      </div>

      {/* Add form */}
      {addMode && (
        <div className="card p-5 border-primary-500/30 bg-primary-500/5 space-y-4">
          <p className="text-primary-300 font-black text-sm">فرع جديد</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المعرّف (بالإنجليزية)" hint="مثال: heliopolis">
              <input
                value={newBranch.id}
                onChange={e => setNewBranch(p => ({ ...p, id: e.target.value }))}
                placeholder="branch_id"
                dir="ltr"
                className="input-field w-full font-mono text-sm"
              />
            </Field>
            <Field label="الاسم العربي" hint="مثال: مصر الجديدة">
              <input
                value={newBranch.name}
                onChange={e => setNewBranch(p => ({ ...p, name: e.target.value }))}
                placeholder="اسم الفرع"
                className="input-field w-full"
              />
            </Field>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="btn-primary" disabled={saving}>
              <Plus className="w-4 h-4" /> حفظ
            </button>
            <button onClick={() => setAddMode(false)} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Branches list */}
      {branches.length === 0 ? (
        <div className="card p-10 text-center">
          <Building2 className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">لا توجد فروع — أضف أول فرع</p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch, idx) => (
            <div
              key={branch.id}
              className="card p-4 flex items-center gap-4"
            >
              {editIdx === idx ? (
                // ── Edit row ──────────────────────────────────────────────
                <>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <p className="text-dark-500 text-[10px] font-bold uppercase">المعرّف</p>
                      <input
                        value={editBuf.id}
                        onChange={e => setEditBuf(p => ({ ...p, id: e.target.value }))}
                        dir="ltr"
                        className="input-field w-full font-mono text-sm py-1.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-dark-500 text-[10px] font-bold uppercase">الاسم</p>
                      <input
                        value={editBuf.name}
                        onChange={e => setEditBuf(p => ({ ...p, name: e.target.value }))}
                        className="input-field w-full py-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={confirmEdit}
                      disabled={saving}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      title="حفظ"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditIdx(null)}
                      className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white transition-colors"
                      title="إلغاء"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                // ── View row ──────────────────────────────────────────────
                <>
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm">{branch.name}</p>
                    <p className="text-dark-500 text-[11px] font-mono">{branch.id}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(idx)}
                      className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      disabled={saving}
                      className="p-2 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {saving && (
        <p className="text-primary-400 text-xs text-center animate-pulse">
          جاري الحفظ…
        </p>
      )}
    </div>
  );
}

// ── Interests tab ────────────────────────────────────────────────────────────
// Manages the interest categories the reception desk offers when registering
// a walk-in customer. Stored as a plain string[] via /api/interests.
function InterestsTab() {
  const [interests, setInterests] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [editIdx,   setEditIdx]   = useState(null);
  const [editBuf,   setEditBuf]   = useState('');
  const [addMode,   setAddMode]   = useState(false);
  const [newItem,   setNewItem]   = useState('');

  useEffect(() => {
    fetchInterests()
      .then(setInterests)
      .catch(() => setInterests([]))
      .finally(() => setLoading(false));
  }, []);

  const persist = async (list) => {
    setSaving(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      const saved = await updateInterests(list);
      setInterests(saved);
      toast.success('تم حفظ الاهتمامات بنجاح', { id: tId });
    } catch {
      toast.error('فشل الحفظ', { id: tId });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (idx) => persist(interests.filter((_, i) => i !== idx));

  const startEdit = (idx) => { setEditIdx(idx); setEditBuf(interests[idx]); };

  const confirmEdit = () => {
    const v = editBuf.trim();
    if (!v) return;
    if (interests.some((it, i) => i !== editIdx && it === v)) {
      toast.error('الاهتمام موجود بالفعل');
      return;
    }
    const updated = interests.map((it, i) => (i === editIdx ? v : it));
    setEditIdx(null);
    persist(updated);
  };

  const handleAdd = () => {
    const v = newItem.trim();
    if (!v) { toast.error('اكتب اسم الاهتمام'); return; }
    if (interests.includes(v)) { toast.error('الاهتمام موجود بالفعل'); return; }
    setAddMode(false);
    setNewItem('');
    persist([...interests, v]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-black text-sm">{interests.length} اهتمام مُعرَّف</p>
          <p className="text-dark-500 text-xs mt-0.5">
            الاهتمامات تظهر في فورم إضافة عميل جديد في الاستقبال
          </p>
        </div>
        <button
          onClick={() => { setAddMode(true); setNewItem(''); }}
          className="btn-primary"
          disabled={saving}
        >
          <Plus className="w-4 h-4" />
          إضافة اهتمام
        </button>
      </div>

      {/* Add form */}
      {addMode && (
        <div className="card p-5 border-primary-500/30 bg-primary-500/5 space-y-4">
          <p className="text-primary-300 font-black text-sm">اهتمام جديد</p>
          <Field label="اسم الاهتمام" hint="مثال: غرف النوم">
            <input
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="اسم الفئة"
              className="input-field w-full"
            />
          </Field>
          <div className="flex gap-3">
            <button onClick={handleAdd} className="btn-primary" disabled={saving}>
              <Plus className="w-4 h-4" /> حفظ
            </button>
            <button onClick={() => setAddMode(false)} className="btn-secondary">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Interests list */}
      {interests.length === 0 ? (
        <div className="card p-10 text-center">
          <Tag className="w-10 h-10 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">لا توجد اهتمامات — أضف أول اهتمام</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interests.map((item, idx) => (
            <div key={item} className="card p-4 flex items-center gap-4">
              {editIdx === idx ? (
                <>
                  <input
                    value={editBuf}
                    onChange={e => setEditBuf(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmEdit()}
                    className="input-field flex-1 py-1.5"
                  />
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={confirmEdit}
                      disabled={saving}
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                      title="حفظ"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditIdx(null)}
                      className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white transition-colors"
                      title="إلغاء"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-primary-400" />
                  </div>
                  <p className="flex-1 min-w-0 text-white font-black text-sm">{item}</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(idx)}
                      className="p-2 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-primary-500/10 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      disabled={saving}
                      className="p-2 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {saving && (
        <p className="text-primary-400 text-xs text-center animate-pulse">جاري الحفظ…</p>
      )}
    </div>
  );
}

// ── Sales Targets tab ────────────────────────────────────────────────────────
// Admin sets revenue goals per branch and per sales rep.
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

const curMonthStr = () => new Date().toISOString().slice(0, 7);

function TargetsTab() {
  const { branches } = useBranches();
  const [reps, setReps]         = useState([]);   // [{name, branch, role}]
  const [targets, setTargets]   = useState({});   // `${type}:${name}` → amount
  const [repsLoading, setRepsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [month, setMonth]       = useState(curMonthStr());

  const [branchInputs, setBranchInputs] = useState({}); // branchId → string
  const [repPick, setRepPick]   = useState('');
  const [repInput, setRepInput] = useState('');

  // Sales reps load once.
  useEffect(() => {
    fetchUsers()
      .then(users => setReps((users || []).filter(u => ['sales', 'rep'].includes(u.role))))
      .catch(() => setReps([]))
      .finally(() => setRepsLoading(false));
  }, []);

  // Targets reload whenever the selected month changes.
  useEffect(() => {
    fetchTargets(month)
      .then(tgts => {
        const map = {};
        for (const t of tgts) map[`${t.scope_type}:${t.scope_name}`] = t.target_amount;
        setTargets(map);
      })
      .catch(() => setTargets({}));
    setBranchInputs({});  // drop stale buffers from the previous month
    setRepPick('');
    setRepInput('');
  }, [month]);

  const save = async (scope_type, scope_name, amount) => {
    const v = Number(amount);
    if (!scope_name) { toast.error('اختر أولاً'); return; }
    if (!Number.isFinite(v) || v < 0) { toast.error('اكتب مبلغ صحيح'); return; }
    const key = `${scope_type}:${scope_name}`;
    setSavingKey(key);
    const tId = toast.loading('جاري الحفظ...');
    try {
      await saveTarget({ scope_type, scope_name, target_amount: v, target_month: month });
      setTargets(prev => ({ ...prev, [key]: v }));
      toast.success('تم حفظ المستهدف', { id: tId });
    } catch {
      toast.error('فشل الحفظ', { id: tId });
    }
    setSavingKey('');
  };

  if (repsLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-white font-black text-lg">🎯 إدارة المستهدفات البيعية</h3>
        <p className="text-dark-500 text-xs mt-1">
          حدّد مستهدف عدد التعاقدات لكل فرع ولكل سيلز — لكل شهر على حدة.
        </p>
      </div>

      {/* Month picker — which month these targets apply to */}
      <div className="card p-4 flex items-center gap-3 flex-wrap border-primary-500/30 bg-primary-500/5">
        <Target className="w-4 h-4 text-primary-400" />
        <label className="text-white font-bold text-sm">شهر المستهدف:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || curMonthStr())}
          dir="ltr"
          className="input-field text-sm py-1.5"
        />
        <span className="text-dark-500 text-[11px]">
          المستهدفات اللي تحت بتخص الشهر المختار ده فقط.
        </span>
      </div>

      {/* Branch targets */}
      <section className="space-y-3">
        <p className="text-dark-300 font-black text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-400" /> مستهدفات الفروع
        </p>
        {branches.length === 0 ? (
          <p className="text-dark-500 text-sm">لا توجد فروع — أضف الفروع أولاً.</p>
        ) : branches.map((b) => {
          const key = `branch:${b.id}`;
          return (
            <div key={b.id} className="card p-4 flex items-center gap-3 flex-wrap">
              <span className="text-white font-bold text-sm flex-1 min-w-[120px]">{b.name}</span>
              {targets[key] != null && (
                <span className="text-emerald-400 text-[11px] font-bold">
                  الحالي: {fmtNum(targets[key])} تعاقد
                </span>
              )}
              <input
                type="number" dir="ltr" placeholder="عدد التعاقدات"
                value={branchInputs[b.id] ?? (targets[key] ?? '')}
                onChange={(e) => setBranchInputs(p => ({ ...p, [b.id]: e.target.value }))}
                className="input-field text-sm py-1.5 w-40"
              />
              <button
                onClick={() => save('branch', b.id, branchInputs[b.id] ?? targets[key])}
                disabled={savingKey === key}
                className="btn-primary text-xs"
              >
                <Save className="w-3.5 h-3.5" /> حفظ
              </button>
            </div>
          );
        })}
      </section>

      {/* Sales-rep targets */}
      <section className="space-y-3">
        <p className="text-dark-300 font-black text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-400" /> مستهدفات السيلز
        </p>
        <div className="card p-4 border-primary-500/30 bg-primary-500/5 flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-dark-400 text-[10px] font-black uppercase">السيلز</label>
            <select
              value={repPick}
              onChange={(e) => {
                setRepPick(e.target.value);
                setRepInput(targets[`sales_rep:${e.target.value}`] ?? '');
              }}
              className="input-field text-sm py-1.5 min-w-[170px]"
            >
              <option value="">— اختر السيلز —</option>
              {reps.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}{r.branch ? ` (${formatBranch(r.branch)})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-dark-400 text-[10px] font-black uppercase">المستهدف (تعاقد)</label>
            <input
              type="number" dir="ltr" placeholder="المبلغ"
              value={repInput}
              onChange={(e) => setRepInput(e.target.value)}
              className="input-field text-sm py-1.5 w-40"
            />
          </div>
          <button
            onClick={() => save('sales_rep', repPick, repInput)}
            disabled={!repPick || savingKey === `sales_rep:${repPick}`}
            className="btn-primary text-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> حفظ مستهدف السيلز
          </button>
        </div>

        {/* Current rep targets */}
        {reps.some(r => targets[`sales_rep:${r.name}`] != null) && (
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-dark-800/60 text-dark-400 text-right font-black">
                  <th className="py-2.5 px-4">السيلز</th>
                  <th className="py-2.5 px-4">الفرع</th>
                  <th className="py-2.5 px-4 text-center">المستهدف</th>
                </tr>
              </thead>
              <tbody>
                {reps.filter(r => targets[`sales_rep:${r.name}`] != null).map((r) => (
                  <tr key={r.id} className="border-t border-dark-800/60">
                    <td className="py-2.5 px-4 text-white font-bold">{r.name}</td>
                    <td className="py-2.5 px-4 text-dark-400">{r.branch ? formatBranch(r.branch) : '—'}</td>
                    <td className="py-2.5 px-4 text-center text-emerald-400 font-black">
                      {fmtNum(targets[`sales_rep:${r.name}`])} تعاقد
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-dark-300 text-xs font-bold uppercase tracking-wider">{label}</label>
      {hint && <p className="text-dark-600 text-[11px] -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────
export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings,  setSettings]  = useState(null);
  const [loading,   setLoading]   = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (_) {
      setSettings({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async (key, value) => {
    await updateSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: String(value) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir="rtl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-1 bg-primary-600 rounded-full" />
          <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">إدارة النظام</span>
        </div>
        <h1 className="text-3xl font-black text-white">الإعدادات</h1>
      </div>

      {/* Tabs */}
      <div className="card p-2 flex gap-1">
        {TABS.map(t => {
          const Icon   = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
                active
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'general'      && <GeneralTab      settings={settings} onSave={handleSave} />}
        {activeTab === 'api'          && <ApiTab          settings={settings} onSave={handleSave} />}
        {activeTab === 'users'        && <UsersTab />}
        {activeTab === 'branches'     && <BranchesTab />}
        {activeTab === 'interests'    && <InterestsTab />}
        {activeTab === 'targets'      && <TargetsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
      </div>
    </div>
  );
}

// ── Achievements Weights tab ────────────────────────────────────────────────
function AchievementsTab() {
  const [w, setW] = useState({ followup: 30, visit: 30, close: 40 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetchAchievementWeights()
      .then(setW)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sum = w.followup + w.visit + w.close;
  const valid = Math.round(sum) === 100;

  const save = async () => {
    if (!valid) {
      toast.error('المجموع لازم يساوي 100');
      return;
    }
    setSaving(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      await updateAchievementWeights(w);
      toast.success('اتحفظ ✓', { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحفظ', { id: tId });
    }
    setSaving(false);
  };

  if (loading) return <p className="text-dark-400 text-sm">جاري التحميل...</p>;

  const sliders = [
    { key: 'followup', label: 'نسبة المتابعة',  hint: 'كم عميل اتتابع من اللي سابوا تليفون', color: 'primary' },
    { key: 'visit',    label: 'نسبة الزيارة',   hint: 'كم عميل زار من اللي اتتابعوا',          color: 'emerald' },
    { key: 'close',    label: 'نسبة التقفيل',  hint: 'كم عميل اشترى من اللي زاروا',          color: 'amber' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-black text-lg">معادلة نقاط الإنجازات</h3>
        </div>
        <p className="text-dark-400 text-sm mb-6 leading-relaxed">
          النقاط بتتحسب لكل سيلز ولكل فرع من 3 نسب. اختار وزن كل نسبة في النتيجة النهائية —
          المجموع لازم يكون <b className="text-white">100</b>.
        </p>

        <div className="space-y-5">
          {sliders.map(s => {
            const tones = {
              primary: 'text-primary-400',
              emerald: 'text-emerald-400',
              amber:   'text-amber-400',
            };
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-black text-sm">{s.label}</p>
                    <p className="text-dark-500 text-[11px]">{s.hint}</p>
                  </div>
                  <span className={`text-2xl font-black ${tones[s.color]}`}>
                    {w[s.key]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={w[s.key]}
                  onChange={e => setW({ ...w, [s.key]: parseInt(e.target.value, 10) })}
                  className="w-full accent-primary-500"
                />
              </div>
            );
          })}
        </div>

        <div className={`mt-6 p-3 rounded-xl border text-sm ${
          valid
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
        }`}>
          <b>المجموع:</b> {sum}% {valid ? '✓ صحيح' : `— لازم يبقى 100 (الفرق ${100 - sum})`}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            disabled={!valid || saving}
            onClick={save}
            className="btn-primary disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'جاري الحفظ...' : 'حفظ الأوزان'}
          </button>
          <button
            onClick={() => setW({ followup: 30, visit: 30, close: 40 })}
            className="btn-secondary"
          >
            استعادة الافتراضي (30/30/40)
          </button>
        </div>
      </div>

      <ForecastWeightsCard />
    </div>
  );
}

// ── Forecast Weights card (inside Achievements tab) ─────────────────────────
function ForecastWeightsCard() {
  const [w, setW] = useState({ with_phone: 80, without_phone: 35 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    fetchForecastWeights()
      .then(setW)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const tId = toast.loading('جاري الحفظ...');
    try {
      await updateForecastWeights(w);
      toast.success('اتحفظ ✓', { id: tId });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل الحفظ', { id: tId });
    }
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="w-5 h-5 text-primary-400" />
        <h3 className="text-white font-black text-lg">معدّل الزيارة المتوقع</h3>
      </div>
      <p className="text-dark-400 text-sm mb-6 leading-relaxed">
        لما عميل يضغط <b className="text-white">branch_selected</b>، يا إما يكون
        ساب تليفون قبل كده يا إما لأ. الـ "زيارات متوقعة" بتُحسب من العدد
        مضروب في النسبة. كل وزن مستقل (مش لازم المجموع 100).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-300 font-black text-sm">عميل ساب تليفون</p>
            <span className="text-2xl font-black text-emerald-300">{w.with_phone}%</span>
          </div>
          <p className="text-emerald-500/70 text-[11px] mb-3">
            بنقدر نتواصل معاه + اتأكّد لنا بالرقم — احتمال أعلى
          </p>
          <input
            type="range" min={0} max={100} value={w.with_phone}
            onChange={e => setW({ ...w, with_phone: parseInt(e.target.value, 10) })}
            className="w-full accent-emerald-500"
          />
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-amber-300 font-black text-sm">عميل بدون تليفون</p>
            <span className="text-2xl font-black text-amber-300">{w.without_phone}%</span>
          </div>
          <p className="text-amber-500/70 text-[11px] mb-3">
            مفيش طريقة متابعة — احتمال أقل
          </p>
          <input
            type="range" min={0} max={100} value={w.without_phone}
            onChange={e => setW({ ...w, without_phone: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-500"
          />
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ معدّلات التوقع'}
        </button>
        <button
          onClick={() => setW({ with_phone: 80, without_phone: 35 })}
          className="btn-secondary"
        >
          استعادة الافتراضي (80% / 35%)
        </button>
      </div>
    </div>
  );
}
