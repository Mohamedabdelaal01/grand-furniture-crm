import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation }    from 'react-router-dom';
import { Bell, Search, RefreshCw, Calendar as CalendarIcon, LogOut, ChevronDown, User } from 'lucide-react';
import { format }         from 'date-fns';
import { ar }             from 'date-fns/locale';
import { useAuth }        from '../contexts/AuthContext';
import { useAlerts }      from '../contexts/AlertsContext';

const Navbar = () => {
  const navigate              = useNavigate();
  const location              = useLocation();
  const { user, logout }      = useAuth();
  const { unreadCount }       = useAlerts();

  const [currentTime, setCurrentTime]       = useState(new Date());
  const [searchValue, setSearchValue]       = useState('');
  const [userMenuOpen, setUserMenuOpen]     = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const menuRef = useRef(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search: navigate to leads if not there, then dispatch event
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    
    if (location.pathname !== '/leads') {
      navigate(`/leads?search=${encodeURIComponent(value)}`);
    } else {
      window.dispatchEvent(new CustomEvent('search:global', { detail: value }));
    }
  };

  // Refresh: trigger all useSmartPolling instances on current page
  const handleRefresh = () => {
    setRefreshing(true);
    window.dispatchEvent(new CustomEvent('app:refresh'));
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = user?.role === 'admin' ? 'مدير النظام' : 'مندوب مبيعات';
  const initials  = user?.name
    ? user.name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'GF';

  return (
    <header className="h-20 bg-dark-900/50 backdrop-blur-md border-b border-dark-800 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Search */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 group-focus-within:text-primary-500 transition-colors w-4 h-4" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearch}
            placeholder="ابحث عن عميل، منتج، أو فرع..."
            className="w-full bg-dark-800/50 border border-dark-700 hover:border-dark-600 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/5 rounded-2xl py-2.5 pr-11 pl-4 text-sm text-dark-50 placeholder-dark-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Date & Time */}
        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-dark-800/40 rounded-xl border border-dark-700/50">
          <CalendarIcon className="w-4 h-4 text-primary-500" />
          <div className="text-right leading-tight">
            <p className="text-dark-200 text-xs font-bold">
              {format(currentTime, 'EEEE، d MMMM', { locale: ar })}
            </p>
            <p className="text-dark-500 text-[10px] font-medium">
              {format(currentTime, 'hh:mm:ss a', { locale: ar })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-dark-800/50 hover:bg-dark-700 text-dark-400 hover:text-primary-400 rounded-xl border border-dark-700/50 transition-all active:scale-95"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Bell with real unread count */}
          <button
            className="relative p-2.5 bg-dark-800/50 hover:bg-dark-700 text-dark-400 hover:text-primary-400 rounded-xl border border-dark-700/50 transition-all active:scale-95"
            title="الإشعارات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-dark-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-dark-800/50 hover:bg-dark-700 border border-dark-700/50 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-xs shadow-inner">
              {initials}
            </div>
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-dark-100 text-xs font-bold truncate max-w-[100px]">{user?.name || '—'}</p>
              <p className="text-dark-500 text-[10px]">{roleLabel}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-dark-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-52 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-dark-800">
                <p className="text-white text-sm font-bold">{user?.name}</p>
                <p className="text-dark-500 text-[11px] truncate">{user?.email}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  user?.role === 'admin'
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                    : 'bg-dark-700 text-dark-400 border border-dark-600'
                }`}>
                  {roleLabel}
                </span>
              </div>

              {/* Menu items */}
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 text-sm font-bold transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
