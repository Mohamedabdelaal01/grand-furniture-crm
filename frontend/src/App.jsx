import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider }     from './contexts/AuthContext';
import { AlertsProvider }   from './contexts/AlertsContext';
import ProtectedRoute       from './components/ProtectedRoute';
import ErrorBoundary        from './components/ErrorBoundary';
import AppShell             from './components/AppShell';
import Login                from './pages/Login';
import Dashboard            from './pages/Dashboard';
import AdminDashboardView   from './pages/AdminDashboardView';
import BranchManagerDashboardView from './pages/BranchManagerDashboardView';
import SalesDashboardView   from './pages/SalesDashboardView';
import LeadDetail           from './pages/LeadDetail';
import Leads                from './pages/Leads';
import RevisitView          from './pages/RevisitView';
import Contracts            from './pages/Contracts';
import AuditLedger          from './pages/AuditLedger';
import Analytics            from './pages/Analytics';
import Settings             from './pages/Settings';
import Products             from './pages/Products';
import SystemGuide          from './pages/SystemGuide';
import McpGuide             from './pages/McpGuide';
import ManyChatGuide        from './pages/ManyChatGuide';
import NotFound             from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <AlertsProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Protected shell — all pages inside share Sidebar + Navbar */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index              element={<Dashboard />} />
              <Route path="leads"       element={<Leads />} />
              <Route path="leads/:userId" element={<LeadDetail />} />
              {/* Branch manager focused views */}
              <Route
                path="branch/pending"
                element={
                  <ProtectedRoute allowedRoles={['branch_manager']}>
                    <BranchManagerDashboardView view="pending" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="branch/done"
                element={
                  <ProtectedRoute allowedRoles={['branch_manager']}>
                    <BranchManagerDashboardView view="done" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="branch/settings"
                element={
                  <ProtectedRoute allowedRoles={['branch_manager']}>
                    <BranchManagerDashboardView view="settings" />
                  </ProtectedRoute>
                }
              />
              {/* Sales pre-visit follow-up — single tabbed page */}
              <Route
                path="sales/followups"
                element={
                  <ProtectedRoute allowedRoles={['sales']}>
                    <SalesDashboardView view="followups" />
                  </ProtectedRoute>
                }
              />
              {/* Re-visit follow-up — visited but didn't buy (tabbed page) */}
              <Route
                path="revisit"
                element={
                  <ProtectedRoute allowedRoles={['admin','branch_manager','sales','rep']}>
                    <RevisitView />
                  </ProtectedRoute>
                }
              />

              {/* Contracts — admin / branch manager / sales / rep (scoped server-side) */}
              <Route path="contracts" element={<ProtectedRoute allowedRoles={['admin','branch_manager','sales','rep']}><Contracts /></ProtectedRoute>} />

              {/* Product catalog management — admin + branch manager */}
              <Route path="catalog" element={<ProtectedRoute allowedRoles={['admin','branch_manager']}><Products /></ProtectedRoute>} />

              {/* Audit ledger — admin only */}
              <Route path="audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLedger /></ProtectedRoute>} />

              {/* Admin domain pages — each one has internal tabs */}
              <Route path="customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="customers" /></ProtectedRoute>} />
              <Route path="branches"  element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="branches"  /></ProtectedRoute>} />
              <Route path="sales"     element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="sales"     /></ProtectedRoute>} />
              <Route path="reps"      element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="reps"      /></ProtectedRoute>} />
              <Route path="campaigns" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="campaigns" /></ProtectedRoute>} />
              <Route path="products"  element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="products"  /></ProtectedRoute>} />

              {/* Interactive system guide — open to every authenticated role */}
              <Route path="guide" element={<ProtectedRoute><SystemGuide /></ProtectedRoute>} />

              {/* System pages */}
              <Route path="mcp" element={<ProtectedRoute allowedRoles={['admin']}><McpGuide /></ProtectedRoute>} />
              <Route path="manychat-guide" element={<ProtectedRoute allowedRoles={['admin']}><ManyChatGuide /></ProtectedRoute>} />
              <Route path="settings"       element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />

              {/* Legacy fallback routes — kept for direct URL access (hidden from sidebar) */}
              <Route path="analytics"         element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />
              <Route path="hot-leads"         element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="hotleads" /></ProtectedRoute>} />
              <Route path="lead-groups"       element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="groups"   /></ProtectedRoute>} />
              <Route path="calls"             element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="calls"    /></ProtectedRoute>} />
              <Route path="my-leads"          element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="my"       /></ProtectedRoute>} />
              <Route path="gamification"      element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="gamify"   /></ProtectedRoute>} />
              <Route path="reception"         element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="reception"/></ProtectedRoute>} />
              <Route path="sales-performance" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView view="salesperf"/></ProtectedRoute>} />
            </Route>

            {/* Fallback — explicit 404, not a silent redirect */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </AlertsProvider>
    </AuthProvider>
  );
}

export default App;
