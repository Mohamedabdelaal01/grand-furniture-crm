/**
 * BadgeShelf — displays earned achievement badges for a specific entity.
 * Each badge: emoji/icon + label + earned date + score snapshot.
 */
import { Award } from 'lucide-react';

const BadgeShelf = ({ badges = [], compact = false }) => {
  if (!badges.length) {
    return compact ? null : (
      <p className="text-muted text-[11px]">لسه مفيش إنجازات مكتسبة</p>
    );
  }
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-2'}`}>
      {badges.map((b) => (
        <div
          key={b.badge_code}
          title={`${b.badge_label} • ${new Date(b.earned_at).toLocaleDateString('ar-EG')}${b.score != null ? ` • ${Math.round(b.score)} نقطة` : ''}`}
          className="flex items-center gap-1.5 bg-gradient-to-l from-amber-500/15 to-amber-500/5 border border-amber-500/25 rounded-full px-2.5 py-1 text-[11px] font-black text-amber-300"
        >
          <Award className="w-3 h-3" />
          <span>{b.badge_label}</span>
        </div>
      ))}
    </div>
  );
};

export default BadgeShelf;
