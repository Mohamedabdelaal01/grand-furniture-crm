import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Package, AlertTriangle } from 'lucide-react';

// Red-flag threshold: product has at least this many online views but zero purchases
const RED_FLAG_MIN_VIEWS = 5;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const views     = payload.find((p) => p.dataKey === 'views')?.value ?? 0;
  const purchases = payload.find((p) => p.dataKey === 'purchases')?.value ?? 0;
  const isRedFlag = views >= RED_FLAG_MIN_VIEWS && purchases === 0;
  return (
    <div className="card p-3 shadow-premium min-w-[160px] space-y-1.5">
      <p className="text-dark-300 text-sm font-bold mb-1">{label}</p>
      <p className="text-primary-400 text-sm font-black">
        {views.toLocaleString()}
        <span className="text-dark-400 text-xs font-bold mr-1">مشاهدة</span>
      </p>
      <p className="text-violet-400 text-sm font-black">
        {purchases.toLocaleString()}
        <span className="text-dark-400 text-xs font-bold mr-1">شراء</span>
      </p>
      {isRedFlag && (
        <p className="text-rose-400 text-[11px] font-bold flex items-center gap-1 pt-1 border-t border-dark-800">
          <AlertTriangle className="w-3 h-3" />
          مشاهدات عالية بدون مبيعات
        </p>
      )}
    </div>
  );
};

const RedFlagBadge = () => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
    <AlertTriangle className="w-3 h-3" />
    فجوة
  </span>
);

/**
 * ProductsChart — dual-bar: online views vs offline purchases.
 * Props:
 *   data     — top_products array: [{ product_id, views }]
 *   gapData  — product_gap array:  [{ product_id, views, purchases }]
 *
 * Falls back gracefully when gapData is not yet available (old dashboard payload).
 */
const ProductsChart = ({ data, gapData }) => {
  const chartData = useMemo(() => {
    // Prefer gapData if available (richer — has purchases too)
    const source = gapData?.length ? gapData : (data || []).map((d) => ({ ...d, purchases: 0 }));
    return source.map((item) => ({
      name:      (item.product_id || 'غير محدد').replace(/_/g, ' '),
      views:     item.views || 0,
      purchases: item.purchases || 0,
      redFlag:   (item.views || 0) >= RED_FLAG_MIN_VIEWS && (item.purchases || 0) === 0,
    }));
  }, [data, gapData]);

  const redFlagCount = chartData.filter((d) => d.redFlag).length;

  if (!chartData.length) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center min-h-[320px] gap-3">
        <Package className="w-10 h-10 text-dark-600" />
        <p className="text-dark-400 font-bold text-sm">لا توجد بيانات منتجات بعد</p>
        <p className="text-dark-600 text-xs">ستظهر البيانات عند وصول أول حدث product_details</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-dark-50">أداء المنتجات</h3>
          <p className="text-dark-500 text-xs mt-0.5">مشاهدات أونلاين مقابل مشتريات فعلية</p>
        </div>
        {redFlagCount > 0 && (
          <div className="flex items-center gap-1.5 bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-rose-400 text-xs font-bold">{redFlagCount} منتج فجوة</span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={70}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
            formatter={(value) => value === 'views' ? 'مشاهدات' : 'مشتريات'}
          />
          <Bar dataKey="views"     name="views"     fill="#0ea5e9" radius={[6, 6, 0, 0]} />
          <Bar dataKey="purchases" name="purchases" fill="#a78bfa" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Red flag list */}
      {redFlagCount > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-dark-500 mb-2">
            منتجات تحتاج مراجعة — مشاهدات عالية بدون مبيعات
          </p>
          <div className="flex flex-wrap gap-2">
            {chartData.filter((d) => d.redFlag).map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs"
              >
                <span className="text-white font-bold">{d.name}</span>
                <span className="text-primary-400 font-black tabular-nums">{d.views}</span>
                <RedFlagBadge />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsChart;
