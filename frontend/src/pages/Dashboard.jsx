/**
 * Dashboard — RBAC router.
 * Renders AdminDashboardView for admins, SalesRepDashboardView for reps.
 * Handles null roles gracefully by defaulting to the sales rep view.
 */
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardView      from './AdminDashboardView';
import SalesRepDashboardView   from './SalesRepDashboardView';
import ReceptionDashboardView  from './ReceptionDashboardView';
import SalesDashboardView      from './SalesDashboardView';
import BranchManagerDashboardView from './BranchManagerDashboardView';

const Dashboard = () => {
  const { user } = useAuth();

  // Treat null/undefined role as 'rep' — safe default for existing users
  const role = user?.role ?? 'rep';

  if (role === 'admin')          return <AdminDashboardView />;
  if (role === 'reception')      return <ReceptionDashboardView />;
  if (role === 'sales')          return <SalesDashboardView />;
  if (role === 'branch_manager') return <BranchManagerDashboardView />;

  return <SalesRepDashboardView />;
};

export default Dashboard;
