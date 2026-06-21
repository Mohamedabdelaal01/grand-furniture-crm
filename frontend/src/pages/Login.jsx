import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sofa, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Login() {
  const navigate        = useNavigate();
  const { user, login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Already logged in → redirect to dashboard
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error;
      setError(msg || 'حدث خطأ — تحقق من اتصالك بالإنترنت');
    } finally {
      setLoading(false);
    }
  };

  // Shared input styling — semantic field tokens (theme-aware, inline so the
  // global .input-field class stays untouched for the inner pages batch).
  const fieldClass =
    'w-full px-4 py-2.5 bg-field text-field-foreground placeholder-field-placeholder ' +
    'border border-border rounded-field focus:outline-none focus:border-focus ' +
    'focus:ring-2 focus:ring-focus/40 transition-all duration-300';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative" dir="rtl">
      {/* Light / Dark toggle — fixed top-left so it's reachable before login */}
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/40">
            <Sofa className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black text-foreground">Grand Furniture</h1>
          <p className="text-muted text-sm mt-1">نظام إدارة المبيعات الذكي</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-2xl shadow-soft p-8 space-y-6">
          <div>
            <h2 className="text-xl font-black text-foreground">تسجيل الدخول</h2>
            <p className="text-muted text-sm mt-1">أدخل بياناتك للمتابعة</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-muted text-xs font-bold uppercase tracking-wider">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@grandfurniture.eg"
                required
                autoFocus
                className={fieldClass}
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-muted text-xs font-bold uppercase tracking-wider">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`${fieldClass} pl-10`}
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPwd
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye    className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 mt-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-bold shadow-lg shadow-primary-900/30 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" />
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  دخول
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-xs mt-6">
          Grand Furniture CRM — Sales Intelligence System
        </p>
      </div>
    </div>
  );
}
