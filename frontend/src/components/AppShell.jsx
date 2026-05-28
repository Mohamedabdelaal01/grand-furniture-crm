import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';

/**
 * AppShell — persistent layout wrapper for all protected pages.
 * Renders Sidebar + Navbar + page content via <Outlet />.
 * Shows a persistent amber banner for demo_* training accounts (they run
 * against the isolated sandbox DB, never production).
 *
 * Mobile behaviour:
 *   — Sidebar is hidden off-screen on small screens and slides in as an
 *     overlay drawer when the hamburger button in Navbar is tapped.
 *   — A semi-transparent backdrop closes the drawer on tap-outside.
 *   — On lg+ screens the sidebar is always visible (normal desktop layout).
 */
export default function AppShell() {
  const { user } = useAuth();
  const isDemo = typeof user?.name === 'string' && user.name.startsWith('demo_');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Mobile overlay backdrop — closes drawer on tap-outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen(v => !v)} />
        {isDemo && (
          <div
            dir="rtl"
            className="bg-amber-500 text-amber-950 font-black text-sm text-center px-4 py-2 shadow-lg"
          >
            ⚠️ وضع التجريب والتدريب نشط حالياً — أي بيانات يتم تسجيلها لن تؤثر على النظام الحقيقي
          </div>
        )}
        {/* p-3 on mobile → p-6 on md+ */}
        <main className="flex-1 overflow-y-auto p-3 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#1e293b',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#1e293b',
            },
          },
        }}
      />
    </div>
  );
}
