/**
 * AuditLedger — admin control room for reverting human errors.
 * Lists logged assignment actions and lets the admin undo any of them,
 * restoring the affected DB row to its previous state.
 */
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ScrollText, RefreshCw, RotateCcw, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { fetchAuditLogs, revertAuditLog } from '../services/api';

// Human-readable Arabic labels for each logged action type.
const ACTION_LABELS = {
  assign_customer: 'تعيين عميل لمندوب',
  set_sales:       'تحديد سيلز الصالة',
};

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AuditLedger() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [confirmLog, setConfirmLog] = useState(null); // log row pending revert
  const [busy, setBusy]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await fetchAuditLogs());
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const doRevert = async () => {
    if (!confirmLog) return;
    setBusy(true);
    const tId = toast.loading('جاري التراجع...');
    try {
      await revertAuditLog(confirmLog.id);
      toast.success('تم التراجع عن الإجراء بنجاح', { id: tId });
      setConfirmLog(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التراجع', { id: tId });
    }
    setBusy(false);
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-amber-500 rounded-full" />
            <span className="text-amber-400 font-black text-[10px] uppercase tracking-[0.2em]">
              النظام والرقابة
            </span>
          </div>
          <h1 className="text-3xl font-black text-foreground flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-amber-400" />
            سجل العمليات
          </h1>
          <p className="text-muted text-sm mt-1">
            كل عمليات التعيين — تقدر تتراجع عن أي إجراء غلط وترجّع الحالة زي ما كانت
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted font-bold">لا توجد عمليات مسجّلة بعد</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-surface-secondary/60 text-muted text-right font-black uppercase tracking-wider">
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">الموظف</th>
                  <th className="py-3 px-4">نوع الإجراء</th>
                  <th className="py-3 px-4">العميل المستهدف</th>
                  <th className="py-3 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-border/60 hover:bg-surface-secondary/20">
                    <td className="py-3 px-4 text-foreground">{fmtDateTime(log.created_at)}</td>
                    <td className="py-3 px-4 text-foreground font-bold">{log.operator_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-accent/15 text-accent">
                        {ACTION_LABELS[log.action_type] || log.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-mono" dir="ltr">{log.target_id || '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center">
                        {log.reverted ? (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-black">
                            <CheckCircle className="w-3.5 h-3.5" />
                            تم التراجع
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmLog(log)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-black transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            تراجع
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {confirmLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          dir="rtl"
          onClick={() => !busy && setConfirmLog(null)}
        >
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-foreground font-black">تأكيد التراجع</h3>
              </div>
              <button
                onClick={() => !busy && setConfirmLog(null)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-foreground text-sm leading-relaxed mb-2">
              هتتراجع عن إجراء
              <span className="text-amber-300 font-black mx-1">
                {ACTION_LABELS[confirmLog.action_type] || confirmLog.action_type}
              </span>
              اللي عمله
              <span className="text-foreground font-bold mx-1">{confirmLog.operator_name || '؟'}</span>.
            </p>
            <p className="text-muted text-xs mb-6">
              السيستم هيرجّع البيانات للحالة اللي كانت عليها قبل الإجراء ده.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLog(null)}
                disabled={busy}
                className="btn-secondary flex-1 justify-center"
              >
                إلغاء
              </button>
              <button
                onClick={doRevert}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 text-sm font-black transition-colors disabled:opacity-50"
              >
                {busy ? (
                  <span className="w-4 h-4 border-2 border-amber-950/40 border-t-amber-950 rounded-full animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                تأكيد التراجع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
