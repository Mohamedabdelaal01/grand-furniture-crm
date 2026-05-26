import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, UserCheck, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatLeadClass, getLeadBadgeClass, formatBranch } from '../services/api';
import generateLeadExplanation from '../utils/leadExplanation';
import { enrichLead } from '../utils/leadIntelligence';
import useAssignments from '../hooks/useAssignments';
import useRepList from '../hooks/useRepList';
import BehaviorBadge from './BehaviorBadge';
import SendFlowButton from './SendFlowButton';

// ── helpers ─────────────────────────────────────────
const parseSqliteDate = (str) => {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
};

// ── زرار معلومات + popover ───────────────────────────
const InfoButton = ({ explanation }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-7 h-7 flex items-center justify-center rounded-lg bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 transition-colors"
        title="ليه العميل ده أولوية؟"
        aria-label="عرض سبب الأولوية"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-2 left-0 sm:left-auto sm:right-0 w-64 bg-dark-900 border border-primary-500/30 rounded-xl shadow-2xl p-3 text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-1.5">
            <span className="text-primary-400 text-[10px] font-black uppercase tracking-wider">
              ليه العميل ده أولوية؟
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
              className="text-dark-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-white text-xs leading-relaxed font-bold">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Sales rep dropdown ───────────────────────────────
const AssigneeSelect = ({ userId, assignee, onChange }) => {
  const { reps } = useRepList();
  return (
    <select
      value={assignee || ''}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onChange(userId, e.target.value || null);
      }}
      className={`text-xs font-bold rounded-lg px-2 py-1.5 border transition-colors cursor-pointer outline-none ${
        assignee
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-dark-800 border-dark-700 text-dark-400 hover:text-white'
      }`}
    >
      <option value="">بدون</option>
      {reps.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
};

const PAGE_SIZES = [10, 25, 50, 100];

// ── Main Component ───────────────────────────────────
const HotLeadsTable = ({ leads }) => {
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterClass,   setFilterClass]   = useState('all');
  const [specialFilter, setSpecialFilter] = useState('none');
  const [page,          setPage]          = useState(1);
  const [pageSize,      setPageSize]      = useState(25);

  const navigate = useNavigate();
  const [assignments, setAssignment] = useAssignments();

  // Enrich + filter
  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    let data = leads.map(enrichLead).filter(Boolean);

    if (searchTerm) {
      data = data.filter((l) =>
        l.first_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterClass !== 'all') {
      data = data.filter((l) => l.lead_class === filterClass);
    }

    if (specialFilter === 'location_not_visited') {
      data = data.filter((l) => l.location_requested && !l.visit_confirmed);
    } else if (specialFilter === 'ready') {
      data = data.filter((l) => l.behavior === 'ready');
    } else if (specialFilter === 'at_risk') {
      data = data.filter((l) => l.risk_score >= 50);
    }

    return data.sort((a, b) => b.urgency_score - a.urgency_score);
  }, [leads, searchTerm, filterClass, specialFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); }, [searchTerm, filterClass, specialFilter, pageSize]);

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pagedLeads = filteredLeads.slice(pageStart, pageStart + pageSize);

  const goToLead = useCallback((id) => navigate(`/leads/${id}`), [navigate]);

  const topLeads = filteredLeads.slice(0, 3);

  return (
    <div className="card overflow-hidden space-y-6 p-6">

      {/* ── CALL NOW SECTION ─────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span className="text-rose-400">🔥</span>
            <span>اتصل حالاً</span>
          </h2>
          <span className="text-dark-500 text-xs font-bold">أعلى 3 أولوية</span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {topLeads.map((lead) => {
            const explanation = generateLeadExplanation(lead);
            const assignee = assignments[lead.user_id];
            return (
              <div
                key={lead.user_id}
                className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 hover:border-rose-500/40 transition-colors cursor-pointer"
                onClick={() => goToLead(lead.user_id)}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className="text-white font-black">{lead.first_name || 'غير معروف'}</p>
                  {lead.recency_bonus === 30 && (
                    <span className="text-rose-400 text-[10px] font-black animate-pulse">
                      الآن 🔴
                    </span>
                  )}
                </div>

                <p className="text-dark-400 text-xs mb-2">
                  {formatBranch(lead.preferred_branch) || 'لم يحدد فرع'}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <BehaviorBadge behavior={lead.behavior} size="sm" withTooltip />
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-dark-900/60 border border-dark-800 text-dark-300 font-bold">
                    {lead.timing.label}
                  </span>
                </div>

                <p className="text-dark-300 text-xs leading-relaxed mb-3 min-h-[2.5rem]">
                  {explanation}
                </p>

                <div className="bg-dark-950/40 border border-dark-800/50 rounded-lg p-2 mb-3">
                  <p className="text-[11px] text-white font-bold leading-snug">
                    <span className="mr-1">{lead.next_action.icon}</span>
                    {lead.next_action.action}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-rose-500/10">
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-emerald-400 font-black">
                      {lead.conversion_probability}%
                    </span>
                    <span className="text-dark-500">U: {lead.urgency_score}</span>
                  </div>
                  {assignee && (
                    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black">
                      <UserCheck className="w-3 h-3" />
                      {assignee}
                    </span>
                  )}
                </div>

                <div
                  className="pt-2 flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SendFlowButton userId={lead.user_id} size="sm" />
                </div>
              </div>
            );
          })}

          {topLeads.length === 0 && (
            <div className="col-span-3 py-8 text-center text-dark-400 text-sm">
              لا يوجد عملاء ساخنين حالياً
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ───────────────────────── */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-dark-800">
        <input
          placeholder="بحث بالاسم..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field flex-1 min-w-[180px]"
        />

        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">كل التصنيفات</option>
          <option value="hot">ساخن</option>
          <option value="warm">دافئ</option>
          <option value="cold">بارد</option>
          <option value="converted">تم التحويل</option>
        </select>

        <select
          value={specialFilter}
          onChange={(e) => setSpecialFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="none">بدون فلتر خاص</option>
          <option value="ready">جاهزين فقط</option>
          <option value="at_risk">في خطر</option>
          <option value="location_not_visited">طلب موقع ولم يزر</option>
        </select>
      </div>

      {/* ── Table ───────────────────────── */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-dark-400 border-b border-dark-800 text-right text-[11px] uppercase font-black tracking-wider">
              <th className="py-3 px-2 w-10">#</th>
              <th className="py-3 px-2">الاسم</th>
              <th className="py-3 px-2 hidden md:table-cell">الفرع</th>
              <th className="py-3 px-2 hidden lg:table-cell">السلوك</th>
              <th className="py-3 px-2">التصنيف</th>
              <th className="py-3 px-2 hidden sm:table-cell">آخر نشاط</th>
              <th className="py-3 px-2">Conv %</th>
              <th className="py-3 px-2">Urgency</th>
              <th className="py-3 px-2 hidden xl:table-cell">الإجراء</th>
              <th className="py-3 px-2">مندوب</th>
              <th className="py-3 px-2 hidden lg:table-cell">إرسال</th>
              <th className="py-3 px-2 w-10">سبب</th>
            </tr>
          </thead>

          <tbody>
            {pagedLeads.map((lead, i) => {
              const isUrgent = lead.timing.urgent;
              const explanation = generateLeadExplanation(lead);
              const assignee = assignments[lead.user_id];
              const globalIndex = pageStart + i;

              return (
                <tr
                  key={lead.user_id}
                  className={`cursor-pointer hover:bg-dark-800/40 transition-colors border-b border-dark-800/50 ${
                    isUrgent ? 'bg-rose-500/[0.04]' : ''
                  }`}
                  onClick={() => goToLead(lead.user_id)}
                >
                  <td className="py-3 px-2 text-dark-500 font-bold">{globalIndex + 1}</td>

                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">
                        {lead.first_name || 'غير معروف'}
                      </span>
                      {lead.location_requested ? (
                        <span title="طلب موقع" className="text-primary-400">📍</span>
                      ) : null}
                      {lead.visit_confirmed ? (
                        <span title="أكد زيارة" className="text-emerald-400">✅</span>
                      ) : null}
                    </div>
                  </td>

                  <td className="py-3 px-2 hidden md:table-cell text-dark-300">
                    {formatBranch(lead.preferred_branch) || '—'}
                  </td>

                  <td className="py-3 px-2 hidden lg:table-cell">
                    <BehaviorBadge behavior={lead.behavior} size="sm" withTooltip />
                  </td>

                  <td className="py-3 px-2">
                    <span className={`badge ${getLeadBadgeClass(lead.lead_class)}`}>
                      {formatLeadClass(lead.lead_class)}
                    </span>
                  </td>

                  <td className="py-3 px-2 hidden sm:table-cell text-xs text-dark-400">
                    {lead.last_activity
                      ? formatDistanceToNow(parseSqliteDate(lead.last_activity), {
                          addSuffix: true,
                          locale: ar,
                        })
                      : '—'}
                  </td>

                  <td className="py-3 px-2">
                    <span className="text-emerald-400 font-black">
                      {lead.conversion_probability}%
                    </span>
                  </td>

                  <td className="py-3 px-2">
                    <span className={`font-black ${isUrgent ? 'text-rose-400' : 'text-primary-400'}`}>
                      {lead.urgency_score}
                    </span>
                  </td>

                  <td className="py-3 px-2 hidden xl:table-cell max-w-[200px]">
                    <span className="text-dark-300 text-xs leading-snug">
                      <span className="mr-1">{lead.next_action.icon}</span>
                      {lead.next_action.action}
                    </span>
                  </td>

                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <AssigneeSelect
                      userId={lead.user_id}
                      assignee={assignee}
                      onChange={setAssignment}
                    />
                  </td>

                  <td className="py-3 px-2 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <SendFlowButton userId={lead.user_id} size="sm" stopPropagation />
                  </td>

                  <td className="py-3 px-2" onClick={(e) => e.stopPropagation()}>
                    <InfoButton explanation={explanation} />
                  </td>
                </tr>
              );
            })}

            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={12} className="py-10 text-center text-dark-400">
                  لا توجد بيانات مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────── */}
      {filteredLeads.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-dark-800">
          <div className="flex items-center gap-2 text-xs text-dark-400">
            <span>
              {pageStart + 1}–{Math.min(pageStart + pageSize, filteredLeads.length)}
              {' '}من{' '}
              <span className="text-white font-bold">{filteredLeads.length}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-dark-700" />
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="input-field py-1 text-xs w-auto"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} لكل صفحة</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="px-2 py-1.5 rounded-lg text-xs font-bold text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ‹ السابق
            </button>

            {/* Page number chips */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    p === safePage
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              التالي ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 py-1.5 rounded-lg text-xs font-bold text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotLeadsTable;
