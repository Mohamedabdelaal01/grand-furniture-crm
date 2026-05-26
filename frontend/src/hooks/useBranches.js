/**
 * useBranches — fetches the active branches [{id,name}] from the API so
 * filters/dropdowns stay in sync with what the admin manages in Settings
 * (instead of a hardcoded list). Module-level cache shared across components,
 * mirrors the useRepList pattern.
 */
import { useState, useEffect } from 'react';
import { fetchBranches } from '../services/api';

let _cache = null;
let _inflight = null;

function loadBranches() {
  if (_cache !== null) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = fetchBranches()
      .then((list) => { _cache = Array.isArray(list) ? list : []; return _cache; })
      .catch(() => { _cache = []; return []; })
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

export default function useBranches() {
  const [branches, setBranches] = useState(_cache ?? []);
  const [loading,  setLoading]  = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) {
      setBranches(_cache);
      setLoading(false);
      return;
    }
    loadBranches().then((list) => {
      setBranches(list);
      setLoading(false);
    });
  }, []);

  return { branches, loading };
}
