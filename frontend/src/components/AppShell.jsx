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
 */
export default function AppShell() {
  const { user } = useAuth();
  const isDemo = typeof user?.name === 'string' && user.name.startsWith('demo_');

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        {isDemo && (
          <div
            dir="rtl"
            className="bg-amber-500 text-amber-950 font-black text-sm text-center px-4 py-2 shadow-lg"
          >
            ⚠️ وضع التجريب والتدريب نشط حالياً — أي بيانات يتم تسجيلها لن تؤثر على النظام الحقيقي
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
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
