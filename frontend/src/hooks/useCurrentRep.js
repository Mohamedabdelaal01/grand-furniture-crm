/**
 * useCurrentRep — tracks which rep the admin is currently viewing.
 * Value is persisted to localStorage. Any valid string is accepted —
 * the list of valid names comes from the DB (useRepList), not hardcoded.
 */
import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'current_rep';
const EVENT       = 'current_rep_changed';

export default function useCurrentRep() {
  const [rep, setRep] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(STORAGE_KEY) || '';
    } catch (_) {
      return '';
    }
  });

  useEffect(() => {
    const sync = (e) => {
      if (e?.detail !== undefined) {
        setRep(e.detail);
      } else {
        try {
          const v = window.localStorage.getItem(STORAGE_KEY);
          setRep(v || '');
        } catch (_) {}
      }
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const changeRep = useCallback((newRep) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, newRep || '');
      window.dispatchEvent(new CustomEvent(EVENT, { detail: newRep || '' }));
    } catch (_) {}
    setRep(newRep || '');
  }, []);

  return [rep, changeRep];
}
