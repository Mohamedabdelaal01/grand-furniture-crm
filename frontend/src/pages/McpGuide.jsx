/**
 * McpGuide — Admin training page for the Cloud AI Assistant (MCP over SSE).
 * Documents the Railway-hosted SSE endpoint, all 4 CRM tools, security model,
 * and concrete Arabic prompt examples for daily admin use.
 */
import { useState } from 'react';
import {
  Bot, BarChart3, Users, Terminal, Pencil, Copy, Check,
  Plug, AlertTriangle, ShieldCheck, Zap, Globe, Database,
  Lightbulb, ChevronDown, ChevronUp, Lock,
} from 'lucide-react';

// ── Config snippet (SSE — no local script) ────────────────────────────────────
const CONFIG_SNIPPET = `{
  "mcpServers": {
    "grand-furniture-crm": {
      "url": "https://medo-backend-production.up.railway.app/api/mcp/sse",
      "headers": {
        "x-mcp-key": "Medo_Super_Secret_2026"
      }
    }
  }
}`;

// ── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    icon: BarChart3,
    tone: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    badgeTone: 'bg-emerald-500/15 text-emerald-300',
    mode: 'قراءة',
    name: 'get_branch_kpis',
    title: 'مؤشرات أداء الفروع',
    desc: 'يسترجع إجمالي المبيعات وعدد الزيارات ونسبة تحقيق المستهدف لأي فرع أو لكل الفروع مجمّعةً، لشهر تختاره أو للشهر الحالي.',
    params: ['branch — اسم الفرع (اختياري، فارغ = كل الفروع)', 'target_month — الشهر YYYY-MM (اختياري)'],
    prompts: [
      'إيه أداء فرع عين شمس في مايو 2026؟',
      'قارنلي أداء كل الفروع الشهر ده وقولي مين وصل المستهدف ومين لأ',
      'أنهي فرع عنده أعلى نسبة تحويل زيارات لمبيعات؟',
    ],
  },
  {
    icon: Users,
    tone: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    badgeTone: 'bg-sky-500/15 text-sky-300',
    mode: 'قراءة',
    name: 'get_leads_by_status',
    title: 'قائمة العملاء بالفلتر',
    desc: 'يجيب بقائمة العملاء (id / الاسم / التليفون / التصنيف / المندوب) مع فلترة بالمندوب المسؤول أو بتصنيف العميل. الخطوة الأولى الإلزامية قبل أي تعديل جماعي.',
    params: [
      'assigned_rep — اسم المندوب (اختياري)',
      'lead_class — cold / warm / hot / visited / purchased (اختياري)',
    ],
    prompts: [
      'هاتلي كل العملاء الباردين المسندين لأحمد',
      'كام عميل hot عندنا دلوقتي؟',
      'وريني العملاء اللي زاروا الفرع ولسه معملوش شراء',
    ],
  },
  {
    icon: Terminal,
    tone: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    badgeTone: 'bg-violet-500/15 text-violet-300',
    mode: 'قراءة',
    name: 'run_select_sql',
    title: 'استعلام SQL حر',
    desc: 'تنفيذ أي استعلام SELECT مخصص للتحليلات والتقارير المتقدمة. يقبل SELECT فقط — أي استعلام تعديلي يُرفض تلقائياً.',
    params: ['sql_query — استعلام SELECT (إلزامي)'],
    prompts: [
      'اعملي تقرير بأكتر 5 منتجات مبيعاً هذا الربع',
      'وضّح توزيع العملاء على المندوبين في كل فرع',
      'كام عميل اتزار من غير ما يشتري في آخر 30 يوم؟',
      'قارن معدل تحويل العملاء بين فرعي نصر سيتي والمعادي',
    ],
  },
  {
    icon: Pencil,
    tone: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    badgeTone: 'bg-rose-500/15 text-rose-300',
    mode: 'كتابة',
    name: 'execute_write_sql',
    title: 'تعديل البيانات (INSERT / UPDATE / DELETE)',
    desc: 'تنفيذ عمليات تعديل حقيقية على البيانات الحية. مخصصة لإصلاح السجلات القديمة والتصحيحات الجماعية. يحجب DDL بالكامل (DROP / ALTER / TRUNCATE).',
    params: ['sql_query — INSERT أو UPDATE أو DELETE (إلزامي)'],
    prompts: [
      'صحّح تصنيف العملاء اللي مالهمش نشاط من 6 شهور لـ cold',
      'أسند العملاء بدون مندوب في فرع فيصل لـ محمد',
      'حدّث revisit_status للعملاء اللي زاروا فرع حلوان الشهر ده ومعملوش شراء',
      'امسح السجلات التجريبية اللي user_id بتاعها بيبدأ بـ test_',
    ],
  },
];

// ── Operational advantages ────────────────────────────────────────────────────
const ADVANTAGES = [
  {
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'استجابة فورية',
    body: 'الاتصال مباشر من Claude Desktop إلى Railway — بدون وسيط ولا port forwarding. زمن الاستجابة مرتبط فقط بسرعة الشبكة.',
  },
  {
    icon: Globe,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    title: 'من أي مكان في العالم',
    body: 'يعمل من الموبايل، من الفرع، من البيت — طالما عندك Claude Desktop والمفتاح السري. لا حاجة لنفس الجهاز أو الشبكة.',
  },
  {
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'بيانات حية دايماً',
    body: 'يتصل بنفس قاعدة البيانات الحقيقية على Railway — نفس الأرقام اللي تظهر في الداشبورد وبتيجي من ManyChat في نفس اللحظة.',
  },
  {
    icon: Zap,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'صفر استهلاك محلي',
    body: 'لا يوجد أي process يشتغل في الخلفية على الجهاز. كل المعالجة تحدث على خوادم Railway — صفر CPU وصفر RAM محلي.',
  },
];

// ── Reusable components ───────────────────────────────────────────────────────
function CopyButton({ text, label = 'نسخ' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) { /* clipboard blocked — user can select manually */ }
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-bold text-primary-400 hover:text-primary-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'تم النسخ' : label}
    </button>
  );
}

function PromptChip({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="انسخ هذا الـ prompt"
      className="flex items-center gap-2 text-right text-xs text-dark-200 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-dark-500 rounded-lg px-3 py-2 transition-all group"
    >
      <span className="flex-1 leading-relaxed">«{text}»</span>
      {copied
        ? <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
        : <Copy className="w-3 h-3 text-dark-500 group-hover:text-dark-300 flex-shrink-0 transition-colors" />
      }
    </button>
  );
}

function CollapsibleTool({ tool }) {
  const [open, setOpen] = useState(false);
  const Icon = tool.icon;
  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-dark-800/40 transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 ${tool.tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-white font-black text-sm" dir="ltr">{tool.name}</code>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tool.badgeTone}`}>
              {tool.mode}
            </span>
          </div>
          <p className="text-dark-400 text-xs mt-0.5">{tool.title}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-dark-500 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-dark-500 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-dark-800/60 px-4 pb-4 pt-4 space-y-4">
          <p className="text-dark-300 text-sm leading-relaxed">{tool.desc}</p>

          {/* Parameters */}
          <div>
            <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-2">المُدخلات</p>
            <ul className="space-y-1">
              {tool.params.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-dark-300">
                  <span className="text-primary-500 font-black mt-0.5">·</span>
                  <code dir="ltr" className="leading-relaxed">{p}</code>
                </li>
              ))}
            </ul>
          </div>

          {/* Prompt examples */}
          <div>
            <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-2">
              أمثلة على الأسئلة — انقر لنسخ
            </p>
            <div className="space-y-1.5">
              {tool.prompts.map((p, i) => <PromptChip key={i} text={p} />)}
            </div>
          </div>

          {/* Write-mode danger callout */}
          {tool.mode === 'كتابة' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-rose-300 text-xs font-black">تحذير أمني — تأثير مباشر على البيانات الحية</p>
                <p className="text-dark-300 text-xs leading-relaxed">
                  دايماً اطلب من Claude إنه يعرض جملة <code dir="ltr">WHERE</code> وعدد
                  الصفوف المتأثرة <b>قبل</b> التنفيذ. خذ نسخة احتياطية من قاعدة
                  البيانات قبل أي تعديل جماعي واسع.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function McpGuide() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16" dir="rtl">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-1 bg-primary-600 rounded-full" />
          <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
            النظام والرقابة
          </span>
        </div>
        <h1 className="text-3xl font-black text-white flex items-center gap-2">
          <Bot className="w-7 h-7 text-primary-400" />
          المساعد الذكي السحابي (AI Assistant)
        </h1>
        <p className="text-dark-400 text-sm mt-1.5 leading-relaxed">
          Claude Desktop متصل مباشرةً بقاعدة بيانات الـ CRM الحية على Railway —
          اسأله أسئلة، اطلب منه تقارير، أو صحّح بيانات قديمة بجملة واحدة.
        </p>
      </div>

      {/* ── Architecture overview ────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h3 className="text-white font-black text-sm">كيف يعمل النظام؟</h3>
        <p className="text-dark-300 text-sm leading-relaxed">
          النظام يعتمد على <b className="text-white">Model Context Protocol (MCP)</b> عبر
          بروتوكول <b className="text-white">Server-Sent Events (SSE)</b> — وهو خط اتصال
          دائم ومشفر بين Claude Desktop وخادم Railway. بمجرد الربط، يقدر Claude يستعلم
          عن البيانات أو يعدّلها مباشرةً بدون أي أداة وسيطة أو سكريبت محلي.
        </p>

        {/* Architecture flow */}
        <div className="rounded-xl bg-dark-950 border border-dark-800 p-4" dir="ltr">
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-primary-500/15 text-primary-300 border border-primary-500/20">
              Claude Desktop
            </span>
            <span className="text-dark-500">──SSE/HTTPS──▶</span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              Railway (server.js)
            </span>
            <span className="text-dark-500">──WAL──▶</span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20">
              grand_furniture.db
            </span>
          </div>
          <p className="text-center text-dark-600 text-[10px] mt-2 font-mono">
            x-mcp-key header on every request
          </p>
        </div>

        {/* Security callout */}
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-rose-300 text-xs font-black">⚠️ وضع القراءة والكتابة مُفعّل</p>
            <p className="text-dark-200 text-xs leading-relaxed">
              Claude يقدر يقرأ <b>ويعدّل</b> البيانات الحقيقية. الحماية:
              أداة الكتابة تقبل <b>DML فقط</b> وتحجب أوامر حذف الجداول (DDL)،
              وكل عملية تعديل تتسجّل في سجل التدقيق على Railway.
              <b className="text-rose-300"> أخذ نسخة احتياطية قبل أي تعديل جماعي واجب.</b>
            </p>
          </div>
        </div>
      </div>

      {/* ── Operational advantages ───────────────────────────────────────── */}
      <div>
        <h3 className="text-white font-black text-sm mb-3">مزايا النظام السحابي</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ADVANTAGES.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className={`rounded-xl border p-4 ${a.bg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${a.color}`} />
                  <p className="text-white text-xs font-black">{a.title}</p>
                </div>
                <p className="text-dark-300 text-xs leading-relaxed">{a.body}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Security section ─────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h3 className="text-white font-black text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          جدار الأمان السحابي
        </h3>

        <div className="space-y-3">
          {/* x-mcp-key */}
          <div className="flex items-start gap-3 rounded-xl border border-dark-700 bg-dark-900/50 p-4">
            <Lock className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-xs font-black mb-1">المفتاح السري — <code dir="ltr">x-mcp-key</code></p>
              <p className="text-dark-300 text-xs leading-relaxed">
                كل طلب — سواء SSE أو POST — لازم يحمل المفتاح السري في الـ header.
                أي طلب بدون المفتاح الصح يحصل على <code className="text-rose-400">401 Unauthorized</code> فوراً.
                المفتاح مخزّن في Railway environment variables — مش في الكود.
              </p>
            </div>
          </div>

          {/* DDL Blocking */}
          <div className="flex items-start gap-3 rounded-xl border border-dark-700 bg-dark-900/50 p-4">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-xs font-black mb-1">حجب DDL — حماية هيكل قاعدة البيانات</p>
              <p className="text-dark-300 text-xs leading-relaxed">
                أداة الكتابة تمر الاستعلام على فلتر regex قبل التنفيذ.
                أي استعلام يحتوي على{' '}
                <code className="text-rose-400" dir="ltr">DROP · ALTER · TRUNCATE · ATTACH · VACUUM</code>{' '}
                يُرفض بـ error فوري — مستحيل حذف جدول أو تعديل هيكل قاعدة البيانات.
              </p>
            </div>
          </div>

          {/* Audit log */}
          <div className="flex items-start gap-3 rounded-xl border border-dark-700 bg-dark-900/50 p-4">
            <Database className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white text-xs font-black mb-1">سجل التدقيق — Audit Log</p>
              <p className="text-dark-300 text-xs leading-relaxed mb-2">
                كل عملية كتابة تتسجّل في Railway deployment logs بالصيغة:
              </p>
              <pre dir="ltr" className="text-[10px] text-emerald-300 bg-dark-950 rounded-lg p-2 font-mono overflow-x-auto">
                [mcp][WRITE] rows_affected=N :: UPDATE lead_profiles SET ...
              </pre>
            </div>
          </div>

          {/* تلميحات أمنية خطيرة */}
          <div className="flex items-start gap-2.5 rounded-xl border-2 border-rose-500/50 bg-rose-500/8 p-4">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-rose-300 text-sm font-black">🚨 تلميحات أمنية خطيرة — اقرأها قبل أي تعديل</p>
              <ul className="space-y-1.5">
                {[
                  'لا تعطِ المفتاح السري لأي مندوب مبيعات — هو صلاحية أدمن كاملة.',
                  'دايماً اطلب من Claude "وريني الاستعلام اللي هتنفذه" قبل الموافقة.',
                  'خذ نسخة احتياطية من grand_furniture.db قبل أي UPDATE أو DELETE جماعي.',
                  'لو حصل خطأ في بيانات، أول خطوة: اسأل Claude عن آخر [mcp][WRITE] في الـ logs.',
                  'المفتاح مخزّن في Railway env vars فقط — لا تضعه في الكود أو في repo.',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-dark-200">
                    <span className="text-rose-400 font-black flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tools section ────────────────────────────────────────────────── */}
      <div>
        <h3 className="text-white font-black text-sm mb-3">
          الأدوات المتاحة لـ Claude — اضغط لعرض التفاصيل والأمثلة
        </h3>
        <div className="space-y-2">
          {TOOLS.map(tool => <CollapsibleTool key={tool.name} tool={tool} />)}
        </div>
      </div>

      {/* ── Prompt playbook ──────────────────────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <div>
          <h3 className="text-white font-black text-sm flex items-center gap-2 mb-1">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            كتاب الـ Prompts — أسئلة جاهزة للأدمن
          </h3>
          <p className="text-dark-400 text-xs">انقر على أي مثال لنسخه، ثم الصقه في Claude مباشرةً.</p>
        </div>

        {/* Analytics prompts */}
        <div>
          <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-2">
            📊 تحليلات الأداء
          </p>
          <div className="space-y-1.5">
            {[
              'قارن أداء كل الفروع في الربع الثاني 2026 وقولي مين حقق المستهدف',
              'اعملي تقرير شامل: المبيعات، الزيارات، ونسبة التحويل لكل فرع',
              'وضّح العلاقة بين عدد العملاء الـ hot ونسبة المبيعات في كل فرع',
              'أنهي المندوب عنده أعلى معدل تحويل من warm لـ purchased هذا الشهر؟',
            ].map((p, i) => <PromptChip key={i} text={p} />)}
          </div>
        </div>

        {/* Data fix prompts */}
        <div>
          <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-2">
            🔧 إصلاح البيانات القديمة
          </p>
          <div className="space-y-1.5">
            {[
              'صحّح تصنيف العملاء اللي مالهمش نشاط من 6 شهور وتصنيفهم مش cold — حوّلهم لـ cold',
              'أسند العملاء اللي مالهمش مندوب في فرع نصر سيتي للمندوب الأقل تحميلاً',
              'حدّث revisit_status للعملاء اللي زاروا فرع حلوان في أبريل 2026 ومعملوش شراء',
              'امسح السجلات التجريبية اللي user_id بتاعها بيبدأ بـ test_ — وريني كام سجل قبل الحذف',
            ].map((p, i) => <PromptChip key={i} text={p} />)}
          </div>
        </div>

        {/* Cross-branch insights */}
        <div>
          <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-2">
            🌐 رؤى متعددة الفروع
          </p>
          <div className="space-y-1.5">
            {[
              'أنهي الفرع عنده أكتر عملاء hot ومع ذلك أقل مبيعات؟ ليه؟',
              'وضّح توزيع العملاء على المندوبين في كل فرع وحدد لو في مندوب محمّل أكتر من اللازم',
              'أنهي المنتجات الأكتر طلباً في كل فرع وقارن بين الفروع',
              'اعملي تقرير أسبوعي: العملاء الجدد، الزيارات، والمبيعات لكل فرع من 2026-05-01 لـ 2026-05-23',
            ].map((p, i) => <PromptChip key={i} text={p} />)}
          </div>
        </div>
      </div>

      {/* ── Connection steps ─────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h3 className="text-white font-black text-sm flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary-400" />
          ربط Claude Desktop — خطوة واحدة فقط
        </h3>

        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            1
          </span>
          <p className="text-dark-200 text-sm leading-relaxed">
            افتح ملف إعدادات Claude Desktop:
            <code className="block mt-1 text-xs text-dark-400 bg-dark-900 rounded px-2 py-1" dir="ltr">
              ~/Library/Application Support/Claude/claude_desktop_config.json
            </code>
          </p>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            2
          </span>
          <p className="text-dark-200 text-sm leading-relaxed">
            الصق المقطع ده (لو عندك <code dir="ltr">mcpServers</code> بالفعل، ضيف المفتاح جواه فقط):
          </p>
        </div>

        {/* Config snippet with copy */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-dark-500 text-[11px] font-black" dir="ltr">claude_desktop_config.json</span>
            <CopyButton text={CONFIG_SNIPPET} label="نسخ الكود" />
          </div>
          <pre
            dir="ltr"
            className="bg-dark-950 border border-dark-800 rounded-xl p-4 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed"
          >
            {CONFIG_SNIPPET}
          </pre>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-lg bg-primary-500/20 text-primary-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
            3
          </span>
          <p className="text-dark-200 text-sm leading-relaxed">
            اقفل Claude Desktop وافتحه تاني — هتلاقي{' '}
            <b className="text-white">grand-furniture-crm</b> ظهر في قائمة الأدوات 🔌.
          </p>
        </div>

        {/* Verification tip */}
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-300 text-[11px] font-black mb-0.5">اختبار سريع للتأكد</p>
            <p className="text-dark-200 text-xs leading-relaxed">
              اسأل Claude:{' '}
              <span className="text-white font-bold">«كام عميل hot عندنا دلوقتي؟»</span>
              {' '}— لو ردّ بأرقام حقيقية من النظام، الربط يعمل تمام ✅
            </p>
          </div>
        </div>

        {/* Key benefits reminder */}
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 text-[11px] font-black mb-0.5">لا يوجد node ولا سكريبت محلي</p>
            <p className="text-dark-200 text-xs leading-relaxed">
              على عكس الإعداد القديم، مش محتاج تشغّل أي أمر على جهازك.
              الـ URL في الإعدادات يوصّل Claude مباشرةً بالخادم السحابي على Railway.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
