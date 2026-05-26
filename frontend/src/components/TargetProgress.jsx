/**
 * TargetProgress — a motivational progress bar comparing actual sales against
 * a set target. Used on the admin / branch-manager / sales-rep dashboards.
 */
const fmt = (n) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));

/** Current month as an Arabic label, e.g. "مايو 2026". */
export const arabicMonthLabel = (d = new Date()) =>
  new Intl.DateTimeFormat('ar-EG-u-nu-latn', { month: 'long', year: 'numeric' }).format(d);

export default function TargetProgress({ target = 0, percent = 0, label }) {
  const effectiveLabel = label || `مستهدف شهر ${arabicMonthLabel()}`;
  if (!target || target <= 0) {
    return (
      <p className="text-dark-500 text-[11px] mt-3 font-bold">— لم يتم تحديد مستهدف بعد —</p>
    );
  }

  const pct = Math.max(0, Math.round(percent || 0));
  const bar = pct >= 100 ? 'from-emerald-500 to-emerald-400'
    : pct >= 60          ? 'from-primary-500 to-primary-400'
    : pct >= 30          ? 'from-amber-500 to-amber-400'
    :                      'from-rose-500 to-rose-400';

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold gap-2">
        <span className="text-dark-400">{effectiveLabel}: {fmt(target)} ج.م</span>
        <span className={pct >= 100 ? 'text-emerald-400' : 'text-white'}>
          تم تحقيق: {pct}%
        </span>
      </div>
      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${bar} transition-all duration-700`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
