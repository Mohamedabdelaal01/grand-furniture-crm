import { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { fetchProducts } from '../services/api';

// Reusable multi-select for the product catalog.
// Loads /api/products once on mount, then renders an accordion: categories
// are collapsed by default; clicking one expands its products. A search box
// is also provided — typing auto-expands matching categories.
//
// Props:
//   selectedIds (number[])              — controlled value
//   onChange    (ids: number[]) => void — emits the new selection
//   compact     (boolean)               — denser layout for inline panels
//   label       (string)                — optional override (default: "المنتجات")
const ProductMultiSelect = ({ selectedIds = [], onChange, compact = false, label }) => {
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery]     = useState('');
  const [loaded, setLoaded]   = useState(false);
  const [openCats, setOpenCats] = useState(() => new Set());

  useEffect(() => {
    fetchProducts()
      .then(d => setCatalog(d.products || []))
      .catch(() => setCatalog([]))
      .finally(() => setLoaded(true));
  }, []);

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id];
    onChange?.(next);
  };

  const toggleCat = (catName) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName); else next.add(catName);
      return next;
    });
  };

  // Group products by category, applying the search filter (if any).
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.reduce((acc, p) => {
      if (q && !p.name.toLowerCase().includes(q)) return acc;
      if (!acc[p.category_name]) acc[p.category_name] = [];
      acc[p.category_name].push(p);
      return acc;
    }, {});
  }, [catalog, query]);

  // Count of selected products per category for the badge in the header.
  const selectedByCat = useMemo(() => {
    const map = {};
    for (const id of selectedIds) {
      const p = catalog.find(x => x.id === id);
      if (!p) continue;
      map[p.category_name] = (map[p.category_name] || 0) + 1;
    }
    return map;
  }, [selectedIds, catalog]);

  // When searching, auto-expand every category that has a match. Otherwise
  // respect the user's manual open/close state.
  const isOpen = (catName) => (query.trim() ? true : openCats.has(catName));

  const pickerHeight = compact ? 'max-h-56' : 'max-h-80';

  if (loaded && catalog.length === 0) {
    return (
      <div>
        <label className="block text-muted text-xs font-bold mb-1.5">
          {label || 'المنتجات في العقد'}
        </label>
        <p className="text-muted text-xs p-3 rounded-xl bg-surface/40 border border-border">
          لسه مفيش منتجات في الكاتالوج. الأدمن لازم يضيفها من "إدارة المنتجات".
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-muted text-xs font-bold mb-1.5">
        {label || 'المنتجات في العقد'}
        {selectedIds.length > 0 && (
          <span className="text-accent mr-2">({selectedIds.length} مختار)</span>
        )}
      </label>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedIds.map(id => {
            const p = catalog.find(x => x.id === id);
            if (!p) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/15 border border-accent/30 text-accent text-xs font-bold"
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="🔎 ابحث عن منتج…"
        className="input-field w-full text-sm mb-2"
      />

      <div className={`${pickerHeight} overflow-y-auto rounded-xl border border-border bg-surface/40 p-1.5 space-y-1`}>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-muted text-xs text-center py-4">
            {loaded ? 'مفيش نتائج' : 'جاري التحميل…'}
          </p>
        ) : (
          Object.entries(grouped).map(([catName, items]) => {
            const open = isOpen(catName);
            const selectedCount = selectedByCat[catName] || 0;
            return (
              <div key={catName} className="rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCat(catName)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 bg-surface-secondary/40 hover:bg-surface-secondary/70 transition-colors"
                >
                  <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                  <span className="flex-1 text-right text-foreground text-sm font-bold">
                    {catName}
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-[10px] font-bold bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                      {selectedCount}
                    </span>
                  )}
                  <span className="text-muted text-[10px] font-bold">
                    {items.length}
                  </span>
                </button>

                {open && (
                  <div className="grid grid-cols-1 gap-0.5 px-1 py-1.5">
                    {items.map(p => {
                      const checked = selectedIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                            ${checked
                              ? 'bg-accent/15 text-accent'
                              : 'hover:bg-surface-secondary/60 text-foreground'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(p.id)}
                            className="w-3.5 h-3.5 accent-accent"
                          />
                          <span className="flex-1">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductMultiSelect;
