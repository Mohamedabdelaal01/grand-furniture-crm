/**
 * useInterests — fetches the interest categories (string[]) the admin manages
 * in Settings, so the reception walk-in form stays in sync instead of using a
 * hardcoded list. Module-level cache shared across components — mirrors the
 * useBranches pattern.
 */
import { useState, useEffect } from 'react';
import { fetchInterests } from '../services/api';

let _cache = null;
let _inflight = null;

function loadInterests() {
  if (_cache !== null) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = fetchInterests()
      .then((list) => { _cache = Array.isArray(list) ? list : []; return _cache; })
      .catch(() => { _cache = []; return []; })
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

export default function useInterests() {
  const [interests, setInterests] = useState(_cache ?? []);
  const [loading,   setLoading]   = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) {
      setInterests(_cache);
      setLoading(false);
      return;
    }
    loadInterests().then((list) => {
      setInterests(list);
      setLoading(false);
    });
  }, []);

  return { interests, loading };
}
