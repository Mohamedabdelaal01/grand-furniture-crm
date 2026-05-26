import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { formatBranch } from '../services/api';
import { TrendingUp, MapPin, Star } from 'lucide-react';

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const demand  = payload.find(p => p.dataKey === 'demand')?.value  || 0;
  const visits  = payload.find(p => p.dataKey === 'visits')?.value  || 0;
  const convPct = demand > 0 ? ((visits / demand) * 100).toFixed(0) : 0;

  return (
    <div className="card p-4 shadow-premium min-w-[160px] space-y-2">
      <p className="text-dark-200 text-sm font-bold border-b border-dark-700 pb-2 mb-2">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-dark-400 text-xs">طلبات</span>
        <span className="text-amber-400 font-black">{demand}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-dark-400 text-xs">زيارات فعلية</span>
        <span className="text-emerald-400 font-black">{visits}</span>
      </div>
      <div className="pt-2 border-t border-dark-700 flex items-center justify-between gap-4">
        <span className="text-dark-400 text-xs">معدل التحويل</span>
        <span className="text-primary-400 font-black">{convPct}%</span>
      </div>
    </div>
  );
};

// ── Insight chip ───────────────────────────────────────────────────────────────
const InsightChip = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${color}`}>
    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
    <span className="text-dark-400">{label}:</span>
    <span className="text-white">{value}</span>
  </div>
);

const BranchAnalysisChart = ({ demandData, visitsData }) => {
  // Merge both datasets on branch key
  const { chartData, insights } = useMemo(() => {
    if (!demandData?.length && !visitsData?.length) return { chartData: [], insights: {} };

    const allBranches = Array.from(new Set([
      ...(demandData || []).map(d => d.branch),
      ...(visitsData || []).map(v => v.branch),
    ]));

    const demandMap = Object.fromEntries((demandData || []).map(d => [d.branch, d.requests]));
    const visitsMap = Object.fromEntries((visitsData || []).map(v => [v.branch, v.visits]));

    const merged = allBranches.map(branch => ({
      branch,
      name:    formatBranch(branch),
      demand:  demandMap[branch] || 0,
      visits:  visitsMap[branch] || 0,
      convPct: demandMap[branch]
        ? parseFloat(((visitsMap[branch] || 0) / demandMap[branch] * 100).toFixed(1))
        : 0,
    })).sort((a, b) => b.demand - a.demand);

    // Insights
    const highestDemand  = merged.reduce((a, b) => a.demand  > b.demand  ? a : b, merged[0]);
    const highestVisits  = merged.reduce((a, b) => a.visits  > b.visits  ? a : b, merged[0]);
    const bestConversion = merged.filter(b => b.demand > 0)
                                 .reduce((a, b) => a.convPct > b.convPct ? a : b, merged[0]);

    return {
      chartData: merged,
      insights: {
        highestDemand:  highestDemand?.name,
        highestVisits:  highestVisits?.name,
        bestConversion: bestConversion?.name,
        bestConvPct:    bestConversion?.convPct,
      },
    };
  }, [demandData, visitsData]);

  if (!chartData.length) {
    return (
      <div className="card p-6 flex items-center justify-center h-full min-h-[320px]">
        <div className="text-center space-y-3">
          <MapPin className="w-10 h-10 text-dark-600 mx-auto" />
          <p className="text-dark-400 font-bold text-sm">لا توجد بيانات فروع بعد</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-5">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-dark-50">تحليل الفروع</h3>
        <p className="text-dark-500 text-xs mt-0.5">مقارنة الطلبات مقابل الزيارات الفعلية</p>
      </div>

      {/* Insight chips */}
      {(insights.highestDemand || insights.highestVisits || insights.bestConversion) && (
        <div className="flex flex-wrap gap-2">
          {insights.highestDemand && (
            <InsightChip
              icon={TrendingUp}
              label="أعلى طلب"
              value={insights.highestDemand}
              color="border-amber-500/20 bg-amber-500/5 text-amber-400"
            />
          )}
          {insights.highestVisits && (
            <InsightChip
              icon={MapPin}
              label="أعلى زيارات"
              value={insights.highestVisits}
              color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            />
          )}
          {insights.bestConversion && (
            <InsightChip
              icon={Star}
              label="أفضل تحويل"
              value={`${insights.bestConversion} (${insights.bestConvPct}%)`}
              color="border-primary-500/20 bg-primary-500/5 text-primary-400"
            />
          )}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
            formatter={val => val === 'demand' ? 'طلبات' : 'زيارات فعلية'}
          />
          <Bar
            dataKey="demand"
            fill="#f59e0b"
            radius={[6, 6, 0, 0]}
            opacity={0.85}
          />
          <Bar
            dataKey="visits"
            fill="#22c55e"
            radius={[6, 6, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Conversion rate mini table */}
      <div className="border-t border-dark-800/60 pt-4">
        <p className="text-dark-500 text-[10px] font-black uppercase tracking-widest mb-3">
          معدل تحويل الطلب → زيارة
        </p>
        <div className="space-y-2">
          {chartData.map(branch => (
            <div key={branch.branch} className="flex items-center gap-3">
              <span className="text-dark-300 text-xs w-24 truncate flex-shrink-0">{branch.name}</span>
              <div className="flex-1 h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(branch.convPct, 100)}%`,
                    background: branch.convPct >= 50
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : branch.convPct >= 25
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)',
                  }}
                />
              </div>
              <span className="text-dark-300 text-[11px] font-black tabular-nums w-10 text-left">
                {branch.convPct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BranchAnalysisChart;
