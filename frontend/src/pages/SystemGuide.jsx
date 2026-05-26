/**
 * SystemGuide — role-based, fully-realistic training sandboxes.
 * Every simulation mirrors the actual component layout, state machine,
 * and data patterns — no real API calls, pure local state.
 *
 * Admin     → لوحة التحكم في التدريب الشاملة (reception + sales arenas + guide)
 * Reception → Reception Arena only + guide
 * Sales     → Sales Arena only + guide
 * Others    → accordion guide
 */
import { useState, useRef, useEffect } from 'react';
import {
  BookOpen, ChevronDown, Lightbulb,
  LayoutDashboard, Target, ScrollText, FlaskConical, Archive,
  Users, TrendingUp, Power, ListChecks, CheckCircle, ShoppingBag,
  Search, RotateCcw, UserCheck,
  // Arena icons
  Phone, Building2, UserPlus, Megaphone, AlertCircle,
  CheckCircle2, RotateCw, ChevronLeft, ChevronRight,
  X, PhoneOff, Heart, ThumbsDown, Clock3, Award, Flame,
  CheckCheck, Trophy, GraduationCap, Layers, Printer,
  ScanLine, ListTodo, Star, Zap, BarChart3, Briefcase,
  CalendarDays, ClipboardList, Bell, ChevronUp, Check,
  Trash2, Lock, Wifi, RefreshCw, Clock, MessageCircle,
  PhoneCall, MapPinned, MapPinOff, Wallet, Percent,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

// Reception — pre-seeded phone numbers the trainee can "look up"
const MOCK_PHONES = {
  '01012345678': {
    user_id: 'u_mock_1', first_name: 'أحمد محمد',
    lead_class: 'warm', campaign_source: 'إعلان فيسبوك',
    pre_visit_rep: null, was_lost_and_returned: false,
    branch: 'نصر سيتي',
  },
  '01098765432': {
    user_id: 'u_mock_2', first_name: 'سامي عبد الرحمن',
    lead_class: 'hot', campaign_source: 'إنستجرام',
    pre_visit_rep: 'محمود علي', was_lost_and_returned: true,
    branch: 'المعادي',
  },
  '01155443322': {
    user_id: 'u_mock_3', first_name: 'هبة علي',
    lead_class: 'cold', campaign_source: null,
    pre_visit_rep: 'أحمد سيلز', was_lost_and_returned: false,
    branch: 'أكتوبر',
  },
};

// Reception — shared lookup lists
const MOCK_REPS    = ['أحمد محمد', 'محمود علي', 'سارة حسن', 'عمر خالد'];
const BRANCHES     = ['نصر سيتي', 'المعادي', 'القاهرة الجديدة', 'أكتوبر', 'الإسكندرية'];
const INTERESTS    = ['غرف النوم', 'غرف السفرة', 'غرف الأطفال', 'الانتريهات', 'المطابخ'];
const SOURCES      = ['فيسبوك', 'انستجرام', 'تيك توك', 'زيارة مباشرة', 'ترشيح صديق'];

// Showroom sales mock data — mirrors SalesDashboardView
const MOCK_SHOWROOM_CUSTOMERS = [
  { user_id: 's1', first_name: 'خالد حسن',     lead_class: 'purchased', phones: '01023456789', visited_at: '2026-05-23', my_purchases: 1, my_sales_total: 35000 },
  { user_id: 's2', first_name: 'منى إبراهيم',  lead_class: 'visited',   phones: '01156789012', visited_at: '2026-05-22', my_purchases: 0, my_sales_total: 0 },
  { user_id: 's3', first_name: 'طارق سعيد',    lead_class: 'visited',   phones: '01234567890', visited_at: '2026-05-22', my_purchases: 0, my_sales_total: 0 },
  { user_id: 's4', first_name: 'هند كمال',     lead_class: 'purchased', phones: null,          visited_at: '2026-05-21', my_purchases: 1, my_sales_total: 49000 },
];
const MOCK_SHOWROOM_FOLLOWUPS = [
  { user_id: 'fup1', first_name: 'رامي كمال',    lead_class: 'warm', phones: '01099887766', assigned_at: '2026-05-20T10:00:00Z', followed_up: 0, visited: false, total_score: 72 },
  { user_id: 'fup2', first_name: 'دينا مصطفى',  lead_class: 'cold', phones: '01011223344', assigned_at: '2026-05-19T14:00:00Z', followed_up: 0, visited: false, total_score: 41 },
  { user_id: 'fup3', first_name: 'أسامة فتحي',  lead_class: 'hot',  phones: '01099887755', assigned_at: '2026-05-18T09:00:00Z', followed_up: 1, followed_up_at: '2026-05-21T11:00:00Z', call_summary: 'مهتم بغرفة النوم الكلاسيك، قال هيزور الأسبوع الجاي', visited: false, total_score: 88 },
  { user_id: 'fup4', first_name: 'سحر إبراهيم', lead_class: 'warm', phones: '01199887766', assigned_at: '2026-05-17T08:00:00Z', followed_up: 1, followed_up_at: '2026-05-20T15:00:00Z', call_summary: 'زارت وشافت المنتجات واشترت طقم سفرة', visited: true,  total_score: 67 },
];

const LEAD_META = {
  cold:      { label: 'بارد',     badge: 'text-slate-300 bg-slate-500/15 border-slate-500/25' },
  warm:      { label: 'دافئ',     badge: 'text-amber-300 bg-amber-500/15 border-amber-500/25' },
  hot:       { label: 'ساخن 🔥',  badge: 'text-rose-300  bg-rose-500/15  border-rose-500/25'  },
  visited:   { label: 'زار',      badge: 'text-sky-300   bg-sky-500/15   border-sky-500/25'   },
  purchased: { label: 'اشترى ✅', badge: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25' },
};

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE CONTENT (accordion)
// ─────────────────────────────────────────────────────────────────────────────
const TONES = {
  primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
  violet:  'text-violet-400 bg-violet-500/10 border-violet-500/20',
  sky:     'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

const GUIDE = {
  admin: [
    { icon: LayoutDashboard, tone: 'primary', title: 'لوحة القيادة التنفيذية',
      steps: [
        'صفحة "نظرة عامة" بتعرض 3 مؤشرات رئيسية: إجمالي المبيعات، إجمالي الزيارات، ونسبة الإغلاق العامة.',
        'استخدم فلتر التاريخ (من / إلى) وفلتر الفرع في الأعلى لحصر الأرقام على فترة أو فرع معيّن.',
        'الرسوم البيانية تحت (قمع المبيعات، توزيع العملاء، تحليل الفروع) بتتحدّث مع الفلتر تلقائياً.',
      ],
      tip: 'قسم "تحليل الفروع" ليه فلتر تاريخ مستقل — يفيدك تقارن الطلبات بالزيارات في أي مدة.',
    },
    { icon: Target, tone: 'emerald', title: 'محرك المستهدفات الشهرية',
      steps: [
        'افتح الإعدادات → تبويب "المستهدفات".',
        'اختار الشهر من منتقي الشهر (الافتراضي هو الشهر الحالي).',
        'حدّد مبلغ المستهدف لكل فرع، ولكل سيلز على حدة، واضغط "حفظ".',
      ],
      tip: 'كل شهر له مستهدفاته المستقلة — تقدر تحدّد أرقام مختلفة لكل شهر بدون ما تأثّر على الشهور التانية.',
    },
    { icon: ScrollText, tone: 'amber', title: 'سجل العمليات — التراجع عن الأخطاء',
      steps: [
        'من السايد بار: النظام والرقابة → "سجل العمليات".',
        'الصفحة بتعرض كل عمليات التعيين: مين عيّن مين، وإمتى.',
        'لو حصل تعيين بالغلط، اضغط "تراجع" وأكّد — السيستم يرجّع الحالة زي ما كانت.',
      ],
      tip: 'سجل العمليات هو شبكة الأمان بتاعتك — أي خطأ بشري في التعيين يتصلّح بضغطة واحدة.',
    },
    { icon: FlaskConical, tone: 'violet', title: 'الحسابات التجريبية بضغطة واحدة',
      steps: [
        'الإعدادات → الإعدادات العامة → قسم "الحسابات التجريبية".',
        'اضغط "🚀 إنشاء طاقم الحسابات التجريبية" — السيستم بينشئ 4 حسابات تدريب على قاعدة منفصلة.',
        'درّب فريقك على الحسابات دي — أي حاجة يعملوها مش بتأثر على النظام الحقيقي.',
      ],
      tip: 'باسورد الحسابات التجريبية كلها "123". لما تخلص اضغط "🗑️ حذف حسابات الديمو".',
    },
    { icon: Archive, tone: 'rose', title: 'أرشفة الحساب مقابل الحذف الجذري',
      steps: [
        'لما تضغط زر إزالة موظف، بيظهر مودال "خيارات إزالة الموظف" بخيارين.',
        '🟢 "أرشفة الحساب (مستحسن)": يعطّل الدخول لكنه يحتفظ بكل التاريخ.',
        '🔴 "حذف جذري (خطر)": يمسح الموظف وكل سجلاته ويرجّع عملاءه لـ "جديد".',
      ],
      tip: 'استخدم "الأرشفة" دائماً — الحذف الجذري يمسح التاريخ نهائياً.',
    },
  ],
  branch_manager: [
    { icon: Users,    tone: 'primary', title: 'توزيع العملاء على السيلز',
      steps: ['من السايد بار افتح "توزيع المتابعات".', 'لكل عميل، اختار السيلز المناسب من القائمة المنسدلة.', 'تقدر تستخدم فلاتر "ساب رقمه" و"طريقة التسجيل" لفرز العملاء بسرعة.'],
      tip: 'لو غيّرت إسناد عميل لسيلز تاني، دورة المتابعة بتبدأ من جديد.',
    },
    { icon: Target,   tone: 'emerald', title: 'مستهدف الفرع مقابل الفعلي',
      steps: ['في النظرة العامة بتلاقي كارت "مبيعات الفرع".', 'تحت الكارت شريط تقدّم بيوضح مستهدف الشهر ونسبة تحقيقه.'],
    },
    { icon: TrendingUp,tone: 'sky',   title: 'متابعة مستهدفات السيلز الفردية',
      steps: ['جدول "أداء السيلز" في النظرة العامة فيه عمودين مهمين: "المستهدف" و"نسبة التحقيق".'],
      tip: 'تابع نسبة التحقيق أسبوعياً — السيلز اللي تحت 30% محتاج دعم.',
    },
    { icon: Power,    tone: 'rose',   title: 'تعطيل سيلز بأمان (بدل الحذف)',
      steps: ['في "إعدادات الفرع" بتلاقي قائمة سيلز فرعك.', 'بدل ما تحذف، استخدم زر التعطيل/التنشيط.'],
      tip: 'مدير الفرع ليس لديه صلاحية حذف نهائي — التعطيل هو الطريقة الآمنة.',
    },
  ],
  sales: [
    { icon: Users, tone: 'primary', title: 'صفحة عملائي',
      steps: [
        'صفحتك الرئيسية بتعرض العملاء اللي الاستقبال حدّدك معاهم بعد ما وصلوا المعرض.',
        'كل سطر بيعرض اسم العميل، حالته، رقمه (لو موجود)، وتاريخ الزيارة.',
        'لو العميل اشترى بيظهر: ✅ اشترى • المبلغ — لو لسه، بيظهر زر "سجّل البيع ←".',
      ],
      tip: 'الاستقبال هو اللي بيختارك لكل عميل — مش بتختار أنت.',
    },
    { icon: ShoppingBag, tone: 'emerald', title: 'تسجيل البيع',
      steps: [
        'اضغط على العميل في قائمة "عملائي" عشان تفتح ملفه.',
        'من ملف العميل اضغط "تسجيل شراء" واكتب المبلغ ورقم التعاقد.',
        'العميل بيتحوّل تلقائياً لحالة "اشترى" ويتحسب في مبيعاتك الشهرية.',
      ],
      tip: 'المبيعات بتتحسب على الشهر اللي تم فيه التسجيل.',
    },
    { icon: ListChecks, tone: 'amber', title: 'متابعة قبل الزيارة',
      steps: [
        'من السايد بار اضغط "متابعة قبل الزيارة" — دول عملاء مدير الفرع أسندهم ليك تتصل بيهم وتشجعهم يزوروا.',
        'تاب "محتاجين متابعة": عملاء لسه ما تصلتش بيهم — اضغط "تابعت" واكتب ملخص المكالمة.',
        'تاب "تابعتهم + زاروا": عملاء اتصلت بيهم وفعلاً زاروا — هيتحسبوا في معدل نجاحك.',
        'تاب "تابعتهم + لسه": اتصلت بيهم بس لسه مجاوش — تابع تاني أو حاول حجز موعد.',
      ],
      tip: 'ملخص المكالمة بيشوفه مدير الفرع في ملف العميل — اكتب حاجة مفيدة.',
    },
    { icon: Target, tone: 'violet', title: 'كارت مبيعاتي والمستهدف',
      steps: [
        'في صفحتك الرئيسية في كارت "مبيعاتي هذا الشهر" — بيعرض مبيعاتك بالجنيه.',
        'تحت الرقم شريط تقدم بيعرض نسبة تحقيق المستهدف الشهري.',
      ],
      tip: 'الشريط بيتحوّل للأخضر لما توصل 100% من مستهدفك!',
    },
  ],

  reception: [
    { icon: Search,    tone: 'primary', title: 'البحث بالتليفون أو رقم التعاقد',
      steps: ['استخدم خانة البحث في الأعلى للوصول لأي عميل.', 'تقدر تبحث برقم تليفون العميل أو برقم التعاقد.'],
    },
    { icon: CheckCircle,tone: 'emerald', title: 'تأكيد وصول الزيارة',
      steps: ['اكتب رقم تليفون العميل واضغط "تأكيد".', 'لو مش مسجّل، اضغط "إضافة عميل جديد" واملا بياناته.', 'بعد التأكيد، اختار السيلز اللي هيقف مع العميل.'],
      tip: 'حدّد السيلز يدوياً دائماً — السيستم لا يختاره تلقائياً.',
    },
    { icon: RotateCcw, tone: 'rose',    title: 'تنبيه: عميل عاد بعد إغلاقه',
      steps: ['لو ظهر بادج أحمر: "⚠️ العميل كان مغلق (Lost) ورجع زار المعرض تاني!".', 'فرصة مهمة — اختارله سيلز شاطر.'],
    },
    { icon: UserCheck, tone: 'sky',     title: 'بادج "السيلز السابق"',
      steps: ['فوق قائمة اختيار السيلز بيظهر سطر: "وقف معاه في الزيارة السابقة: [اسم السيلز]".'],
      tip: 'البادج معلومة مساعِدة فقط — القرار النهائي ليك.',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function GuideCard({ section, open, onToggle }) {
  const Icon = section.icon;
  const tone = TONES[section.tone] || TONES.primary;
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 text-right hover:bg-dark-800/30 transition-colors">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="flex-1 text-white font-black text-sm">{section.title}</h3>
        <ChevronDown className={`w-5 h-5 text-dark-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-dark-800/60 pt-3">
          <ol className="space-y-2.5">
            {section.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-dark-800 text-dark-300 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-dark-200 text-sm leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
          {section.tip && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-300 text-[11px] font-black mb-0.5">تلميح هام</p>
                <p className="text-dark-200 text-xs leading-relaxed">{section.tip}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GuideDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-dark-800" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-800">
        <BookOpen className="w-3.5 h-3.5 text-dark-500" />
        <span className="text-dark-500 text-xs font-bold">دليل الأدوار المرجعي</span>
      </div>
      <div className="flex-1 h-px bg-dark-800" />
    </div>
  );
}

function GuideAccordion({ sections }) {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="space-y-2">
      {sections.map((s, i) => (
        <GuideCard key={i} section={s} open={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEPTION ARENA — mirrors ReceptionDesk.jsx exactly
// ─────────────────────────────────────────────────────────────────────────────
const R_IDLE = 'idle'; const R_LOADING = 'loading';
const R_SUCCESS = 'success'; const R_ERROR = 'error'; const R_FORM = 'form';

function ReceptionArena() {
  const [code,   setCode]   = useState('');
  const [state,  setState]  = useState(R_IDLE);
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [branch, setBranch] = useState('');
  const [selectedSales, setSelectedSales] = useState('');
  const [salesSaved,    setSalesSaved]    = useState(false);
  const [formName,  setFormName]  = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formInterest, setFormInterest] = useState('');
  const [formSource,   setFormSource]   = useState('');
  const [formErr, setFormErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleConfirm = () => {
    const trimmed = code.trim().replace(/\s|-/g, '');
    if (!trimmed) return;
    if (!branch) { setErrMsg('اختار الفرع اللي إنت فيه الأول'); setState(R_ERROR); return; }
    setState(R_LOADING);
    setResult(null); setSelectedSales(''); setSalesSaved(false);
    setTimeout(() => {
      const found = MOCK_PHONES[trimmed] || MOCK_PHONES[code.trim()];
      if (found) {
        setResult(found); setState(R_SUCCESS); setCode('');
      } else {
        setErrMsg('الرقم ده مش موجود في السيستم — تأكد إن العميل مسجّل في الماسنجر');
        setState(R_ERROR);
      }
    }, 900);
  };

  const handleCreateWalkIn = () => {
    if (!formName.trim())  { setFormErr('اكتب اسم العميل'); return; }
    if (!formPhone.trim()) { setFormErr('اكتب رقم تليفون العميل'); return; }
    if (!branch)           { setFormErr('اختار الفرع الأول'); return; }
    setState(R_LOADING); setFormErr('');
    setTimeout(() => {
      setResult({
        user_id: 'u_walkin', first_name: formName.trim(),
        lead_class: 'new', campaign_source: formSource || null,
        pre_visit_rep: null, was_lost_and_returned: false,
        branch,
      });
      setState(R_SUCCESS); setCode('');
    }, 700);
  };

  const reset = () => {
    setState(R_IDLE); setCode(''); setResult(null); setErrMsg('');
    setSelectedSales(''); setSalesSaved(false);
    setFormName(''); setFormPhone(''); setFormInterest(''); setFormSource(''); setFormErr('');
    inputRef.current?.focus();
  };

  const openWalkInForm = () => {
    setFormPhone(code.trim() || ''); setFormName(''); setFormInterest(''); setFormSource(''); setFormErr('');
    setState(R_FORM);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-4" dir="rtl">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/20 rounded-3xl flex items-center justify-center mx-auto">
          <Phone className="w-8 h-8 text-primary-400" />
        </div>
        <h2 className="text-2xl font-black text-white">استقبال الزيارات</h2>
        <p className="text-dark-400 text-sm">اسأل العميل عن رقم تليفونه واكتبه هنا لتأكيد وصوله للمعرض</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold">
          <Lightbulb className="w-3.5 h-3.5" />
          جرّب: 01012345678 · 01098765432 · 01155443322 · أو رقم غير موجود
        </div>
      </div>

      {/* Input card */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-3.5 h-3.5 text-primary-400" />
            الفرع اللي إنت فيه
          </label>
          <select
            value={branch}
            onChange={e => setBranch(e.target.value)}
            disabled={state === R_LOADING}
            className="input-field w-full text-base"
          >
            <option value="">— اختار الفرع —</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <p className="text-dark-600 text-[11px] mt-1">اختاره مرة واحدة — الزيارة هتتسجّل للفرع ده.</p>
        </div>
        <div className="h-px bg-dark-800" />

        <label className="block text-dark-400 text-xs font-bold uppercase tracking-wider">رقم تليفون العميل</label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="01012345678"
            type="tel" dir="ltr" maxLength={20}
            disabled={state === R_LOADING}
            className="input-field flex-1 text-lg font-mono tracking-widest text-center"
            autoComplete="off"
          />
          <button
            onClick={handleConfirm}
            disabled={!code.trim() || state === R_LOADING}
            className="btn-primary px-6 disabled:opacity-50"
          >
            {state === R_LOADING
              ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'تأكيد'}
          </button>
        </div>
        <p className="text-dark-600 text-xs text-center">اضغط Enter أو انقر تأكيد — أي صيغة للرقم تشتغل</p>
      </div>

      {/* SUCCESS */}
      {state === R_SUCCESS && result && (
        <div className="card p-6 border-emerald-500/30 bg-emerald-500/5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">تأكيد الوصول ✓</p>
              <h3 className="text-2xl font-black text-white mb-1">أهلاً بك، {result.first_name}!</h3>
              {result.branch && (
                <p className="text-sm text-white font-bold mb-1">🏬 جاي لفرع: <span className="text-emerald-300">{result.branch}</span></p>
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

          {result.was_lost_and_returned && (
            <div className="rounded-xl border-2 border-rose-500/50 bg-rose-500/10 px-4 py-3">
              <p className="text-rose-300 font-black text-sm">⚠️ العميل كان مغلق (Lost) ورجع زار المعرض تاني!</p>
            </div>
          )}

          {/* Assign sales rep */}
          <div className="border-t border-emerald-500/20 pt-4">
            {salesSaved ? (
              <div className="flex items-center gap-2 text-sm font-black text-emerald-300">
                <UserCheck className="w-4 h-4" />
                العميل هيقف مع: {selectedSales}
              </div>
            ) : (
              <>
                {result.last_showroom_rep && (
                  <p className="text-[12px] text-amber-300 font-bold mb-2">🧍 وقف معاه في الزيارة السابقة: {result.last_showroom_rep}</p>
                )}
                <label className="flex items-center gap-1.5 text-dark-300 text-xs font-bold mb-2">
                  <Users className="w-3.5 h-3.5 text-primary-400" />
                  مين السيلز اللي هيقف مع العميل؟
                </label>
                <div className="flex gap-3">
                  <select
                    value={selectedSales}
                    onChange={e => setSelectedSales(e.target.value)}
                    className="input-field flex-1"
                  >
                    <option value="">— اختار السيلز —</option>
                    {MOCK_REPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button
                    onClick={() => selectedSales && setSalesSaved(true)}
                    disabled={!selectedSales}
                    className="btn-primary px-5 disabled:opacity-50"
                  >
                    تأكيد
                  </button>
                </div>
              </>
            )}
          </div>

          <button onClick={reset} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors">
            <RotateCcw className="w-4 h-4" />
            تسجيل زيارة أخرى
          </button>
        </div>
      )}

      {/* ERROR */}
      {state === R_ERROR && (
        <div className="card p-6 border-rose-500/30 bg-rose-500/5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-rose-400 text-xs font-black uppercase tracking-wider mb-1">خطأ</p>
              <p className="text-white font-bold">{errMsg}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors">
              <RotateCcw className="w-4 h-4" />
              حاول مرة أخرى
            </button>
            <button onClick={openWalkInForm} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-500/15 hover:bg-primary-500/25 border border-primary-500/30 text-primary-300 text-sm font-bold transition-colors">
              <UserPlus className="w-4 h-4" />
              إضافة عميل جديد
            </button>
          </div>
        </div>
      )}

      {/* WALK-IN FORM */}
      {state === R_FORM && (
        <div className="card p-6 border-primary-500/30 bg-primary-500/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary-500/15 rounded-2xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-black">إضافة عميل جديد</h3>
              <p className="text-dark-400 text-xs">عميل مش مسجّل — هيتسجّل كزيارة مؤكدة</p>
            </div>
          </div>

          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">اسم العميل *</label>
            <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="الاسم بالكامل" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">رقم التليفون *</label>
            <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="01012345678" type="tel" dir="ltr" className="input-field w-full font-mono tracking-widest text-center" />
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">مهتم بإيه؟</label>
            <select value={formInterest} onChange={e => setFormInterest(e.target.value)} className="input-field w-full">
              <option value="">— اختار الفئة —</option>
              {INTERESTS.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-dark-400 text-xs font-bold mb-1">عرفنا منين؟</label>
            <select value={formSource} onChange={e => setFormSource(e.target.value)} className="input-field w-full">
              <option value="">— اختار المصدر —</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {formErr && <p className="text-rose-400 text-xs font-bold">{formErr}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={reset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-800/60 hover:bg-dark-800 border border-dark-700 text-dark-300 hover:text-white text-sm font-bold transition-colors">
              إلغاء
            </button>
            <button
              onClick={handleCreateWalkIn}
              disabled={!formName.trim() || !formPhone.trim() || state === R_LOADING}
              className="flex-1 btn-primary justify-center disabled:opacity-50"
            >
              {state === R_LOADING
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><UserPlus className="w-4 h-4" />إضافة وتأكيد الزيارة</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES ARENA — mirrors SalesDashboardView.jsx exactly
// السيلز في المعرض: بيقف مع العملاء اللي الاستقبال أسندهم ليه، يتابع قبل الزيارة
// ─────────────────────────────────────────────────────────────────────────────
const SALES_FUP_TABS = [
  { id: 'pending',     label: 'محتاجين متابعة', icon: PhoneCall, tone: 'text-amber-400',
    title: 'عملاء محتاجين متابعة', empty: 'مفيش عملاء مسنودين ليك للمتابعة دلوقتي' },
  { id: 'visited',     label: 'تابعتهم + زاروا', icon: MapPinned, tone: 'text-emerald-400',
    title: 'تابعتهم وزاروا المعرض', empty: 'مفيش عملاء تابعتهم وزاروا المعرض لسه' },
  { id: 'not-visited', label: 'تابعتهم + لسه',  icon: MapPinOff, tone: 'text-amber-400',
    title: 'تابعتهم ولسه مزاروش', empty: 'كل اللي تابعتهم زاروا المعرض 👌' },
];

const timeAgoSales = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d <= 0) return 'اليوم';
  if (d === 1) return 'أمس';
  return `${d} يوم`;
};

function SalesCallModal({ customer, onConfirm, onClose }) {
  const [summary, setSummary] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" dir="rtl" onClick={onClose}>
      <div className="card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-black">متابعة العميل</h3>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-dark-400 text-xs mb-3">{customer.first_name}</p>
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
          <button onClick={() => onConfirm(summary.trim())} className="btn-primary flex-1">تأكيد المتابعة</button>
        </div>
      </div>
    </div>
  );
}

function SalesArena() {
  const [view,      setView]      = useState('home');
  const [customers, setCustomers] = useState(MOCK_SHOWROOM_CUSTOMERS);
  const [followups, setFollowups] = useState(MOCK_SHOWROOM_FOLLOWUPS);
  const [fupTab,    setFupTab]    = useState('pending');
  const [callFor,   setCallFor]   = useState(null);
  const [busy,      setBusy]      = useState({});

  const repName = 'أحمد محمد';
  const branch  = 'نصر سيتي';

  // KPIs
  const salesTotal  = customers.filter(c => c.my_purchases > 0).reduce((s, c) => s + c.my_sales_total, 0);
  const servedCount = customers.length;
  const boughtCount = customers.filter(c => c.my_purchases > 0).length;
  const closeRate   = servedCount > 0 ? Math.round((boughtCount / servedCount) * 100) : 0;

  const lists = {
    pending:       followups.filter(f => !f.followed_up),
    visited:       followups.filter(f => !!f.followed_up && f.visited),
    'not-visited': followups.filter(f => !!f.followed_up && !f.visited),
  };

  const confirmFollow = (summary) => {
    const c = callFor;
    setCallFor(null);
    setBusy(b => ({ ...b, [c.user_id]: false }));
    setFollowups(prev => prev.map(x =>
      x.user_id === c.user_id
        ? { ...x, followed_up: 1, followed_up_at: new Date().toISOString(), call_summary: summary || null }
        : x
    ));
  };

  const viewLabel = view === 'home' ? 'عملائي' : 'متابعة قبل الزيارة';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-4" dir="rtl">

      {/* ── Header — mirrors SalesDashboardView header exactly ──────── */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
              مبيعات · {viewLabel}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white">أهلاً، {repName}</h1>
          <p className="text-dark-400 text-sm mt-1">فرع {branch}</p>
        </div>
        {/* View toggle: home ↔ followups */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setView('home')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border transition-all ${
              view === 'home'
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                : 'text-dark-400 border-dark-700 hover:text-white hover:bg-dark-800/50'}`}>
            <Users className="w-4 h-4" />عملائي
          </button>
          <button
            onClick={() => setView('followups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black border transition-all ${
              view === 'followups'
                ? 'bg-primary-500/20 text-primary-300 border-primary-500/30'
                : 'text-dark-400 border-dark-700 hover:text-white hover:bg-dark-800/50'}`}>
            <PhoneCall className="w-4 h-4" />متابعة قبل الزيارة
          </button>
        </div>
      </div>

      {/* ── HOME VIEW: KPIs + عملائي ────────────────────────────────── */}
      {view === 'home' && (
        <div className="space-y-10">

          {/* KPIs — 4 cards exactly like SalesDashboardView */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary-400" />
              <h3 className="text-white font-black text-sm">أرقامي هذا الشهر</h3>
              <p className="text-dark-500 text-xs mr-1">مبيعاتك وأدائك في الشهر الحالي</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* مبيعاتي هذا الشهر + TargetProgress bar */}
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-emerald-400 bg-emerald-500/10">
                  <Wallet className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-white">{salesTotal.toLocaleString('en-US')}</p>
                <p className="text-dark-500 text-xs mt-1">مبيعاتي هذا الشهر (ج.م)</p>
                <div className="mt-3">
                  <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '42%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-dark-500 mt-1">
                    <span>٤٢٪ مستهدفي</span>
                    <span>٢٠٠,٠٠٠ ج.م</span>
                  </div>
                </div>
              </div>
              {/* عملاء وقفت معاهم */}
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-primary-400 bg-primary-500/10">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-white">{servedCount}</p>
                <p className="text-dark-500 text-xs mt-1">عملاء وقفت معاهم</p>
              </div>
              {/* اشتروا */}
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-sky-400 bg-sky-500/10">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-white">{boughtCount}</p>
                <p className="text-dark-500 text-xs mt-1">اشتروا</p>
              </div>
              {/* نسبة التقفيل */}
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-amber-400 bg-amber-500/10">
                  <Percent className="w-5 h-5" />
                </div>
                <p className="text-2xl font-black text-white">{closeRate}%</p>
                <p className="text-dark-500 text-xs mt-1">نسبة التقفيل</p>
              </div>
            </div>
          </section>

          {/* عملائي — customers assigned by reception */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-violet-400" />
              <h3 className="text-white font-black text-sm">عملائي ({customers.length})</h3>
              <p className="text-dark-500 text-xs mr-1">العملاء اللي الاستقبال حدّدك معاهم</p>
            </div>
            <div className="card p-5">
              <div className="space-y-2.5">
                {customers.map(c => {
                  const bought = c.my_purchases > 0;
                  const meta   = LEAD_META[c.lead_class] || LEAD_META.cold;
                  return (
                    <div key={c.user_id}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                        bought
                          ? 'bg-emerald-500/5 border-emerald-500/25'
                          : 'bg-dark-800/40 border-dark-700 hover:border-dark-600'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate">{c.first_name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                          <span className={`px-2 py-0.5 rounded-full border ${meta.badge}`}>{meta.label}</span>
                          {c.phones && <span className="text-dark-300 font-mono" dir="ltr">{c.phones}</span>}
                          <span className="text-dark-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />{c.visited_at}
                          </span>
                        </div>
                      </div>
                      {bought ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-xs font-black flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" /> اشترى • {c.my_sales_total.toLocaleString('en-US')} ج.م
                        </span>
                      ) : (
                        <span className="text-primary-400 text-xs font-bold flex-shrink-0">سجّل البيع ←</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-dark-600 text-[11px] mt-4 text-center">
                اضغط على العميل عشان تسجّل بيع أو تضيف ملاحظة من ملفه
              </p>
            </div>
          </section>
        </div>
      )}

      {/* ── FOLLOWUPS VIEW: 3 tabs — mirrors FUP_TABS ───────────────── */}
      {view === 'followups' && (() => {
        const tab = SALES_FUP_TABS.find(t => t.id === fupTab) || SALES_FUP_TABS[0];
        const TabIcon = tab.icon;
        return (
          <div className="space-y-4">
            {/* Tab bar */}
            <div className="card p-1.5 flex gap-1">
              {SALES_FUP_TABS.map(t => {
                const TIcon  = t.icon;
                const active = fupTab === t.id;
                return (
                  <button key={t.id} onClick={() => setFupTab(t.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-black transition-all ${
                      active
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'}`}>
                    <TIcon className="w-4 h-4" />
                    {t.label}
                    <span className="text-xs opacity-70">({lists[t.id].length})</span>
                  </button>
                );
              })}
            </div>

            {/* Followup list card */}
            <div className="card overflow-hidden">
              <div className="p-4 flex items-center gap-2 border-b border-dark-800">
                <TabIcon className={`w-4 h-4 ${tab.tone}`} />
                <h4 className="text-white font-black text-sm">{tab.title}</h4>
                <span className="text-xs text-dark-400 font-bold">({lists[tab.id].length})</span>
              </div>
              {lists[tab.id].length === 0 ? (
                <p className="text-center text-dark-500 text-sm py-16">{tab.empty}</p>
              ) : (
                <div className="divide-y divide-dark-800/60">
                  {lists[tab.id].map(c => {
                    const meta = LEAD_META[c.lead_class] || LEAD_META.cold;
                    return (
                      <div key={c.user_id} className="px-4 py-3 flex items-start gap-3 hover:bg-dark-800/20 transition-colors">
                        {fupTab === 'pending' ? (
                          <button
                            onClick={() => { setBusy(b => ({ ...b, [c.user_id]: true })); setCallFor(c); }}
                            disabled={!!busy[c.user_id]}
                            className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-full px-3 py-1.5 transition-colors mt-0.5">
                            <PhoneCall className="w-4 h-4" />تابعت
                          </button>
                        ) : (
                          <span className="shrink-0 text-emerald-400 mt-1"><CheckCircle2 className="w-5 h-5" /></span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-bold text-sm truncate">{c.first_name}</span>
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${meta.badge}`}>{meta.label}</span>
                            {fupTab !== 'pending' && (
                              c.visited
                                ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">تمت الزيارة</span>
                                : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">لسه مزارش</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-dark-400 flex-wrap">
                            {c.phones && <span className="font-mono" dir="ltr">{c.phones}</span>}
                            <span className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 text-amber-400" />{c.total_score}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {fupTab === 'pending' ? `اتسند ${timeAgoSales(c.assigned_at)}` : timeAgoSales(c.followed_up_at)}
                            </span>
                          </div>
                          {fupTab !== 'pending' && c.call_summary && (
                            <p className="mt-1.5 text-[12px] text-dark-200 bg-dark-800/60 rounded-lg px-3 py-2 leading-relaxed">
                              {c.call_summary}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {callFor && (
        <SalesCallModal
          customer={callFor}
          onConfirm={confirmFollow}
          onClose={() => { setCallFor(null); setBusy(b => ({ ...b, [callFor?.user_id]: false })); }}
        />
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ADMIN TRAINING PANEL
// ─────────────────────────────────────────────────────────────────────────────
const ADMIN_SLIDES = [
  { id: 'reception', icon: Phone,          label: 'محاكاة موظف الاستقبال',          sublabel: 'Reception Arena',   color: 'sky',    component: ReceptionArena  },
  { id: 'sales',     icon: Briefcase,      label: 'محاكاة السيلز في المعرض',         sublabel: 'Showroom Sales',    color: 'rose',   component: SalesArena      },
];
const SLIDE_COLORS = {
  sky:    { active: 'bg-sky-500/20    text-sky-300    border-sky-500/40',    inactive: 'text-dark-400 border-transparent hover:text-sky-300    hover:bg-sky-500/10'    },
  rose:   { active: 'bg-rose-500/20   text-rose-300   border-rose-500/40',   inactive: 'text-dark-400 border-transparent hover:text-rose-300   hover:bg-rose-500/10'   },
  violet: { active: 'bg-violet-500/20 text-violet-300 border-violet-500/40', inactive: 'text-dark-400 border-transparent hover:text-violet-300 hover:bg-violet-500/10' },
};

function AdminTrainingPanel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [openIdx,     setOpenIdx]     = useState(0);
  const slide = ADMIN_SLIDES[activeSlide];
  const SlideComponent = slide.component;

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-violet-500/20 border border-primary-500/30 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-300" />
          </div>
          <div>
            <h2 className="text-white font-black text-lg">لوحة التحكم في التدريب الشاملة</h2>
            <p className="text-dark-400 text-xs mt-0.5">محاكاة تفاعلية كاملة لكل أدوار النظام — بدون أي تأثير على البيانات الحقيقية</p>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-dark-950 rounded-xl border border-dark-800">
          {ADMIN_SLIDES.map((s, i) => {
            const Icon = s.icon;
            const isActive = activeSlide === i;
            const colors = SLIDE_COLORS[s.color];
            return (
              <button key={s.id} onClick={() => setActiveSlide(i)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 px-4 rounded-lg border font-black text-sm transition-all duration-200 ${isActive ? colors.active : colors.inactive}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-800">
          <Layers className="w-3.5 h-3.5 text-dark-500" />
          <span className="text-dark-500 text-[11px]">الشريحة النشطة:</span>
          <span className="text-dark-300 text-[11px] font-black">{slide.label}</span>
          <span className="text-dark-600 text-[10px] mr-auto" dir="ltr">{slide.sublabel}</span>
        </div>
      </div>

      <div className="card p-5">
        <SlideComponent key={activeSlide} />
      </div>

      <GuideDivider />
      <GuideAccordion sections={GUIDE.admin} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC ACCORDION (branch_manager + fallback)
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ROLES = [
  { id: 'admin',          label: '👑 مدير النظام'   },
  { id: 'branch_manager', label: '🏬 مدير الفرع'    },
  { id: 'sales',          label: '💼 مبيعات المعرض' },
  { id: 'reception',      label: '🛎️ الاستقبال'     },
];

function GenericGuidePage({ initialRole }) {
  const [activeRole, setActiveRole] = useState(initialRole);
  const sections = GUIDE[activeRole] || [];
  return (
    <div className="space-y-5">
      <div className="card p-1.5 flex flex-wrap gap-1">
        {ALL_ROLES.map(r => {
          const active = activeRole === r.id;
          return (
            <button key={r.id} onClick={() => setActiveRole(r.id)}
              className={`flex-1 min-w-[130px] py-2.5 rounded-xl text-sm font-black transition-all ${
                active ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                       : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'}`}>
              {r.label}
            </button>
          );
        })}
      </div>
      <GuideAccordion sections={sections} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SystemGuide() {
  const { user } = useAuth();
  const role = user?.role;

  const subtitle =
    role === 'admin'     ? 'لوحة التحكم في التدريب الشاملة — محاكاة تفاعلية كاملة لكل الأدوار' :
    role === 'reception' ? 'بيئة تدريب الاستقبال — تسجيل الزيارات بكل سيناريوهاتها' :
    role === 'sales'     ? 'بيئة تدريب السيلز في المعرض — عملائي، متابعة قبل الزيارة، وتسجيل البيع' :
    'شرح تفاعلي لكل ميزة — اختار دورك وافتح أي قسم.';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-1 bg-primary-600 rounded-full" />
          <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">مساعدة</span>
        </div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary-400" />
          دليل استخدام النظام
        </h1>
        <p className="text-dark-400 text-sm mt-1">{subtitle}</p>
      </div>

      {role === 'admin' && <AdminTrainingPanel />}

      {role === 'reception' && (
        <>
          <div className="card p-5"><ReceptionArena /></div>
          <GuideDivider />
          <GuideAccordion sections={GUIDE.reception} />
        </>
      )}

      {role === 'sales' && (
        <>
          <div className="card p-5"><SalesArena /></div>
          <GuideDivider />
          <GuideAccordion sections={GUIDE.sales} />
        </>
      )}

      {role !== 'admin' && role !== 'reception' && role !== 'sales' && (
        <GenericGuidePage initialRole={ALL_ROLES.some(r => r.id === role) ? role : 'admin'} />
      )}
    </div>
  );
}
