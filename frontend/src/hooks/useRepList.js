/**
 * useRepList — fetches the list of sales rep names from the API.
 * Accessible to all authenticated users (admin + rep).
 * Result is cached at module level so multiple components share one fetch.
 */
import { useState, useEffect } from 'react';
import { fetchReps } from '../services/api';

// Module-level cache: survives re-renders, cleared on page refresh.
let _cache = null;
let _inflight = null;

function loadReps() {
  if (_cache !== null) return Promise.resolve(_cache);
  if (!_inflight) {
    _inflight = fetchReps()
      .then((names) => { _cache = names; return names; })
      .catch(() => { _cache = []; return []; })
      .finally(() => { _inflight = null; });
  }
  return _inflight;
}

export default function useRepList() {
  const [reps,    setReps]    = useState(_cache ?? []);
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    if (_cache !== null) {
      setReps(_cache);
      setLoading(false);
      return;
    }
    loadReps().then((names) => {
      setReps(names);
      setLoading(false);
    });
  }, []);

  return { reps, loading };
}
