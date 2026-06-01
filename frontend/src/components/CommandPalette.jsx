/**
 * CommandPalette — global Ctrl/Cmd+K launcher for admins. Instantly search any
 * lead by name or phone (hits the backend), or jump to any admin page. Keyboard:
 *   ⌘K / Ctrl+K  open      ·  Esc close
 *   ↑ / ↓        move      ·  Enter select
 * Mounted once in AppShell; only active for the admin role.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CornerDownLeft, LayoutDashboard, Users, FileText, Radar,
  Headset, TrendingUp, Package, Activity, Settings, ScrollText, User,
} from 'lucide-react';
import { searchLeadsGlobal } from '../services/api';

const PAGES = [
  { label: 'نظرة عامة',        path: '/',                        icon: LayoutDashboard, kw: 'dashboard رئيسية' },
  { label: 'قاعدة العملاء',     path: '/leads',                   icon: Users,           kw: 'leads عملاء' },
  { label: 'التعاقدات',         path: '/contracts',               icon: FileText,        kw: 'contracts عقود مبيعات' },
  { label: 'التحليلات العميقة',  path: '/admin/advanced-analytics', icon: Radar,          kw: 'advanced analytics تحليلات' },
  { label: 'متابعات السيلز',     path: '/followup-monitor',        icon: Headset,         kw: 'followups متابعات' },
  { label: 'تحليلات الحملات',    path: '/analytics',               icon: TrendingUp,      kw: 'campaigns حملات' },
  { label: 'إدارة المنتجات',     path: '/catalog',                 icon: Package,         kw: 'catalog products منتجات' },
  { label: 'صحة النظام',         path: '/system-health',           icon: Activity,        kw: 'system health صحة' },
  { label: 'سجل العمليات',       path: '/audit-logs',              icon: ScrollText,      kw: 'audit logs سجل' },
  { label: 'الإعدادات',          path: '/settings',                icon: Settings,        kw: 'settings إعدادات' },
];

const CLASS_BADGE = {
  cold: 'bg-sky-500/15 text-sky-300',
  warm: 'bg-amber-500/15 text-amber-300',
  hot: 'bg-rose-500/15 text-rose-300',
  visited: 'bg-violet-500/15 text-violet-300',
  purchased: 'bg-emerald-500/15 text-emerald-300',
};
const CLASS_AR = { cold: 'بارد', warm: 'دافئ', hot: 'ساخن', visited: 'زار', purchased: 'اشترى' };

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const [leads, setLeads]   = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  // Global hotkey: ⌘K / Ctrl+K toggles; Esc closes.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reset + focus when opening.
  useEffect(() => {
    if (open) {
      setQ(''); setLeads([]); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced backend lead search.
  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) { setLeads([]); return; }
    const t = setTimeout(async () => {
      try { setLeads(await searchLeadsGlobal(term)); } catch { setLeads([]); }
    }, 220);
    return () => clearTimeout(t);
  }, [q, open]);

  const pageMatches = (() => {
    const t = q.trim().toLowerCase();
    if (!t) return PAGES;
    return PAGES.filter((p) => p.label.includes(q.trim()) || p.kw.toLowerCase().includes(t));
  })();

  // Flat list of selectable items: pages first, then leads.
  const items = [
    ...pageMatches.map((p) => ({ type: 'page', ...p })),
    ...leads.map((l) => ({ type: 'lead', ...l })),
  ];

  useEffect(() => { setActive(0); }, [q, leads.length]);

  const go = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    if (item.type === 'page') navigate(item.path);
    else navigate(`/leads/${item.user_id}`);
  }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
         dir="rtl" onMouseDown={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden"
           onMouseDown={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-dark-800">
          <Search className="w-5 h-5 text-dark-500 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ابحث عن عميل بالاسم أو الرقم، أو انتقل لصفحة..."
            className="flex-1 bg-transparent py-4 text-white placeholder-dark-500 outline-none text-sm"
          />
          <kbd className="text-[10px] text-dark-500 bg-dark-800 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-dark-500 text-sm">
              {q.trim().length >= 2 ? 'لا توجد نتائج' : 'اكتب حرفين على الأقل للبحث عن عميل'}
            </div>
          ) : (
            <>
              {pageMatches.length > 0 && (
                <div className="px-4 pt-1 pb-1 text-[10px] font-black text-dark-500 uppercase tracking-wider">صفحات</div>
              )}
              {items.map((item, i) => {
                const isActive = i === active;
                const Icon = item.type === 'page' ? item.icon : User;
                const isFirstLead = item.type === 'lead' && (i === 0 || items[i - 1].type === 'page');
                return (
                  <div key={item.type === 'page' ? item.path : item.user_id}>
                    {isFirstLead && (
                      <div className="px-4 pt-2 pb-1 text-[10px] font-black text-dark-500 uppercase tracking-wider">عملاء</div>
                    )}
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                        isActive ? 'bg-primary-600/20' : 'hover:bg-dark-800/40'}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-300' : 'text-dark-400'}`} />
                      <div className="flex-1 min-w-0">
                        {item.type === 'page' ? (
                          <span className="text-white text-sm font-bold">{item.label}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-bold truncate">{item.first_name || item.user_id}</span>
                            {item.phone && <span className="text-dark-500 font-mono text-[11px]" dir="ltr">{item.phone}</span>}
                          </div>
                        )}
                      </div>
                      {item.type === 'lead' && item.lead_class && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${CLASS_BADGE[item.lead_class] || 'bg-dark-800 text-dark-300'}`}>
                          {CLASS_AR[item.lead_class] || item.lead_class}
                        </span>
                      )}
                      {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-dark-500 shrink-0" />}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-dark-800 text-[10px] text-dark-500">
          <span className="flex items-center gap-1"><kbd className="bg-dark-800 px-1 rounded">↑</kbd><kbd className="bg-dark-800 px-1 rounded">↓</kbd> تنقّل</span>
          <span className="flex items-center gap-1"><kbd className="bg-dark-800 px-1 rounded">↵</kbd> فتح</span>
          <span className="mr-auto flex items-center gap-1"><kbd className="bg-dark-800 px-1 rounded">⌘</kbd><kbd className="bg-dark-800 px-1 rounded">K</kbd></span>
        </div>
      </div>
    </div>
  );
}
