import { Navigate, Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — wraps any page that requires authentication.
 * - Shows a spinner while the auth check is in-flight.
 * - Redirects to /login if not authenticated.
 * - `role`         — single role string (legacy, kept for backward compat)
 * - `allowedRoles` — array of allowed roles (preferred for new usage)
 *   If neither is set, any authenticated user is allowed.
 */
export default function ProtectedRoute({ children, role, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark-950">
        <div className="w-10 h-10 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Resolve allowed roles: allowedRoles prop takes precedence over legacy role prop
  const allowed = allowedRoles ?? (role ? [role] : null);
  const userRole = user?.role ?? null; // no implicit role — deny by default if missing

  if (allowed && !allowed.includes(userRole)) {
    // Explicit "access denied" instead of a silent bounce to "/", so the user
    // understands why they can't see the page.
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950 p-6" dir="rtl">
        <div className="card p-10 text-center max-w-md border-amber-500/20 bg-amber-500/5">
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-black text-white mb-3">غير مصرّح لك</h3>
          <p className="text-dark-400 mb-8 text-sm leading-relaxed">
            الصفحة دي مخصصة للمدير فقط. لو محتاج صلاحية إضافية كلّم مدير النظام.
          </p>
          <Link to="/" className="btn-primary w-full py-4 inline-block">
            الرجوع للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
