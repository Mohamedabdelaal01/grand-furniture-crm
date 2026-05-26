import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sofa, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/40">
            <Sofa className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Grand Furniture</h1>
          <p className="text-dark-400 text-sm mt-1">نظام إدارة المبيعات الذكي</p>
        </div>

        {/* Card */}
        <div className="card p-8 space-y-6">
          <div>
            <h2 className="text-xl font-black text-white">تسجيل الدخول</h2>
            <p className="text-dark-400 text-sm mt-1">أدخل بياناتك للمتابعة</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-dark-300 text-xs font-bold uppercase tracking-wider">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@grandfurniture.eg"
                required
                autoFocus
                className="input-field w-full"
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-dark-300 text-xs font-bold uppercase tracking-wider">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field w-full pl-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
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
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        <p className="text-center text-dark-600 text-xs mt-6">
          Grand Furniture CRM — Sales Intelligence System
        </p>
      </div>
    </div>
  );
}
