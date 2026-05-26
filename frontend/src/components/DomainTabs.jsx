/**
 * DomainTabs — reusable internal tab navigation for domain pages.
 * Each domain page (customers, branches, sales, reps, campaigns, products)
 * uses this to switch between its sub-views without leaving the page.
 */
const DomainTabs = ({ tabs, activeId, onChange }) => {
  return (
    <div className="card p-1.5 flex flex-wrap gap-1 sticky top-2 z-20 backdrop-blur-md">
      {tabs.map((t) => {
        const Icon   = t.icon;
        const active = activeId === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
              active
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                : 'text-dark-400 hover:text-white hover:bg-dark-800/50 border border-transparent'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{t.label}</span>
            {t.count != null && (
              <span className={`text-[10px] px-1.5 rounded-full ${active ? 'bg-primary-500/30' : 'bg-dark-700'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DomainTabs;
