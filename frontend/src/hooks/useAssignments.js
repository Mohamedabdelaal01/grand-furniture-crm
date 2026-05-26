import { useEffect, useState, useCallback } from 'react';
import { getAssignments, setAssignment as writeAssignment } from '../utils/assignments';

/**
 * useAssignments — hook يتابع التعيينات من localStorage
 * ويـ re-render أي component لما حد يعدّل.
 *
 * @returns {[assignments, setAssignment]}
 */
export default function useAssignments() {
  const [assignments, setAssignments] = useState(() => getAssignments());

  useEffect(() => {
    const sync = () => setAssignments(getAssignments());

    // Custom event من نفس الـ tab
    window.addEventListener('lead_assignments_changed', sync);
    // storage event لأي tab تاني (لو في ويندو ثاني مفتوح)
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('lead_assignments_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setAssignment = useCallback((userId, rep) => {
    writeAssignment(userId, rep);
  }, []);

  return [assignments, setAssignment];
}
