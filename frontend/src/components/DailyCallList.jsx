import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, Check, Phone, UserCheck, Users } from 'lucide-react';
import { formatBranch, formatLeadClass, getLeadBadgeClass } from '../services/api';
import { buildRankedQueue } from '../utils/leadIntelligence';
import generateLeadExplanation from '../utils/leadExplanation';
import BehaviorBadge from './BehaviorBadge';
import useAssignments from '../hooks/useAssignments';
import useCalledToday from '../hooks/useCalledToday';
import useRepList from '../hooks/useRepList';

const DailyCallList = ({ leads, currentRep, onStartSession }) => {
  const navigate = useNavigate();
  const [assignments] = useAssignments();
  const { isCalled, toggleCalled } = useCalledToday();
  const { reps } = useRepList();

  const enrichedQueue = useMemo(() => buildRankedQueue(leads || [], 30), [leads]);

  // Group by assignee
  const groupedByRep = useMemo(() => {
    const map = {};
    reps.forEach((r) => (map[r] = []));
    map.__unassigned__ = [];
    enrichedQueue.forEach((lead) => {
      const rep = assignments[lead.user_id];
      if (rep && map[rep]) map[rep].push(lead);
      else map.__unassigned__.push(lead);
    });
    return map;
  }, [enrichedQueue, assignments]);

  const handlePrint = () => window.print();

  const today = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalCount = enrichedQueue.length;
  const calledCount = enrichedQueue.filter((l) => isCalled(l.user_id)).length;

  if (totalCount === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4">
          <Phone className="w-7 h-7 text-dark-500" />
        </div>
        <p className="text-white font-black mb-1">لا توجد مكالمات مطلوبة النهارده</p>
        <p className="text-dark-400 text-sm">هنعرضلك الأولويات أول ما تظهر</p>
      </div>
    );
  }

  const renderLeadRow = (lead, index) => {
    const called = isCalled(lead.user_id);
    const assignee = assignments[lead.user_id];
    const explanation = generateLeadExplanation(lead);

    return (
      <div
        key={lead.user_id}
        className={`flex items-start gap-3 py-3 px-4 border-b border-dark-800/50 last:border-0 transition-all ${
          called ? 'opacity-50' : 'hover:bg-dark-800/30'
        } print:border-b print:border-gray-300 print:opacity-100 print:py-2`}
      >
        {/* Check */}
        <button
          onClick={() => toggleCalled(lead.user_id)}
          className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all mt-1 ${
            called
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-dark-600 hover:border-emerald-500'
          } print:border-black print:bg-white`}
          aria-label="تم الاتصال"
        >
          {called && <Check className="w-4 h-4 text-white print:text-black" />}
        </button>

        {/* Rank */}
        <span className="text-dark-500 font-black text-sm w-5 text-center flex-shrink-0 mt-1 print:text-black">
          {index + 1}
        </span>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`text-white font-black ${
                  called ? 'line-through text-dark-500' : ''
                } print:text-black print:no-underline`}
              >
                {lead.first_name || 'غير معروف'}
              </span>
              <span className="text-dark-500 text-xs print:text-gray-600">
                • {formatBranch(lead.preferred_branch) || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge ${getLeadBadgeClass(lead.lead_class)} print:border print:border-black print:bg-white print:text-black`}>
                {formatLeadClass(lead.lead_class)}
              </span>
              <BehaviorBadge behavior={lead.behavior} size="sm" />
              <span className="text-primary-400 font-black text-xs print:text-black">
                U:{lead.urgency_score}
              </span>
            </div>
          </div>

          <p className="text-dark-400 text-xs mt-1 leading-relaxed print:text-gray-700">
            {explanation}
          </p>

          <div className="flex items-center gap-3 mt-1.5 text-[11px]">
            <span className={lead.next_action.priority === 'high' ? 'text-rose-400' : 'text-dark-500'}>
              {lead.next_action.icon} {lead.next_action.action}
            </span>
          </div>

          {/* Customer data — phone, product, sessions, ad source */}
          <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-dark-400 flex-wrap print:text-gray-700">
            {lead.phone && (
              <span dir="ltr" className="font-mono font-bold text-emerald-400 print:text-black">
                📱 {lead.phone}
              </span>
            )}
            {lead.last_product && <span>🛋️ {lead.last_product}</span>}
            {lead.last_category && <span className="text-dark-500">{lead.last_category}</span>}
            {lead.session_count != null && <span>جلسات: {lead.session_count}</span>}
            {lead.product_view_count != null && <span>مشاهدات: {lead.product_view_count}</span>}
            {lead.campaign_source && <span>📣 {lead.campaign_source}</span>}
          </div>
          {lead.last_input_text && (
            <p className="text-[11px] text-dark-300 mt-1 leading-snug print:text-gray-700">
              💬 {lead.last_input_text}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1 text-[11px] text-dark-500 print:text-gray-600">
            <span>Conv: {lead.conversion_probability}%</span>
            <span>•</span>
            <span>Priority: {lead.priority_score}</span>
            {assignee && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-400 print:text-black">
                  <UserCheck className="w-3 h-3" />
                  {assignee}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 daily-call-list print:space-y-3">

      {/* ── Header ────────────────────────────────────── */}
      <div className="card p-5 print:shadow-none print:border-b print:border-black">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-white print:text-black">
              قائمة مكالمات اليوم
            </h2>
            <p className="text-dark-400 text-sm mt-1 print:text-gray-700">{today}</p>
            <p className="text-dark-500 text-xs mt-1 print:text-gray-700">
              المندوب: <span className="text-white font-bold print:text-black">{currentRep}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-dark-800/50 border border-dark-700 rounded-xl px-4 py-2 print:hidden">
              <div>
                <p className="text-dark-500 text-[10px] uppercase tracking-wider">تمّ</p>
                <p className="text-emerald-400 font-black text-lg">
                  {calledCount}/{totalCount}
                </p>
              </div>
            </div>

            <button
              onClick={onStartSession}
              className="btn-primary print:hidden"
            >
              <Phone className="w-4 h-4" />
              ابدأ جلسة اتصال
            </button>

            <button
              onClick={handlePrint}
              className="btn-secondary print:hidden"
              title="طباعة القائمة"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-dark-800 rounded-full overflow-hidden print:hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${totalCount > 0 ? (calledCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── By rep groups ─────────────────────────────── */}
      {reps.map((rep) => {
        const list = groupedByRep[rep] || [];
        if (list.length === 0) return null;
        const isCurrentRep = rep === currentRep;
        return (
          <div
            key={rep}
            className={`card overflow-hidden print:shadow-none ${
              isCurrentRep ? 'border-primary-500/30' : ''
            }`}
          >
            <div
              className={`flex items-center justify-between px-5 py-3 border-b border-dark-800 ${
                isCurrentRep ? 'bg-primary-500/5' : 'bg-dark-900/40'
              } print:bg-white print:border-black`}
            >
              <div className="flex items-center gap-2">
                <Users className={`w-4 h-4 ${isCurrentRep ? 'text-primary-400' : 'text-dark-400'} print:text-black`} />
                <span className="text-white font-black print:text-black">{rep}</span>
                {isCurrentRep && (
                  <span className="text-primary-400 text-[10px] font-black uppercase print:text-black">
                    (أنت)
                  </span>
                )}
              </div>
              <span className="text-dark-400 text-xs font-bold print:text-black">
                {list.length} عميل
              </span>
            </div>
            <div>{list.map((lead, i) => renderLeadRow(lead, i))}</div>
          </div>
        );
      })}

      {/* Unassigned */}
      {groupedByRep.__unassigned__.length > 0 && (
        <div className="card overflow-hidden print:shadow-none">
          <div className="flex items-center justify-between px-5 py-3 border-b border-dark-800 bg-dark-900/40 print:bg-white print:border-black">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-dark-400 print:text-black" />
              <span className="text-white font-black print:text-black">بدون تعيين</span>
            </div>
            <span className="text-dark-400 text-xs font-bold print:text-black">
              {groupedByRep.__unassigned__.length} عميل
            </span>
          </div>
          <div>{groupedByRep.__unassigned__.map((lead, i) => renderLeadRow(lead, i))}</div>
        </div>
      )}
    </div>
  );
};

export default DailyCallList;
