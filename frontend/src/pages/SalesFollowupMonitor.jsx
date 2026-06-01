/**
 * SalesFollowupMonitor — admin-only oversight of every sales rep's follow-up
 * work. Pre-visit and post-visit follow-ups are kept SEPARATE so the admin can
 * see, per rep: how many customers they have, how many they've actually followed
 * up vs. still pending, and READ the notes they wrote in each follow-up.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Headset, RefreshCw, Search, ChevronDown, PhoneCall, MapPinned,
  CheckCircle2, Clock, AlertTriangle, MessageSquareText,
} from 'lucide-react';
import { fetchSalesFollowupMonitor, formatBranch } from '../services/api';

const fmtDate = (iso) => {
  if (!iso) return '';
  const s = String(iso).replace('T', ' ');
  return s.split('.')[0].slice(0, 16); // YYYY-MM-DD HH:MM
};

/** A small labelled count chip. tone ∈ assigned|good|warn|bad */
function Stat({ label, value, tone = 'assigned' }) {
  const tones = {
    assigned: 'text-dark-100 bg-dark-800/60',
    good: 'text-emerald-400 bg-emerald-500/10',
    warn: 'text-amber-400 bg-amber-500/10',
    bad: 'text-rose-400 bg-rose-500/10',
  };
  return (
    <div className={`flex-1 min-w-[72px] rounded-xl px-3 py-2 text-center ${tones[tone]}`}>
      <div className="text-lg font-black leading-none">{value}</div>
      <div className="text-[10px] font-bold mt-1 opacity-80">{label}</div>
    </div>
  );
}

/** One follow-up note line (recent activity). */
function NoteLine({ name, note, at }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-dark-800/40 last:border-0">
      <MessageSquareText className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white font-bold text-xs truncate">{name || '—'}</span>
          <span className="text-dark-500 text-[10px] shrink-0" dir="ltr">{fmtDate(at)}</span>
        </div>
        {note
          ? <p className="text-dark-300 text-xs mt-0.5 leading-relaxed">{note}</p>
          : <p className="text-dark-600 text-xs mt-0.5 italic">— من غير ملاحظة —</p>}
      </div>
    </div>
  );
}

/** A pending customer line (not yet followed up). */
function PendingLine({ name, phone }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-dark-800/40 last:border-0">
      <span className="text-dark-200 text-xs font-bold truncate flex items-center gap-1.5">
        <Clock className="w-3 h-3 text-amber-400 shrink-0" /> {name || '—'}
      </span>
      {phone && <span className="text-dark-500 font-mono text-[11px] shrink-0" dir="ltr">{phone}</span>}
    </div>
  );
}

/** A pre/post follow-up panel for one rep. */
function FollowupPanel({ kind, data }) {
  const isPre = kind === 'pre';
  const Icon  = isPre ? PhoneCall : MapPinned;
  const total = isPre ? data.assigned : data.total;
  return (
    <div className="flex-1 rounded-2xl border border-dark-800 bg-dark-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${isPre ? 'text-sky-400' : 'text-violet-400'}`} />
        <h4 className="text-white font-black text-sm">
          {isPre ? 'متابعة قبل الزيارة' : 'متابعة بعد الزيارة'}
        </h4>
      </div>

      <div className="flex gap-2">
        <Stat label={isPre ? 'مسند ليه' : 'مطلوب يتابعهم'} value={total} tone="assigned" />
        <Stat label="تابعهم" value={data.followed} tone="good" />
        <Stat label="لسه" value={data.pending} tone={data.pending > 0 ? 'warn' : 'assigned'} />
      </div>

      {/* Recent notes the rep wrote */}
      <div>
        <div className="text-dark-400 text-[11px] font-black mb-1 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> آخر المتابعات اللي كتبها
        </div>
        {data.recent.length === 0 ? (
          <p className="text-dark-600 text-xs italic py-1">لسه مكتبش أي متابعة</p>
        ) : (
          <div className="rounded-xl bg-dark-950/40 px-3">
            {data.recent.map((n, i) => (
              <NoteLine key={i} name={n.first_name} at={isPre ? n.followed_up_at : n.created_at}
                        note={isPre ? n.call_summary : n.note} />
            ))}
          </div>
        )}
      </div>

      {/* Still-pending customers */}
      {data.pending_list.length > 0 && (
        <div>
          <div className="text-dark-400 text-[11px] font-black mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> لسه متابعهمش ({data.pending})
          </div>
          <div className="rounded-xl bg-dark-950/40 px-3">
            {data.pending_list.map((c, i) => (
              <PendingLine key={i} name={c.first_name} phone={c.phone} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One rep card (collapsible). */
function RepCard({ rep, open, onToggle }) {
  const preActive  = rep.pre.assigned > 0;
  const postActive = rep.post.total > 0;
  // "Is this rep actually following up?" — flag a rep who has work but did nothing.
  const idlePre  = preActive  && rep.pre.followed === 0;
  const idlePost = postActive && rep.post.followed === 0;
  const idle     = idlePre || idlePost;
  const totalPending = rep.pre.pending + rep.post.pending;

  return (
    <div className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-right hover:bg-dark-800/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-300 flex items-center justify-center font-black shrink-0">
          {(rep.sales_rep || '?').trim().slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-black truncate">{rep.sales_rep}</span>
            <span className="text-dark-500 text-xs">{formatBranch(rep.branch) || '—'}</span>
            {idle && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> مش بيتابع
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] font-bold">
            <span className="text-sky-400">قبل: {rep.pre.followed}/{rep.pre.assigned}</span>
            <span className="text-violet-400">بعد: {rep.post.followed}/{rep.post.total}</span>
            {totalPending > 0 && <span className="text-amber-400">لسه {totalPending}</span>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-dark-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col lg:flex-row gap-3">
          <FollowupPanel kind="pre"  data={rep.pre} />
          <FollowupPanel kind="post" data={rep.post} />
        </div>
      )}
    </div>
  );
}

export default function SalesFollowupMonitor() {
  const [reps, setReps]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ]             = useState('');
  const [openSet, setOpenSet] = useState(() => new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReps(await fetchSalesFollowupMonitor());
    } catch {
      setReps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim();
    if (!t) return reps;
    return reps.filter((r) =>
      (r.sales_rep || '').includes(t) || (formatBranch(r.branch) || '').includes(t)
    );
  }, [reps, q]);

  const toggle = (name) =>
    setOpenSet((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const allOpen = filtered.length > 0 && filtered.every((r) => openSet.has(r.sales_rep));
  const toggleAll = () =>
    setOpenSet(allOpen ? new Set() : new Set(filtered.map((r) => r.sales_rep)));

  // Roll-up totals across all reps.
  const totals = useMemo(() => reps.reduce((a, r) => ({
    preAssigned:  a.preAssigned  + r.pre.assigned,
    preFollowed:  a.preFollowed  + r.pre.followed,
    postTotal:    a.postTotal    + r.post.total,
    postFollowed: a.postFollowed + r.post.followed,
    idle: a.idle + ((r.pre.assigned && !r.pre.followed) || (r.post.total && !r.post.followed) ? 1 : 0),
  }), { preAssigned: 0, preFollowed: 0, postTotal: 0, postFollowed: 0, idle: 0 }), [reps]);

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-primary-600 rounded-full" />
            <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">الرقابة والمتابعة</span>
          </div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            <Headset className="w-7 h-7 text-primary-400" />
            متابعات السيلز
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            شوف كل سيلز بيتابع ولا لأ — متابعات قبل الزيارة وبعدها، والملاحظات اللي كتبها.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary self-start sm:self-end">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Roll-up */}
      {!loading && reps.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4">
            <div className="text-dark-400 text-[11px] font-bold mb-1">متابعة قبل الزيارة</div>
            <div className="text-white font-black text-xl">{totals.preFollowed}<span className="text-dark-500 text-sm">/{totals.preAssigned}</span></div>
          </div>
          <div className="card p-4">
            <div className="text-dark-400 text-[11px] font-bold mb-1">متابعة بعد الزيارة</div>
            <div className="text-white font-black text-xl">{totals.postFollowed}<span className="text-dark-500 text-sm">/{totals.postTotal}</span></div>
          </div>
          <div className="card p-4">
            <div className="text-dark-400 text-[11px] font-bold mb-1">عدد السيلز</div>
            <div className="text-white font-black text-xl">{reps.length}</div>
          </div>
          <div className="card p-4">
            <div className="text-dark-400 text-[11px] font-bold mb-1">مش بيتابعوا</div>
            <div className={`font-black text-xl ${totals.idle ? 'text-rose-400' : 'text-emerald-400'}`}>{totals.idle}</div>
          </div>
        </div>
      )}

      {/* Search + expand all */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-dark-500 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم السيلز أو الفرع..."
            className="input-field w-full pr-9 text-sm py-2"
          />
        </div>
        {filtered.length > 0 && (
          <button onClick={toggleAll} className="btn-secondary whitespace-nowrap text-sm">
            {allOpen ? 'اطوي الكل' : 'افتح الكل'}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Headset className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400 font-bold">لا يوجد سيلز بمتابعات لعرضها</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((rep) => (
            <RepCard
              key={rep.sales_rep}
              rep={rep}
              open={openSet.has(rep.sales_rep)}
              onToggle={() => toggle(rep.sales_rep)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
