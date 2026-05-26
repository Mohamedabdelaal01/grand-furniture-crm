// leadIntelligence.js — Decision + Behavior Intelligence Engine
// كل الحسابات frontend فقط — مفيش تغيير في الـ API.
//
// الـ lead شكله:
// { user_id, first_name, total_score, lead_class, preferred_branch,
//   last_product, last_activity, visit_confirmed, location_requested,
//   recency_bonus, intent_bonus, priority_score }

// ── Constants مشتقة من backend ──────────────────────────────────────────────
// SCORE_MAP.visit_confirmed = 100، THRESHOLDS.converted = 150
// priority_score = total_score + recency_bonus (0..30) + intent_bonus (0..100)
const MAX_REASONABLE_SCORE = 200;   // score لفوق ده بـ 100% probability
const MAX_RECENCY_BONUS = 30;
const MAX_INTENT_BONUS = 100;

/**
 * parseSqliteDate — UTC parse للـ timestamps من SQLite
 */
export function parseSqliteDate(str) {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
}

/**
 * hoursSince — ساعات من وقت معين
 */
export function hoursSince(sqliteDate) {
  const d = parseSqliteDate(sqliteDate);
  if (!d) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

// ════════════════════════════════════════════════════════════════════════════
// 1️⃣ Conversion Probability — احتمال التحويل %
// ════════════════════════════════════════════════════════════════════════════
/**
 * computeConversionProbability(lead) → 0..100
 *
 * Weights:
 *   - base score    35%
 *   - intent        30%
 *   - recency       20%
 *   - visit flag    15%
 *
 * لو lead_class = converted → 100% مباشرة.
 */
export function computeConversionProbability(lead) {
  if (!lead) return 0;
  if (lead.lead_class === 'converted' || lead.visit_confirmed) return 100;

  const scorePart  = Math.min((lead.total_score || 0) / MAX_REASONABLE_SCORE, 1) * 35;
  const intentPart = Math.min((lead.intent_bonus || 0) / MAX_INTENT_BONUS, 1) * 30;
  const recencyPart = Math.min((lead.recency_bonus || 0) / MAX_RECENCY_BONUS, 1) * 20;
  const visitPart  = lead.location_requested ? 15 : 0;

  return Math.round(scorePart + intentPart + recencyPart + visitPart);
}

// ════════════════════════════════════════════════════════════════════════════
// 2️⃣ Urgency Score — أولوية الاتصال
// ════════════════════════════════════════════════════════════════════════════
/**
 * computeUrgencyScore(lead) → 0..100
 * formula: recency*0.4 + intent*0.4 + priority_normalized*0.2
 */
export function computeUrgencyScore(lead) {
  if (!lead) return 0;
  const recency = ((lead.recency_bonus || 0) / MAX_RECENCY_BONUS) * 100;
  const intent  = ((lead.intent_bonus || 0) / MAX_INTENT_BONUS) * 100;
  const priority = Math.min((lead.priority_score || 0) / MAX_REASONABLE_SCORE, 1) * 100;
  return Math.round(recency * 0.4 + intent * 0.4 + priority * 0.2);
}

// ════════════════════════════════════════════════════════════════════════════
// 3️⃣ Next Best Action — اقتراح الإجراء التالي
// ════════════════════════════════════════════════════════════════════════════
/**
 * generateNextBestAction(lead) → { action, priority, icon }
 * priority: 'high' | 'medium' | 'low'
 */
export function generateNextBestAction(lead) {
  if (!lead) return { action: 'متابعة', priority: 'low', icon: '👁️' };

  // Converted — تأكيد زيارة
  if (lead.lead_class === 'converted' || lead.visit_confirmed) {
    return {
      action: 'تأكيد موعد الزيارة وإرسال تفاصيل الفرع',
      priority: 'high',
      icon: '📅',
    };
  }

  // أعلى intent: طلب موقع + مش زار → حوّله لزيارة
  if (lead.location_requested && !lead.visit_confirmed) {
    return {
      action: 'اتصل فوراً — طلب موقع الفرع ولم يزر بعد',
      priority: 'high',
      icon: '📞',
    };
  }

  // نشاط اللحظة + hot
  if ((lead.recency_bonus || 0) === 30 && lead.lead_class === 'hot') {
    return {
      action: 'اتصل الآن — العميل نشط في آخر ساعة',
      priority: 'high',
      icon: '🔥',
    };
  }

  // ضغط خريطة
  if ((lead.intent_bonus || 0) >= 40) {
    return {
      action: 'ابعت له فيديو للفرع وعرض خاص',
      priority: 'high',
      icon: '🎬',
    };
  }

  // اختار فرع بدون طلب زيارة
  if ((lead.intent_bonus || 0) >= 30 && !lead.location_requested) {
    return {
      action: 'ابعت له عنوان الفرع + رقم واتساب المندوب',
      priority: 'medium',
      icon: '💬',
    };
  }

  // نشاط خلال 6 ساعات
  if ((lead.recency_bonus || 0) >= 20) {
    return {
      action: 'ابعت له عرض محدود بالوقت على آخر منتج شافه',
      priority: 'medium',
      icon: '⏰',
    };
  }

  // hot لكن ساكن
  if (lead.lead_class === 'hot') {
    return {
      action: 'ابعت له منتجات مشابهة لآخر اهتمام',
      priority: 'medium',
      icon: '🛋️',
    };
  }

  // warm
  if (lead.lead_class === 'warm') {
    return {
      action: 'ابعت له كتالوج مخصص حسب اهتمامه',
      priority: 'low',
      icon: '📨',
    };
  }

  return {
    action: 'متابعة ضمن حملة إعادة التسويق',
    priority: 'low',
    icon: '🔁',
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 4️⃣ Behavior Classification — تصنيف سلوكي
// ════════════════════════════════════════════════════════════════════════════
/**
 * classifyBehavior(lead) → 'ready' | 'comparing' | 'hesitant' | 'lost' | 'new'
 *
 * ready — جاهز: visit_confirmed / location_requested بنشاط حديث
 * comparing — بيقارن: intent عالي + شاف كذا منتج، لكن مش طلب زيارة
 * hesitant — متردد: hot لكن مفيش نشاط حديث
 * lost — ضائع: آخر نشاط > 7 أيام وlead_class مش converted
 * new — جديد: score منخفض ونشاط حديث
 */
export function classifyBehavior(lead) {
  if (!lead) return 'new';

  const hrs = hoursSince(lead.last_activity);

  // Converted أو زائر = ready
  if (lead.lead_class === 'converted' || lead.visit_confirmed) return 'ready';

  // طلب موقع + نشاط في 24 ساعة = ready
  if (lead.location_requested && hrs <= 24) return 'ready';

  // lost: آخر نشاط > 7 أيام
  if (hrs > 24 * 7) return 'lost';

  // comparing: intent عالي (شاف منتجات أو ضغط خريطة) بدون طلب موقع
  if ((lead.intent_bonus || 0) >= 30 && !lead.location_requested) {
    return 'comparing';
  }

  // hesitant: hot لكن مفيش نشاط في آخر 24 ساعة
  if (lead.lead_class === 'hot' && hrs > 24) return 'hesitant';

  // hot بنشاط حديث لكن مش طلب موقع
  if (lead.lead_class === 'hot' && hrs <= 24) return 'comparing';

  // باقي الحالات → new
  return 'new';
}

export const BEHAVIOR_META = {
  ready: {
    label: 'جاهز',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: '✅',
    description: 'اتخذ قرار — اتصل لإتمام الزيارة',
  },
  comparing: {
    label: 'بيقارن',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10',
    border: 'border-primary-500/30',
    icon: '🔍',
    description: 'بيدور على الأنسب — ساعده يختار',
  },
  hesitant: {
    label: 'متردد',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: '🤔',
    description: 'عنده اهتمام لكن مش متحمس — حفّزه',
  },
  lost: {
    label: 'في خطر',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: '⚠️',
    description: 'بعيد عن آخر تفاعل — ابعت عرض يرجعه',
  },
  new: {
    label: 'جديد',
    color: 'text-dark-300',
    bg: 'bg-dark-800',
    border: 'border-dark-700',
    icon: '🌱',
    description: 'بيستكشف — سيبه يشوف أكتر',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// 5️⃣ Risk Score — احتمال فقدان العميل
// ════════════════════════════════════════════════════════════════════════════
/**
 * computeRiskScore(lead) → 0..100
 *
 * يزيد مع:
 *   - البُعد عن آخر نشاط (decay)
 *   - hot lead مش متعامل معاه
 *   - مفيش تعيين مندوب (optional — offloaded للـ UI)
 */
export function computeRiskScore(lead) {
  if (!lead) return 0;
  if (lead.lead_class === 'converted' || lead.visit_confirmed) return 0;

  const hrs = hoursSince(lead.last_activity);
  let risk = 0;

  // Recency decay: > 6h يبدأ يزيد، > 72h max
  if (hrs > 72) risk += 50;
  else if (hrs > 24) risk += 30;
  else if (hrs > 6) risk += 10;

  // hot lead بدون حركة
  if (lead.lead_class === 'hot' && hrs > 24) risk += 25;

  // طلب موقع ومش راح
  if (lead.location_requested && !lead.visit_confirmed && hrs > 48) risk += 25;

  return Math.min(100, risk);
}

// ════════════════════════════════════════════════════════════════════════════
// 6️⃣ Timing Recommendation — وقت الاتصال الأمثل
// ════════════════════════════════════════════════════════════════════════════
/**
 * getTimingRecommendation(lead) → { timing, label, urgent }
 *   timing: 'now' | 'today' | 'tomorrow' | 'later'
 */
export function getTimingRecommendation(lead) {
  if (!lead) return { timing: 'later', label: 'لاحقاً', urgent: false };

  const hrs = hoursSince(lead.last_activity);

  if (lead.visit_confirmed || lead.lead_class === 'converted') {
    return { timing: 'today', label: 'تابع اليوم', urgent: false };
  }

  if (lead.location_requested && hrs <= 2) {
    return { timing: 'now', label: 'اتصل فوراً', urgent: true };
  }

  if (lead.lead_class === 'hot' && hrs <= 1) {
    return { timing: 'now', label: 'اتصل فوراً', urgent: true };
  }

  if (lead.lead_class === 'hot' && hrs <= 6) {
    return { timing: 'today', label: 'اتصل اليوم', urgent: false };
  }

  if (lead.lead_class === 'warm' && hrs <= 24) {
    return { timing: 'today', label: 'تواصل اليوم', urgent: false };
  }

  if (hrs <= 48) {
    return { timing: 'tomorrow', label: 'متابعة بكرا', urgent: false };
  }

  return { timing: 'later', label: 'حملة إعادة تسويق', urgent: false };
}

// ════════════════════════════════════════════════════════════════════════════
// 7️⃣ Enrichment — دمج كل البيانات في lead واحد enriched
// ════════════════════════════════════════════════════════════════════════════
/**
 * enrichLead(lead) → lead كامل فيه كل الحسابات
 */
export function enrichLead(lead) {
  if (!lead) return null;
  return {
    ...lead,
    conversion_probability: computeConversionProbability(lead),
    urgency_score: computeUrgencyScore(lead),
    behavior: classifyBehavior(lead),
    risk_score: computeRiskScore(lead),
    next_action: generateNextBestAction(lead),
    timing: getTimingRecommendation(lead),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 8️⃣ Grouping — تقسيم الـ leads لـ buckets قابلة للتنفيذ
// ════════════════════════════════════════════════════════════════════════════
/**
 * groupLeads(leads) → { callNow, highOpportunity, lowPriority, atRisk }
 *
 * callNow — urgency >= 60 أو ready/hot نشط
 * highOpportunity — conversion_probability >= 40 لكن مش urgent
 * atRisk — risk_score >= 50
 * lowPriority — الباقي
 */
export function groupLeads(leads) {
  const enriched = (leads || []).map(enrichLead).filter(Boolean);

  const callNow = [];
  const highOpportunity = [];
  const atRisk = [];
  const lowPriority = [];

  for (const l of enriched) {
    if (l.urgency_score >= 60 || l.timing.timing === 'now') {
      callNow.push(l);
    } else if (l.risk_score >= 50) {
      atRisk.push(l);
    } else if (l.conversion_probability >= 40) {
      highOpportunity.push(l);
    } else {
      lowPriority.push(l);
    }
  }

  // كل group مرتب بـ urgency descending
  const sortByUrgency = (arr) => arr.sort((a, b) => b.urgency_score - a.urgency_score);

  return {
    callNow: sortByUrgency(callNow),
    highOpportunity: sortByUrgency(highOpportunity),
    atRisk: sortByUrgency(atRisk),
    lowPriority: sortByUrgency(lowPriority),
    all: enriched,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 9️⃣ Ranked queue — ترتيب شامل للاتصال
// ════════════════════════════════════════════════════════════════════════════
/**
 * buildRankedQueue(leads, limit=20) → array مرتبة بالأولوية الشاملة
 */
export function buildRankedQueue(leads, limit = 20) {
  const enriched = (leads || []).map(enrichLead).filter(Boolean);
  return enriched
    .sort((a, b) => {
      // urgent أول
      if (a.timing.urgent && !b.timing.urgent) return -1;
      if (b.timing.urgent && !a.timing.urgent) return 1;
      return b.urgency_score - a.urgency_score;
    })
    .slice(0, limit);
}
