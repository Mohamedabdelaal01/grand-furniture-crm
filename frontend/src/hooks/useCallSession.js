import { useState, useCallback, useEffect } from 'react';

// ── Persistence ──────────────────────────────────────────────────────────────
const STORAGE_PREFIX = 'call_log_'; // key = call_log_{YYYY-MM-DD}_{rep}

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function storageKey(rep) {
  return `${STORAGE_PREFIX}${todayStr()}_${rep || 'default'}`;
}

function readLog(rep) {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(storageKey(rep));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLog(rep, entries) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(rep), JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('call_log_changed'));
  } catch (_) {}
}

// ── Outcomes ─────────────────────────────────────────────────────────────────
export const CALL_OUTCOMES = {
  CALLED: 'called',
  NO_ANSWER: 'no_answer',
  INTERESTED: 'interested',
  NOT_INTERESTED: 'not_interested',
  RESCHEDULE: 'reschedule',
};

export const OUTCOME_META = {
  [CALL_OUTCOMES.CALLED]: {
    label: 'اتصلت',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
    xp: 10,
  },
  [CALL_OUTCOMES.INTERESTED]: {
    label: 'مهتم',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    xp: 30,
  },
  [CALL_OUTCOMES.NOT_INTERESTED]: {
    label: 'غير مهتم',
    color: 'text-dark-400',
    bg: 'bg-dark-800',
    border: 'border-dark-700',
    xp: 5,
  },
  [CALL_OUTCOMES.NO_ANSWER]: {
    label: 'لم يرد',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    xp: 5,
  },
  [CALL_OUTCOMES.RESCHEDULE]: {
    label: 'تأجيل',
    color: 'text-dark-300',
    bg: 'bg-dark-800',
    border: 'border-dark-700',
    xp: 0,
  },
};

/**
 * useCallSession — إدارة جلسة اتصال + log يومي
 *
 * @param {string} rep — المندوب الحالي
 * @returns {{
 *   log, active, startSession, endSession, recordOutcome,
 *   getOutcomeForLead, totalXp, summary
 * }}
 */
export default function useCallSession(rep) {
  const [log, setLog] = useState(() => readLog(rep));
  const [active, setActive] = useState(false);

  // sync لو تغير المندوب أو الـ storage
  useEffect(() => {
    setLog(readLog(rep));
    const sync = () => setLog(readLog(rep));
    window.addEventListener('call_log_changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('call_log_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [rep]);

  const startSession = useCallback(() => setActive(true), []);
  const endSession = useCallback(() => setActive(false), []);

  const recordOutcome = useCallback(
    (userId, outcome, lead) => {
      if (!userId || !OUTCOME_META[outcome]) return;
      const xp = OUTCOME_META[outcome].xp;
      const entry = {
        id: `${Date.now()}-${userId}`,
        user_id: userId,
        first_name: lead?.first_name || '',
        outcome,
        xp,
        timestamp: Date.now(),
      };
      const next = [entry, ...readLog(rep)];
      writeLog(rep, next);
      setLog(next);
    },
    [rep]
  );

  const getOutcomeForLead = useCallback(
    (userId) => log.find((l) => l.user_id === userId)?.outcome || null,
    [log]
  );

  const totalXp = log.reduce((sum, e) => sum + (e.xp || 0), 0);

  const summary = {
    total: log.length,
    called: log.filter((l) => l.outcome === CALL_OUTCOMES.CALLED).length,
    interested: log.filter((l) => l.outcome === CALL_OUTCOMES.INTERESTED).length,
    not_interested: log.filter((l) => l.outcome === CALL_OUTCOMES.NOT_INTERESTED).length,
    no_answer: log.filter((l) => l.outcome === CALL_OUTCOMES.NO_ANSWER).length,
    reschedule: log.filter((l) => l.outcome === CALL_OUTCOMES.RESCHEDULE).length,
    xp: totalXp,
  };

  return {
    log,
    active,
    startSession,
    endSession,
    recordOutcome,
    getOutcomeForLead,
    totalXp,
    summary,
  };
}
