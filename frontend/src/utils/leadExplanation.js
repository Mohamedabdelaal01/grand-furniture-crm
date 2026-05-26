// leadExplanation.js — يولّد شرح عربي "ليه العميل ده Hot؟"
// بيرجع أقوى سببين كجملة موحدة عشان الشرح يبقى مفيد من غير ضجيج.

/**
 * قواعد الشرح مرتبة من أعلى intent لأقل.
 * كل rule بيتشيّك فيه match، ولو صح بيتضاف للناتج.
 * الترتيب مهم — بيحدد إيه اللي يظهر أول.
 */
const RULES = [
  {
    key: 'visit_confirmed',
    match: (l) => l.visit_confirmed === 1 || l.visit_confirmed === true,
    text: 'أكد زيارة الفرع — جاهز للتحويل',
    weight: 100,
  },
  {
    key: 'location_requested',
    match: (l) => l.location_requested === 1 || l.location_requested === true,
    text: 'طلب موقع الفرع — نية عالية جداً',
    weight: 90,
  },
  {
    key: 'map_click',
    match: (l) => (l.intent_bonus || 0) >= 40,
    text: 'ضغط خريطة Google — بيفكر يزور فعلاً',
    weight: 80,
  },
  {
    key: 'recency_now',
    match: (l) => (l.recency_bonus || 0) === 30,
    text: 'نشط الآن (آخر ساعة)',
    weight: 75,
  },
  {
    key: 'branch_selected',
    match: (l) => (l.intent_bonus || 0) >= 30 && (l.intent_bonus || 0) < 40,
    text: 'اختار فرع محدد — اتخذ قرار',
    weight: 65,
  },
  {
    key: 'recency_6h',
    match: (l) => (l.recency_bonus || 0) === 20,
    text: 'نشاطه خلال آخر 6 ساعات',
    weight: 50,
  },
  {
    key: 'recency_24h',
    match: (l) => (l.recency_bonus || 0) === 10,
    text: 'نشاطه خلال آخر 24 ساعة',
    weight: 30,
  },
  {
    key: 'high_score',
    match: (l) => (l.total_score || 0) >= 75 && l.lead_class === 'hot',
    text: 'نقاطه عدّت عتبة 75 — مصنف ساخن',
    weight: 20,
  },
  {
    key: 'converted',
    match: (l) => l.lead_class === 'converted',
    text: 'عميل مؤكد التحويل',
    weight: 10,
  },
];

/**
 * يرجع array من أقوى الأسباب المنطبقة على الـ lead.
 * مفيدة لو الـ UI عايزة تعرضهم كـ bullets.
 */
export function getLeadReasons(lead, limit = 2) {
  if (!lead) return [];
  const matched = RULES.filter((r) => {
    try {
      return r.match(lead);
    } catch (_) {
      return false;
    }
  });
  return matched.slice(0, limit).map((r) => r.text);
}

/**
 * يرجع جملة عربية واحدة (أو جملتين مفصولين بـ —) بتشرح ليه العميل ده أولوية.
 * لو مفيش سبب منطبق، بيرجع fallback عام.
 *
 * @param {Object} lead
 * @returns {string}
 */
export function generateLeadExplanation(lead) {
  const reasons = getLeadReasons(lead, 2);

  if (reasons.length === 0) {
    return 'عميل نشط مؤخراً — يستحق متابعة';
  }

  if (reasons.length === 1) return reasons[0];
  return `${reasons[0]} • ${reasons[1]}`;
}

/**
 * Short variant — سبب واحد فقط، للـ badges والـ tooltips القصيرة.
 */
export function generateShortExplanation(lead) {
  const reasons = getLeadReasons(lead, 1);
  return reasons[0] || 'نشاط عالي';
}

export default generateLeadExplanation;
