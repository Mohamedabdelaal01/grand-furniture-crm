import { Award, Flame, Trophy, Zap, Lock } from 'lucide-react';

const BadgeCard = ({ badge, earned }) => (
  <div
    className={`p-4 rounded-xl border text-center transition-all ${
      earned
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-surface-secondary/40 border-border opacity-50'
    }`}
    title={badge.description}
  >
    <div className="text-3xl mb-2">{earned ? badge.icon : <Lock className="w-6 h-6 mx-auto text-muted" />}</div>
    <p className={`text-xs font-black ${earned ? 'text-amber-400' : 'text-muted'}`}>
      {badge.label}
    </p>
    <p className="text-[10px] text-muted mt-1 leading-tight">{badge.description}</p>
  </div>
);

const LeaderboardRow = ({ entry, rank, isCurrentRep }) => {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
        isCurrentRep
          ? 'bg-accent/10 border-accent/30'
          : 'bg-surface-secondary/40 border-border/50'
      }`}
    >
      <div className="w-8 text-center font-black text-lg">
        {rank < 3 ? medals[rank] : <span className="text-muted">{rank + 1}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-black text-sm truncate ${isCurrentRep ? 'text-accent' : 'text-foreground'}`}>
          {entry.rep}
          {isCurrentRep && <span className="text-[10px] mr-2 text-accent">(أنت)</span>}
        </p>
        <p className="text-muted text-[11px]">
          Level {entry.level} • {entry.streak > 0 && `🔥 ${entry.streak} أيام`}
        </p>
      </div>
      <div className="text-left">
        <p className="text-accent font-black text-sm">{entry.totalXp} XP</p>
        <p className="text-muted text-[11px]">اليوم: {entry.todayXp}</p>
      </div>
    </div>
  );
};

const GamificationPanel = ({ gamification, currentRep }) => {
  if (!gamification) return null;
  const { totalXp, todayXp, streak, level, earnedBadges, allBadges, leaderboard } = gamification;
  const earnedIds = new Set(earnedBadges.map((b) => b.id));

  return (
    <div className="space-y-5">
      {/* ── Level + XP ────────────────────────────────── */}
      <div className="card p-6 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 border border-accent/40 flex items-center justify-center">
              <Award className="w-8 h-8 text-accent" />
            </div>
            <div>
              <p className="text-muted text-[11px] font-black uppercase tracking-wider">
                المستوى
              </p>
              <p className="text-3xl font-black text-foreground">Level {level.level}</p>
              <p className="text-muted text-xs mt-0.5">{currentRep}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-muted text-[10px] uppercase tracking-wider">اليوم</p>
              <p className="text-2xl font-black text-emerald-400">{todayXp}</p>
            </div>
            <div className="w-px h-10 bg-surface-tertiary" />
            <div className="text-center">
              <p className="text-muted text-[10px] uppercase tracking-wider">إجمالي</p>
              <p className="text-2xl font-black text-accent">{totalXp}</p>
            </div>
            <div className="w-px h-10 bg-surface-tertiary" />
            <div className="text-center">
              <p className="text-muted text-[10px] uppercase tracking-wider flex items-center gap-1 justify-center">
                <Flame className="w-3 h-3" />
                Streak
              </p>
              <p className="text-2xl font-black text-rose-400">{streak.current}</p>
            </div>
          </div>
        </div>

        {/* Progress to next level */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted font-bold">
              تقدم للمستوى {level.level + 1}
            </span>
            <span className="text-accent font-black">
              {totalXp} / {level.nextLevelXp} XP
            </span>
          </div>
          <div className="h-2.5 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent to-accent transition-all"
              style={{ width: `${level.progress}%` }}
            />
          </div>
        </div>

        {streak.best > 0 && (
          <p className="text-muted text-[11px] mt-3 text-center">
            أفضل streak ليك: <span className="text-amber-400 font-black">{streak.best} يوم</span>
          </p>
        )}
      </div>

      {/* ── Leaderboard ──────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h3 className="text-foreground font-black">ترتيب المندوبين</h3>
        </div>
        <div className="space-y-2">
          {leaderboard.map((entry, i) => (
            <LeaderboardRow
              key={entry.rep}
              entry={entry}
              rank={i}
              isCurrentRep={entry.rep === currentRep}
            />
          ))}
        </div>
      </div>

      {/* ── Badges ───────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-foreground font-black">الشارات</h3>
          </div>
          <span className="text-muted text-xs font-bold">
            {earnedBadges.length} / {allBadges.length}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {allBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} earned={earnedIds.has(badge.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GamificationPanel;
