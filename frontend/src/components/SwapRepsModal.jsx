/**
 * SwapRepsModal — admin tool to swap two sales reps: exchange their branch AND
 * their pre-visit customer lists in one click. Post-visit (revisit) customers
 * each one personally served stay with them (owner-based). Reusable anytime.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeftRight, X, AlertTriangle } from 'lucide-react';
import { swapReps, formatBranch } from '../services/api';

export default function SwapRepsModal({ reps = [], onClose, onDone }) {
  const [aId, setAId]   = useState('');
  const [bId, setBId]   = useState('');
  const [busy, setBusy] = useState(false);

  const a = reps.find((r) => String(r.id) === String(aId));
  const b = reps.find((r) => String(r.id) === String(bId));
  const valid = a && b && a.id !== b.id;

  const submit = async () => {
    if (!valid) return;
    if (!window.confirm(
      `هتبدّل "${a.name}" و "${b.name}":\n` +
      `• ${a.name} → فرع ${formatBranch(b.branch) || '—'} وياخد عملاء ${b.name} قبل الزيارة\n` +
      `• ${b.name} → فرع ${formatBranch(a.branch) || '—'} وياخد عملاء ${a.name} قبل الزيارة\n` +
      `التاريخ ومتابعات بعد الزيارة بتفضل زي ما هي. تمام؟`
    )) return;
    setBusy(true);
    const tId = toast.loading('جاري التبديل...');
    try {
      const res = await swapReps(a.id, b.id);
      toast.success(
        `تم التبديل ✓  ${res.a.name}: ${res.a.after} عميل (${formatBranch(res.a.new_branch)}) · ` +
        `${res.b.name}: ${res.b.after} عميل (${formatBranch(res.b.new_branch)})`,
        { id: tId, duration: 6000 }
      );
      onDone?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل التبديل', { id: tId });
    } finally {
      setBusy(false);
    }
  };

  const RepSelect = ({ value, onChange, exclude }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field w-full">
      <option value="">— اختار سيلز —</option>
      {reps.filter((r) => String(r.id) !== String(exclude)).map((r) => (
        <option key={r.id} value={r.id}>{r.name} — {formatBranch(r.branch) || 'بدون فرع'}</option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl"
         onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl"
           onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-foreground font-black text-lg flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-accent" />
            تبديل سيلزين
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-muted text-xs">
            كل سيلز هيروح فرع التاني وياخد عملاءه <strong className="text-foreground">قبل الزيارة</strong>. العملاء بيفضلوا في فروعهم.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-muted text-[11px] font-black">السيلز الأول</label>
              <RepSelect value={aId} onChange={setAId} exclude={bId} />
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[11px] font-black">السيلز التاني</label>
              <RepSelect value={bId} onChange={setBId} exclude={aId} />
            </div>
          </div>

          {/* Preview */}
          {valid && (
            <div className="rounded-xl bg-background/50 border border-border p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <span className="font-bold text-foreground">{a.name}</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
                <span>فرع <span className="text-accent font-bold">{formatBranch(b.branch) || '—'}</span></span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <span className="font-bold text-foreground">{b.name}</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
                <span>فرع <span className="text-accent font-bold">{formatBranch(a.branch) || '—'}</span></span>
              </div>
              <div className="flex items-start gap-1.5 text-amber-400/90 text-[11px] pt-1 border-t border-border">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                التبديل بيأثر على متابعات <strong>قبل الزيارة</strong> + الفرع. التعاقدات ومتابعات بعد الزيارة بتفضل مع صاحبها.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">إلغاء</button>
            <button onClick={submit} disabled={!valid || busy} className="btn-primary disabled:opacity-40">
              {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><ArrowLeftRight className="w-4 h-4" /> بدّل دلوقتي</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
