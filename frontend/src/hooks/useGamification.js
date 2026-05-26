import { useMemo, useEffect, useState, useCallback } from 'react';
import useRepList from './useRepList';

// ── XP storage (per rep, daily) ─────────────────────────────────────────────
const XP_PREFIX = 'xp_log_';         // xp_log_{rep} → array of {date, xp}
const STREAK_PREFIX = 'streak_';     // streak_{rep} → {current, last_active_date, best}
const EVENT = 'gamification_changed';

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch (_) {}
}

// ── XP reader ───────────────────────────────────────────────────────────────
function readXpLog(rep) {
  return readJSON(`${XP_PREFIX}${rep}`, []);
}

function readStreak(rep) {
  return readJSON(`${STREAK_PREFIX}${rep}`, {
    current: 0,
    best: 0,
    last_active_date: null,
  });
}

// ── Streak update logic ─────────────────────────────────────────────────────
function updateStreakOnActivity(rep) {
  const today = todayStr();
  const streak = readStreak(rep);
  if (streak.last_active_date === today) return streak;

  // yesterday check
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const newCurrent = streak.last_active_date === yesterday ? streak.current + 1 : 1;
  const newBest = Math.max(newCurrent, streak.best || 0);
  const next = { current: newCurrent, best: newBest, last_active_date: today };
  writeJSON(`${STREAK_PREFIX}${rep}`, next);
  return next;
}

// ── Badges definitions ──────────────────────────────────────────────────────
export const BADGES = [
  {
    id: 'first_call',
    label: 'أول اتصال',
    icon: '🎯',
    description: 'سجّلت أول اتصال النهارده',
    check: ({ todayXp, todayLog }) => todayLog.length >= 1,
  },
  {
    id: 'century',
    label: 'المئة',
    icon: '💯',
    description: 'وصلت لـ 100 XP في يوم واحد',
    check: ({ todayXp }) => todayXp >= 100,
  },
  {
    id: 'sniper',
    label: 'القنّاص',
    icon: '🏹',
    description: '5 عملاء "مهتم" في يوم',
    check: ({ todayLog }) =>
      todayLog.filter((e) => e.outcome === 'interested').length >= 5,
  },
  {
    id: 'hustler',
    label: 'العجلة',
    icon: '⚡',
    description: '10 اتصالات في يوم',
    check: ({ todayLog }) => todayLog.length >= 10,
  },
  {
    id: 'streak_3',
    label: 'ثلاثة أيام',
    icon: '🔥',
    description: 'نشاط متواصل لـ 3 أيام',
    check: ({ streak }) => (streak?.current || 0) >= 3,
  },
  {
    id: 'streak_7',
    label: 'أسبوع كامل',
    icon: '🌟',
    description: 'نشاط متواصل لـ 7 أيام',
    check: ({ streak }) => (streak?.current || 0) >= 7,
  },
  {
    id: 'streak_30',
    label: 'شهر كامل',
    icon: '👑',
    description: 'نشاط متواصل لـ 30 يوم',
    check: ({ streak }) => (streak?.current || 0) >= 30,
  },
];

// ── Level calculation ──────────────────────────────────────────────────────
export function computeLevel(totalXp) {
  // Level formula: level n requires n*100 XP (1→100, 2→200, 3→300...)
  // cumulative: L=k requires k*(k+1)/2 * 100
  // simple: level = floor(sqrt(totalXp / 50))
  const level = Math.max(1, Math.floor(Math.sqrt((totalXp || 0) / 50)));
  const levelStart = (level - 1) * (level - 1) * 50;
  const levelEnd = level * level * 50;
  const progress = Math.min(
    100,
    Math.round(((totalXp - levelStart) / (levelEnd - levelStart)) * 100)
  );
  return { level, progress, levelStart, levelEnd, nextLevelXp: levelEnd };
}

/**
 * useGamification — XP, streak, badges, leaderboard
 * بيقرا الـ log الحالي من useCallSession ويشتق منه stats.
 *
 * @param {string} currentRep
 * @param {Array} todayLog — اليوم من useCallSession
 */
export default function useGamification(currentRep, todayLog = []) {
  const [tick, setTick] = useState(0);
  const { reps } = useRepList();

  useEffect(() => {
    const sync = () => setTick((t) => t + 1);
    window.addEventListener(EVENT, sync);
    window.addEventListener('call_log_changed', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('call_log_changed', sync);
    };
  }, []);

  // ── Record XP إلى الـ log التاريخي عند أي نشاط ───────────────────────────
  useEffect(() => {
    if (!currentRep) return;
    if (!todayLog || todayLog.length === 0) return;

    const today = todayStr();
    const xpToday = todayLog.reduce((s, e) => s + (e.xp || 0), 0);
    const log = readXpLog(currentRep);
    const existingIdx = log.findIndex((e) => e.date === today);
    if (existingIdx >= 0) {
      if (log[existingIdx].xp !== xpToday) {
        log[existingIdx] = { date: today, xp: xpToday };
        writeJSON(`${XP_PREFIX}${currentRep}`, log);
      }
    } else {
      log.push({ date: today, xp: xpToday });
      writeJSON(`${XP_PREFIX}${currentRep}`, log);
    }

    updateStreakOnActivity(currentRep);
  }, [currentRep, todayLog]);

  // ── Derived stats for current rep ─────────────────────────────────────────
  const stats = useMemo(() => {
    const xpLog = readXpLog(currentRep);
    const totalXp = xpLog.reduce((s, e) => s + (e.xp || 0), 0);
    const today = todayStr();
    const todayXp = xpLog.find((e) => e.date === today)?.xp || 0;
    const streak = readStreak(currentRep);
    const level = computeLevel(totalXp);

    // badges earned
    const ctx = { todayXp, todayLog, streak, totalXp };
    const earned = BADGES.filter((b) => b.check(ctx));

    return {
      totalXp,
      todayXp,
      streak,
      level,
      earnedBadges: earned,
      allBadges: BADGES,
    };
  }, [currentRep, tick, todayLog]);

  // ── Leaderboard across all reps ───────────────────────────────────────────
  const leaderboard = useMemo(() => {
    // tick هنا عشان نـ re-calculate لو حد تاني عدّل
    void tick;
    return reps.map((r) => {
      const xpLog = readXpLog(r);
      const totalXp = xpLog.reduce((s, e) => s + (e.xp || 0), 0);
      const today = todayStr();
      const todayXp = xpLog.find((e) => e.date === today)?.xp || 0;
      const streak = readStreak(r);
      return {
        rep: r,
        totalXp,
        todayXp,
        streak: streak.current || 0,
        best: streak.best || 0,
        level: computeLevel(totalXp).level,
      };
    }).sort((a, b) => b.totalXp - a.totalXp);
  }, [tick, currentRep, todayLog, reps]);

  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(`${XP_PREFIX}${currentRep}`);
      window.localStorage.removeItem(`${STREAK_PREFIX}${currentRep}`);
      window.dispatchEvent(new CustomEvent(EVENT));
    } catch (_) {}
  }, [currentRep]);

  return { ...stats, leaderboard, reset };
}
