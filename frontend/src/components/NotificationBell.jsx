import { useState, useRef, useEffect } from 'react';
import { Bell, X, Flame, Trophy, CheckCheck, Trash2, FileText, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ALERT_TYPES } from '../hooks/useLeadAlerts';

const typeMeta = {
  [ALERT_TYPES.BECAME_HOT]: {
    icon: Flame,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'عميل ساخن',
  },
  [ALERT_TYPES.ENTERED_TOP3]: {
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'دخل Top 3',
  },
  // ── Admin macro alerts ──────────────────────────────────────────────────
  new_purchase: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'تعاقد جديد',
  },
  high_value_deal: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'بيعة ضخمة',
  },
  contract_modified: {
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'تعديل تعاقد',
  },
  contract_deleted: {
    icon: Trash2,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'حذف تعاقد',
  },
};

const NotificationBell = ({
  alerts = [],
  unreadCount = 0,
  onDismiss,
  onClear,
  onMarkAllRead,
  onAlertClick,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      // لما يفتح → mark all as read
      if (next && unreadCount > 0) onMarkAllRead?.();
      return next;
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className="relative p-2.5 bg-surface-secondary/50 hover:bg-surface-tertiary text-foreground hover:text-accent rounded-xl border border-border/50 transition-all active:scale-95"
        title="الإشعارات"
        aria-label={`الإشعارات — ${unreadCount} غير مقروءة`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-pulse text-accent' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-border shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-3 w-[340px] max-w-[92vw] bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/40">
            <div>
              <h4 className="text-foreground font-black text-sm">الإشعارات</h4>
              <p className="text-muted text-[11px] mt-0.5">
                {alerts.length === 0
                  ? 'لا توجد إشعارات'
                  : `${alerts.length} إشعار${alerts.length > 1 ? '' : ''}`}
              </p>
            </div>

            {alerts.length > 0 && (
              <button
                onClick={onClear}
                className="flex items-center gap-1 text-muted hover:text-rose-400 text-xs font-bold transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/5"
                title="مسح الكل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 bg-surface-secondary/60 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-muted" />
                </div>
                <p className="text-muted text-sm font-bold">لا توجد إشعارات</p>
                <p className="text-muted text-xs mt-1">
                  هنعلّمك أول ما يظهر عميل ساخن
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const meta = typeMeta[alert.type] || typeMeta[ALERT_TYPES.BECAME_HOT];
                const Icon = meta.icon;
                return (
                  <div
                    key={alert.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border/60 last:border-b-0 hover:bg-surface-secondary/30 transition-colors cursor-pointer ${
                      !alert.read ? 'bg-accent/[0.03]' : ''
                    }`}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.border}`}
                    >
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-foreground text-sm font-bold leading-snug">
                          {alert.message}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss?.(alert.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-400 transition-all p-0.5"
                          title="إغلاق"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-surface-tertiary" />
                        <span className="text-muted text-[11px]">
                          {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                    </div>

                    {!alert.read && (
                      <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
