/**
 * SectionHeader — visual divider between dashboard sections.
 * Adds a clear title + icon + thin underline so the eye can group cards together.
 */
const SectionHeader = ({ icon: Icon, title, subtitle, accent = 'primary' }) => {
  const accentMap = {
    primary: 'from-accent to-accent/0 text-accent bg-accent/10',
    amber:   'from-amber-500 to-amber-500/0 text-amber-400 bg-amber-500/10',
    emerald: 'from-emerald-500 to-emerald-500/0 text-emerald-400 bg-emerald-500/10',
    rose:    'from-rose-500 to-rose-500/0 text-rose-400 bg-rose-500/10',
    violet:  'from-violet-500 to-violet-500/0 text-violet-400 bg-violet-500/10',
  };
  const [gradient, ...rest] = (accentMap[accent] || accentMap.primary).split(' ');
  const textCls = rest.find(c => c.startsWith('text-')) || 'text-accent';
  const bgCls   = rest.find(c => c.startsWith('bg-'))   || 'bg-accent/10';

  return (
    <div className="flex items-center gap-3 pt-2">
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgCls}`}>
          <Icon className={`w-5 h-5 ${textCls}`} />
        </div>
      )}
      <div className="flex-1">
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className={`flex-1 h-px bg-gradient-to-l ${gradient} via-surface-tertiary`} />
    </div>
  );
};

export default SectionHeader;
