import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BarChart3, Settings, Sofa,
  LogOut, BookOpen, Phone, Trophy, ShieldCheck, ShoppingBag,
  CheckCircle2, UserPlus, PhoneCall, MapPinned, FileText,
  TrendingUp, Megaphone, MapPin, Package, Headset, Building2, ScrollText, Bot,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const location       = useLocation();
  const navigate       = useNavigate();
  const { user, logout } = useAuth();

  const role    = user?.role ?? 'rep';
  const isAdmin = role === 'admin';

  // Shared link — the merged re-visit follow-up page (tabs inside the page)
  const revisitLink   = { path: '/revisit',   icon: MapPinned, label: 'متابعة بعد الزيارة' };
  const contractsLink = { path: '/contracts', icon: FileText,  label: 'التعاقدات' };

  // ── Admin nav: executive war-room — strategic workspaces ─────────────────
  // The admin role is shared by C-level executives (Owner / GM / Marketing
  // Director). Macro-management only — no reception, tasks, or per-lead lists.
  const adminNavSections = [
    {
      title: '👑 الإدارة العليا',
      items: [
        { path: '/',          icon: LayoutDashboard, label: 'نظرة عامة' },
        { path: '/contracts', icon: FileText,        label: 'التعاقدات' },
        { path: '/sales',     icon: Trophy,          label: 'لوحة الشرف' },
      ],
    },
    {
      title: '🚀 التسويق وتطوير الأعمال',
      items: [
        { path: '/analytics', icon: TrendingUp, label: 'تحليلات الحملات' },
      ],
    },
    {
      title: '🏬 إدارة التشغيل',
      items: [
        { path: '/leads', icon: Users, label: 'قاعدة العملاء' },
      ],
    },
    {
      title: '⚙️ النظام والرقابة',
      items: [
        { path: '/audit-logs', icon: ScrollText, label: 'سجل العمليات' },
        { path: '/mcp',        icon: Bot,        label: 'ربط الذكاء الاصطناعي' },
        { path: '/settings',   icon: Settings,   label: 'الإعدادات'   },
      ],
    },
  ];

  // ── Sales nav (showroom salesperson) ─────────────────────────────────────
  const salesNavSections = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/',      icon: LayoutDashboard, label: 'عملائي' },
        // Hidden from sales role per request — kept for other roles below.
        // { path: '/leads?registration=manual', icon: Phone, label: 'عملاء الاستقبال' },
      ],
    },
    {
      title: 'المتابعات',
      items: [
        { path: '/sales/followups', icon: PhoneCall, label: 'متابعة قبل الزيارة' },
        revisitLink,
      ],
    },
    {
      title: 'المبيعات',
      items: [contractsLink],
    },
  ];

  // ── Branch manager nav ───────────────────────────────────────────────────
  const branchManagerNavSections = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/', icon: BarChart3, label: 'نظرة عامة' },
      ],
    },
    {
      title: 'المتابعات',
      items: [
        { path: '/branch/pending', icon: UserPlus,    label: 'توزيع المتابعات' },
        { path: '/branch/done',    icon: CheckCircle2, label: 'تمت متابعتهم'   },
        revisitLink,
      ],
    },
    {
      title: 'الفرع',
      items: [
        { path: '/branch/pending?registration=manual', icon: Phone, label: 'عملاء الاستقبال' },
        contractsLink,
        { path: '/branch/settings', icon: Settings, label: 'إعدادات الفرع' },
      ],
    },
  ];

  // ── Rep nav ──────────────────────────────────────────────────────────────
  const repNavSections = [
    {
      title: 'الرئيسية',
      items: [
        { path: '/',      icon: LayoutDashboard, label: 'داشبورد' },
        { path: '/leads', icon: Users,           label: 'عملائي'  },
        { path: '/leads?registration=manual', icon: Phone, label: 'عملاء الاستقبال' },
      ],
    },
    {
      title: 'المتابعات',
      items: [revisitLink],
    },
    {
      title: 'المبيعات',
      items: [contractsLink],
    },
  ];

  // ── Reception nav ────────────────────────────────────────────────────────
  const receptionNavSections = [
    { title: null, items: [{ path: '/', icon: Phone, label: 'الاستقبال' }] },
  ];

  const roleNavSections = isAdmin
    ? adminNavSections
    : role === 'reception'
      ? receptionNavSections
      : role === 'sales'
        ? salesNavSections
        : role === 'branch_manager'
          ? branchManagerNavSections
          : repNavSections;

  // The interactive system guide is available to every role.
  const navSections = [
    ...roleNavSections,
    { title: 'مساعدة', items: [{ path: '/guide', icon: BookOpen, label: '📖 دليل النظام' }] },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    const [base, query] = path.split('?');
    if (!location.pathname.startsWith(base)) return false;
    // A link carrying a query (e.g. /leads?registration=manual) is only
    // active when that query is present — keeps it distinct from plain /leads.
    if (query) return location.search.includes(query);
    return !location.search.includes('registration=');
  };

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'GF';

  const roleLabel   = isAdmin ? 'مدير النظام'
    : role === 'reception' ? 'موظف استقبال'
    : role === 'sales' ? 'سيلز المعرض'
    : role === 'branch_manager' ? 'مدير فرع'
    : 'مندوب مبيعات';
  const RoleIcon    = isAdmin ? ShieldCheck
    : role === 'reception' ? Phone
    : role === 'sales' ? ShoppingBag
    : role === 'branch_manager' ? BarChart3
    : Trophy;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-64 bg-dark-900 border-l border-dark-800 flex flex-col h-full z-20">
      {/* Logo */}
      <div className="h-20 flex items-center px-6 border-b border-dark-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-900/20">
            <Sofa className="w-6 h-6 text-white" />
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">جراند للأثاث</h1>
            <p className="text-[10px] text-dark-400 font-medium uppercase tracking-widest mt-1">Grand Furniture</p>
          </div>
        </div>
      </div>

      {/* Navigation — grouped sections for every role */}
      <nav className="flex-1 p-4 mt-2 overflow-y-auto">
        {navSections.map((section, si) => (
          <div key={section.title || `sec-${si}`} className="mb-4 last:mb-0">
            {section.title && (
              <p className="text-[10px] font-black text-dark-500 uppercase tracking-[0.15em] px-4 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
                      ${active
                        ? 'bg-primary-600/10 text-primary-500 border border-primary-600/20'
                        : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100 border border-transparent'
                      }`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className={`font-semibold text-sm ${active ? 'text-primary-400' : ''}`}>{item.label}</span>
                    {active && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile + Logout */}
      <div className="p-4 border-t border-dark-800 bg-dark-950/30 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-dark-800/40">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {initials}
            </div>
            <div className="absolute bottom-0 left-0 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full" />
          </div>
          <div className="flex-1 text-right overflow-hidden">
            <p className="text-sm font-bold text-dark-50 truncate">{user?.name || '—'}</p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <RoleIcon className={`w-3 h-3 ${isAdmin ? 'text-amber-400' : 'text-primary-400'}`} />
              <p className={`text-[11px] font-bold ${isAdmin ? 'text-amber-400' : 'text-primary-400'}`}>
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-dark-400 hover:text-rose-400 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/20 transition-all text-sm font-bold"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
