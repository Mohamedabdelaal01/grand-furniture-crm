import { BEHAVIOR_META } from '../utils/leadIntelligence';

const BehaviorBadge = ({ behavior, size = 'sm', showIcon = true, withTooltip = false }) => {
  const meta = BEHAVIOR_META[behavior] || BEHAVIOR_META.new;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-black ${meta.bg} ${meta.border} ${meta.color} ${sizeClasses[size]}`}
      title={withTooltip ? meta.description : undefined}
    >
      {showIcon && <span>{meta.icon}</span>}
      <span>{meta.label}</span>
    </span>
  );
};

export default BehaviorBadge;
