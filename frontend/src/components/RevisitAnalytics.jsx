/**
 * RevisitAnalytics — funnel analytics for customers who VISITED but didn't buy:
 * how many are still being followed up, how many converted, how many were
 * closed, and re-follow-up activity. Scoped server-side by role
 * (admin = all branches, branch_manager = own branch, sales = own customers).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, ShoppingBag, PhoneCall, XCircle, RefreshCw, TrendingUp, Repeat,
} from 'lucide-react';
import { fetchRevisitAnalytics, formatBranch } from '../services/api';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

const StatTile = ({ icon: Icon, label, value, hint, tone = 'primary' }) => {
  const tones = {
    primary: 'text-primary-400 bg-primary-500/10 border-primary-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose:    'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-dark-300 text-[11px] font-bold">{label}</span>
      </div>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      {hint && <p className="text-dark-500 text-[10px] mt-1.5">{hint}</p>}
    </div>
  );
};

export default function RevisitAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchRevisitAnalytics());
    } catch {
      setData({ summary: {}, byBranch: [], bySales: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s        = data?.summary  || {};
  const byBranch = data?.byBranch || [];
  const bySales  = data?.bySales  || [];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-black text-lg flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary-400" />
            تحليلات متابعة الزيارات
          </h3>
          <p className="text-dark-500 text-xs mt-1">
            العملاء اللي زاروا المعرض — مين اشترى، مين لسه بيتتابع، ومين اتقفل
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatTile icon={MapPin}     label="زاروا المعرض"   value={fmt(s.visited_total)} tone="primary" />
            <StatTile icon={ShoppingBag} label="زاروا واشتروا" value={fmt(s.bought)}
              hint={`نسبة التحويل ${s.conversion_rate || 0}%`} tone="emerald" />
            <StatTile icon={PhoneCall}  label="محتاجين متابعة" value={fmt(s.pending)} tone="amber" />
            <StatTile icon={XCircle}    label="اتقفلوا"        value={fmt(s.lost)} tone="rose" />
            <StatTile icon={PhoneCall}  label="مكالمات متابعة" value={fmt(s.followups_total)}
              hint={`${fmt(s.customers_followed)} عميل اتتابع`} tone="primary" />
            <StatTile icon={TrendingUp} label="متوسط المتابعات" value={s.avg_followups || 0}
              hint="لكل عميل اتتابع" tone="primary" />
          </div>

          {/* Per-branch */}
          <div className="card overflow-hidden">
            <div className="p-4 flex items-center gap-2 border-b border-dark-800">
              <MapPin className="w-4 h-4 text-primary-400" />
              <h4 className="text-white font-black text-sm">متابعة الزيارات حسب الفرع</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                    <th className="py-3 px-4">الفرع</th>
                    <th className="py-3 px-4 text-center">محتاجين متابعة</th>
                    <th className="py-3 px-4 text-center">اشتروا</th>
                    <th className="py-3 px-4 text-center">اتقفلوا</th>
                    <th className="py-3 px-4 text-center">مكالمات متابعة</th>
                    <th className="py-3 px-4 text-center">نسبة التحويل</th>
                  </tr>
                </thead>
                <tbody>
                  {byBranch.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-dark-500">لا توجد بيانات</td></tr>
                  ) : byBranch.map((b, i) => (
                    <tr key={`${b.branch}-${i}`} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                      <td className="py-3 px-4 text-white font-bold">{formatBranch(b.branch)}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-bold">{b.pending}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">{b.bought}</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">{b.lost}</td>
                      <td className="py-3 px-4 text-center text-primary-400 font-bold">{b.followups}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-black ${b.conversion >= 30 ? 'text-emerald-400' : b.conversion >= 10 ? 'text-amber-400' : 'text-dark-500'}`}>
                          {b.conversion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-salesperson */}
          <div className="card overflow-hidden">
            <div className="p-4 flex items-center gap-2 border-b border-dark-800">
              <ShoppingBag className="w-4 h-4 text-primary-400" />
              <h4 className="text-white font-black text-sm">متابعة الزيارات حسب السيلز</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                    <th className="py-3 px-4">السيلز</th>
                    <th className="py-3 px-4">الفرع</th>
                    <th className="py-3 px-4 text-center">محتاجين متابعة</th>
                    <th className="py-3 px-4 text-center">اشتروا</th>
                    <th className="py-3 px-4 text-center">اتقفلوا</th>
                    <th className="py-3 px-4 text-center">مكالمات متابعة</th>
                    <th className="py-3 px-4 text-center">نسبة التحويل</th>
                  </tr>
                </thead>
                <tbody>
                  {bySales.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-dark-500">لا توجد بيانات</td></tr>
                  ) : bySales.map((r, i) => (
                    <tr key={`${r.sales_rep}-${r.branch}-${i}`} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                      <td className="py-3 px-4 text-white font-bold">{r.sales_rep}</td>
                      <td className="py-3 px-4 text-dark-400">{formatBranch(r.branch)}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-bold">{r.pending}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.bought}</td>
                      <td className="py-3 px-4 text-center text-rose-400 font-bold">{r.lost}</td>
                      <td className="py-3 px-4 text-center text-primary-400 font-bold">{r.followups}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-black ${r.conversion >= 30 ? 'text-emerald-400' : r.conversion >= 10 ? 'text-amber-400' : 'text-dark-500'}`}>
                          {r.conversion}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
