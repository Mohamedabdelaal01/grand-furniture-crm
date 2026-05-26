import { useEffect, useRef, useState, useCallback } from 'react';

// ── Web Audio API — beep helper ──────────────────────────────────────────────
// مش بنستخدم <audio> tag — WebAudio أخف وأوثق
// ملاحظة: الـ browser بيطلب user interaction الأول قبل ما يشغل صوت.
// لو متمنع → الـ catch بيبلع الـ error بدون ما يكسر الـ flow.
let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    } catch (_) {
      audioCtx = null;
    }
  }
  return audioCtx;
}

function playBeep({ frequency = 880, duration = 150, volume = 0.12 } = {}) {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    // fade out عشان مفيش click في الآخر
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch (_) {
    // ignore — الـ browser ممكن يمنع الصوت
  }
}

function playHotBeep() {
  playBeep({ frequency: 880, duration: 180, volume: 0.1 });
}

function playTop3Beep() {
  // نبضة مزدوجة أعلى — urgent
  playBeep({ frequency: 1046, duration: 150, volume: 0.14 });
  setTimeout(() => playBeep({ frequency: 1318, duration: 180, volume: 0.14 }), 180);
}

// ── Alert types ──────────────────────────────────────────────────────────────
export const ALERT_TYPES = {
  BECAME_HOT: 'became_hot',
  ENTERED_TOP3: 'entered_top3',
};

const MAX_HISTORY = 20;

/**
 * useLeadAlerts — يقارن leads الحالية بالقديمة ويولّد alerts
 *
 * @param {Array} currentLeads — الـ recent_hot_leads من الـ dashboard
 * @param {Array} prevLeads — نفس الـ leads من آخر poll (قبل الحالية)
 *
 * @returns {Object} { alerts, toasts, unreadCount, dismiss, clear, markAllRead, dismissToast }
 */
export default function useLeadAlerts(currentLeads, prevLeads) {
  const [alerts, setAlerts] = useState([]); // history — آخر 20
  const [toasts, setToasts] = useState([]); // الـ toasts الظاهرة دلوقتي
  const seenAlertIdsRef = useRef(new Set()); // منع duplicates لنفس الـ event

  // مقارنة leads وتوليد alerts
  useEffect(() => {
    if (!Array.isArray(currentLeads) || currentLeads.length === 0) return;
    // أول poll — مفيش prev للمقارنة — مبنولّدش alerts
    if (!Array.isArray(prevLeads)) return;

    const prevMap = new Map(prevLeads.map((l) => [l.user_id, l]));
    const prevTop3Ids = new Set(prevLeads.slice(0, 3).map((l) => l.user_id));
    const currentTop3Ids = new Set(currentLeads.slice(0, 3).map((l) => l.user_id));

    const newAlerts = [];

    for (const lead of currentLeads) {
      const prev = prevMap.get(lead.user_id);

      // ── became_hot: lead جديد hot/converted وكان warm/cold (أو مش موجود) ──
      const wasHotOrConverted =
        prev && (prev.lead_class === 'hot' || prev.lead_class === 'converted');
      const isHotOrConverted =
        lead.lead_class === 'hot' || lead.lead_class === 'converted';

      if (isHotOrConverted && !wasHotOrConverted) {
        // بنربط الـ alert بالـ user_id + lead_class عشان مايتكررش
        const alertKey = `${ALERT_TYPES.BECAME_HOT}:${lead.user_id}:${lead.lead_class}`;
        if (!seenAlertIdsRef.current.has(alertKey)) {
          seenAlertIdsRef.current.add(alertKey);
          newAlerts.push({
            id: `${Date.now()}-${alertKey}`,
            key: alertKey,
            type: ALERT_TYPES.BECAME_HOT,
            lead,
            timestamp: new Date(),
            read: false,
            message:
              lead.lead_class === 'converted'
                ? `${lead.first_name || 'عميل'} تحوّل إلى عميل مؤكد`
                : `${lead.first_name || 'عميل'} أصبح عميل ساخن`,
          });
        }
      }

      // ── entered_top3: دخل top 3 ومكنش فيه قبل كده ──
      if (currentTop3Ids.has(lead.user_id) && !prevTop3Ids.has(lead.user_id)) {
        // مفتاح بيتجدد كل ما يدخل top 3 (بعد ما يكون خرج)
        const alertKey = `${ALERT_TYPES.ENTERED_TOP3}:${lead.user_id}:${Math.floor(Date.now() / 60000)}`;
        if (!seenAlertIdsRef.current.has(alertKey)) {
          seenAlertIdsRef.current.add(alertKey);
          newAlerts.push({
            id: `${Date.now()}-${alertKey}`,
            key: alertKey,
            type: ALERT_TYPES.ENTERED_TOP3,
            lead,
            timestamp: new Date(),
            read: false,
            message: `${lead.first_name || 'عميل'} دخل أعلى 3 — اتصل حالاً`,
          });
        }
      }
    }

    if (newAlerts.length === 0) return;

    // صوت — نشغله مرة واحدة حسب أعلى أولوية
    const hasTop3 = newAlerts.some((a) => a.type === ALERT_TYPES.ENTERED_TOP3);
    if (hasTop3) playTop3Beep();
    else playHotBeep();

    // add للـ history (limit 20) + للـ toasts (limit 3 ظاهرة)
    setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_HISTORY));
    setToasts((prev) => [...newAlerts, ...prev].slice(0, 3));
  }, [currentLeads, prevLeads]);

  // auto-dismiss toast بعد 6 ثواني
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) =>
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 6000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const dismiss = useCallback((id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clear = useCallback(() => {
    setAlerts([]);
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return {
    alerts,
    toasts,
    unreadCount,
    dismiss,
    clear,
    markAllRead,
    dismissToast,
  };
}
