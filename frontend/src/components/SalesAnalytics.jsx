/**
 * SalesAnalytics — admin-only. Per-salesperson & per-branch performance
 * with filters (salesperson / branch / date range). Admin only — sales
 * figures are never shown to reception/reps/other sales.
 */
import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Filter, RefreshCw, Building2, UserCheck } from 'lucide-react';
import { fetchSalesAnalytics, fetchSalesReps, formatBranch } from '../services/api';
import useBranches from '../hooks/useBranches';
import RevisitAnalytics from './RevisitAnalytics';

const fmt = (n) => new Intl.NumberFormat('en-US').format(n || 0);

export default function SalesAnalytics() {
  const { branches } = useBranches();
  const [reps, setReps]       = useState([]);
  const [sales, setSales]     = useState('');
  const [branch, setBranch]   = useState('');
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSalesReps().then(setReps).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchSalesAnalytics({ sales, branch, from, to }));
    } catch (_) {
      setData({ bySales: [], byBranch: [] });
    } finally {
      setLoading(false);
    }
  }, [sales, branch, from, to]);

  useEffect(() => { load(); }, []); // initial

  const bySales  = data?.bySales  || [];
  const byBranch = data?.byBranch || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h3 className="text-white font-black text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-400" />
          تحليلات السيلز ومبيعات الفروع
        </h3>
        <p className="text-dark-500 text-xs mt-1">
          أداء كل سيلز: وقف مع كام عميل، كام اشترى، نسبة التقفيل، وإجمالي مبيعاته
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-dark-500 self-center" />
        <div className="space-y-1">
          <label className="text-dark-500 text-[10px] font-black uppercase">السيلز</label>
          <select value={sales} onChange={e => setSales(e.target.value)} className="input-field text-sm py-1.5 min-w-[140px]">
            <option value="">كل السيلز</option>
            {reps.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-dark-500 text-[10px] font-black uppercase">الفرع</label>
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field text-sm py-1.5 min-w-[130px]">
            <option value="">كل الفروع</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-dark-500 text-[10px] font-black uppercase">من</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field text-sm py-1.5" dir="ltr" />
        </div>
        <div className="space-y-1">
          <label className="text-dark-500 text-[10px] font-black uppercase">إلى</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field text-sm py-1.5" dir="ltr" />
        </div>
        <button onClick={load} disabled={loading} className="btn-primary self-end">
          {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><RefreshCw className="w-4 h-4" /> تطبيق</>}
        </button>
      </div>

      {/* Per-salesperson */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-2 border-b border-dark-800">
          <UserCheck className="w-4 h-4 text-primary-400" />
          <h4 className="text-white font-black text-sm">أداء كل سيلز</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                <th className="py-3 px-4">السيلز</th>
                <th className="py-3 px-4">الفرع</th>
                <th className="py-3 px-4 text-center">وقف مع</th>
                <th className="py-3 px-4 text-center">اشترى</th>
                <th className="py-3 px-4 text-center">مشتراش</th>
                <th className="py-3 px-4 text-center">نسبة التقفيل</th>
                <th className="py-3 px-4 text-center">تمت متابعتهم</th>
                <th className="py-3 px-4 text-center">تابع + زار</th>
                <th className="py-3 px-4 text-center">تابع + لسه</th>
                <th className="py-3 px-4 text-center">عدد التعاقدات</th>
              </tr>
            </thead>
            <tbody>
              {bySales.length === 0 ? (
                <tr><td colSpan={10} className="py-10 text-center text-dark-500">لا توجد بيانات</td></tr>
              ) : bySales.map((r, i) => (
                <tr key={`${r.sales_rep}-${r.branch}-${i}`} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                  <td className="py-3 px-4 text-white font-bold">{r.sales_rep}</td>
                  <td className="py-3 px-4 text-dark-400">{formatBranch(r.branch)}</td>
                  <td className="py-3 px-4 text-center text-dark-200 font-bold">{r.served}</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.bought}</td>
                  <td className="py-3 px-4 text-center text-rose-400 font-bold">{r.not_bought}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-black ${r.close_rate >= 30 ? 'text-emerald-400' : r.close_rate >= 10 ? 'text-amber-400' : 'text-dark-500'}`}>
                      {r.close_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-primary-400 font-bold">{r.followed_up || 0}</td>
                  <td className="py-3 px-4 text-center text-emerald-400 font-bold">{r.fu_visited || 0}</td>
                  <td className="py-3 px-4 text-center text-amber-400 font-bold">{r.fu_not_visited || 0}</td>
                  <td className="py-3 px-4 text-center text-primary-400 font-black">{r.contracts || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-branch */}
      <div className="card overflow-hidden">
        <div className="p-4 flex items-center gap-2 border-b border-dark-800">
          <Building2 className="w-4 h-4 text-primary-400" />
          <h4 className="text-white font-black text-sm">مبيعات الفروع</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-dark-800/60 text-dark-400 text-right font-black uppercase tracking-wider">
                <th className="py-3 px-4">الفرع</th>
                <th className="py-3 px-4 text-center">عملاء وقفوا مع سيلز</th>
                <th className="py-3 px-4 text-center">اشتروا</th>
                <th className="py-3 px-4 text-center">نسبة التقفيل</th>
              </tr>
            </thead>
            <tbody>
              {byBranch.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-dark-500">لا توجد بيانات</td></tr>
              ) : byBranch.map((b, i) => {
                const rate = b.served ? Math.round((b.bought / b.served) * 100) : 0;
                return (
                  <tr key={`${b.branch}-${i}`} className="border-t border-dark-800/60 hover:bg-dark-800/20">
                    <td className="py-3 px-4 text-white font-bold">{formatBranch(b.branch)}</td>
                    <td className="py-3 px-4 text-center text-dark-200 font-bold">{b.served}</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">{b.bought}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-black ${rate >= 30 ? 'text-emerald-400' : rate >= 10 ? 'text-amber-400' : 'text-dark-500'}`}>
                        {rate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Re-visit follow-up analytics */}
      <div className="border-t border-dark-800 pt-6">
        <RevisitAnalytics />
      </div>
    </div>
  );
}
