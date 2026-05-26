import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Phone, PhoneOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { fetchPredictions, formatBranch } from '../services/api';

const CONFIDENCE_LABEL = {
  high:   'ثقة عالية',
  medium: 'ثقة متوسطة',
  low:    'ثقة منخفضة',
};

const CONFIDENCE_COLOR = {
  high:   'text-emerald-400',
  medium: 'text-primary-400',
  low:    'text-dark-400',
};

/**
 * WeeklyForecast — predicts visits for the next 7 days using the
 * last 14 days of visit_confirmed + location_request events.
 * Updates with smartPolling-equivalent refresh: refetches every 60s.
 */
export default function WeeklyForecast() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetchPredictions();
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (loading && !data) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-4 w-32 bg-dark-800 rounded mb-3" />
        <div className="h-10 w-20 bg-dark-800 rounded mb-4" />
        <div className="h-40 bg-dark-800/40 rounded" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-sm text-dark-400">
        تعذر تحميل التوقعات: {error || 'لا توجد بيانات'}
      </div>
    );
  }

  const trendUp = data.trend >= 1;
  const TrendIcon = trendUp ? TrendingUp : TrendingDown;
  const trendColor = trendUp ? 'text-emerald-400' : 'text-rose-400';
  const chartData = (data.daily_series || []).map((d) => ({
    date: d.date.slice(5),     // "MM-DD"
    visits: d.count,
  }));

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
              توقعات الأسبوع
            </span>
          </div>
          <h2 className="text-lg font-black text-white">زيارات متوقعة (7 أيام)</h2>
          <p className="text-[10px] text-dark-500 mt-1 leading-relaxed">
            <b className="text-dark-300">اختار فرع + ساب رقم</b> × {data.weights?.with_phone ?? 80}%
            {' + '}
            <b className="text-dark-300">طلب عنوان بدون رقم</b> × {data.weights?.without_phone ?? 35}%
          </p>
        </div>
        <span className={`text-xs font-bold ${CONFIDENCE_COLOR[data.confidence] || 'text-dark-400'}`}>
          {CONFIDENCE_LABEL[data.confidence] || data.confidence}
        </span>
      </div>

      <div className="flex items-baseline gap-3">
        <div className="text-4xl font-black text-white tabular-nums">
          {data.expected_visits}
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span>×{data.trend}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-dark-400">
          <Activity className="w-3.5 h-3.5" />
          <span>{data.recent_avg_per_day} / يوم</span>
        </div>
      </div>

      {(data.last7_with_phone != null || data.last7_without_phone != null) && (
        <div className="flex gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <Phone className="w-3.5 h-3.5" />
            <span>اختار فرع وساب رقم: <b className="tabular-nums">{data.last7_with_phone || 0}</b></span>
            <span className="text-emerald-500/60">× {data.weights?.with_phone ?? 80}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <PhoneOff className="w-3.5 h-3.5" />
            <span>طلب عنوان بدون رقم: <b className="tabular-nums">{data.last7_without_phone || 0}</b></span>
            <span className="text-amber-500/60">× {data.weights?.without_phone ?? 35}%</span>
          </div>
        </div>
      )}

      <div className="h-40 -mx-2">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#334155" />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <ReferenceLine
              y={data.recent_avg_per_day}
              stroke="#475569"
              strokeDasharray="3 3"
            />
            <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {data.top_branches?.length > 0 && (
        <div className="pt-4 border-t border-dark-800">
          <div className="text-[10px] font-black uppercase tracking-wider text-dark-500 mb-2">
            أعلى الفروع زيارة (آخر 7 أيام)
          </div>
          <div className="flex flex-wrap gap-2">
            {data.top_branches.map((b) => (
              <span
                key={b.branch}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800/60 border border-dark-700 text-xs"
              >
                <span className="text-white font-bold">{formatBranch(b.branch)}</span>
                <span className="text-emerald-400 font-black tabular-nums">{b.visits}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
