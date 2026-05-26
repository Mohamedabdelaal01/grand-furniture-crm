import { useMemo } from 'react';
import { formatEventType } from '../services/api';
import { ArrowDown, TrendingDown } from 'lucide-react';

// Funnel stage order including map_click (Phase 3)
const STAGE_ORDER = [
  'product_details',
  'location_request',
  'branch_selected',
  'map_click',
  'contact_request',
  'visit_confirmed',
];

// Entry events shown separately above the main funnel as "top-of-funnel" awareness
const AWARENESS_ORDER = ['entry_catalog', 'entry_offer', 'entry_location'];

// Colour per funnel depth — darkest at top (widest), brightest at bottom (converted)
const STAGE_COLORS = {
  product_details:  { bar: '#38bdf8', text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/20' },
  location_request: { bar: '#818cf8', text: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20' },
  branch_selected:  { bar: '#a78bfa', text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
  map_click:        { bar: '#f472b6', text: 'text-pink-400',    bg: 'bg-pink-500/10',    border: 'border-pink-500/20' },
  contact_request:  { bar: '#fb923c', text: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
  visit_confirmed:  { bar: '#4ade80', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

const DEFAULT_COLOR = { bar: '#64748b', text: 'text-dark-400', bg: 'bg-dark-800/40', border: 'border-dark-700/50' };

// ── Drop-off indicator between two stages ─────────────────────────────────────
const DropOff = ({ from, to }) => {
  if (!from || !to || from === 0) return null;
  const retained = to / from;
  const dropped  = (1 - retained) * 100;
  const isBad    = dropped > 60;
  const isMed    = dropped > 30;

  return (
    <div className="flex items-center justify-center py-1 gap-2 opacity-80">
      <ArrowDown className="w-3 h-3 text-dark-600" />
      {dropped > 0 && (
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md inline-flex items-center gap-1
          ${isBad ? 'text-rose-400 bg-rose-500/10' : isMed ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}
        `}>
          <TrendingDown className="w-2.5 h-2.5" />
          {dropped.toFixed(0)}% تسرّب
        </span>
      )}
    </div>
  );
};

const FunnelChart = ({ data }) => {
  const { mainStages, awarenessStages, summary } = useMemo(() => {
    if (!data?.length) return { mainStages: [], awarenessStages: [], summary: {} };

    const byType = Object.fromEntries(data.map(d => [d.event_type, d.unique_users]));

    const mainStages = STAGE_ORDER
      .map(type => ({
        type,
        name:  formatEventType(type),
        value: byType[type] || 0,
        color: STAGE_COLORS[type] || DEFAULT_COLOR,
      }))
      .filter(s => s.value > 0);

    const awarenessStages = AWARENESS_ORDER
      .map(type => ({
        type,
        name:  formatEventType(type),
        value: byType[type] || 0,
      }))
      .filter(s => s.value > 0);

    const topValue    = mainStages[0]?.value  || 1;
    const bottomValue = mainStages[mainStages.length - 1]?.value || 0;
    const overallConv = ((bottomValue / topValue) * 100).toFixed(1);

    let bestDrop = { pct: 0, from: null, to: null };
    mainStages.forEach((s, i) => {
      if (i === 0) return;
      const prev = mainStages[i - 1];
      const drop = prev.value > 0 ? (1 - s.value / prev.value) * 100 : 0;
      if (drop > bestDrop.pct) bestDrop = { pct: drop, from: prev.name, to: s.name };
    });

    return {
      mainStages,
      awarenessStages,
      summary: { overallConv, bestDrop, topValue, bottomValue },
    };
  }, [data]);

  if (!mainStages.length) {
    return (
      <div className="card p-6 flex items-center justify-center min-h-[320px]">
        <p className="text-dark-400 font-bold text-sm">لا توجد بيانات قمع بعد</p>
      </div>
    );
  }

  const maxValue = Math.max(...mainStages.map(s => s.value), 1);

  return (
    <div className="card p-6 space-y-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-dark-50">قمع التحويل</h3>
          <p className="text-dark-500 text-xs mt-0.5">
            من مشاهدة المنتج → تأكيد الزيارة
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-400 text-lg font-black tabular-nums">{summary.overallConv}%</p>
            <p className="text-dark-500 text-[9px] uppercase font-bold tracking-wide">تحويل كلي</p>
          </div>
          {summary.bestDrop?.pct > 0 && (
            <div className="text-center px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <p className="text-rose-400 text-lg font-black tabular-nums">{summary.bestDrop.pct.toFixed(0)}%</p>
              <p className="text-dark-500 text-[9px] uppercase font-bold tracking-wide">أعلى تسرّب</p>
            </div>
          )}
        </div>
      </div>

      {/* Awareness mini row */}
      {awarenessStages.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-dark-500 text-[10px] font-black uppercase tracking-widest ml-1">وعي:</span>
          {awarenessStages.map(s => (
            <div key={s.type} className="flex items-center gap-1.5 px-2.5 py-1 bg-dark-800/40 rounded-lg border border-dark-700/50">
              <span className="text-dark-300 text-[11px] font-bold">{s.name}</span>
              <span className="text-dark-500 text-[10px] font-black tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main funnel bars */}
      <div className="space-y-1">
        {mainStages.map((stage, idx) => {
          const pct   = (stage.value / maxValue) * 100;
          const prev  = mainStages[idx - 1];

          return (
            <div key={stage.type}>
              {/* Drop-off between stages */}
              {idx > 0 && <DropOff from={prev.value} to={stage.value} />}

              {/* Stage row */}
              <div className="group">
                <div className="flex items-center justify-between mb-1.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[11px] font-black w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${stage.color.bg} ${stage.color.text} ${stage.color.border} border`}>
                      {idx + 1}
                    </span>
                    <span className={`text-sm font-bold transition-colors ${stage.color.text} truncate`}>
                      {stage.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {idx > 0 && prev.value > 0 && (
                      <span className="text-dark-500 text-[10px] font-bold tabular-nums">
                        {((stage.value / prev.value) * 100).toFixed(0)}% بقاء
                      </span>
                    )}
                    <span className={`text-base font-black tabular-nums ${stage.color.text}`}>
                      {stage.value.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Bar */}
                <div className="relative h-7 bg-dark-800/60 rounded-lg overflow-hidden">
                  {/* Base fill */}
                  <div
                    className="absolute inset-y-0 right-0 rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-3"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${stage.color.bar}55, ${stage.color.bar})`,
                    }}
                  >
                    {pct > 18 && (
                      <span className="text-[10px] font-black text-white/90">
                        {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Biggest drop-off callout */}
      {summary.bestDrop?.from && (
        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-start gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-dark-300 text-[11px] leading-relaxed">
            <span className="font-black text-rose-400">أكبر نقطة تسرّب</span>{' '}
            بين <span className="text-white font-bold">{summary.bestDrop.from}</span>{' '}
            و <span className="text-white font-bold">{summary.bestDrop.to}</span>{' '}
            — {summary.bestDrop.pct.toFixed(0)}% من العملاء لم يكملوا هذه الخطوة.
          </p>
        </div>
      )}
    </div>
  );
};

export default FunnelChart;
