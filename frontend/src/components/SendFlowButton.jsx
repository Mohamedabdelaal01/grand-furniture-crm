import { useState } from 'react';
import { Send, Check, AlertCircle } from 'lucide-react';
import { triggerMessage } from '../services/api';

// Arabic labels matching the existing UI tone.
const LABELS = {
  send_immediate:   'إرسال فوري',
  send_branch_info: 'إرسال بيانات الفرع',
  send_offer:       'إرسال عرض',
  re_engage:        'إعادة تفعيل',
};

/**
 * SendFlowButton — fires a ManyChat flow for a lead via the backend.
 * Honors the 2/week limit (server returns 429). Shows inline state.
 *
 * Props:
 *   userId       — string, the lead's manychat user_id (required)
 *   actionType   — optional override (otherwise the server picks)
 *   size         — 'sm' | 'md' (default 'md')
 *   onSent       — callback fired with the API response on success
 *   stopPropagation — prevents row click bubbling (true inside tables)
 */
export default function SendFlowButton({
  userId,
  actionType,
  size = 'md',
  onSent,
  stopPropagation = false,
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);  // 'ok' | 'limit' | 'error'
  const [errorText, setErrorText] = useState(null);

  async function handleClick(e) {
    if (stopPropagation) e.stopPropagation();
    if (!userId || busy) return;
    setBusy(true);
    setResult(null);
    setErrorText(null);
    try {
      const data = await triggerMessage({ user_id: userId, action_type: actionType });
      setResult('ok');
      onSent?.(data);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error || err.message;
      if (status === 429) {
        setResult('limit');
        setErrorText('وصلت للحد الأسبوعي (2)');
      } else {
        setResult('error');
        setErrorText(message);
      }
    } finally {
      setBusy(false);
    }
  }

  const padding = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm';

  let cls = 'bg-primary-600 hover:bg-primary-500 text-white border-primary-500/40';
  let Icon = Send;
  let label = actionType ? (LABELS[actionType] || 'إرسال') : 'إرسال';

  if (result === 'ok') {
    cls = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    Icon = Check;
    label = 'تم الإرسال';
  } else if (result === 'limit') {
    cls = 'bg-amber-500/15 text-amber-300 border-amber-500/40 cursor-not-allowed';
    Icon = AlertCircle;
    label = 'الحد الأسبوعي';
  } else if (result === 'error') {
    cls = 'bg-rose-500/15 text-rose-300 border-rose-500/40';
    Icon = AlertCircle;
    label = 'فشل';
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || result === 'limit'}
        className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition-colors active:scale-95 disabled:opacity-60 ${padding} ${cls}`}
        title={errorText || label}
      >
        <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{busy ? '...' : label}</span>
      </button>
      {errorText && result !== 'limit' && (
        <span className="text-[10px] text-rose-300">{errorText}</span>
      )}
    </div>
  );
}
