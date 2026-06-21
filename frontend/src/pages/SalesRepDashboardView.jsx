/**
 * SalesRepDashboardView — Personal dashboard for sales rep users.
 * Shows only their own leads, calls, gamification, and reception desk.
 * No global analytics, no rep selector, no branch-level KPIs.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, UserCheck, Trophy, ScanLine, RefreshCw,
  Wifi, WifiOff, Star, Target, Zap, ListTodo, BarChart3,
  Users, CheckCircle2, Clock, ShoppingBag, PhoneCall, ArrowLeft,
} from 'lucide-react';
import SectionHeader     from '../components/SectionHeader';
import DailyCallList     from '../components/DailyCallList';
import MyTasksPanel      from '../components/MyTasksPanel';
import MyLeadsPanel      from '../components/MyLeadsPanel';
import GamificationPanel from '../components/GamificationPanel';
import CallSession       from '../components/CallSession';
import ReceptionDesk     from '../components/ReceptionDesk';
import NotificationBell  from '../components/NotificationBell';
import AlertToast        from '../components/AlertToast';
import { fetchDashboard, fetchMyTarget, fetchMySalesCustomers } from '../services/api';
import TargetProgress, { arabicMonthLabel } from '../components/TargetProgress';
import useSmartPolling   from '../hooks/useSmartPolling';
import useLeadAlerts     from '../hooks/useLeadAlerts';
import { useAlerts }     from '../contexts/AlertsContext';
import { useAuth }       from '../contexts/AuthContext';
import useAssignments    from '../hooks/useAssignments';
import useCallSession    from '../hooks/useCallSession';
import useGamification   from '../hooks/useGamification';

// ── Today's visitors (reception-confirmed, assigned to this rep) ─────────────
function TodaysVisitorsPanel({ repName }) {
  const navigate   = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const data = await fetchMySalesCustomers({ today: true });
      setVisitors(data.customers || []);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // auto-refresh every 30 s so new arrivals appear without manual action
    intervalRef.current = setInterval(load, 30_000);
    return () => clearInterval(intervalRef.current);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <div className="text-center py-10">
        <Users className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted font-bold text-sm">لسه محدش وقف معاك النهارده</p>
        <p className="text-muted text-xs mt-1">أول ما الاستقبال يسجّل زيارة ليك هتظهر هنا تلقائي</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5" dir="rtl">
      {visitors.map((v) => (
        <div
          key={v.user_id}
          className={`flex items-center gap-3 p-3.5 rounded-xl border ${
            v.my_purchases > 0
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-surface-secondary/40 border-border'
          }`}
        >
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate(`/leads/${v.user_id}`)}
              className="text-foreground font-black text-sm hover:text-accent transition-colors truncate block text-right"
            >
              {v.first_name || 'عميل'}
            </button>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-muted">
              {v.phones && (
                <span className="font-mono flex items-center gap-1" dir="ltr">
                  <Phone className="w-3 h-3" />{v.phones}
                </span>
              )}
              {v.visited_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(v.visited_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {v.my_purchases > 0 ? (
              <span className="flex items-center gap-1 text-emerald-400 text-xs font-black">
                <ShoppingBag className="w-3.5 h-3.5" /> اشترى
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1 text-amber-400 text-xs font-black">
                  <CheckCircle2 className="w-3.5 h-3.5" /> في المعرض
                </span>
                {/* shortcut to the revisit follow-up page for this customer */}
                <button
                  onClick={() => navigate('/revisit')}
                  title="روح صفحة المتابعة"
                  className="flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent transition-colors"
                >
                  <PhoneCall className="w-3 h-3" />
                  تابعه
                </button>
              </>
            )}
          </div>
        </div>
      ))}

      {/* Quick link to the full revisit page */}
      <button
        onClick={() => navigate('/revisit')}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border bg-surface-secondary/30 hover:bg-surface-secondary text-muted hover:text-foreground text-xs font-bold transition-colors mt-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        فتح صفحة المتابعة الكاملة
      </button>
    </div>
  );
}

// ── Relative time indicator ───────────────────────────────────────────────────
const RelativeTime = ({ lastUpdated }) => {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!lastUpdated) return null;
  const s    = Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
  const text = s < 5 ? 'الآن' : s < 60 ? `منذ ${s} ثانية` : `منذ ${Math.floor(s / 60)} دقيقة`;
  return <span>{text}</span>;
};

// ── Personal quick-stat card ──────────────────────────────────────────────────
const StatChip = ({ icon: Icon, label, value, color = 'primary' }) => {
  const colors = {
    primary: 'bg-accent/10 border-accent/20 text-accent',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[color]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="text-right">
        <p className="text-xs font-bold opacity-70">{label}</p>
        <p className="text-lg font-black leading-none">{value}</p>
      </div>
    </div>
  );
};

// ── Tab definitions (sales rep sees only personal tools) ─────────────────────
const REP_TABS = [
  { id: 'calls',     label: 'مكالمات اليوم', icon: Phone     },
  { id: 'tasks',     label: 'مهامي',         icon: ListTodo  },
  { id: 'my',        label: 'عملائي',        icon: UserCheck },
  { id: 'gamify',    label: 'إنجازاتي',      icon: Trophy    },
  { id: 'reception', label: 'الاستقبال',     icon: ScanLine  },
];

const SalesRepDashboardView = () => {
  const { user }                = useAuth();
  const [activeTab, setActiveTab] = useState('calls');

  // ── Data polling (shared endpoint — filtering is done server-side) ─────────
  const { data, prevData, loading, lastUpdated, refresh, isVisible } =
    useSmartPolling(fetchDashboard, { activeInterval: 20000, backgroundInterval: 90000 });

  // ── Alerts ────────────────────────────────────────────────────────────────
  const { alerts, toasts, unreadCount, dismiss, clear, markAllRead, dismissToast } =
    useLeadAlerts(data?.recent_hot_leads, prevData?.recent_hot_leads);

  const { pushAlerts } = useAlerts();
  useEffect(() => { pushAlerts(alerts, unreadCount); }, [alerts, unreadCount, pushAlerts]);

  // ── Rep identity — always the logged-in user ──────────────────────────────
  const repName    = user?.name || 'مندوب';
  const [assignments] = useAssignments();
  const session    = useCallSession(repName);
  const gamification = useGamification(repName, session.log);

  // All leads from the API (already filtered server-side for this rep)
  const leads = data?.recent_hot_leads || [];

  // Personal sales target + achievement
  const [myTarget, setMyTarget] = useState(null);
  useEffect(() => {
    fetchMyTarget().then(setMyTarget).catch(() => setMyTarget(null));
  }, []);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="w-8 h-1 bg-accent rounded-full" />
            <span className="text-accent font-black text-xs uppercase tracking-[0.2em]">
              Sales Rep Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground">أهلاً، {repName}</h1>
          <p className="text-muted mt-1">
            Level <span className="text-accent font-bold">{gamification.level.level}</span>
            {' • '}
            <span className="text-amber-400 font-bold">{gamification.totalXp} XP</span>
            {' • '}مندوب مبيعات
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Connection status */}
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
            onMarkAllRead={markAllRead} onAlertClick={() => {}}
          />

          <button onClick={session.startSession} className="btn-primary">
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">ابدأ جلسة</span>
          </button>

          <button onClick={refresh} className="btn-secondary group" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* Toasts */}
      <AlertToast toasts={toasts} onDismiss={dismissToast} onClick={() => {}} />

      {/* ── Personal quick stats ──────────────────────── */}
      <section className="space-y-4">
        <SectionHeader
          icon={BarChart3}
          title="أرقامي اليوم"
          subtitle="نظرة سريعة على نشاطك"
          accent="primary"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatChip
            icon={Target}
            label="العملاء المعيّنين"
            value={leads.length}
            color="primary"
          />
          <StatChip
            icon={Zap}
            label="مكالمات اليوم"
            value={session.log?.filter(l => {
              const today = new Date().toDateString();
              return l.timestamp && new Date(l.timestamp).toDateString() === today;
            }).length ?? 0}
            color="amber"
          />
          <StatChip
            icon={Star}
            label="المستوى الحالي"
            value={`Level ${gamification.level.level}`}
            color="emerald"
          />
        </div>

        {/* Personal sales target — motivational progress bar */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-accent" />
            <span className="text-foreground font-black text-sm">تعاقداتي</span>
            <span className="text-emerald-400 font-black text-sm mr-auto">
              {myTarget?.contracts ?? 0} تعاقد
            </span>
          </div>
          <TargetProgress
            target={myTarget?.target || 0}
            percent={myTarget?.percent || 0}
            label={`مستهدفي — ${arabicMonthLabel()}`}
          />
        </div>
      </section>

      {/* ── Tab bar ───────────────────────────────────── */}
      <div className="card p-2 flex flex-wrap gap-1 sticky top-4 z-30 backdrop-blur-md">
        {REP_TABS.map((t) => {
          const Icon   = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all ${
                active
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-muted hover:text-foreground hover:bg-surface-secondary/50 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ───────────────────────────────── */}
      {activeTab === 'calls'     && (
        <DailyCallList
          leads={leads}
          currentRep={repName}
          onStartSession={session.startSession}
        />
      )}
      {activeTab === 'tasks'     && <MyTasksPanel />}
      {activeTab === 'my'        && (
        <MyLeadsPanel
          leads={leads}
          currentRep={repName}
          onStartSession={session.startSession}
        />
      )}
      {activeTab === 'gamify'    && (
        <GamificationPanel
          gamification={gamification}
          currentRep={repName}
        />
      )}
      {activeTab === 'reception' && (
        <div className="space-y-6">
          <ReceptionDesk />
          {/* ── زوار اليوم — customers confirmed today and assigned to this rep ── */}
          <section className="space-y-4">
            <SectionHeader
              icon={Users}
              title="زاروا المعرض وقفوا معاك"
              subtitle="العملاء اللي سجّلهم الاستقبال ليك النهارده — بيتحدّث تلقائي"
              accent="violet"
            />
            <div className="card p-5">
              <TodaysVisitorsPanel repName={repName} />
            </div>
          </section>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────── */}
      <div className="text-center text-xs text-muted">
        آخر تحديث: <RelativeTime lastUpdated={lastUpdated} />
        <span className="mx-2 text-muted">•</span>
        {lastUpdated?.toLocaleTimeString('ar-EG')}
      </div>

      {/* ── Call Session modal ─────────────────────────── */}
      {session.active && (
        <CallSession
          leads={leads}
          assignments={assignments}
          currentRep={repName}
          session={session}
          onClose={session.endSession}
          onlyAssignedToMe={activeTab === 'my'}
        />
      )}
    </div>
  );
};

export default SalesRepDashboardView;
