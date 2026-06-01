import { useState } from 'react';
import { formatBranch, fetchCustomerJourney } from '../services/api';

/**
 * CrossBranchTags — compact tags on a customer card flagging a "comparer" (dealt
 * with >1 branch) and where they bought. The "قارن فروع" tag EXPANDS in place to
 * show the full cross-branch story (which branches they visited + who served them
 * + where they bought) so the rep/manager sees it without opening the profile.
 *
 * The card's own branch/rep already shows the OWNER (who sold to them in this
 * branch); this just adds the comparison context. Needs the list endpoint to
 * return `branches_count` + `bought_branch`.
 *
 * NOTE: relies on the parent badge row being `flex-wrap` — the expanded detail is
 * a full-width child that wraps onto its own line.
 */
export default function CrossBranchTags({ c }) {
  const [open, setOpen]       = useState(false);
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!c || (c.branches_count || 0) <= 1) return null;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && !journey) {
      setLoading(true);
      try { setJourney(await fetchCustomerJourney(c.user_id)); }
      catch { setJourney({ visits: [], purchases: [] }); }
      setLoading(false);
    }
  };

  const items = journey
    ? [
        ...(journey.visits    || []).map(v => ({ kind: 'visit',    branch: v.branch, who: v.sales_rep, at: v.visited_at })),
        ...(journey.purchases || []).map(p => ({ kind: 'purchase', branch: p.branch, who: p.rep,       at: p.created_at })),
      ].sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0))
    : [];

  return (
    <>
      <button
        onClick={toggle}
        title="تفاصيل الفروع اللي العميل اتعامل معاها"
        className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
      >
        🔀 قارن فروع {open ? '▴' : '▾'}
      </button>
      {c.bought_branch && (
        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          🛒 اشترى من {formatBranch(c.bought_branch)}
        </span>
      )}
      {open && (
        <div className="basis-full w-full mt-1.5 rounded-lg bg-dark-800/60 border border-amber-500/20 px-3 py-2 space-y-1" dir="rtl">
          {loading ? (
            <p className="text-dark-500 text-[11px]">جاري التحميل...</p>
          ) : items.length ? (
            items.map((it, i) => (
              <p key={i} className="text-[11px] text-dark-200 leading-relaxed">
                <span className="font-bold">{it.kind === 'purchase' ? '🛒 اشترى من' : '🏬 زار'} {it.branch ? formatBranch(it.branch) : '—'}</span>
                {it.who ? <span className="text-dark-400"> — وقف مع {it.who}</span> : null}
              </p>
            ))
          ) : (
            <p className="text-dark-500 text-[11px]">مفيش تفاصيل</p>
          )}
        </div>
      )}
    </>
  );
}
