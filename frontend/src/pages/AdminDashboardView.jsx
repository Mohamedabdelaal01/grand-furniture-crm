/**
 * AdminDashboardView — Global dashboard for admin users.
 * Shows full KPIs, charts, all leads, campaigns, and rep-selector.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Flame, CheckCircle, Activity, MapPin, TrendingUp, RefreshCw,
  Wifi, WifiOff, BarChart3, Layers, Phone, UserCheck, Trophy,
  ScanLine, Megaphone, BookOpen, PieChart, LineChart, Package,
  Building2, Headset, List, ListTodo, ShoppingBag,
} from 'lucide-react';
import KPICard               from '../components/KPICard';
import SectionHeader         from '../components/SectionHeader';
import DomainTabs            from '../components/DomainTabs';
import AchievementsLeaderboard from '../components/AchievementsLeaderboard';
import LeadDistributionChart from '../components/LeadDistributionChart';
import ProductsChart         from '../components/ProductsChart';
import BranchAnalysisChart   from '../components/BranchDemandChart';
import FunnelChart           from '../components/FunnelChart';
import HotLeadsTable         from '../components/HotLeadsTable';
import NotificationBell      from '../components/NotificationBell';
import AlertToast            from '../components/AlertToast';
import RepSelector           from '../components/RepSelector';
import LeadGroups            from '../components/LeadGroups';
import DailyCallList         from '../components/DailyCallList';
import MyLeadsPanel          from '../components/MyLeadsPanel';
import GamificationPanel     from '../components/GamificationPanel';
import CallSession           from '../components/CallSession';
import WeeklyForecast        from '../components/WeeklyForecast';
import ReceptionDesk         from '../components/ReceptionDesk';
import CampaignPerformance   from '../components/CampaignPerformance';
import SalesAnalytics        from '../components/SalesAnalytics';
import ManyChatGuide         from './ManyChatGuide';
import {
  fetchDashboard,
  fetchSalesAchievements, fetchBranchAchievements, fetchRepsAnalytics,
  fetchLeadsAging, fetchAdminKpis,
} from '../services/api';
import TargetProgress        from '../components/TargetProgress';
import useSmartPolling       from '../hooks/useSmartPolling';
import useAdminNotifications from '../hooks/useAdminNotifications';
import useBranches           from '../hooks/useBranches';
import { useAlerts }         from '../contexts/AlertsContext';
import { useAuth }           from '../contexts/AuthContext';
import useAssignments        from '../hooks/useAssignments';
import useCurrentRep         from '../hooks/useCurrentRep';
import useRepList            from '../hooks/useRepList';
import useCallSession        from '../hooks/useCallSession';
import useGamification       from '../hooks/useGamification';

const fmtNum = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-surface-secondary via-surface-tertiary to-surface-secondary rounded-xl ${className}`}
    style={{ animation: 'shimmer 1.8s infinite', backgroundSize: '200% 100%' }}
  />
);
const KPICardSkeleton = () => (
  <div className="card p-6 space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-2.5 w-32 rounded" />
      </div>
      <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
    </div>
  </div>
);

// ── Relative time indicator ───────────────────────────────────────────────────
const RelativeTime = ({ lastUpdated }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!lastUpdated) return null;
  const s = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
  const text = s < 5 ? 'الآن' : s < 60 ? `منذ ${s} ثانية` : `منذ ${Math.floor(s / 60)} دقيقة`;
  return <span>{text}</span>;
};

// View labels (one per route — sidebar drives which view is active)
const VIEW_LABELS = {
  overview:  'لوحة التحكم',
  customers: 'العملاء',
  branches:  'الفروع',
  sales:     'السيلز',
  reps:      'المناديب',
  campaigns: 'الحملات',
  products:  'المنتجات',
  // Legacy / fallback labels
  hotleads:  'العملاء الساخنين',
  groups:    'مجموعات العملاء',
  calls:     'مكالمات اليوم',
  my:        'عملاء المندوب',
  gamify:    'الإنجازات',
  reception: 'الاستقبال',
  salesperf: 'تحليلات السيلز',
  guide:     'دليل ManyChat',
};

// ── Achievements data hook — fetches and refetches on demand ──────────────────
function useAchievements(entity) {
  const [data, setData]       = useState({ rows: [], weights: null });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const fn = entity === 'branch' ? fetchBranchAchievements : fetchSalesAchievements;
    fn().then(d => { if (alive) setData(d); }).catch(() => {})
        .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [entity]);
  return { ...data, loading };
}

// ── Domain: العملاء — PURE ANALYTICS for admin ───────────────────────────────
// لا أزرار "اتصل" أو "ابعت" — مدير النظام بيشوف ملخّصات وتوزيعات بس.
// التشغيل (اتصال/إرسال) في حسابات المناديب والسيلز.
const CustomersDomain = ({ data, navigate }) => {
  const [tab, setTab] = useState('distribution');

  const summary    = data?.summary || {};
  // lead_distribution is an array [{lead_class, count}] from /api/dashboard
  const distArr    = Array.isArray(summary.lead_distribution) ? summary.lead_distribution : [];
  const distMap    = Object.fromEntries(distArr.map(d => [d.lead_class, d.count]));
  const totalLeads = summary.total_leads || 0;
  const dist = {
    cold:      distMap.cold      || 0,
    warm:      distMap.warm      || 0,
    hot:       distMap.hot       || 0,
    visited:   (distMap.visited  || 0) + (distMap.converted || 0),
    purchased: distMap.purchased || 0,
  };
  // Authoritative count from /api/dashboard
  const withPhones = summary.with_phones_count || 0;
  const phoneCovrg = totalLeads ? Math.round((withPhones / totalLeads) * 100) : 0;

  // Aging buckets — fetched from /api/admin/leads-aging across ALL leads
  // (not from the recent_hot_leads preview, which only carries ~10 entries).
  const [ages, setAges] = useState({ today: 0, week: 0, month: 0, older: 0, total: 0 });
  const [agingLoading, setAgingLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setAgingLoading(true);
    fetchLeadsAging()
      .then(d => { if (alive) setAges(d); })
      .catch(() => {})  // production backend may not have the endpoint yet — show zeros
      .finally(() => { if (alive) setAgingLoading(false); });
    return () => { alive = false; };
  }, []);

  const tabs = [
    { id: 'distribution', label: 'التوزيع حسب الحالة', icon: PieChart, count: totalLeads },
    { id: 'aging',        label: 'العمر والتراكم',      icon: Activity },
    { id: 'sources',      label: 'مصادر العملاء',       icon: Megaphone },
  ];

  const StatTile = ({ icon: Icon, label, value, hint, color = 'primary' }) => {
    const tones = {
      primary: 'text-accent bg-accent/10',
      sky:     'text-sky-400 bg-sky-500/10',
      emerald: 'text-emerald-400 bg-emerald-500/10',
      amber:   'text-amber-400 bg-amber-500/10',
      rose:    'text-rose-400 bg-rose-500/10',
      slate:   'text-slate-300 bg-slate-500/10',
    };
    return (
      <div className="card p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-2xl font-black text-foreground">{value}</p>
        <p className="text-muted text-xs mt-1">{label}</p>
        {hint && <p className="text-muted text-[10px] mt-1">{hint}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />

      {tab === 'distribution' && (
        <section className="space-y-6">
          <SectionHeader
            icon={PieChart}
            title="توزيع العملاء حسب الحالة"
            subtitle="فين العملاء واقفين دلوقتي في الرحلة"
            accent="primary"
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatTile icon={Users}       label="إجمالي العملاء" value={totalLeads}            hint="عميل في الـ DB" color="primary" />
            <StatTile icon={Activity}    label="بارد + دافئ"    value={dist.cold + dist.warm} color="amber" />
            <StatTile icon={Flame}       label="ساخن"           value={dist.hot}              color="rose" />
            <StatTile icon={MapPin}      label="زاروا"          value={dist.visited}          color="sky" />
            <StatTile icon={CheckCircle} label="اشتروا"         value={dist.purchased}        color="emerald" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatTile icon={Phone}    label="عملاء سابوا رقم"     value={`${withPhones} (${phoneCovrg}%)`} hint={`من ${totalLeads} عميل`} color="primary" />
            <StatTile icon={UserCheck} label="نسبة التحويل لزيارة" value={`${summary.conversion_to_visit || 0}%`} hint="زيارة ÷ إجمالي" color="emerald" />
          </div>
          <LeadDistributionChart data={summary.lead_distribution} />
        </section>
      )}

      {tab === 'aging' && (
        <section className="space-y-6">
          <SectionHeader
            icon={Activity}
            title="عمر العملاء في السيستم"
            subtitle="بنفصل العملاء حسب من أول ما دخلوا — بيوضح كام عميل جديد وكام قديم"
            accent="violet"
          />
          {agingLoading ? (
            <div className="card p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatTile icon={Activity} label="اليوم"          value={ages.today} hint="آخر 24 ساعة" color="emerald" />
                <StatTile icon={Activity} label="آخر أسبوع"      value={ages.week}  hint="2-7 أيام"     color="primary" />
                <StatTile icon={Activity} label="آخر شهر"        value={ages.month} hint="8-30 يوم"     color="amber" />
                <StatTile icon={Activity} label="أقدم من شهر"    value={ages.older} hint="فوق 30 يوم"   color="slate" />
              </div>
              <div className="card p-5 text-muted text-xs leading-relaxed">
                المجموع: <b className="text-foreground">{ages.total}</b> عميل بتاريخ إنشاء.
                <br />
                💡 العملاء القدامى (أقدم من شهر) لو لسه باردين، غالباً مش هيتحوّلوا.
                راجع <b className="text-foreground">إعدادات النظام → lead_expiry_days</b> عشان تظبط مدة الصلاحية.
              </div>
            </>
          )}
        </section>
      )}

      {tab === 'sources' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Megaphone}
            title="مصادر العملاء"
            subtitle="العملاء بييجوا منين؟ ManyChat، حملات، إعلانات، أو دخول مباشر"
            accent="amber"
          />
          <div className="card p-6 text-center">
            <Megaphone className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-foreground font-black mb-2">تحليل المصادر متاح في قسم الحملات</p>
            <p className="text-muted text-xs mb-4">صفحة الحملات بتعرض أداء كل حملة وعدد العملاء منها</p>
            <button onClick={() => navigate('/campaigns')} className="btn-primary text-xs">
              افتح قسم الحملات ←
            </button>
          </div>
        </section>
      )}

      <div className="card p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="text-muted">
          📂 محتاج تشوف القائمة الكاملة بالفلاتر والتصدير؟
        </div>
        <button onClick={() => navigate('/leads')} className="btn-secondary">
          افتح قائمة العملاء الكاملة ←
        </button>
      </div>
    </div>
  );
};

// ── Domain: الفروع ───────────────────────────────────────────────────────────
const BranchesDomain = ({ data }) => {
  const [tab, setTab] = useState('overview');
  const achievements  = useAchievements('branch');
  const tabs = [
    { id: 'overview',     label: 'نظرة عامة',         icon: BarChart3 },
    { id: 'achievements', label: '🏆 إنجازات الفروع', icon: Trophy    },
  ];

  // Date filter for the branch-analysis section.
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [branchKpi, setBranchKpi] = useState(null);
  useEffect(() => {
    if (!dateRange.startDate && !dateRange.endDate) { setBranchKpi(null); return; }
    fetchAdminKpis(dateRange).then(setBranchKpi).catch(() => setBranchKpi(null));
  }, [dateRange]);
  const demandData = branchKpi?.branch_demand || data?.branch_demand;
  const visitsData = branchKpi?.branch_visits || data?.branch_visits;

  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />
      {tab === 'overview' && (
        <section className="space-y-4">
          <SectionHeader
            icon={MapPin}
            title="طلب الفرع مقابل الزيارات الفعلية"
            subtitle="مقارنة كم عميل طلب كل فرع وكم منهم فعلاً زاره"
            accent="primary"
          />
          {/* Date filter for this section */}
          <div className="card p-4 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted text-xs font-black">
              <BarChart3 className="w-4 h-4" /> فلترة بالتاريخ
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[10px] font-black uppercase">من تاريخ</label>
              <input
                type="date" dir="ltr"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(d => ({ ...d, startDate: e.target.value }))}
                className="input-field text-sm py-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[10px] font-black uppercase">إلى تاريخ</label>
              <input
                type="date" dir="ltr"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(d => ({ ...d, endDate: e.target.value }))}
                className="input-field text-sm py-1.5"
              />
            </div>
            {(dateRange.startDate || dateRange.endDate) && (
              <button
                onClick={() => setDateRange({ startDate: '', endDate: '' })}
                className="btn-secondary text-xs"
              >
                مسح الفلتر
              </button>
            )}
          </div>
          <BranchAnalysisChart demandData={demandData} visitsData={visitsData} />
        </section>
      )}
      {tab === 'achievements' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Trophy}
            title="ترتيب الفروع بالأداء"
            subtitle="نقاط مركّبة: نسبة المتابعة + نسبة الزيارة + نسبة التقفيل"
            accent="amber"
          />
          <AchievementsLeaderboard
            rows={achievements.rows}
            weights={achievements.weights}
            entityType="branch"
            loading={achievements.loading}
          />
        </section>
      )}
    </div>
  );
};

// ── Domain: السيلز ───────────────────────────────────────────────────────────
const SalesDomain = () => {
  const [tab, setTab] = useState('performance');
  const achievements  = useAchievements('sales');
  const tabs = [
    { id: 'performance',  label: 'أداء السيلز',       icon: TrendingUp },
    { id: 'achievements', label: '🏆 إنجازات السيلز', icon: Trophy     },
  ];
  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />
      {tab === 'performance'  && <SalesAnalytics />}
      {tab === 'achievements' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Trophy}
            title="ترتيب السيلز بالأداء"
            subtitle="نقاط مركّبة لكل سيلز معرض بناءً على المتابعات والزيارات والتقفيلات"
            accent="amber"
          />
          <AchievementsLeaderboard
            rows={achievements.rows}
            weights={achievements.weights}
            entityType="sales"
            loading={achievements.loading}
          />
        </section>
      )}
    </div>
  );
};

// ── Domain: المناديب (call reps) — PURE ANALYTICS for admin ─────────────────
// لا أدوات تشغيلية (مفيش "ابدأ جلسة" ولا قائمة مكالمات شخصية) — مدير النظام بيشوف
// أداء المناديب بس، التعيين الفعلي بيحصل تلقائياً في حساباتهم.
const RepsDomain = () => {
  const [tab, setTab] = useState('performance');
  const [data, setData] = useState({ rows: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchRepsAnalytics()
      .then(d => { if (alive) setData(d); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const tabs = [
    { id: 'performance', label: 'أداء المناديب', icon: TrendingUp, count: data.rows?.length },
  ];

  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />
      {tab === 'performance' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Headset}
            title="ترتيب المناديب بالأداء"
            subtitle="عملاء معيّنين، تحويلات، رسائل ManyChat، تاسكات — لكل مندوب"
            accent="violet"
          />
          {loading ? (
            <div className="card p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : data.rows.length === 0 ? (
            <div className="card p-12 text-center">
              <Headset className="w-10 h-10 text-muted mx-auto mb-3" />
              <p className="text-muted font-bold">لسه مفيش مناديب</p>
              <p className="text-muted text-xs mt-1">
                ضيف مستخدمين بصلاحية "مندوب" من إعدادات النظام عشان تظهر بياناتهم هنا
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-surface-secondary/60 text-muted text-right font-black uppercase tracking-wider">
                      <th className="py-3 px-3">المندوب</th>
                      <th className="py-3 px-3 text-center">عملاء معيّنين</th>
                      <th className="py-3 px-3 text-center">ساخنين</th>
                      <th className="py-3 px-3 text-center">زاروا</th>
                      <th className="py-3 px-3 text-center">اشتروا</th>
                      <th className="py-3 px-3 text-center">رسائل أُرسلت</th>
                      <th className="py-3 px-3 text-center">تاسكات معلّقة</th>
                      <th className="py-3 px-3 text-center">تاسكات مكتملة</th>
                      <th className="py-3 px-3 text-center">% التحويل</th>
                      <th className="py-3 px-3 text-center">% التقفيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.email} className="border-t border-border/60 hover:bg-surface-secondary/20">
                        <td className="py-3 px-3 text-foreground font-black">
                          {r.name}
                          {!r.active && <span className="mr-2 text-[10px] text-rose-400">(موقوف)</span>}
                        </td>
                        <td className="py-3 px-3 text-center text-foreground font-bold">{r.leads_assigned}</td>
                        <td className="py-3 px-3 text-center text-rose-400 font-bold">{r.hot_leads}</td>
                        <td className="py-3 px-3 text-center text-sky-400 font-bold">{r.visited}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">{r.purchased}</td>
                        <td className="py-3 px-3 text-center text-accent font-bold">{r.messages_sent}</td>
                        <td className="py-3 px-3 text-center text-amber-400 font-bold">{r.tasks_pending}</td>
                        <td className="py-3 px-3 text-center text-muted font-bold">{r.tasks_done}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black ${r.conversion_rate >= 30 ? 'text-emerald-400' : r.conversion_rate >= 10 ? 'text-amber-400' : 'text-muted'}`}>
                            {r.conversion_rate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-black ${r.close_rate >= 30 ? 'text-emerald-400' : r.close_rate >= 10 ? 'text-amber-400' : 'text-muted'}`}>
                            {r.close_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border text-[11px] text-muted">
                <b>التعيين تلقائي:</b> كل عميل يتوزّع على أقل مندوب حِملاً (auto-assign).
                مدير النظام بيراقب الأداء بس، التشغيل في حسابات المناديب نفسهم.
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

// ── Domain: الحملات ──────────────────────────────────────────────────────────
const CampaignsDomain = ({ data }) => {
  const [tab, setTab] = useState('performance');
  const tabs = [
    { id: 'performance', label: 'أداء الحملات', icon: Megaphone },
  ];
  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />
      {tab === 'performance' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Megaphone}
            title="أداء كل حملة"
            subtitle="عدد العملاء والزيارات والمشتريات حسب الحملة"
            accent="violet"
          />
          <CampaignPerformance data={data?.campaign_performance} />
        </section>
      )}
    </div>
  );
};

// ── Domain: المنتجات ─────────────────────────────────────────────────────────
const ProductsDomain = ({ data, navigate }) => {
  const [tab, setTab] = useState('top');
  const tabs = [
    { id: 'top',        label: 'الأكثر طلباً', icon: Package    },
    { id: 'categories', label: 'تحليل الفئات', icon: Layers     },
  ];
  return (
    <div className="space-y-6">
      <DomainTabs tabs={tabs} activeId={tab} onChange={setTab} />
      {tab === 'top' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Package}
            title="المنتجات الأكثر طلباً"
            subtitle="أهم المنتجات اللي بتجذب العملاء + الفجوات بين الطلب والمبيعات"
            accent="amber"
          />
          <ProductsChart data={data?.top_products} gapData={data?.product_gap} />
        </section>
      )}
      {tab === 'categories' && (
        <div className="card p-6 text-center">
          <Layers className="w-10 h-10 text-accent mx-auto mb-3" />
          <p className="text-foreground font-black mb-2">تحليل الفئات والـ drill-down للمنتجات</p>
          <p className="text-muted text-xs mb-4">صفحة كاملة فيها 6 فئات + drill-down لكل موديل</p>
          <button onClick={() => navigate('/analytics')} className="btn-primary text-xs">
            افتح تحليل الفئات الكامل ←
          </button>
        </div>
      )}
    </div>
  );
};

const AdminDashboardView = ({ view = 'overview' }) => {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const activeTab   = view;

  // ── Data polling ──────────────────────────────────────────────────────────
  const { data, prevData, loading, error, lastUpdated, refresh, isVisible } =
    useSmartPolling(fetchDashboard, { activeInterval: 15000, backgroundInterval: 60000 });

  // ── Alerts — admin sees backend macro notifications only ──────────────────
  const { alerts, toasts, unreadCount, dismiss, clear, markAllRead, dismissToast } =
    useAdminNotifications();

  const { pushAlerts } = useAlerts();
  useEffect(() => { pushAlerts(alerts, unreadCount); }, [alerts, unreadCount, pushAlerts]);

  // ── Rep management ────────────────────────────────────────────────────────
  const [currentRep, setCurrentRep] = useCurrentRep();
  const { reps }       = useRepList();

  // Clear stale localStorage value if the stored rep no longer exists in the DB
  useEffect(() => {
    if (reps.length > 0 && currentRep && !reps.includes(currentRep)) {
      setCurrentRep('');
    }
  }, [reps, currentRep, setCurrentRep]);

  // Admin always acts under their own name — currentRep is only for VIEWING
  const effectiveRep = user?.name || currentRep;
  const viewingRep   = currentRep;            // the rep whose data is displayed

  const [assignments]  = useAssignments();
  const session        = useCallSession(effectiveRep);
  const gamification   = useGamification(effectiveRep, session.log);

  const handleAlertClick = (alert) => {
    if (alert?.lead?.user_id) navigate(`/leads/${alert.lead.user_id}`);
  };

  // ── Executive KPIs — filtered server-side (revenue / visits / closing) ────
  const { branches } = useBranches();
  const [kpiFilters, setKpiFilters] = useState({ startDate: '', endDate: '', branch: '' });
  const [kpiData, setKpiData]       = useState(null);
  useEffect(() => {
    if (view !== 'overview') return;
    fetchAdminKpis(kpiFilters)
      .then(setKpiData)
      .catch(() => setKpiData(null));
  }, [view, kpiFilters]);

  // ── Branch analysis — its own dedicated date filter on the overview ───────
  const [branchRange, setBranchRange] = useState({ startDate: '', endDate: '' });
  const [branchKpi, setBranchKpi]     = useState(null);
  useEffect(() => {
    if (view !== 'overview') return;
    if (!branchRange.startDate && !branchRange.endDate) { setBranchKpi(null); return; }
    fetchAdminKpis(branchRange).then(setBranchKpi).catch(() => setBranchKpi(null));
  }, [view, branchRange]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const summary = data?.summary  || {};
    const prev    = prevData?.summary || {};
    const calcTrend = (cur, prv) =>
      !prv || prv === 0 ? null : parseFloat((((cur - prv) / prv) * 100).toFixed(1));

    const totalLeads      = summary.total_leads        || 0;
    const hotToday        = summary.hot_leads_today    || 0;
    const visitsConfirmed = summary.visits_confirmed   || 0;
    const visitsToday     = summary.visits_today       || 0;
    const convRate        = summary.conversion_to_visit|| 0;
    const todayStr        = new Date().toISOString().split('T')[0];
    const totalEventsToday =
      data?.weekly_activity?.find(d => d.day === todayStr)?.events || 0;

    return {
      totalLeads:      { value: totalLeads,      trend: calcTrend(totalLeads,      prev.total_leads) },
      hotToday:        { value: hotToday,        trend: calcTrend(hotToday,        prev.hot_leads_today) },
      visitsConfirmed: { value: visitsConfirmed, trend: calcTrend(visitsConfirmed, prev.visits_confirmed) },
      visitsToday:     { value: visitsToday,     trend: null },
      convRate:        { value: convRate,         trend: calcTrend(convRate,         prev.conversion_to_visit) },
      eventsToday:     { value: totalEventsToday, trend: null },
    };
  }, [data, prevData]);

  // ── Error State ───────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="card p-10 text-center max-w-md border-rose-500/20 bg-rose-500/5">
          <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-rose-500" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-3">عذراً، حدث خطأ في الاتصال</h3>
          <p className="text-muted mb-8 text-sm leading-relaxed">{error}</p>
          <button onClick={refresh} className="btn-primary w-full py-4">إعادة محاولة الاتصال</button>
        </div>
      </div>
    );
  }

  const summary    = data?.summary || {};
  const isFirstLoad = loading && !data;
  const leads      = data?.recent_hot_leads || [];

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-1 bg-amber-500 rounded-full" />
            <span className="text-amber-400 font-black text-xs uppercase tracking-[0.2em]">
              Admin — {VIEW_LABELS[view] || 'لوحة التحكم'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground">{VIEW_LABELS[view] || 'لوحة التحكم'}</h1>
          <p className="text-muted mt-2">
            <span className="text-emerald-400 font-bold">{user?.name || 'مدير النظام'}</span>
            {' • '}مدير النظام
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${
              isVisible
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-surface-secondary/50 border-border text-muted'
            }`}
          >
            {isVisible ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isVisible ? 'متصل' : 'في الخلفية'}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <RelativeTime lastUpdated={lastUpdated} />
          </div>

          <NotificationBell
            alerts={alerts} unreadCount={unreadCount}
            onDismiss={dismiss} onClear={clear}
            onMarkAllRead={markAllRead} onAlertClick={handleAlertClick}
          />

          <button onClick={refresh} className="btn-secondary group" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Toasts */}
      <AlertToast toasts={toasts} onDismiss={dismissToast} onClick={handleAlertClick} />

      {/* ── Executive war-room overview ──────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-10">
          {/* Filter bar — date range + branch (re-fetches the KPIs) */}
          <div className="card p-4 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted text-xs font-black">
              <BarChart3 className="w-4 h-4" /> فلترة المؤشرات
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[10px] font-black uppercase">من تاريخ</label>
              <input
                type="date" dir="ltr"
                value={kpiFilters.startDate}
                onChange={(e) => setKpiFilters(f => ({ ...f, startDate: e.target.value }))}
                className="input-field text-sm py-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[10px] font-black uppercase">إلى تاريخ</label>
              <input
                type="date" dir="ltr"
                value={kpiFilters.endDate}
                onChange={(e) => setKpiFilters(f => ({ ...f, endDate: e.target.value }))}
                className="input-field text-sm py-1.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[10px] font-black uppercase">الفرع</label>
              <select
                value={kpiFilters.branch}
                onChange={(e) => setKpiFilters(f => ({ ...f, branch: e.target.value }))}
                className="input-field text-sm py-1.5 min-w-[150px]"
              >
                <option value="">كل الفروع</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {(kpiFilters.startDate || kpiFilters.endDate || kpiFilters.branch) && (
              <button
                onClick={() => setKpiFilters({ startDate: '', endDate: '', branch: '' })}
                className="btn-secondary text-xs"
              >
                مسح الفلتر
              </button>
            )}
          </div>

          {/* Top row — executive KPIs */}
          <section className="space-y-4">
            <SectionHeader
              icon={BarChart3}
              title="مؤشرات الأداء التنفيذية"
              subtitle="نظرة شاملة على أداء الشركة"
              accent="primary"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {!kpiData
                ? Array.from({ length: 3 }).map((_, i) => <KPICardSkeleton key={i} />)
                : (
                  <>
                    <div className="h-full flex flex-col gap-3">
                      <div className="flex-1">
                        <KPICard
                          icon={ShoppingBag}
                          label="عدد التعاقدات"
                          value={fmtNum(kpiData.contracts_count)}
                          subtitle="إجمالي عدد العقود المسجّلة"
                          color="success"
                        />
                      </div>
                      <TargetProgress target={kpiData.target} percent={kpiData.percent_achieved} />
                    </div>
                    <KPICard
                      icon={MapPin}
                      label="إجمالي الزيارات"
                      value={fmtNum(kpiData.total_visits)}
                      subtitle="زيارات مؤكدة للمعارض"
                    />
                    <KPICard
                      icon={TrendingUp}
                      label="نسبة الإغلاق العامة"
                      value={`${kpiData.closing_rate}%`}
                      subtitle="العملاء اللي اشتروا ÷ اللي زاروا"
                      color="warning"
                    />
                  </>
                )
              }
            </div>
          </section>

          {/* Macro analytics — funnel, distribution, branch performance.
              Honours the filter bar: charts use the filtered KPI dataset
              when available, falling back to the live dashboard feed. */}
          <section className="space-y-4">
            <SectionHeader
              icon={PieChart}
              title="التحليلات الاستراتيجية"
              subtitle="القمع وتوزيع العملاء — تتأثر بالفلتر بالأعلى"
              accent="violet"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FunnelChart           data={kpiData?.funnel_stages || data?.funnel_stages} />
              <LeadDistributionChart data={kpiData?.lead_distribution || summary.lead_distribution} />
            </div>
          </section>

          {/* Branch analysis — own date filter */}
          <section className="space-y-4">
            <SectionHeader
              icon={MapPin}
              title="تحليل الفروع"
              subtitle="مقارنة الطلبات مقابل الزيارات الفعلية"
              accent="primary"
            />
            <div className="card p-4 flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-muted text-xs font-black">
                <MapPin className="w-4 h-4" /> فلترة بالتاريخ
              </div>
              <div className="space-y-1">
                <label className="text-muted text-[10px] font-black uppercase">من تاريخ</label>
                <input
                  type="date" dir="ltr"
                  value={branchRange.startDate}
                  onChange={(e) => setBranchRange(r => ({ ...r, startDate: e.target.value }))}
                  className="input-field text-sm py-1.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted text-[10px] font-black uppercase">إلى تاريخ</label>
                <input
                  type="date" dir="ltr"
                  value={branchRange.endDate}
                  onChange={(e) => setBranchRange(r => ({ ...r, endDate: e.target.value }))}
                  className="input-field text-sm py-1.5"
                />
              </div>
              {(branchRange.startDate || branchRange.endDate) && (
                <button
                  onClick={() => setBranchRange({ startDate: '', endDate: '' })}
                  className="btn-secondary text-xs"
                >
                  مسح الفلتر
                </button>
              )}
            </div>
            <BranchAnalysisChart
              demandData={branchKpi?.branch_demand || kpiData?.branch_demand || data?.branch_demand}
              visitsData={branchKpi?.branch_visits || kpiData?.branch_visits || data?.branch_visits}
            />
          </section>
        </div>
      )}

      {/* ── New 6-domain pages (with internal tabs) ───────────────── */}
      {activeTab === 'customers' && <CustomersDomain data={data} navigate={navigate} />}
      {activeTab === 'branches'  && <BranchesDomain  data={data} />}
      {activeTab === 'sales'     && <SalesDomain />}
      {activeTab === 'reps'      && <RepsDomain />}
      {activeTab === 'campaigns' && <CampaignsDomain data={data} />}
      {activeTab === 'products'  && <ProductsDomain  data={data} navigate={navigate} />}

      {/* ── Legacy fallback views (direct URL access only) ────────── */}
      {activeTab === 'hotleads' && (
        <section className="space-y-4">
          <SectionHeader
            icon={Flame}
            title="العملاء الساخنين الآن"
            subtitle="العملاء اللي محتاجين تواصل سريع"
            accent="rose"
          />
          <HotLeadsTable leads={leads} />
        </section>
      )}

      {activeTab === 'groups'    && <LeadGroups leads={leads} />}
      {activeTab === 'calls'     && <DailyCallList  leads={leads} currentRep={viewingRep} onStartSession={session.startSession} />}
      {activeTab === 'my'        && <MyLeadsPanel   leads={leads} currentRep={viewingRep} onStartSession={session.startSession} />}
      {activeTab === 'gamify'    && <GamificationPanel gamification={gamification} currentRep={viewingRep} />}
      {activeTab === 'reception' && <ReceptionDesk />}
      {activeTab === 'salesperf' && <SalesAnalytics />}
      {activeTab === 'guide'     && <ManyChatGuide />}

      {/* ── Footer ────────────────────────────────────── */}
      <div className="text-center text-xs text-muted print:hidden">
        آخر تحديث: <RelativeTime lastUpdated={lastUpdated} />
        <span className="mx-2 text-muted">•</span>
        {lastUpdated?.toLocaleTimeString('ar-EG')}
      </div>

      {/* ── Call Session modal ─────────────────────────── */}
      {session.active && (
        <CallSession
          leads={leads}
          assignments={assignments}
          currentRep={effectiveRep}
          session={session}
          onClose={session.endSession}
          onlyAssignedToMe={activeTab === 'my'}
        />
      )}
    </div>
  );
};

export default AdminDashboardView;
