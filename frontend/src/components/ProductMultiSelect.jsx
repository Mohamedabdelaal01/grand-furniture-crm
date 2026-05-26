import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { fetchProducts } from '../services/api';

// Reusable multi-select for the product catalog.
// Loads /api/products once on mount, groups by category, supports search,
// and renders selected items as removable chips.
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

  const grouped = catalog.reduce((acc, p) => {
    if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return acc;
    if (!acc[p.category_name]) acc[p.category_name] = [];
    acc[p.category_name].push(p);
    return acc;
  }, {});

  const pickerHeight = compact ? 'max-h-40' : 'max-h-56';

  if (loaded && catalog.length === 0) {
    return (
      <div>
        <label className="block text-dark-400 text-xs font-bold mb-1.5">
          {label || 'المنتجات في العقد'}
        </label>
        <p className="text-dark-500 text-xs p-3 rounded-xl bg-dark-900/40 border border-dark-800">
          لسه مفيش منتجات في الكاتالوج. الأدمن لازم يضيفها من "إدارة المنتجات".
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-dark-400 text-xs font-bold mb-1.5">
        {label || 'المنتجات في العقد'}
        {selectedIds.length > 0 && (
          <span className="text-primary-300 mr-2">({selectedIds.length} مختار)</span>
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
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/15 border border-primary-500/30 text-primary-200 text-xs font-bold"
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="hover:text-white"
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

      <div className={`${pickerHeight} overflow-y-auto rounded-xl border border-dark-800 bg-dark-900/40 p-2 space-y-2`}>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-dark-500 text-xs text-center py-4">
            {loaded ? 'مفيش نتائج' : 'جاري التحميل…'}
          </p>
        ) : (
          Object.entries(grouped).map(([catName, items]) => (
            <div key={catName}>
              <p className="text-dark-500 text-[10px] uppercase tracking-wider font-bold px-2 mb-1">
                {catName}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {items.map(p => {
                  const checked = selectedIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors
                        ${checked
                          ? 'bg-primary-500/15 text-primary-200'
                          : 'hover:bg-dark-800/60 text-dark-200'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(p.id)}
                        className="w-3.5 h-3.5 accent-primary-500"
                      />
                      <span className="flex-1">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductMultiSelect;
