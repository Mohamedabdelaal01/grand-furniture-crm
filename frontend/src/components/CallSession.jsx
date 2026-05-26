import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Phone, PhoneOff, Heart, ThumbsDown, Clock3, ChevronLeft, ChevronRight,
  Award, Flame, Target, CheckCheck, Trophy,
} from 'lucide-react';
import { formatBranch, formatLeadClass, getLeadBadgeClass, createTask } from '../services/api';
import { buildRankedQueue } from '../utils/leadIntelligence';
import { CALL_OUTCOMES, OUTCOME_META } from '../hooks/useCallSession';

function plusDaysStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
import BehaviorBadge from './BehaviorBadge';
import generateLeadExplanation from '../utils/leadExplanation';

// ── Action button ───────────────────────────────────────────────────────────
const ActionButton = ({ outcome, icon: Icon, onClick, disabled }) => {
  const meta = OUTCOME_META[outcome];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${meta.bg} ${meta.border} ${meta.color} hover:brightness-125`}
    >
      <Icon className="w-4 h-4" />
      <span>{meta.label}</span>
      <span className="text-[10px] opacity-70">+{meta.xp} XP</span>
    </button>
  );
};

// ── Stat card في الـ summary ────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div className="bg-dark-900/60 border border-dark-800 rounded-xl p-4 text-center">
    <p className="text-dark-500 text-[11px] font-bold uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-2xl font-black ${color || 'text-white'}`}>{value}</p>
  </div>
);

const CallSession = ({
  leads,
  assignments,
  currentRep,
  session,           // useCallSession return
  onClose,
  onlyAssignedToMe = true,
}) => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  // Reschedule → create a follow-up task
  const [reschedule, setReschedule] = useState(null); // { due, note } | null
  const [savingTask, setSavingTask] = useState(false);

  // ── Queue ─────────────────────────────────────────────────────────────────
  const queue = useMemo(() => {
    let filtered = leads || [];
    if (onlyAssignedToMe && currentRep) {
      filtered = filtered.filter(
        (l) =>
          !assignments[l.user_id] || assignments[l.user_id] === currentRep
      );
    }
    return buildRankedQueue(filtered, 30);
  }, [leads, assignments, currentRep, onlyAssignedToMe]);

  // ── Active lead ───────────────────────────────────────────────────────────
  const lead = queue[idx];

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goNext();
      if (e.key === 'ArrowRight') goPrev();
      if (!lead) return;
      if (e.key === '1') handleOutcome(CALL_OUTCOMES.CALLED);
      if (e.key === '2') handleOutcome(CALL_OUTCOMES.INTERESTED);
      if (e.key === '3') handleOutcome(CALL_OUTCOMES.NOT_INTERESTED);
      if (e.key === '4') handleOutcome(CALL_OUTCOMES.NO_ANSWER);
      if (e.key === '5') handleOutcome(CALL_OUTCOMES.RESCHEDULE);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead, idx, queue.length]);

  if (!queue || queue.length === 0) {
    return (
      <div className="fixed inset-0 z-[200] bg-dark-950/95 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-dark-800 border border-dark-700 flex items-center justify-center mx-auto mb-6">
            <Phone className="w-9 h-9 text-dark-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">لا توجد عملاء لنداء</h2>
          <p className="text-dark-400 mb-8">
            {onlyAssignedToMe
              ? 'مفيش leads متعينين ليك أو متاحين دلوقتي'
              : 'مفيش عملاء في الطابور حالياً'}
          </p>
          <button onClick={onClose} className="btn-primary">
            العودة للوحة
          </button>
        </div>
      </div>
    );
  }

  function goNext() {
    if (idx >= queue.length - 1) {
      setShowSummary(true);
    } else {
      setIdx((i) => i + 1);
    }
  }

  function goPrev() {
    setIdx((i) => Math.max(0, i - 1));
  }

  function handleOutcome(outcome) {
    if (!lead) return;
    // "اتصل لاحقاً" → open the reminder prompt instead of advancing
    if (outcome === CALL_OUTCOMES.RESCHEDULE) {
      session.recordOutcome(lead.user_id, outcome, lead);
      setReschedule({ due: plusDaysStr(2), note: '' });
      return;
    }
    session.recordOutcome(lead.user_id, outcome, lead);
    setTimeout(goNext, 150);
  }

  async function saveReschedule() {
    if (!lead || !reschedule?.due) return;
    setSavingTask(true);
    try {
      await createTask({
        lead_id: lead.user_id,
        due_at:  reschedule.due,
        note:    reschedule.note || 'متابعة بعد المكالمة',
        source:  'reschedule',
      });
    } catch (_) { /* non-blocking — outcome already recorded */ }
    setSavingTask(false);
    setReschedule(null);
    setTimeout(goNext, 100);
  }

  function skipReschedule() {
    setReschedule(null);
    setTimeout(goNext, 100);
  }

  function handleViewProfile() {
    onClose();
    navigate(`/leads/${lead.user_id}`);
  }

  // ── Summary screen ────────────────────────────────────────────────────────
  if (showSummary) {
    const s = session.summary;
    return (
      <div className="fixed inset-0 z-[200] bg-dark-950/95 backdrop-blur-xl overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">جلسة ناجحة!</h2>
              <p className="text-dark-400">ملخص نشاطك في الجلسة</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              <StatCard label="إجمالي" value={s.total} />
              <StatCard label="مهتم" value={s.interested} color="text-emerald-400" />
              <StatCard label="لم يرد" value={s.no_answer} color="text-amber-400" />
              <StatCard label="غير مهتم" value={s.not_interested} color="text-dark-300" />
              <StatCard label="تأجيل" value={s.reschedule} color="text-dark-300" />
              <StatCard label="XP اليوم" value={s.xp} color="text-primary-400" />
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-primary flex-1 py-3">
                الرجوع للوحة
              </button>
              <button
                onClick={() => {
                  setShowSummary(false);
                  setIdx(0);
                }}
                className="btn-secondary py-3"
              >
                جلسة جديدة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main call UI ──────────────────────────────────────────────────────────
  const currentOutcome = session.getOutcomeForLead(lead.user_id);
  const progressPct = Math.round(((idx + 1) / queue.length) * 100);
  const explanation = generateLeadExplanation(lead);

  return (
    <div className="fixed inset-0 z-[200] bg-dark-950/95 backdrop-blur-xl overflow-y-auto">
      <div className="min-h-screen flex flex-col p-4 sm:p-6">

        {/* ── Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors px-3 py-2"
          >
            <X className="w-5 h-5" />
            <span className="text-sm font-bold hidden sm:inline">إنهاء الجلسة</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-primary-500/10 border border-primary-500/30 rounded-xl px-3 py-1.5">
              <Award className="w-4 h-4 text-primary-400" />
              <span className="text-primary-400 font-black text-sm">
                {session.totalXp} XP
              </span>
            </div>
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-1.5">
              <CheckCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-black text-sm">{session.summary.total}</span>
            </div>
          </div>
        </div>

        {/* ── Progress ─────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-dark-400 mb-2 font-bold">
            <span>عميل {idx + 1} من {queue.length}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* ── Lead card ────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <div className="card p-6 sm:p-8">

              {/* Avatar + name + behavior */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-black flex-shrink-0">
                  {lead.first_name?.charAt(0) || '؟'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-black text-white truncate">
                    {lead.first_name || 'غير معروف'}
                  </h2>
                  <p className="text-dark-400 text-sm mt-1">
                    {formatBranch(lead.preferred_branch) || 'لم يحدد فرع'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className={`badge ${getLeadBadgeClass(lead.lead_class)}`}>
                      {formatLeadClass(lead.lead_class)}
                    </span>
                    <BehaviorBadge behavior={lead.behavior} size="md" />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-dark-950/50 border border-dark-800 rounded-xl p-4 mb-5">
                <p className="text-primary-400 text-[11px] font-black uppercase tracking-wider mb-1.5">
                  ليه نتصل به؟
                </p>
                <p className="text-white text-sm leading-relaxed">{explanation}</p>
              </div>

              {/* Next action */}
              <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border border-primary-500/30 rounded-xl p-4 mb-5">
                <p className="text-primary-400 text-[11px] font-black uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5" />
                  الإجراء المقترح
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{lead.next_action.icon}</span>
                  <p className="text-white font-black leading-snug">
                    {lead.next_action.action}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <StatCard
                  label="Conversion"
                  value={`${lead.conversion_probability}%`}
                  color="text-emerald-400"
                />
                <StatCard label="Urgency" value={lead.urgency_score} color="text-rose-400" />
                <StatCard label="Priority" value={lead.priority_score} color="text-primary-400" />
              </div>

              {/* Current outcome (if already recorded) */}
              {currentOutcome && (
                <div
                  className={`${OUTCOME_META[currentOutcome].bg} ${OUTCOME_META[currentOutcome].border} border rounded-xl p-3 mb-5 flex items-center gap-3`}
                >
                  <CheckCheck className={`w-5 h-5 ${OUTCOME_META[currentOutcome].color}`} />
                  <span className={`${OUTCOME_META[currentOutcome].color} font-bold text-sm`}>
                    تم تسجيل: {OUTCOME_META[currentOutcome].label}
                  </span>
                </div>
              )}

              {/* Actions — 2x3 grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <ActionButton
                  outcome={CALL_OUTCOMES.CALLED}
                  icon={Phone}
                  onClick={() => handleOutcome(CALL_OUTCOMES.CALLED)}
                />
                <ActionButton
                  outcome={CALL_OUTCOMES.INTERESTED}
                  icon={Heart}
                  onClick={() => handleOutcome(CALL_OUTCOMES.INTERESTED)}
                />
                <ActionButton
                  outcome={CALL_OUTCOMES.NOT_INTERESTED}
                  icon={ThumbsDown}
                  onClick={() => handleOutcome(CALL_OUTCOMES.NOT_INTERESTED)}
                />
                <ActionButton
                  outcome={CALL_OUTCOMES.NO_ANSWER}
                  icon={PhoneOff}
                  onClick={() => handleOutcome(CALL_OUTCOMES.NO_ANSWER)}
                />
                <ActionButton
                  outcome={CALL_OUTCOMES.RESCHEDULE}
                  icon={Clock3}
                  onClick={() => handleOutcome(CALL_OUTCOMES.RESCHEDULE)}
                />
                <button
                  onClick={handleViewProfile}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 font-black text-sm transition-all active:scale-95"
                >
                  الملف الكامل
                </button>
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between pt-4 border-t border-dark-800">
                <button
                  onClick={goPrev}
                  disabled={idx === 0}
                  className="flex items-center gap-1.5 text-dark-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-bold"
                >
                  <ChevronRight className="w-4 h-4" />
                  السابق
                </button>
                <span className="text-dark-500 text-[11px]">
                  اختصارات: 1-5 للإجراء • ← → للتنقل • Esc للإنهاء
                </span>
                <button
                  onClick={goNext}
                  className="flex items-center gap-1.5 text-dark-400 hover:text-white transition-colors text-sm font-bold"
                >
                  {idx >= queue.length - 1 ? 'إنهاء' : 'التالي'}
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule → follow-up reminder prompt */}
      {reschedule && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
             role="dialog" aria-modal="true" aria-label="تذكير متابعة">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl" dir="rtl">
            <h3 className="text-white font-black text-lg mb-1">تذكير متابعة 🔔</h3>
            <p className="text-dark-400 text-sm mb-5">
              هتتصل بـ <span className="text-white font-bold">{lead?.first_name || lead?.user_id}</span> تاني إمتى؟
            </p>

            <label className="block text-dark-300 text-xs font-bold mb-1.5">تاريخ المتابعة</label>
            <input
              type="date"
              value={reschedule.due}
              min={plusDaysStr(0)}
              onChange={(e) => setReschedule(r => ({ ...r, due: e.target.value }))}
              className="input-field w-full mb-4"
              dir="ltr"
            />

            <label className="block text-dark-300 text-xs font-bold mb-1.5">ملاحظة (اختياري)</label>
            <input
              type="text"
              value={reschedule.note}
              onChange={(e) => setReschedule(r => ({ ...r, note: e.target.value }))}
              placeholder="مثال: عايز يشوف ألوان تانية"
              className="input-field w-full mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={saveReschedule}
                disabled={savingTask || !reschedule.due}
                className="btn-primary flex-1 py-3"
              >
                {savingTask ? '...' : 'احفظ التذكير'}
              </button>
              <button onClick={skipReschedule} className="btn-secondary flex-1 py-3">
                تخطّي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallSession;
