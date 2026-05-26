import { X, Flame, Trophy } from 'lucide-react';
import { ALERT_TYPES } from '../hooks/useLeadAlerts';

const typeMeta = {
  [ALERT_TYPES.BECAME_HOT]: {
    icon: Flame,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    shadow: 'shadow-rose-500/20',
    label: 'عميل ساخن',
  },
  [ALERT_TYPES.ENTERED_TOP3]: {
    icon: Trophy,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    shadow: 'shadow-amber-500/20',
    label: 'Top 3',
  },
};

const AlertToast = ({ toasts = [], onDismiss, onClick }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-6 left-6 z-[100] flex flex-col gap-3 max-w-[360px] w-[calc(100vw-3rem)] sm:w-auto pointer-events-none"
      dir="rtl"
    >
      {toasts.map((toast) => {
        const meta = typeMeta[toast.type] || typeMeta[ALERT_TYPES.BECAME_HOT];
        const Icon = meta.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto animate-toast-in bg-dark-900/95 backdrop-blur-md border ${meta.border} rounded-2xl shadow-2xl ${meta.shadow} overflow-hidden`}
            onClick={() => onClick?.(toast)}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
          >
            <div className="flex items-start gap-3 p-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg} ${meta.border}`}
              >
                <Icon className={`w-5 h-5 ${meta.color}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${meta.color}`}>
                  {meta.label}
                </div>
                <p className="text-white text-sm font-bold leading-snug">
                  {toast.message}
                </p>
                {toast.lead?.preferred_branch && (
                  <p className="text-dark-400 text-xs mt-1">
                    Priority: {toast.lead.priority_score}
                  </p>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss?.(toast.id);
                }}
                className="text-dark-500 hover:text-white transition-colors p-1"
                title="إغلاق"
                aria-label="إغلاق الإشعار"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* progress bar لإظهار الـ 6 seconds */}
            <div className={`h-1 ${meta.bg}`}>
              <div
                className={`h-full ${meta.color.replace('text-', 'bg-')} animate-toast-progress`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AlertToast;
