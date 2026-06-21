/**
 * TransferRepModal — admin tool to MOVE a sales rep to another branch without
 * dragging their customers along. The rep's old-branch pre-visit customers are
 * released back to that branch's unassigned pool; history stays untouched.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRightLeft, X, AlertTriangle } from 'lucide-react';
import { transferRep, formatBranch } from '../services/api';
import useBranches from '../hooks/useBranches';

export default function TransferRepModal({ reps = [], onClose, onDone }) {
  const { branches } = useBranches();
  const [repId, setRepId]   = useState('');
  const [branch, setBranch] = useState('');
  const [busy, setBusy]     = useState(false);

  const rep = reps.find((r) => String(r.id) === String(repId));
  const valid = rep && branch && rep.branch !== branch;

  const submit = async () => {
    if (!valid) return;
    if (!window.confirm(
      `هتنقل "${rep.name}" من فرع ${formatBranch(rep.branch) || '—'} لفرع ${formatBranch(branch)}.\n` +
      `عملاءه قبل الزيارة في الفرع القديم هيرجعوا "مش متوزّع" عشان مدير الفرع يوزّعهم.\n` +
      `التاريخ (الزيارات والتعاقدات) هيفضل زي ما هو. تمام؟`
    )) return;
    setBusy(true);
    const tId = toast.loading('جاري النقل...');
    try {
      const res = await transferRep(rep.id, branch);
      toast.success(
        `تم نقل ${res.rep} لفرع ${formatBranch(res.to)} — ${res.released} عميل رجعوا "مش متوزّع" في ${formatBranch(res.from) || 'الفرع القديم'}`,
        { id: tId, duration: 6000 }
      );
      onDone?.();
      onClose?.();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'فشل النقل', { id: tId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" dir="rtl" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl"
           onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-foreground font-black text-lg flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-accent" />
            نقل سيلز لفرع تاني
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-muted text-xs">
            السيلز هيتنقل <strong className="text-foreground">فاضي</strong> — عملاءه القدام يفضلوا في فرعهم، والتاريخ زي ما هو.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-muted text-[11px] font-black">السيلز</label>
              <select value={repId} onChange={(e) => setRepId(e.target.value)} className="input-field w-full">
                <option value="">— اختار سيلز —</option>
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} — {formatBranch(r.branch) || 'بدون فرع'}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted text-[11px] font-black">الفرع الجديد</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} className="input-field w-full">
                <option value="">— اختار فرع —</option>
                {branches.filter((b) => !rep || b.id !== rep.branch).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {valid && (
            <div className="rounded-xl bg-background/50 border border-border p-4 text-sm space-y-2">
              <div className="flex items-center gap-2 text-foreground">
                <span className="font-bold text-foreground">{rep.name}</span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
                <span>من <span className="text-foreground font-bold">{formatBranch(rep.branch) || '—'}</span> لـ <span className="text-accent font-bold">{formatBranch(branch)}</span></span>
              </div>
              <div className="flex items-start gap-1.5 text-amber-400/90 text-[11px] pt-1 border-t border-border">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                عملاءه قبل الزيارة في الفرع القديم هيرجعوا «مش متوزّع». التعاقدات ومتابعات بعد الزيارة بتفضل مع صاحبها.
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="btn-secondary">إلغاء</button>
            <button onClick={submit} disabled={!valid || busy} className="btn-primary disabled:opacity-40">
              {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><ArrowRightLeft className="w-4 h-4" /> انقله دلوقتي</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
