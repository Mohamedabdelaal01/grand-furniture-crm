/**
 * useAdminNotifications — polls the backend for macro admin alerts
 * (contracts changed, high-value deals) and exposes the same interface
 * NotificationBell / AlertToast expect from useLeadAlerts.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchNotifications, markNotificationsRead } from '../services/api';

export default function useAdminNotifications(pollMs = 30000) {
  const [alerts, setAlerts]           = useState([]);
  const [toasts, setToasts]           = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenRef  = useRef(new Set());  // ids already seen — for toast dedup
  const firstRef = useRef(true);       // skip toasts on the very first load

  const load = useCallback(async () => {
    try {
      const { notifications, unread } = await fetchNotifications();
      const mapped = (notifications || []).map((n) => ({
        id:        n.id,
        type:      n.type,
        message:   n.message,
        timestamp: new Date(String(n.created_at).replace(' ', 'T') + 'Z'),
        read:      !!n.read,
      }));
      setAlerts(mapped);
      setUnreadCount(unread || 0);

      // Surface genuinely-new unread notifications as toasts.
      const fresh = mapped.filter((m) => !m.read && !seenRef.current.has(m.id));
      mapped.forEach((m) => seenRef.current.add(m.id));
      if (!firstRef.current && fresh.length) {
        setToasts((prev) => [...fresh, ...prev].slice(0, 3));
      }
      firstRef.current = false;
    } catch (_) { /* keep last state on error */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  // auto-dismiss toasts after 6s
  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((p) => p.filter((x) => x.id !== t.id)), 6000)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const dismiss      = useCallback((id) => setAlerts((p) => p.filter((a) => a.id !== id)), []);
  const clear        = useCallback(() => setAlerts([]), []);
  const dismissToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  const markAllRead  = useCallback(async () => {
    setAlerts((p) => p.map((a) => ({ ...a, read: true })));
    setUnreadCount(0);
    try { await markNotificationsRead(); } catch (_) { /* ignore */ }
  }, []);

  return { alerts, toasts, unreadCount, dismiss, clear, markAllRead, dismissToast };
}
