import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Smart polling hook — يغيّر الـ interval بناءً على حالة الـ tab
 *
 * @param {Function} fetchFn — الدالة اللي بتجيب الـ data (مثلاً fetchDashboard)
 * @param {Object} options
 * @param {number} options.activeInterval — الـ interval لما الـ tab ظاهر (default 15s)
 * @param {number} options.backgroundInterval — الـ interval لما الـ tab في الخلفية (default 60s)
 * @param {boolean} options.enabled — تفعيل أو تعطيل الـ polling
 *
 * @returns {Object} { data, prevData, loading, error, lastUpdated, refresh, isVisible }
 */
export default function useSmartPolling(
  fetchFn,
  {
    activeInterval = 15000,
    backgroundInterval = 60000,
    enabled = true,
  } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );

  // مراجع مش بتسبب re-render
  const prevDataRef = useRef(null);
  const timerRef = useRef(null);
  const fetchFnRef = useRef(fetchFn);
  const lastDataHashRef = useRef(null);

  // نحدّث الـ ref عند تغيّر الدالة — عشان ما نعيدش schedule الـ timer كل render
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  // دالة الـ fetch الأساسية — stable reference
  const refresh = useCallback(async () => {
    try {
      setError(null);
      const freshData = await fetchFnRef.current();

      // nعمل hash بسيط عشان نعرف لو البيانات اتغيرت فعلاً
      const newHash = JSON.stringify(freshData);
      const changed = newHash !== lastDataHashRef.current;

      if (changed) {
        setData((prev) => {
          prevDataRef.current = prev;
          return freshData;
        });
        lastDataHashRef.current = newHash;
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useSmartPolling] fetch error:', err);
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // متابعة visibilityState
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);

      // لما الـ tab يرجع visible — نعمل refresh فوري
      if (visible) refresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refresh]);

  // استمع لحدث app:refresh الصادر من زر الـ Navbar
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('app:refresh', handler);
    return () => window.removeEventListener('app:refresh', handler);
  }, [refresh]);

  // إدارة الـ interval نفسه
  useEffect(() => {
    if (!enabled) return;

    // fetch فوري على أول mount
    refresh();

    const interval = isVisible ? activeInterval : backgroundInterval;
    timerRef.current = setInterval(refresh, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, isVisible, activeInterval, backgroundInterval, refresh]);

  return {
    data,
    prevData: prevDataRef.current,
    loading,
    error,
    lastUpdated,
    refresh,
    isVisible,
  };
}
