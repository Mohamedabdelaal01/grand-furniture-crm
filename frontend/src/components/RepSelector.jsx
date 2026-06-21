import { useEffect } from 'react';
import { UserCircle } from 'lucide-react';
import useRepList from '../hooks/useRepList';

const RepSelector = ({ currentRep, onChange, compact = false }) => {
  const { reps, loading } = useRepList();

  // Auto-select the first rep once the list loads and nothing is selected yet
  useEffect(() => {
    if (!loading && reps.length > 0 && !currentRep) {
      onChange(reps[0]);
    }
  }, [loading, reps, currentRep, onChange]);

  return (
    <div
      className={`flex items-center gap-2 ${
        compact ? '' : 'bg-surface-secondary/40 border border-border rounded-xl px-3 py-2'
      }`}
    >
      {!compact && <UserCircle className="w-4 h-4 text-accent" />}
      {!compact && (
        <span className="text-muted text-[11px] font-bold hidden sm:inline">
          المندوب:
        </span>
      )}

      {loading ? (
        <span className="text-muted text-xs animate-pulse">جاري التحميل…</span>
      ) : reps.length === 0 ? (
        <span className="text-muted text-xs">لا يوجد مندوبون</span>
      ) : (
        <select
          value={currentRep || reps[0]}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-foreground text-xs font-black outline-none cursor-pointer"
        >
          {reps.map((r) => (
            <option key={r} value={r} className="bg-surface">
              {r}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default RepSelector;
