import { useState, useEffect, useCallback } from 'react';

// "تم الاتصال" — بنخزنهم بمفتاح فيه تاريخ اليوم
// كده أول ما اليوم يتغير الـ checks تفرغ تلقائياً (stale keys تفضل في الـ storage
// لكن مش هنقراها، وممكن نعمل cleanup بسيط).

const STORAGE_PREFIX = 'called_today_';

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${STORAGE_PREFIX}${y}-${m}-${d}`;
}

function readCalled() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(todayKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeCalled(userIds) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(todayKey(), JSON.stringify(userIds));
    window.dispatchEvent(new CustomEvent('called_today_changed'));
  } catch (_) {}
}

// cleanup: يمسح أي مفتاح بـ called_today_ ليس اليوم
function cleanupOldKeys() {
  if (typeof window === 'undefined') return;
  const current = todayKey();
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX) && k !== current) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch (_) {}
}

export default function useCalledToday() {
  const [called, setCalled] = useState(() => {
    cleanupOldKeys();
    return readCalled();
  });

  useEffect(() => {
    const sync = () => setCalled(readCalled());
    window.addEventListener('called_today_changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('called_today_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleCalled = useCallback((userId) => {
    if (!userId) return;
    const current = readCalled();
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    writeCalled(next);
  }, []);

  const isCalled = useCallback(
    (userId) => called.includes(userId),
    [called]
  );

  const clearAll = useCallback(() => {
    writeCalled([]);
  }, []);

  return { called, isCalled, toggleCalled, clearAll };
}
