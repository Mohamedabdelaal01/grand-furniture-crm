import { useMemo } from 'react';
import { Megaphone, TrendingUp, ShoppingBag, Users, Eye } from 'lucide-react';

/**
 * CampaignPerformance — shows O2O attribution broken down by campaign_source.
 * Columns: Total Leads | Visits | Purchases | Visit Rate | Purchase Rate
 *
 * Props:
 *   data — campaign_performance array from GET /api/dashboard
 *          [{ campaign_source, total_leads, total_visits, total_purchases, purchase_rate }]
 */
export default function CampaignPerformance({ data }) {
  const rows = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => b.total_leads - a.total_leads);
  }, [data]);

  const totals = useMemo(() => ({
    leads:     rows.reduce((s, r) => s + (r.total_leads     || 0), 0),
    visits:    rows.reduce((s, r) => s + (r.total_visits    || 0), 0),
    purchases: rows.reduce((s, r) => s + (r.total_purchases || 0), 0),
  }), [rows]);

  const overallVisitRate    = totals.leads    ? ((totals.visits    / totals.leads)    * 100).toFixed(1) : '—';
  const overallPurchaseRate = totals.leads    ? ((totals.purchases / totals.leads)    * 100).toFixed(1) : '—';

  if (!rows.length) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Megaphone className="w-10 h-10 text-dark-600" />
        <p className="text-dark-400 font-bold text-sm">لا توجد بيانات حملات بعد</p>
        <p className="text-dark-600 text-xs text-center max-w-xs">
          ستظهر البيانات عندما يُضاف campaign_source في بيانات الـ webhook من ManyChat
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-dark-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-1 bg-primary-600 rounded-full" />
              <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
                أداء الحملات
              </span>
            </div>
            <h2 className="text-lg font-black text-white">نسب التحويل حسب الحملة</h2>
            <p className="text-dark-500 text-xs mt-0.5">
              من تفاعل المسنجر → زيارة المعرض → شراء فعلي
            </p>
          </div>

          {/* Totals bar */}
          <div className="hidden sm:flex items-center gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-white tabular-nums">{totals.leads.toLocaleString()}</p>
              <p className="text-dark-500 text-[10px] font-bold">إجمالي</p>
            </div>
            <div className="w-px h-8 bg-dark-800" />
            <div>
              <p className="text-2xl font-black text-sky-400 tabular-nums">{totals.visits.toLocaleString()}</p>
              <p className="text-dark-500 text-[10px] font-bold">زيارات</p>
            </div>
            <div className="w-px h-8 bg-dark-800" />
            <div>
              <p className="text-2xl font-black text-violet-400 tabular-nums">{totals.purchases.toLocaleString()}</p>
              <p className="text-dark-500 text-[10px] font-bold">مشتريات</p>
            </div>
          </div>
        </div>

        {/* Overall conversion pills */}
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
            <Eye className="w-3 h-3" />
            {overallVisitRate}% معدل الزيارة الكلي
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold">
            <ShoppingBag className="w-3 h-3" />
            {overallPurchaseRate}% معدل الشراء الكلي
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-500 border-b border-dark-800 text-right text-[11px] uppercase font-black tracking-wider">
              <th className="py-3 px-6">الحملة</th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <Users className="w-3 h-3" />
                  إجمالي
                </span>
              </th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3 text-sky-400" />
                  زيارات
                </span>
              </th>
              <th className="py-3 px-4 text-center">معدل الزيارة</th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <ShoppingBag className="w-3 h-3 text-violet-400" />
                  مشتريات
                </span>
              </th>
              <th className="py-3 px-4 text-center">
                <span className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  معدل الشراء
                </span>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => {
              const visitRate    = row.total_leads ? ((row.total_visits    / row.total_leads) * 100).toFixed(1) : 0;
              const purchaseRate = row.total_leads ? ((row.total_purchases / row.total_leads) * 100).toFixed(1) : 0;
              const barWidth     = totals.leads ? Math.round((row.total_leads / totals.leads) * 100) : 0;

              return (
                <tr
                  key={row.campaign_source}
                  className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-4 h-4 text-primary-400" />
                      </div>
                      <div>
                        <p className="text-white font-bold">{row.campaign_source}</p>
                        {/* Mini progress bar showing share of total leads */}
                        <div className="w-24 h-1 bg-dark-800 rounded-full mt-1">
                          <div
                            className="h-1 bg-primary-500/60 rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <span className="text-white font-bold tabular-nums">
                      {row.total_leads.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <span className="text-sky-400 font-bold tabular-nums">
                      {row.total_visits}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <RatePill value={visitRate} color="sky" />
                  </td>

                  <td className="py-4 px-4 text-center">
                    <span className="text-violet-400 font-bold tabular-nums">
                      {row.total_purchases}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-center">
                    <RatePill value={purchaseRate} color="violet" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Rate Pill helper ───────────────────────────────────────────────────────
function RatePill({ value, color }) {
  const n = parseFloat(value) || 0;
  const colorMap = {
    sky:    { bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    text: 'text-sky-400'    },
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
  };
  const c = colorMap[color] || colorMap.sky;
  if (n === 0) {
    return <span className="text-dark-600 font-bold text-xs">—</span>;
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black tabular-nums ${c.bg} border ${c.border} ${c.text}`}>
      {value}%
    </span>
  );
}
