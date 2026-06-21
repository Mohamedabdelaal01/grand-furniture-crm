/**
 * SystemHealth — admin infrastructure monitor. Surfaces DB file size, per-table
 * row counts, server uptime & memory so the admin can spot a growing DB or a
 * runaway table before it causes a crash. Auto-refreshes every 15s.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Activity, RefreshCw, Database, Clock, Cpu, Server, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { fetchSystemHealth } from '../services/api';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

const fmtUptime = (s) => {
  if (s == null) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} يوم ${h} ساعة`;
  if (h) return `${h} ساعة ${m} دقيقة`;
  return `${m} دقيقة`;
};

const TABLE_AR = {
  lead_profiles: 'العملاء', lead_phones: 'أرقام الهواتف', lead_visits: 'الزيارات',
  events: 'الأحداث (ManyChat)', purchases: 'التعاقدات', purchase_items: 'بنود التعاقدات',
  branch_customer_followups: 'إسنادات المتابعة', followup_log: 'سجل المتابعات',
  revisit_followups: 'متابعات بعد الزيارة', users: 'المستخدمون', products: 'المنتجات', tasks: 'المهام',
};

function Metric({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="text-muted text-xs font-bold">{label}</span>
      </div>
      <div className="text-foreground text-2xl font-black">{value}</div>
      {sub && <div className="text-muted text-[11px] mt-1">{sub}</div>}
    </div>
  );
}

export default function SystemHealth() {
  const [h, setH]           = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setH(await fetchSystemHealth()); } catch { setH(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // live-ish refresh
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" dir="rtl">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!h) {
    return <div className="card p-12 text-center text-muted font-bold" dir="rtl">تعذّر تحميل بيانات النظام</div>;
  }

  // Simple health verdict from DB size + memory.
  const dbWarn  = (h.db_mb || 0) > 500;          // SQLite getting large
  const memWarn = (h.memory_rss_mb || 0) > 450;  // Railway free tier ~512MB
  const healthy = !dbWarn && !memWarn;
  const maxRows = Math.max(1, ...Object.values(h.tables || {}).map((v) => v || 0));

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-accent rounded-full" />
            <span className="text-accent font-black text-[10px] uppercase tracking-[0.2em]">البنية التحتية</span>
          </div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
            <Activity className="w-7 h-7 text-accent" />
            صحة النظام
          </h1>
          <p className="text-muted text-sm mt-1">راقب حجم قاعدة البيانات والذاكرة قبل ما تسبب أي توقف مفاجئ.</p>
        </div>
        <button onClick={load} className="btn-secondary self-start sm:self-end">
          <RefreshCw className="w-4 h-4" /> تحديث
        </button>
      </div>

      {/* Verdict banner */}
      <div className={`card p-4 flex items-center gap-3 ${healthy ? 'border-emerald-500/30' : 'border-amber-500/40'}`}>
        {healthy
          ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          : <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />}
        <div>
          <div className="text-foreground font-black">{healthy ? 'النظام يعمل بشكل سليم' : 'انتبه — مؤشرات تحتاج مراجعة'}</div>
          <div className="text-muted text-xs">
            {healthy
              ? 'كل المؤشرات في النطاق الآمن.'
              : `${dbWarn ? 'حجم قاعدة البيانات كبير. ' : ''}${memWarn ? 'استهلاك الذاكرة مرتفع.' : ''}`}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={Database} tone={dbWarn ? 'bg-amber-500/15 text-amber-400' : 'bg-sky-500/15 text-sky-400'}
                label="حجم قاعدة البيانات" value={h.db_mb != null ? `${h.db_mb} م.ب` : '—'} sub={`${fmt(h.total_rows)} صف إجمالاً`} />
        <Metric icon={Clock} tone="bg-emerald-500/15 text-emerald-400"
                label="مدة تشغيل الخادم" value={fmtUptime(h.uptime_seconds)} />
        <Metric icon={Cpu} tone={memWarn ? 'bg-amber-500/15 text-amber-400' : 'bg-violet-500/15 text-violet-400'}
                label="استهلاك الذاكرة" value={`${h.memory_rss_mb} م.ب`} sub="RSS" />
        <Metric icon={Server} tone="bg-accent/15 text-accent"
                label="إصدار Node" value={h.node_version || '—'} />
      </div>

      {/* Row counts per table */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <Database className="w-4 h-4 text-accent" />
          <h3 className="text-foreground font-black text-sm">عدد الصفوف في كل جدول</h3>
        </div>
        <div className="p-4 space-y-2.5">
          {Object.entries(h.tables || {}).map(([t, n]) => (
            <div key={t}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-bold">{TABLE_AR[t] || t}</span>
                <span className="text-foreground font-black">{n == null ? '—' : fmt(n)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                <div className="h-full rounded-full bg-accent/70"
                     style={{ width: `${((n || 0) / maxRows) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-muted text-[11px] text-center">يتحدّث تلقائياً كل ١٥ ثانية</p>
    </div>
  );
}
