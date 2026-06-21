import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Target } from 'lucide-react';
import { formatBranch, formatLeadClass, getLeadBadgeClass } from '../services/api';
import { enrichLead } from '../utils/leadIntelligence';
import BehaviorBadge from './BehaviorBadge';
import useAssignments from '../hooks/useAssignments';
import useCallSession, { OUTCOME_META } from '../hooks/useCallSession';

const MyLeadsPanel = ({ leads, currentRep, onStartSession }) => {
  const navigate = useNavigate();
  const [assignments] = useAssignments();
  const session = useCallSession(currentRep);

  const myLeads = useMemo(() => {
    const assigned = (leads || []).filter(
      (l) => assignments[l.user_id] === currentRep
    );
    return assigned.map(enrichLead).sort((a, b) => b.urgency_score - a.urgency_score);
  }, [leads, assignments, currentRep]);

  if (myLeads.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-surface-secondary flex items-center justify-center mx-auto mb-4">
          <UserCheck className="w-7 h-7 text-muted" />
        </div>
        <p className="text-foreground font-black mb-2">لا يوجد عملاء معينين ليك</p>
        <p className="text-muted text-sm mb-6">
          روح على جدول العملاء وعيّن نفسك على الـ leads
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="card p-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">عملائي</h2>
          <p className="text-muted text-sm mt-1">
            <span className="text-emerald-400 font-bold">{currentRep}</span>
            {' • '}
            {myLeads.length} عميل معيّن
          </p>
        </div>

        <button onClick={onStartSession} className="btn-primary">
          <Target className="w-4 h-4" />
          ابدأ جلسة اتصال
        </button>
      </div>

      {/* Leads grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myLeads.map((lead) => {
          const outcome = session.getOutcomeForLead(lead.user_id);
          const outcomeMeta = outcome ? OUTCOME_META[outcome] : null;

          return (
            <div
              key={lead.user_id}
              onClick={() => navigate(`/leads/${lead.user_id}`)}
              className="card p-4 cursor-pointer hover:border-accent/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-black truncate">
                    {lead.first_name || 'غير معروف'}
                  </p>
                  <p className="text-muted text-xs mt-0.5">
                    {formatBranch(lead.preferred_branch) || 'لم يحدد'}
                  </p>
                </div>
                <span className={`badge ${getLeadBadgeClass(lead.lead_class)}`}>
                  {formatLeadClass(lead.lead_class)}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <BehaviorBadge behavior={lead.behavior} size="sm" withTooltip />
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-surface-secondary border border-border text-foreground font-bold">
                  {lead.timing.label}
                </span>
              </div>

              {/* Customer data — phone, product, activity, ad source */}
              <div className="flex flex-wrap gap-x-2.5 gap-y-1 mb-3 text-[11px] text-muted">
                {lead.phone && (
                  <span dir="ltr" className="font-mono font-bold text-emerald-400">
                    📱 {lead.phone}
                  </span>
                )}
                {lead.last_product && <span>🛋️ {lead.last_product}</span>}
                {lead.last_category && <span className="text-muted">{lead.last_category}</span>}
                {lead.session_count != null && <span>جلسات: {lead.session_count}</span>}
                {lead.campaign_source && <span>📣 {lead.campaign_source}</span>}
              </div>
              {lead.last_input_text && (
                <p className="text-[11px] text-foreground mb-3 leading-snug bg-background/40 border border-border rounded-lg px-2.5 py-1.5">
                  💬 {lead.last_input_text}
                </p>
              )}

              <div className="bg-background/40 border border-border rounded-lg p-2.5 mb-3">
                <p className="text-[11px] text-foreground font-bold leading-snug">
                  <span className="mr-1">{lead.next_action.icon}</span>
                  {lead.next_action.action}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-black">
                    {lead.conversion_probability}%
                  </span>
                  <span className="text-muted">P: {lead.priority_score}</span>
                </div>

                {outcomeMeta && (
                  <span className={`${outcomeMeta.color} text-[10px] font-black`}>
                    ✓ {outcomeMeta.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyLeadsPanel;
