import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, TrendingUp, AlertTriangle, Layers, UserCheck } from 'lucide-react';
import { formatBranch } from '../services/api';
import { groupLeads } from '../utils/leadIntelligence';
import BehaviorBadge from './BehaviorBadge';
import useAssignments from '../hooks/useAssignments';

const GROUP_CONFIG = {
  callNow: {
    title: 'اتصل حالاً',
    icon: Phone,
    color: 'text-rose-400',
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/20',
    accent: 'bg-rose-500',
    description: 'أولوية عليا — تواصل فوراً',
  },
  highOpportunity: {
    title: 'فرصة عالية',
    icon: TrendingUp,
    color: 'text-primary-400',
    bg: 'bg-primary-500/5',
    border: 'border-primary-500/20',
    accent: 'bg-primary-500',
    description: 'احتمال تحويل عالي — تابع اليوم',
  },
  atRisk: {
    title: 'في خطر',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    accent: 'bg-amber-500',
    description: 'ممكن نخسرهم — محتاجين متابعة',
  },
  lowPriority: {
    title: 'أولوية منخفضة',
    icon: Layers,
    color: 'text-dark-400',
    bg: 'bg-dark-800/40',
    border: 'border-dark-700',
    accent: 'bg-dark-600',
    description: 'nurture — حملات عامة',
  },
};

const LeadCard = ({ lead, assignee, onClick }) => {
  const nextAction = lead.next_action;
  const prioClass =
    nextAction.priority === 'high'
      ? 'text-rose-400'
      : nextAction.priority === 'medium'
      ? 'text-amber-400'
      : 'text-dark-400';

  return (
    <div
      onClick={() => onClick(lead.user_id)}
      className="bg-dark-900/50 hover:bg-dark-800/60 border border-dark-800 hover:border-primary-500/30 rounded-xl p-3 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-white font-black text-sm truncate">
            {lead.first_name || 'غير معروف'}
          </p>
          <p className="text-dark-400 text-[11px] mt-0.5">
            {formatBranch(lead.preferred_branch) || 'لم يحدد'}
          </p>
        </div>
        <BehaviorBadge behavior={lead.behavior} size="sm" />
      </div>

      <div className="flex items-start gap-2 bg-dark-950/40 rounded-lg p-2 mb-2 border border-dark-800/50">
        <span className="text-base flex-shrink-0">{nextAction.icon}</span>
        <p className={`text-[11px] font-bold leading-snug ${prioClass}`}>
          {nextAction.action}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3">
          <span className="text-primary-400 font-black">
            {lead.conversion_probability}%
          </span>
          <span className="text-dark-500">
            urgency: {lead.urgency_score}
          </span>
        </div>
        {assignee && (
          <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-black">
            <UserCheck className="w-3 h-3" />
            {assignee}
          </span>
        )}
      </div>
    </div>
  );
};

const GroupSection = ({ groupKey, leads, assignments, onLeadClick }) => {
  const cfg = GROUP_CONFIG[groupKey];
  const Icon = cfg.icon;
  if (!leads || leads.length === 0) return null;

  return (
    <div
      className={`card p-5 border ${cfg.border} ${cfg.bg}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${cfg.color}`} />
          </div>
          <div>
            <h3 className={`font-black ${cfg.color}`}>{cfg.title}</h3>
            <p className="text-dark-500 text-[11px] mt-0.5">{cfg.description}</p>
          </div>
        </div>
        <span className={`${cfg.accent} text-white font-black text-sm px-3 py-1 rounded-full`}>
          {leads.length}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {leads.map((lead) => (
          <LeadCard
            key={lead.user_id}
            lead={lead}
            assignee={assignments[lead.user_id]}
            onClick={onLeadClick}
          />
        ))}
      </div>
    </div>
  );
};

const LeadGroups = ({ leads }) => {
  const navigate = useNavigate();
  const [assignments] = useAssignments();

  const groups = useMemo(() => groupLeads(leads || []), [leads]);

  const handleLeadClick = (id) => navigate(`/leads/${id}`);

  if (!leads || leads.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-dark-400">لا توجد بيانات عملاء</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <GroupSection groupKey="callNow" leads={groups.callNow} assignments={assignments} onLeadClick={handleLeadClick} />
      <GroupSection groupKey="highOpportunity" leads={groups.highOpportunity} assignments={assignments} onLeadClick={handleLeadClick} />
      <GroupSection groupKey="atRisk" leads={groups.atRisk} assignments={assignments} onLeadClick={handleLeadClick} />
      <GroupSection groupKey="lowPriority" leads={groups.lowPriority} assignments={assignments} onLeadClick={handleLeadClick} />
    </div>
  );
};

export default LeadGroups;
