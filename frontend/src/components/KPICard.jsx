import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorMap = {
  primary: {
    icon:       'bg-primary-500/10 text-primary-500 ring-primary-500/20',
    gradient:   'from-primary-500/8 to-transparent',
    accent:     'bg-primary-500',
    trendUp:    'bg-emerald-500/10 text-emerald-400',
    trendDown:  'bg-rose-500/10 text-rose-400',
    trendFlat:  'bg-dark-700/60 text-dark-400',
  },
  success: {
    icon:       'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
    gradient:   'from-emerald-500/8 to-transparent',
    accent:     'bg-emerald-500',
    trendUp:    'bg-emerald-500/10 text-emerald-400',
    trendDown:  'bg-rose-500/10 text-rose-400',
    trendFlat:  'bg-dark-700/60 text-dark-400',
  },
  warning: {
    icon:       'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    gradient:   'from-amber-500/8 to-transparent',
    accent:     'bg-amber-500',
    trendUp:    'bg-emerald-500/10 text-emerald-400',
    trendDown:  'bg-rose-500/10 text-rose-400',
    trendFlat:  'bg-dark-700/60 text-dark-400',
  },
  danger: {
    icon:       'bg-rose-500/10 text-rose-400 ring-rose-500/20',
    gradient:   'from-rose-500/8 to-transparent',
    accent:     'bg-rose-500',
    trendUp:    'bg-rose-500/10 text-rose-400',    // "more hot leads" = bad trend color
    trendDown:  'bg-emerald-500/10 text-emerald-400',
    trendFlat:  'bg-dark-700/60 text-dark-400',
  },
};

const KPICard = ({ icon: Icon, label, value, subtitle, trend, color = 'primary', onClick }) => {
  const c = colorMap[color] || colorMap.primary;

  const interactiveStyles = onClick ? 'cursor-pointer hover:ring-2 hover:ring-primary-500/50' : '';

  const TrendBadge = () => {
    if (trend === null || trend === undefined) return null;
    if (trend === 0) {
      return (
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${c.trendFlat}`}>
          <Minus className="w-3 h-3" />
          <span>0%</span>
        </div>
      );
    }
    const isUp = trend > 0;
    const cls  = isUp ? c.trendUp : c.trendDown;
    return (
      <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${cls}`}>
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span>{Math.abs(trend)}%</span>
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`card card-hover p-6 relative overflow-hidden group h-full ${interactiveStyles}`}
    >
      {/* Glow */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${c.gradient} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />

      {/* Accent line */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${c.accent} opacity-0 group-hover:opacity-30 transition-opacity duration-300`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-dark-400 text-[10px] font-black uppercase tracking-widest mb-3 truncate">{label}</p>
          <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
            <h3 className="text-3xl font-black text-white tracking-tight tabular-nums">{value}</h3>
            <TrendBadge />
          </div>
          {subtitle && (
            <p className="text-dark-500 text-[11px] font-medium leading-snug">{subtitle}</p>
          )}
        </div>

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-1 flex-shrink-0 ml-3 ${c.icon} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
