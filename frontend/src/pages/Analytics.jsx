import { useState, useCallback, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  BarChart3, Users, Flame, MapPin, ShoppingBag,
  Filter, RefreshCw, TrendingUp, Layers, Package,
} from 'lucide-react';
import { fetchAnalytics, formatBranch } from '../services/api';
import KPICard              from '../components/KPICard';
import CampaignPerformance  from '../components/CampaignPerformance';
import useBranches          from '../hooks/useBranches';

// ── Helpers ────────────────────────────────────────────────────────────────
function isoToday() {
  return new Date().toISOString().split('T')[0];
}
function iso30DaysAgo() {
  return new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
}


// Canonical furniture categories — always shown as a fixed framework even
// before any data arrives. The string MUST match exactly what ManyChat sends
// in the `category` field of product_details / category_request events.
const CATEGORIES = [
  { key: 'غرف النوم',          emoji: '🛏️', note: '' },
  { key: 'غرف السفرة',        emoji: '🪑', note: '' },
  { key: 'الانتريهات',         emoji: '🛋️', note: '' },
  { key: 'غرف الأطفال',       emoji: '🧸', note: '' },
  { key: 'الركنات',            emoji: '🛋️', note: '' },
  { key: 'المنتجات الجانبية', emoji: '🪞', note: 'ترابيزات + جزامات + وحدات شاشة' },
];

const EVENT_COLORS = {
  entry_offer:      '#6366f1',
  entry_catalog:    '#8b5cf6',
  entry_location:   '#a78bfa',
  product_details:  '#0ea5e9',
  location_request: '#f59e0b',
  branch_selected:  '#f97316',
  map_click:        '#10b981',
  contact_request:  '#ec4899',
  visit_confirmed:  '#22c55e',
};

// Transform flat eventsSeries into chart-ready rows keyed by day
function buildEventTrend(series) {
  const byDay = {};
  for (const { day, event_type, count } of series) {
    if (!byDay[day]) byDay[day] = { day };
    byDay[day][event_type] = (byDay[day][event_type] || 0) + count;
  }
  return Object.values(byDay).sort((a, b) => a.day.localeCompare(b.day));
}

// Get unique event types seen in the series
function getEventTypes(series) {
  return [...new Set(series.map(r => r.event_type))];
}

// Skeleton card
const Skeleton = () => (
  <div className="animate-pulse bg-surface-secondary rounded-xl h-24" />
);

// ── Custom tooltip for events chart ────────────────────────────────────────
function EventsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-xl p-3 text-xs space-y-1 shadow-2xl">
      <p className="text-foreground font-bold mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.dataKey}:</span>
          <span className="text-foreground font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [from,     setFrom]     = useState(iso30DaysAgo());
  const [to,       setTo]       = useState(isoToday());
  const [branch,   setBranch]   = useState('');
  const [campaign, setCampaign] = useState('');

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeCat, setActiveCat] = useState(null);  // selected category drill-down (views)
  const [activeSalesCat, setActiveSalesCat] = useState(null); // selected category drill-down (sales)

  const { branches: branchList } = useBranches();
  const BRANCH_OPTIONS = [
    { value: '', label: 'كل الفروع' },
    ...branchList.map(b => ({ value: b.id, label: b.name })),
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAnalytics({ from, to, branch, campaign });
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'فشل تحميل التحليلات');
    } finally {
      setLoading(false);
    }
  }, [from, to, branch, campaign]);

  // Auto-apply: reload whenever any filter changes (debounced so typing a
  // campaign name or picking a date doesn't fire a request per keystroke).
  // `load` is rebuilt whenever from/to/branch/campaign change, so depending on
  // it re-runs this effect on every filter change. The "تطبيق" button stays as
  // a manual refresh.
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const funnel      = data?.funnel      || {};
  const eventSeries = buildEventTrend(data?.eventsSeries || []);
  const eventTypes  = getEventTypes(data?.eventsSeries || []);
  const topProducts = data?.topProducts || [];
  const branches    = data?.branches    || [];
  const platforms   = data?.platforms   || [];
  const rawCategories = data?.categories  || [];
  const productsByCategory = data?.productsByCategory || {};
  const adFunnel    = data?.adFunnel    || [];

  // Merge backend data onto the fixed canonical list so ALL categories are
  // always visible — even ones with zero activity in the selected range.
  const byKey = Object.fromEntries(rawCategories.map(c => [c.category, c]));
  const categories = CATEGORIES.map(({ key, emoji, note }) => {
    const d = byKey[key] || {};
    return {
      category:          key,
      emoji,
      note,
      product_views:     d.product_views     || 0,
      category_requests: d.category_requests || 0,
      unique_users:      d.unique_users      || 0,
      models_viewed:     d.models_viewed     || 0,
      hasData:           !!byKey[key],
    };
  });

  // Category drill-down: products of the currently selected category
  const selectedCat = activeCat || categories[0]?.category || null;
  const catProducts = (productsByCategory[selectedCat] || []).slice(0, 50);

  // ── SALES (best-selling) — mirrors the views analysis but from real purchases.
  const topSelling        = data?.topSelling        || [];
  const sellingByCategory = data?.sellingByCategory || {};
  const rawSalesByCat     = data?.salesByCategory   || [];
  // Use the REAL category names from the sales data (not the canonical view-side
  // list — those names don't always match the catalog's, which would create
  // duplicate/empty cards). Best-selling-per-category only makes sense for
  // categories that actually sold. Emoji is looked up when the name matches.
  const salesCategories = rawSalesByCat.map((d) => ({
    category: d.category,
    emoji: (CATEGORIES.find(c => c.key === d.category) || {}).emoji || '📦',
    units: d.units || 0, products_sold: d.products_sold || 0, buyers: d.buyers || 0,
  }));
  const totalUnitsSold = salesCategories.reduce((s, c) => s + c.units, 0);
  const selectedSalesCat = activeSalesCat
    || salesCategories.find(c => c.units > 0)?.category
    || salesCategories[0]?.category || null;
  const catSelling = (sellingByCategory[selectedSalesCat] || []).slice(0, 50);

  // Build CampaignPerformance-compatible data shape
  const campaignData = (data?.campaigns || []).map(c => ({
    campaign_source:  c.campaign_source,
    total_leads:      c.leads,
    total_visits:     c.visits,
    total_purchases:  c.purchases,
    purchase_rate:    c.leads ? parseFloat(((c.purchases / c.leads) * 100).toFixed(1)) : 0,
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12" dir="rtl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-1 bg-accent rounded-full" />
          <span className="text-accent font-black text-[10px] uppercase tracking-[0.2em]">التقارير والبيانات</span>
        </div>
        <h1 className="text-3xl font-black text-foreground">التحليلات المتقدمة</h1>
      </div>

      {/* Filter bar */}
      <div className="card p-4 flex flex-wrap gap-3 items-end sticky top-4 z-20 backdrop-blur-md">
        <Filter className="w-4 h-4 text-muted flex-shrink-0 self-center" />

        <div className="space-y-1">
          <label className="text-muted text-[10px] font-black uppercase tracking-wider">من</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="input-field text-sm py-1.5"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <label className="text-muted text-[10px] font-black uppercase tracking-wider">إلى</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="input-field text-sm py-1.5"
            dir="ltr"
          />
        </div>

        <div className="space-y-1">
          <label className="text-muted text-[10px] font-black uppercase tracking-wider">الفرع</label>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="input-field text-sm py-1.5 min-w-[130px]"
          >
            {BRANCH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-muted text-[10px] font-black uppercase tracking-wider">الحملة</label>
          <input
            type="text"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="eid_offer_2025"
            className="input-field text-sm py-1.5 w-40"
            dir="ltr"
          />
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="btn-primary self-end"
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><RefreshCw className="w-4 h-4" /> تطبيق</>
          }
        </button>
      </div>

      {error && (
        <div className="card p-10 text-center border-rose-500/20 bg-rose-500/5">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-rose-500" />
          </div>
          <p className="text-foreground font-black mb-1">تعذّر تحميل التحليلات</p>
          <p className="text-muted text-sm mb-6">{error}</p>
          <button onClick={load} className="btn-primary">
            <RefreshCw className="w-4 h-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
        ) : (
          <>
            <KPICard icon={Users}       label="إجمالي العملاء"  value={funnel.total_leads || 0} />
            <KPICard icon={Flame}       label="ساخنين"          value={funnel.hot         || 0} color="danger" />
            <KPICard icon={MapPin}      label="زيارات المعرض"   value={funnel.visited     || 0} />
            <KPICard icon={ShoppingBag} label="مشتريات"         value={funnel.purchased   || 0} />
          </>
        )}
      </div>

      {/* Events trend */}
      {eventSeries.length > 0 && (
        <div className="card p-6">
          <h3 className="text-foreground font-black text-lg mb-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            حركة الأحداث اليومية
          </h3>
          <p className="text-muted text-xs mb-6">
            {data?.meta?.from} — {data?.meta?.to}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={eventSeries} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {eventTypes.map(type => (
                  <linearGradient key={type} id={`grad_${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={EVENT_COLORS[type] || '#6366f1'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={EVENT_COLORS[type] || '#6366f1'} stopOpacity={0}   />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<EventsTooltip />} />
              {eventTypes.slice(0, 6).map(type => (
                <Area
                  key={type}
                  type="monotone"
                  dataKey={type}
                  stroke={EVENT_COLORS[type] || '#6366f1'}
                  fill={`url(#grad_${type})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Categories framework — always visible (all 6) ──────── */}
      <div className="card p-6">
        <h3 className="text-foreground font-black text-lg mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-accent" />
          تحليل الفئات
        </h3>
        <p className="text-muted text-xs mb-6">
          اضغط على أي فئة لعرض تحليل الموديلات بداخلها — كل عميل يُحتسب مرة واحدة لكل منتج/فئة
        </p>

        {/* Per-category cards (6 fixed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => {
            const active = selectedCat === c.category;
            const total = c.product_views + c.category_requests;
            return (
              <button
                key={c.category}
                onClick={() => setActiveCat(c.category)}
                className={`text-right p-4 rounded-2xl border transition-all ${
                  active
                    ? 'bg-accent/10 border-accent/40'
                    : 'bg-surface-secondary/40 border-border hover:border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{c.emoji}</span>
                  {total === 0 && (
                    <span className="text-[10px] text-muted bg-surface-secondary px-2 py-0.5 rounded-full">
                      لا بيانات بعد
                    </span>
                  )}
                </div>
                <p className="text-foreground font-black text-sm">{c.category}</p>
                {c.note && <p className="text-muted text-[10px] mb-2">{c.note}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-sky-400 font-black text-lg leading-none">{c.product_views}</p>
                    <p className="text-muted text-[10px] mt-1">مشاهدات منتجات</p>
                  </div>
                  <div>
                    <p className="text-violet-400 font-black text-lg leading-none">{c.category_requests}</p>
                    <p className="text-muted text-[10px] mt-1">طلبات الكتالوج</p>
                  </div>
                  <div>
                    <p className="text-accent font-black text-lg leading-none">{c.models_viewed}</p>
                    <p className="text-muted text-[10px] mt-1">موديلات</p>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-black text-lg leading-none">{c.unique_users}</p>
                    <p className="text-muted text-[10px] mt-1">عملاء</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Comparison chart */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-muted text-xs font-bold mb-4">مقارنة الفئات</p>
          <ResponsiveContainer width="100%" height={categories.length * 52}>
            <BarChart data={categories} layout="vertical" margin={{ right: 24, left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v, n) => [v, n === 'product_views' ? 'مشاهدات المنتجات' : 'طلبات الكتالوج']}
              />
              <Legend
                formatter={(v) => v === 'product_views' ? 'مشاهدات المنتجات' : 'طلبات الكتالوج'}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Bar dataKey="product_views"     fill="#0ea5e9" radius={[0, 4, 4, 0]} name="product_views" />
              <Bar dataKey="category_requests" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="category_requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Per-category product drill-down (always visible) ────── */}
      {selectedCat && (
        <div className="card p-6">
          <h3 className="text-foreground font-black text-lg mb-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-400" />
            موديلات فئة: <span className="text-sky-400">{selectedCat}</span>
          </h3>
          {catProducts.length > 0 ? (
            <>
              <p className="text-muted text-xs mb-6">
                أعلى {catProducts.length} موديل مشاهدةً داخل هذه الفئة
              </p>
              <ResponsiveContainer width="100%" height={Math.max(200, catProducts.length * 34)}>
                <BarChart data={catProducts} layout="vertical" margin={{ right: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="product"
                    width={140}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v, n) => [v, n === 'views' ? 'مشاهدات' : 'عملاء']}
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="views" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="py-12 text-center">
              <Package className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted text-sm font-bold">لا توجد مشاهدات منتجات في فئة "{selectedCat}" بعد</p>
              <p className="text-muted text-xs mt-1">
                هتظهر هنا أول ما عميل يضغط "عرض التفاصيل" على منتج من الفئة دي
              </p>
            </div>
          )}
        </div>
      )}

      {/* Top products */}
      {topProducts.length > 0 && (
        <div className="card p-6">
          <h3 className="text-foreground font-black text-lg mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            أكثر المنتجات مشاهدةً (كل الفئات)
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, topProducts.length * 36)}>
            <BarChart data={topProducts} layout="vertical" margin={{ right: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="product"
                width={120}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [v, 'مشاهدات']}
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="views" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── SALES: best-selling products (overall + per category) ───────────── */}
      <div className="card p-6">
        <h3 className="text-foreground font-black text-lg mb-1 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-400" />
          أكثر المنتجات مبيعاً
        </h3>
        <p className="text-muted text-xs mb-6">
          من المبيعات الفعلية المسجّلة (المنتجات اللي اتباعت في العقود) — العدد = قطع مباعة. اضغط فئة لتفصيلها.
        </p>

        {totalUnitsSold === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-muted text-sm font-bold">لسه مفيش مبيعات مسجّلة بمنتجات في الفترة دي</p>
            <p className="text-muted text-xs mt-1">
              هتظهر هنا أول ما السيلز يسجّل بيعة ويختار المنتج المباع
            </p>
          </div>
        ) : (
          <>
            {/* Best-selling overall */}
            {topSelling.length > 0 && (
              <div className="mb-6">
                <p className="text-muted text-xs font-bold mb-4">الأكثر مبيعاً (كل الفئات)</p>
                <ResponsiveContainer width="100%" height={Math.max(180, topSelling.length * 36)}>
                  <BarChart data={topSelling} layout="vertical" margin={{ right: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="product" width={150} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                    <Tooltip
                      formatter={(v, n) => [v, n === 'units' ? 'قطع مباعة' : 'عملاء']}
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sales per category (clickable cards) */}
            <div className="pt-6 border-t border-border">
              <p className="text-muted text-xs font-bold mb-4">المبيعات حسب الفئة</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {salesCategories.map((c) => {
                  const active = selectedSalesCat === c.category;
                  return (
                    <button
                      key={c.category}
                      onClick={() => setActiveSalesCat(c.category)}
                      className={`text-right p-4 rounded-2xl border transition-all ${
                        active ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-surface-secondary/40 border-border hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{c.emoji}</span>
                        {c.units === 0 && (
                          <span className="text-[10px] text-muted bg-surface-secondary px-2 py-0.5 rounded-full">مفيش مبيعات</span>
                        )}
                      </div>
                      <p className="text-foreground font-black text-sm">{c.category}</p>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div>
                          <p className="text-emerald-400 font-black text-lg leading-none">{c.units}</p>
                          <p className="text-muted text-[10px] mt-1">قطع مباعة</p>
                        </div>
                        <div>
                          <p className="text-sky-400 font-black text-lg leading-none">{c.products_sold}</p>
                          <p className="text-muted text-[10px] mt-1">منتجات</p>
                        </div>
                        <div>
                          <p className="text-accent font-black text-lg leading-none">{c.buyers}</p>
                          <p className="text-muted text-[10px] mt-1">عملاء</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Best-selling within the selected category */}
            {selectedSalesCat && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-foreground text-sm font-black mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  الأكثر مبيعاً في: <span className="text-emerald-400">{selectedSalesCat}</span>
                </p>
                {catSelling.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(160, catSelling.length * 34)}>
                    <BarChart data={catSelling} layout="vertical" margin={{ right: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="product" width={150} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                      <Tooltip
                        formatter={(v, n) => [v, n === 'units' ? 'قطع مباعة' : 'عملاء']}
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12 }}
                        labelStyle={{ color: '#94a3b8' }}
                      />
                      <Bar dataKey="units" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-muted text-sm">مفيش مبيعات في فئة "{selectedSalesCat}" في الفترة دي</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Platform performance — Instagram vs Facebook */}
      {platforms.length > 0 && (
        <div className="card p-6">
          <h3 className="text-foreground font-black text-lg mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            أداء المنصات
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((p) => {
              const conversion = p.leads
                ? ((p.purchases / p.leads) * 100).toFixed(1)
                : '0.0';
              const visitRate = p.leads
                ? ((p.visits / p.leads) * 100).toFixed(1)
                : '0.0';
              const isInsta = p.platform === 'instagram';
              const headerBg = isInsta
                ? 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)'
                : '#1877F2';
              const label = isInsta ? 'Instagram' : 'Facebook';
              return (
                <div
                  key={p.platform}
                  className="rounded-2xl overflow-hidden border border-border bg-surface/40"
                >
                  <div
                    className="px-5 py-3 flex items-center justify-between text-foreground"
                    style={{ background: headerBg }}
                  >
                    <span className="font-black text-base">{label}</span>
                    <span className="text-xs font-bold opacity-90">
                      {p.leads.toLocaleString('ar-EG')} عميل
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-5">
                    <div>
                      <p className="text-muted text-[10px] uppercase tracking-wider font-bold mb-1">
                        زيارات
                      </p>
                      <p className="text-foreground font-black text-xl">{p.visits}</p>
                      <p className="text-muted text-xs font-bold">{visitRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted text-[10px] uppercase tracking-wider font-bold mb-1">
                        مبيعات
                      </p>
                      <p className="text-emerald-400 font-black text-xl">{p.purchases}</p>
                      <p className="text-muted text-xs font-bold">{conversion}%</p>
                    </div>
                    <div>
                      <p className="text-muted text-[10px] uppercase tracking-wider font-bold mb-1">
                        تحويل لزيارة
                      </p>
                      <p className="text-accent font-black text-xl">{visitRate}%</p>
                      <p className="text-muted text-xs font-bold">من العملاء</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && !data?.eventsSeries?.length && (
        <div className="card p-16 text-center">
          <BarChart3 className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-muted font-bold">لا توجد بيانات في هذه الفترة</p>
          <p className="text-muted text-sm mt-1">جرّب تغيير نطاق التاريخ</p>
        </div>
      )}
    </div>
  );
}
