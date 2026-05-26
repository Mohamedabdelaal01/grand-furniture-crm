import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, BookOpen, ExternalLink } from 'lucide-react';

const WEBHOOK_URL = 'https://medo-backend-production.up.railway.app/api/events';

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-700 hover:bg-dark-600 text-xs font-bold text-dark-300 hover:text-white transition-colors">
      {ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {ok ? 'تم' : 'نسخ'}
    </button>
  );
}

function Code({ children }) {
  const text = typeof children === 'string' ? children : JSON.stringify(children, null, 2);
  return (
    <div className="rounded-xl overflow-hidden border border-dark-700 my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-800 border-b border-dark-700">
        <span className="text-dark-400 text-xs font-mono">JSON</span>
        <CopyBtn text={text} />
      </div>
      <pre className="p-4 text-xs text-dark-200 font-mono leading-relaxed overflow-x-auto bg-dark-900/80">{text}</pre>
    </div>
  );
}

function Section({ num, title, color, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-4 p-5 text-right hover:bg-dark-800/30 transition-colors`}>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${color}`}>{num}</span>
        <span className="flex-1 text-white font-black text-base">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-dark-500" /> : <ChevronDown className="w-4 h-4 text-dark-500" />}
      </button>
      {open && <div className="px-6 pb-6 space-y-4 border-t border-dark-800/50 pt-4">{children}</div>}
    </div>
  );
}

function Step({ n, children }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
      <div className="text-dark-300 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Tip({ children }) {
  return <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm">{children}</div>;
}

function Info({ children }) {
  return <div className="bg-primary-500/5 border border-primary-500/20 rounded-xl p-4 text-primary-300 text-sm">{children}</div>;
}

export default function ManyChatGuide() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 py-4">

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-6 h-1 bg-primary-600 rounded-full" />
          <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">دليل شامل</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">دليل الربط المتكامل مع ManyChat</h1>
        <p className="text-dark-400 text-sm">
          هذا الدليل يشرح بالتفصيل كيفية ربط كل زر وحدث في ManyChat مع نظام Grand Furniture CRM.
          اتبع الخطوات بالترتيب لضمان عمل النظام بشكل كامل.
        </p>
      </div>

      {/* Full step-by-step guide banner */}
      <a
        href="/system-guide.html"
        target="_blank"
        rel="noopener noreferrer"
        className="card p-5 flex items-center gap-4 border border-emerald-500/30 bg-gradient-to-l from-emerald-500/10 to-emerald-500/5 hover:from-emerald-500/15 transition-all group"
      >
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-white font-black text-base">📘 الدليل الكامل خطوة بخطوة — من الإعلان لتأكيد الزيارة</p>
          <p className="text-dark-400 text-sm mt-0.5">
            شرح مبسّط بالتفصيل الممل لكل خطوة مع الأمثلة و"ليه؟" — افتحه في تبويب جديد
          </p>
        </div>
        <ExternalLink className="w-5 h-5 text-emerald-400 group-hover:translate-x-[-3px] transition-transform flex-shrink-0" />
      </a>

      {/* Webhook URL */}
      <div className="card p-5 border border-primary-500/30 bg-primary-500/5">
        <p className="text-primary-400 text-xs font-black uppercase tracking-wider mb-3">📡 Webhook URL — هذا هو رابط السيرفر الذي ترسل إليه ManyChat</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-white font-mono text-sm bg-dark-900/60 px-4 py-3 rounded-xl border border-dark-800 overflow-x-auto">
            POST {WEBHOOK_URL}
          </code>
          <CopyBtn text={WEBHOOK_URL} />
        </div>
        <p className="text-dark-500 text-xs mt-2">Method: POST | Content-Type: application/json</p>
      </div>

      {/* Section 1 */}
      <Section num="01" title="إعداد الـ Webhook في ManyChat — الخطوة الأولى" color="bg-primary-500/20 text-primary-400">
        <p className="text-dark-300 text-sm">أول حاجة لازم تعملها هي إضافة الـ Webhook في كل Flow عايز يبعت بيانات للـ CRM.</p>
        <Step n="1">ادخل على <strong className="text-white">ManyChat → Automation → Flows</strong></Step>
        <Step n="2">افتح الـ Flow اللي عايز تربطه (مثلاً Flow "عرض المنتجات")</Step>
        <Step n="3">اضغط <strong className="text-white">+ Add Action</strong> بعد أي زر أو رسالة</Step>
        <Step n="4">اختار <strong className="text-white">Integrations → Webhook</strong></Step>
        <Step n="5">في خانة URL اكتب أو الصق:<br/>
          <code className="text-primary-300 text-xs bg-dark-900/60 px-2 py-1 rounded mt-1 block">{WEBHOOK_URL}</code>
        </Step>
        <Step n="6">Method: <strong className="text-white">POST</strong> | Headers أضف: <code className="text-primary-300 text-xs">Content-Type: application/json</code></Step>
        <Step n="7">في Request Body اكتب الـ JSON المناسب (هتلاقيه في كل قسم أدناه)</Step>
        <Tip>⚡ كل زر في ManyChat يحتاج Webhook Action منفصل بـ event_type مختلف حسب نوع الزر.</Tip>
      </Section>

      {/* Section 2 */}
      <Section num="02" title="Custom Fields — حقول يجب إنشاؤها في ManyChat" color="bg-amber-500/20 text-amber-400">
        <p className="text-dark-300 text-sm">قبل ما تعمل أي Flow، لازم تنشئ هذه الحقول المخصصة في ManyChat:</p>
        <Step n="1">اذهب إلى <strong className="text-white">ManyChat → Settings → Custom Fields</strong></Step>
        <Step n="2">اضغط <strong className="text-white">+ New Custom Field</strong> وأنشئ الحقول التالية:</Step>
        <div className="overflow-x-auto rounded-xl border border-dark-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dark-800 text-dark-400 text-right font-black uppercase">
                <th className="py-2 px-4">اسم الحقل</th>
                <th className="py-2 px-4">النوع</th>
                <th className="py-2 px-4">الغرض</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['ad_id', 'Text', 'معرّف الإعلان الذي جاء منه العميل'],
                ['campaign_source', 'Text', 'اسم الحملة الإعلانية'],
                ['crm_lead_class', 'Text', 'تصنيف العميل (يُحدَّث تلقائياً من الـ CRM)'],
                ['crm_total_score', 'Number', 'نقاط العميل (تُحدَّث تلقائياً من الـ CRM)'],
              ].map(([name, type, desc]) => (
                <tr key={name} className="border-t border-dark-800">
                  <td className="py-2.5 px-4"><code className="text-amber-300 font-mono">{name}</code></td>
                  <td className="py-2.5 px-4 text-dark-400">{type}</td>
                  <td className="py-2.5 px-4 text-dark-300">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Info>💡 حقلا crm_lead_class و crm_total_score يُحدَّثان تلقائياً من الـ CRM كلما تغيّر تصنيف العميل. يمكنك استخدامهما لعمل Segments ذكية في ManyChat وإرسال رسائل مخصصة.</Info>
      </Section>

      {/* Section 3 */}
      <Section num="03" title="ربط الإعلانات (Ad Attribution) — من أين جاء العميل؟" color="bg-rose-500/20 text-rose-400">
        <Tip>⚠️ إعلانات Message Campaign (اللي بتفتح ماسنجر) <strong>مفيهاش Ref URL</strong>. الـ Ref URL للروابط العضوية بس. الطريقة الصح ↓</Tip>
        <p className="text-dark-300 text-sm">اعمل Trigger منفصل لكل إعلان عشان تقارن إعلانات الحملة الواحدة وتعرف مين بيجيب ومين لأ.</p>
        <Step n="1">في الـ Flow اضغط <strong className="text-white">+ New Trigger</strong> → اختار <strong className="text-white">"User clicks a Facebook Ad"</strong></Step>
        <Step n="2">من القايمة اختار <strong className="text-white">الإعلان المحدّد</strong> — وكرّر: trigger لكل إعلان في الحملة</Step>
        <Step n="3">جوه كل trigger أضف Action: <strong className="text-white">Set Custom Field</strong><br/>
          <span className="text-dark-400 text-xs">حقل: campaign_source | القيمة: اسم الحملة (نفسه لكل إعلانات الحملة، مثل: eid_2025)</span>
        </Step>
        <Step n="4">Action ثانية: <strong className="text-white">Set Custom Field</strong><br/>
          <span className="text-dark-400 text-xs">حقل: ad_id | القيمة: رقم/اسم الإعلان (مختلف لكل إعلان، مثل: video_a)</span>
        </Step>
        <Step n="5">بعدها مباشرة أضف External Request بهذا الـ JSON:</Step>
        <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "entry_offer",
  "campaign_source": "{{campaign_source}}",
  "ad_id": "{{ad_id}}",
  "source": "manychat"
}`}</Code>
        <Tip>⚡ كده في جدول "قمع الإعلانات" بالتحليلات هتشوف كل إعلان في الحملة لوحده — توقف الضعيف وتزوّد ميزانية القوي.</Tip>
      </Section>

      {/* Section 4a — category_request */}
      <Section num="04" title="اختيار فئة الكتالوج (category_request)" color="bg-violet-500/20 text-violet-400">
        <p className="text-dark-300 text-sm">لما العميل يضغط على فئة كاملة زي "كتالوج غرف النوم" قبل ما يشوف منتج معيّن:</p>
        <Step n="1">في الـ Flow بتاع كل فئة (غرف النوم / السفرة / الانتريهات / الأطفال)، أضف Webhook Action</Step>
        <Step n="2">غيّر قيمة <code className="text-violet-300">category</code> حسب الفئة:</Step>
        <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "category_request",
  "category": "غرف النوم",
  "source": "manychat"
}`}</Code>
        <Tip>⚡ أول اختيار لفئة = +10 نقاط. لو ضغط نفس الفئة تاني = 0 نقاط (بيتسجّل للتحليل بس). فئة مختلفة = +10 عادي.</Tip>
      </Section>

      {/* Section 4b — product_details */}
      <Section num="05" title="مشاهدة منتج معيّن (product_details)" color="bg-sky-500/20 text-sky-400">
        <p className="text-dark-300 text-sm">كل مرة يضغط فيها العميل "عرض التفاصيل" على منتج معيّن، أرسل هذا الحدث:</p>
        <Step n="1">في الـ Flow، عند كل زر "عرض التفاصيل" لأي منتج، أضف Webhook Action</Step>
        <Step n="2">غيّر <code className="text-sky-300">product</code> لاسم الموديل و <code className="text-sky-300">category</code> للفئة:</Step>
        <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "product_details",
  "product": "اليار",
  "category": "انتريهات",
  "campaign_source": "{{campaign_source}}",
  "ad_id": "{{ad_id}}"
}`}</Code>
        <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
          <p className="text-sky-400 text-xs font-black mb-2">📦 أمثلة — اسم الموديل بالعربي + فئته:</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['اليار', 'انتريهات'], ['روفان', 'انتريهات'],
              ['موديل غرفة نوم', 'غرف النوم'], ['موديل سفرة', 'غرف السفرة'],
              ['موديل أطفال', 'غرف الأطفال'], ['موديل كنبة', 'انتريهات'],
            ].map(([prod, cat]) => (
              <div key={prod} className="flex items-center justify-between bg-dark-900/60 rounded-lg px-3 py-1.5">
                <code className="text-sky-300 text-xs font-mono">{prod}</code>
                <span className="text-dark-400 text-xs">{cat}</span>
              </div>
            ))}
          </div>
        </div>
        <Info>💡 الـ <code className="text-sky-300">category</code> ضروري عشان التحليل المنفصل لكل فئة في صفحة التحليلات. نفس المنتج لو اتشاف مرتين بياخد نقاط مرة واحدة بس — منتج مختلف = نقاط كاملة.</Info>
      </Section>

      {/* Section 5 */}
      <Section num="06" title="طلب الموقع والفروع — أقوى إشارة شراء" color="bg-emerald-500/20 text-emerald-400">
        <p className="text-dark-300 text-sm">عندما يطلب العميل موقع المعرض أو يختار فرعاً — هذه أقوى إشارة على نية الشراء.</p>

        <div className="space-y-2">
          <p className="text-white text-sm font-bold">أ) عند الضغط على "عرض الفروع" أو "أريد الموقع":</p>
          <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "location_request",
  "event_value": "all_branches",
  "campaign_source": "{{campaign_source}}",
  "ad_id": "{{ad_id}}"
}`}</Code>
        </div>

        <div className="space-y-2">
          <p className="text-white text-sm font-bold">ب) عند اختيار فرع معين:</p>
          <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "branch_selected",
  "event_value": "nasr_city",
  "campaign_source": "{{campaign_source}}",
  "ad_id": "{{ad_id}}"
}`}</Code>
        </div>

        <div className="overflow-x-auto rounded-xl border border-dark-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dark-800 text-dark-400 text-right font-black">
                <th className="py-2 px-4">اسم الفرع</th>
                <th className="py-2 px-4">قيمة event_value</th>
              </tr>
            </thead>
            <tbody>
              {[['نصر سيتي','nasr_city'],['المعادي','maadi'],['حلوان','helwan'],['فيصل','faisal'],['عين شمس','ain_shams']].map(([ar,val]) => (
                <tr key={val} className="border-t border-dark-800">
                  <td className="py-2 px-4 text-dark-300">{ar}</td>
                  <td className="py-2 px-4"><code className="text-emerald-300 font-mono">{val}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Tip>⚡ حدث location_request يضيف 40 نقطة وقد يُصنّف العميل مباشرة كـ HOT. بعد ذلك سيقوم الـ CRM تلقائياً بإرسال رسالة تذكيرية إذا لم يزر المعرض خلال 3 أيام.</Tip>
      </Section>

      {/* Section 6 */}
      <Section num="07" title="تأكيد الزيارة — برقم التليفون" color="bg-purple-500/20 text-purple-400">
        <p className="text-dark-300 text-sm">رقم تليفون العميل هو اللي بيربطه بزيارته الفعلية للمعرض. الإعداد:</p>
        <Step n="1">في الـ Flow اللي العميل اختار فيه الفرع — <strong className="text-white">قبل</strong> ما تبعت العنوان — أضف خطوة <strong className="text-white">User Input → Phone</strong> ("ابعتلنا رقم تليفونك 📱")</Step>
        <Step n="2">احفظ الرد في حقل (مثلاً <code className="text-purple-300">{'{{phone}}'}</code>) وأضف Webhook Action بهذا الـ JSON:</Step>
        <Code>{`{
  "user_id": "{{messenger user id}}",
  "first_name": "{{first name}}",
  "event_type": "branch_selected",
  "event_value": "nasr_city",
  "campaign_source": "{{campaign_source}}",
  "ad_id": "{{ad_id}}",
  "phone": "{{phone}}"
}`}</Code>
        <Step n="3">بعد كده ابعت رسالة العنوان عادي</Step>
        <Step n="4">في المعرض: موظف الاستقبال يفتح صفحة <strong className="text-white">الاستقبال</strong>، يسأل العميل عن رقمه، يكتبه ويضغط <strong className="text-white">تأكيد</strong></Step>
        <Info>💡 أي صيغة للرقم تشتغل (01… أو ‎+20…) — السيستم بيوحّدها. وعند التأكيد بيتبعت الـ Visit Flow تلقائياً (رسالة ترحيب / استبيان).</Info>
      </Section>

      {/* Section 7 */}
      <Section num="08" title="الرسائل الآلية — Flows تنطلق تلقائياً من الـ CRM" color="bg-orange-500/20 text-orange-400">
        <p className="text-dark-300 text-sm">الـ CRM بيُطلق 3 أنواع من الرسائل الآلية دون تدخل بشري. لإعدادها:</p>
        <Step n="1">اذهب إلى <strong className="text-white">CRM → الإعدادات → مفاتيح API</strong></Step>
        <Step n="2">ضع الـ ManyChat API Key (من ManyChat → Settings → API)</Step>
        <Step n="3">أنشئ 3 Flows في ManyChat وضع ID كل منها في الإعدادات:</Step>

        <div className="space-y-3">
          {[
            { name: 'Visit Flow ID', color: 'emerald', desc: 'يُرسل تلقائياً عندما يؤكد موظف الاستقبال وصول العميل للمعرض', example: 'رسالة: "أهلاً بك في معرض Grand Furniture! كيف يمكننا مساعدتك اليوم؟ 🛋️"' },
            { name: 'Purchase Flow ID', color: 'sky', desc: 'يُرسل تلقائياً عند تسجيل مبيعات للعميل في الـ CRM', example: 'رسالة: "مبروك على الأثاث الجديد! 🎉 دليل العناية بمنتجاتك موجود هنا..." + زر تقييم الخدمة' },
            { name: 'Reminder Flow ID', color: 'amber', desc: 'يُرسل تلقائياً لمن طلب الموقع ولم يزر المعرض خلال 3 أيام', example: 'رسالة: "لاحظنا اهتمامك بزيارتنا! هل واجهت صعوبة في الوصول؟ احجز موعداً الآن 📍"' },
          ].map(f => (
            <div key={f.name} className={`bg-${f.color}-500/5 border border-${f.color}-500/20 rounded-xl p-4 space-y-2`}>
              <p className={`text-${f.color}-400 font-black text-sm`}>{f.name}</p>
              <p className="text-dark-300 text-xs">{f.desc}</p>
              <p className="text-dark-400 text-xs italic">مثال محتوى الرسالة: {f.example}</p>
            </div>
          ))}
        </div>

        <Step n="4">للحصول على Flow ID: افتح الـ Flow في ManyChat → انظر لآخر الـ URL في المتصفح → خذ الجزء الذي يبدأ بـ <code className="text-orange-300">content...</code></Step>
      </Section>

      {/* Section 8 - Scoring table */}
      <Section num="09" title="جدول النقاط الكامل — كيف يُصنَّف العميل؟" color="bg-dark-600 text-dark-300">
        <p className="text-dark-300 text-sm">النظام يحسب نقاط لكل عميل بناءً على تفاعله. التصنيف يتغير تلقائياً:</p>
        <div className="overflow-x-auto rounded-xl border border-dark-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-dark-800 text-dark-400 text-right font-black uppercase">
                <th className="py-2 px-4">event_type</th>
                <th className="py-2 px-4 text-center">النقاط</th>
                <th className="py-2 px-4">المعنى</th>
                <th className="py-2 px-4">التصنيف</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['entry_offer / entry_catalog', '+5', 'دخل للمرة الأولى', 'cold'],
                ['category_request', '+10', 'اختار فئة كتالوج (مرة لكل فئة)', 'cold → warm'],
                ['entry_location', '+10', 'اهتمام بالفروع', 'cold → warm'],
                ['contact_request', '+15', 'يريد التواصل', 'warm إذا ≥31'],
                ['product_details', '+20', 'مشاهدة منتج (مرة لكل منتج)', 'warm إذا ≥31'],
                ['map_click', '+25', 'ضغط على الخريطة (bonus)', 'يقرّب من hot'],
                ['branch_selected', '+30', 'اختار فرعاً بعينه', 'hot إذا ≥40'],
                ['location_request', '+40', 'طلب الموقع صراحةً', '→ hot مباشرة'],
                ['visit_confirmed', '+100', 'تأكيد الزيارة', '→ visited'],
              ].map(([ev, pts, meaning, cls]) => (
                <tr key={ev} className="border-t border-dark-800">
                  <td className="py-2.5 px-4"><code className="text-primary-300 font-mono text-[11px]">{ev}</code></td>
                  <td className="py-2.5 px-4 text-center font-black text-emerald-400">{pts}</td>
                  <td className="py-2.5 px-4 text-dark-300">{meaning}</td>
                  <td className="py-2.5 px-4 text-dark-400 text-[11px]">{cls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-dark-900/40 border border-dark-700 rounded-xl p-3 text-xs space-y-1">
            <p className="text-white font-black">🌡️ التصنيفات:</p>
            <p className="text-dark-300">🔵 Cold = 0 – 30 نقطة</p>
            <p className="text-dark-300">🟡 Warm = 31 – 74 نقطة</p>
            <p className="text-dark-300">🔴 Hot = 75+ (أو طلب موقع بنقاط ≥ 40)</p>
            <p className="text-dark-300">🏪 Visited = أكّد الزيارة</p>
            <p className="text-dark-300">💰 Purchased = اشترى (نهائي — لا يتراجع)</p>
          </div>
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3 text-xs space-y-1">
            <p className="text-violet-400 font-black">🔁 منع تكرار النقاط:</p>
            <p className="text-dark-300">نفس المنتج اتشاف مرتين = نقاط مرة واحدة</p>
            <p className="text-dark-300">نفس الفئة اتطلبت مرتين = نقاط مرة واحدة</p>
            <p className="text-dark-300">منتج/فئة مختلفة = نقاط كاملة</p>
            <p className="text-dark-500">التكرار بيتسجّل للتحليل بس بـ 0 نقطة</p>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="card p-5 text-center">
        <p className="text-dark-500 text-sm">هل تحتاج مساعدة؟ تواصل مع فريق الدعم أو راجع <strong className="text-primary-400">الإعدادات → مفاتيح API</strong> لإدخال بياناتك</p>
      </div>
    </div>
  );
}
