// assignments.js — إدارة تعيين المندوبين للـ leads
// التعيينات محفوظة في localStorage عشان تفضل بين refreshes.

const STORAGE_KEY = 'lead_assignments';

// SALES_REPS was removed — rep list now comes from the DB via useRepList hook.
// Kept as empty array for any legacy import that hasn't been updated yet.
export const SALES_REPS = [];

/**
 * يرجع object بكل التعيينات: { user_id: rep_name }
 */
export function getAssignments() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

/**
 * يرجع اسم المندوب المعيّن لـ user معيّن، أو null.
 */
export function getAssignment(userId) {
  if (!userId) return null;
  return getAssignments()[userId] || null;
}

/**
 * يعيّن مندوب لـ lead. لو rep = null أو '' → يشيل التعيين.
 */
export function setAssignment(userId, rep) {
  if (typeof window === 'undefined' || !userId) return;
  const current = getAssignments();
  if (!rep) {
    delete current[userId];
  } else {
    current[userId] = rep;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    // ايفنت global عشان أي component يتابع التغييرات
    window.dispatchEvent(new CustomEvent('lead_assignments_changed'));
  } catch (_) {
    // storage full or disabled — ignore
  }
}

/**
 * يشيل التعيين لـ lead واحد.
 */
export function clearAssignment(userId) {
  setAssignment(userId, null);
}

/**
 * يمسح كل التعيينات (للـ debug).
 */
export function clearAllAssignments() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('lead_assignments_changed'));
  } catch (_) {}
}
