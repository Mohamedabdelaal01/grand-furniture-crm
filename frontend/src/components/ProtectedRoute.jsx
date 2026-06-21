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
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
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
      <div className="flex items-center justify-center min-h-screen bg-background p-6" dir="rtl">
        <div className="card p-10 text-center max-w-md border-amber-500/20 bg-amber-500/5">
          <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldX className="w-10 h-10 text-amber-400" />
          </div>
          <h3 className="text-xl font-black text-foreground mb-3">غير مصرّح لك</h3>
          <p className="text-muted mb-8 text-sm leading-relaxed">
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
