/**
 * AchievementsLeaderboard — ranked table for sales reps OR branches.
 * Shows composite score, the 3 component rates with progress bars,
 * earned badges, and rank medals for the top 3.
 *
 * Props:
 *   rows: [{ rank, sales_rep|branch, phones_received, followups_done,
 *            visits_done, purchases_done, followup_rate, visit_rate,
 *            close_rate, score, badges: [] }]
 *   entityType: 'sales' | 'branch'
 *   weights: { followup, visit, close }
 *   loading: bool
 */
import { Trophy, Medal, Award, Phone, MapPin, ShoppingBag } from 'lucide-react';

const RANK_STYLES = {
  1: { bg: 'from-amber-500/20 to-amber-700/5',  text: 'text-amber-400',  icon: Trophy, label: 'الأول' },
  2: { bg: 'from-slate-400/20 to-slate-600/5',  text: 'text-slate-300',  icon: Medal,  label: 'الثاني' },
  3: { bg: 'from-orange-700/20 to-orange-900/5', text: 'text-orange-400', icon: Award,  label: 'الثالث' },
};

const Bar = ({ value, color = 'primary' }) => {
  const colorMap = {
    primary: 'bg-accent',
    emerald: 'bg-emerald-500',
    amber:   'bg-amber-500',
  };
  return (
    <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden w-20">
      <div
        className={`h-full ${colorMap[color] || colorMap.primary} transition-all`}
        style={{ width: `${Math.min(100, value || 0)}%` }}
      />
    </div>
  );
};

const AchievementsLeaderboard = ({ rows = [], entityType = 'sales', weights, loading }) => {
  if (loading) {
    return (
      <div className="card p-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="card p-12 text-center">
        <Trophy className="w-10 h-10 text-muted mx-auto mb-3" />
        <p className="text-muted font-bold">لسه مفيش بيانات إنجازات</p>
        <p className="text-muted text-xs mt-1">
          محتاج عملاء متابعتهم اتسجّلت + زيارات + مبيعات عشان النظام يحسب
        </p>
      </div>
    );
  }

  const isSales = entityType === 'sales';
  return (
    <div className="card overflow-hidden">
      {weights && (
        <div className="px-4 py-2.5 border-b border-border text-[11px] text-muted flex items-center gap-3 flex-wrap">
          <span className="font-bold text-foreground">معادلة النقاط:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" />
            متابعة <b className="text-accent">{weights.followup}%</b>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            زيارة <b className="text-emerald-400">{weights.visit}%</b>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            تقفيل <b className="text-amber-400">{weights.close}%</b>
          </span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="bg-surface-secondary/60 text-muted text-right font-black uppercase tracking-wider">
              <th className="py-3 px-3 w-14 text-center">الترتيب</th>
              <th className="py-3 px-3">{isSales ? 'السيلز' : 'الفرع'}</th>
              {isSales && <th className="py-3 px-3 text-muted">الفرع</th>}
              <th className="py-3 px-3 text-center" title="عملاء سابوا تليفون">سابوا رقم</th>
              <th className="py-3 px-3 text-center">متابعات</th>
              <th className="py-3 px-3 text-center">زيارات</th>
              <th className="py-3 px-3 text-center">تقفيلات</th>
              <th className="py-3 px-3">% المتابعة</th>
              <th className="py-3 px-3">% الزيارة</th>
              <th className="py-3 px-3">% التقفيل</th>
              <th className="py-3 px-3 text-center bg-accent/5">النقاط</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = isSales ? r.sales_rep : r.branch;
              const rankStyle = RANK_STYLES[r.rank];
              const RankIcon  = rankStyle?.icon;
              return (
                <tr
                  key={`${id}-${r.branch || ''}`}
                  className={`border-t border-border/60 hover:bg-surface-secondary/20 transition-colors ${
                    rankStyle ? `bg-gradient-to-l ${rankStyle.bg}` : ''
                  }`}
                >
                  <td className="py-3 px-3 text-center">
                    {rankStyle ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <RankIcon className={`w-4 h-4 ${rankStyle.text}`} />
                        <span className={`text-[10px] font-black ${rankStyle.text}`}>#{r.rank}</span>
                      </div>
                    ) : (
                      <span className="text-muted font-bold">#{r.rank}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-foreground font-black">{id}</td>
                  {isSales && <td className="py-3 px-3 text-muted">{r.branch || '—'}</td>}
                  <td className="py-3 px-3 text-center text-foreground font-bold">{r.phones_received}</td>
                  <td className="py-3 px-3 text-center text-accent font-bold">{r.followups_done}</td>
                  <td className="py-3 px-3 text-center text-emerald-400 font-bold">{r.visits_done}</td>
                  <td className="py-3 px-3 text-center text-amber-400 font-bold">{r.purchases_done}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Bar value={r.followup_rate} color="primary" />
                      <span className="text-accent font-black text-[11px] w-9">{r.followup_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Bar value={r.visit_rate} color="emerald" />
                      <span className="text-emerald-400 font-black text-[11px] w-9">{r.visit_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <Bar value={r.close_rate} color="amber" />
                      <span className="text-amber-400 font-black text-[11px] w-9">{r.close_rate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center bg-accent/5">
                    <span className={`px-2.5 py-1 rounded-lg font-black text-sm ${
                      r.score >= 60 ? 'bg-emerald-500/15 text-emerald-300' :
                      r.score >= 30 ? 'bg-amber-500/15 text-amber-300' :
                      'bg-surface-secondary text-muted'
                    }`}>
                      {r.score}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 border-t border-border text-[11px] text-muted leading-relaxed">
        <Phone className="w-3 h-3 inline ml-1" />
        <b>سابوا رقم</b> = عميل اتسند للسيلز وساب تليفون لما اتواصل معاه ManyChat.
        <span className="mx-2">•</span>
        <b>% المتابعة</b> = متابعات ÷ سابوا رقم.
        <span className="mx-2">•</span>
        <MapPin className="w-3 h-3 inline ml-1" />
        <b>% الزيارة</b> = زيارات ÷ متابعات.
        <span className="mx-2">•</span>
        <ShoppingBag className="w-3 h-3 inline ml-1" />
        <b>% التقفيل</b> = تقفيلات ÷ زيارات.
      </div>
    </div>
  );
};

export default AchievementsLeaderboard;
