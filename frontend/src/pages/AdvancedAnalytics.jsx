/**
 * AdvancedAnalytics — admin-only "التحليلات العميقة". Four executive KPIs that go
 * beyond raw volume:
 *   1. معدل الإغلاق الحقيقي للسيلز — contracts ÷ leads assigned (efficiency).
 *   2. متوسط سرعة التعاقد — avg days from lead creation → purchase.
 *   3. تحليل الفرص الضائعة — where COLD leads drop off (touchpoint / branch / platform).
 *   4. حجم الأموال المعلقة — HOT/WARM pipeline × a mock ticket = money on the table.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Radar, RefreshCw, Target, Timer, TrendingDown, Wallet, Flame, Thermometer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { fetchAdvancedAnalytics, formatBranch } from '../services/api';

const fmt    = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const egp    = (n) => `${fmt(n)} ج.م`;
const rateColor = (r) => (r >= 30 ? '#10b981' : r >= 12 ? '#f59e0b' : '#f43f5e');

function SectionCard({ icon: Icon, tone, title, subtitle, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-white font-black text-lg leading-tight">{title}</h3>
          {subtitle && <p className="text-dark-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Horizontal labelled bar chart from [{label,count}]. */
function MiniBars({ data, color = '#6366f1', empty = 'لا توجد بيانات' }) {
  if (!data || data.length === 0) return <p className="text-dark-600 text-xs italic">{empty}</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }}
               axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                 contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                 labelStyle={{ color: '#f8fafc' }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={color} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AdvancedAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [lostTab, setLostTab] = useState('byCategory');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await fetchAdvancedAnalytics()); }
    catch { setData(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <div className="card p-12 text-center text-dark-400 font-bold" dir="rtl">تعذّر تحميل التحليلات</div>;
  }

  const { repConversion = [], velocity = {}, lostLeads = {}, pipeline = {} } = data;
  // Localize the breakdown labels — the backend returns raw branch ids
  // (faisal/maadi/…) and raw platform values (facebook/instagram); show Arabic.
  const PLATFORM_AR = { instagram: 'إنستجرام', facebook: 'فيسبوك' };
  const localizeBranch   = (rows) => (rows || []).map((r) =>
    ({ ...r, label: r.label === 'غير محدّد' ? r.label : (formatBranch(r.label) || r.label) }));
  const localizePlatform = (rows) => (rows || []).map((r) =>
    ({ ...r, label: PLATFORM_AR[r.label] || r.label }));
  const lostMap = {
    byCategory: { label: 'حسب آخر فئة', data: lostLeads.byCategory,            color: '#6366f1' },
    byBranch:   { label: 'حسب الفرع',   data: localizeBranch(lostLeads.byBranch),   color: '#0ea5e9' },
    byPlatform: { label: 'حسب المنصة',  data: localizePlatform(lostLeads.byPlatform), color: '#a855f7' },
  };
  const velBuckets = velocity.buckets ? [
    { label: 'نفس اليوم', count: velocity.buckets.same_day },
    { label: 'خلال أسبوع', count: velocity.buckets.within_week },
    { label: 'خلال شهر', count: velocity.buckets.within_month },
    { label: 'أكثر من شهر', count: velocity.buckets.over_month },
  ] : [];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">ذكاء الأعمال</span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Radar className="w-7 h-7 text-primary-400" />
            التحليلات العميقة
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            مؤشرات تنفيذية تكشف الكفاءة الحقيقية والفرص الضائعة — مش مجرد أرقام إجمالية.
          </p>
        </div>
        <button onClick={load} className="btn-secondary self-start sm:self-end">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* 4. Pipeline value — headline strip */}
      <SectionCard icon={Wallet} tone="bg-emerald-500/15 text-emerald-400"
        title="حجم الأموال المعلقة" subtitle="القيمة التقديرية للفرص الساخنة والدافئة اللي لسه ماقفلتش (تذكرة افتراضية)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 p-5 text-center">
            <div className="text-emerald-300 text-xs font-bold mb-1">إجمالي الأموال المعلقة</div>
            <div className="text-emerald-400 text-3xl font-black">{egp(pipeline.total_value)}</div>
            <div className="text-dark-400 text-[11px] mt-1">money left on the table</div>
          </div>
          <div className="rounded-2xl bg-dark-900/40 border border-dark-800 p-5">
            <div className="flex items-center gap-2 text-rose-400 font-black mb-1"><Flame className="w-4 h-4" /> عملاء ساخنون</div>
            <div className="text-white text-2xl font-black">{fmt(pipeline.hot)}</div>
            <div className="text-dark-400 text-xs mt-1">× {egp(pipeline.hot_ticket)} = <span className="text-rose-300 font-bold">{egp(pipeline.hot_value)}</span></div>
          </div>
          <div className="rounded-2xl bg-dark-900/40 border border-dark-800 p-5">
            <div className="flex items-center gap-2 text-amber-400 font-black mb-1"><Thermometer className="w-4 h-4" /> عملاء دافئون</div>
            <div className="text-white text-2xl font-black">{fmt(pipeline.warm)}</div>
            <div className="text-dark-400 text-xs mt-1">× {egp(pipeline.warm_ticket)} = <span className="text-amber-300 font-bold">{egp(pipeline.warm_value)}</span></div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. True rep conversion */}
        <SectionCard icon={Target} tone="bg-primary-500/15 text-primary-400"
          title="معدل الإغلاق الحقيقي للسيلز" subtitle="تعاقدات ÷ عملاء مسندين — مين أكفأ في التقفيل مش مين أكتر عملاء">
          {repConversion.length === 0 ? (
            <p className="text-dark-600 text-xs italic">لا توجد بيانات إسناد بعد</p>
          ) : (
            <div className="space-y-3">
              {repConversion.map((r) => (
                <div key={r.rep}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white font-bold">{r.rep}
                      <span className="text-dark-500 font-normal mr-1">{formatBranch(r.branch)}</span>
                    </span>
                    <span className="font-black" style={{ color: rateColor(r.rate) }}>{r.rate}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-dark-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                         style={{ width: `${Math.min(r.rate, 100)}%`, background: rateColor(r.rate) }} />
                  </div>
                  <div className="text-dark-500 text-[10px] mt-0.5">
                    {fmt(r.contracts)} تعاقد من {fmt(r.assigned)} عميل مسند
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 2. Sales velocity */}
        <SectionCard icon={Timer} tone="bg-sky-500/15 text-sky-400"
          title="متوسط سرعة التعاقد" subtitle="متوسط الأيام من تسجيل العميل لحد ما يتعاقد">
          {velocity.sample_size ? (
            <>
              <div className="flex items-end gap-3 mb-3">
                <div className="text-sky-400 text-4xl font-black leading-none">{velocity.avg_days}</div>
                <div className="text-dark-400 text-sm mb-1">يوم في المتوسط</div>
                <div className="mr-auto text-left text-[11px] text-dark-500">
                  <div>أسرع: <span className="text-emerald-400 font-bold">{velocity.fastest_days} يوم</span></div>
                  <div>أبطأ: <span className="text-rose-400 font-bold">{velocity.slowest_days} يوم</span></div>
                </div>
              </div>
              <MiniBars data={velBuckets} color="#0ea5e9" />
              <p className="text-dark-500 text-[11px]">على عيّنة {fmt(velocity.sample_size)} تعاقد</p>
            </>
          ) : (
            <p className="text-dark-600 text-xs italic">لا توجد تعاقدات كافية لحساب السرعة</p>
          )}
        </SectionCard>
      </div>

      {/* 3. Lost lead analysis */}
      <SectionCard icon={TrendingDown} tone="bg-rose-500/15 text-rose-400"
        title="تحليل الفرص الضائعة"
        subtitle={`إجمالي العملاء الباردين: ${fmt(lostLeads.total_cold)} — فين بيحصل التسرّب`}>
        <div className="flex gap-2 mb-3">
          {Object.entries(lostMap).map(([k, v]) => (
            <button key={k} onClick={() => setLostTab(k)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                lostTab === k ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:text-white'}`}>
              {v.label}
            </button>
          ))}
        </div>
        <MiniBars data={lostMap[lostTab].data} color={lostMap[lostTab].color} />
      </SectionCard>
    </div>
  );
}
