import axios from 'axios';

// VITE_API_BASE_URL overrides the default. Defaults to the deployed Railway
// backend so production builds keep working without a .env file.
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'https://medo-backend-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject JWT token + active rep/role into every request
api.interceptors.request.use((config) => {
  try {
    const token = window.localStorage.getItem('gf_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    const rep = window.localStorage.getItem('current_rep');
    if (rep) config.headers['X-Rep'] = rep;
    const role = window.localStorage.getItem('current_rep_role') || 'rep';
    config.headers['X-Rep-Role'] = role;
  } catch (_) { /* ignore */ }
  return config;
});

// Only log in dev — never leak request/response data in production console.
const DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    if (DEV) console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — handle 401 by clearing token and redirecting to login
api.interceptors.response.use(
  (response) => {
    if (DEV) console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    if (DEV) console.error('❌ API Error:', error.message);
    if (error.response) {
      if (DEV) console.error('Response data:', error.response.data);
      if (DEV) console.error('Response status:', error.response.status);
      if (error.response.status === 401) {
        // Don't redirect on login endpoint itself
        if (!error.config?.url?.includes('/api/auth/')) {
          localStorage.removeItem('gf_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard APIs
// ═══════════════════════════════════════════════════════════════════════════

export const fetchDashboard = async () => {
  const response = await api.get('/api/dashboard');
  return response.data;
};

export const fetchLeads = async (params = {}) => {
  const response = await api.get('/api/leads', { params });
  return response.data;
};

export const fetchLeadDetail = async (userId) => {
  const response = await api.get(`/api/leads/${userId}`);
  return response.data;
};

/** Admin: permanently delete a customer + all their data. */
export const deleteLead = async (userId) => {
  const response = await api.delete(`/api/leads/${userId}`);
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// Intelligence APIs (additive — new endpoints introduced by the merge)
// ═══════════════════════════════════════════════════════════════════════════

export const fetchPredictions = async () => {
  const response = await api.get('/api/predictions');
  return response.data;
};

export const triggerMessage = async ({ user_id, action_type, force } = {}) => {
  const response = await api.post('/api/trigger-message', { user_id, action_type, force });
  return response.data;
};

export const fetchFollowUpState = async (userId) => {
  const response = await api.get(`/api/follow-up-state/${userId}`);
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// O2O Attribution APIs
// ═══════════════════════════════════════════════════════════════════════════

/** Receptionist confirms a showroom visit by phone + the branch they're at. */
export const confirmVisit = async (phone, branch) => {
  const response = await api.post('/api/visits/confirm', { phone, branch });
  return response.data;
};

/** Confirm a visit for a specific lead (reception clicks a customer in list). */
export const confirmVisitByUser = async (userId, branch) => {
  const response = await api.post('/api/visits/confirm', { user_id: userId, branch });
  return response.data;
};

/** Reception registers a walk-in customer who never came through ManyChat. */
export const createWalkInCustomer = async ({ first_name, phone, interest, source, branch }) => {
  const response = await api.post('/api/reception/walkin', {
    first_name, phone, interest, source, branch,
  });
  return response.data; // { ok, user_id, first_name, campaign_source, branch, lead_class, walk_in, existed }
};

/** Reception: customers who requested this branch's address (admin: ?branch). */
export const fetchReceptionLeads = async (branch) => {
  const response = await api.get('/api/reception/leads', {
    params: branch ? { branch } : {},
  });
  return response.data; // { branch, count, leads }
};

// ── Sales (showroom salespeople) ────────────────────────────────────────────
/** List salespeople — reception locked to its branch; admin all/?branch. */
export const fetchSalesReps = async (branch) => {
  const response = await api.get('/api/sales/reps', { params: branch ? { branch } : {} });
  return response.data.reps || []; // [{name, branch}]
};

/** Reception attaches the salesperson who served the customer. */
export const setVisitSales = async (userId, salesRep, branch) => {
  const response = await api.post('/api/visits/set-sales', {
    user_id: userId, sales_rep: salesRep, branch,
  });
  return response.data;
};

/** Salesperson: own customers + this-month KPIs.
 *  Pass { today: true } to get only today's confirmed visitors. */
export const fetchMySalesCustomers = async ({ today = false } = {}) => {
  const response = await api.get('/api/sales/my', { params: today ? { today: '1' } : {} });
  return response.data; // { kpis, customers }
};

/** Admin: sales analytics with filters. */
export const fetchSalesAnalytics = async (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const response = await api.get('/api/sales/analytics', { params: filtered });
  return response.data; // { bySales, byBranch }
};

/** Branch manager: their branch overview (KPIs + per-salesperson). */
export const fetchBranchOverview = async (branch) => {
  const response = await api.get('/api/branch/overview', {
    params: branch ? { branch } : {},
  });
  return response.data; // { branch, kpis, bySales }
};

/** Branch manager: customers who requested their branch + follow-up status. */
export const fetchBranchCustomers = async (branch) => {
  const response = await api.get('/api/branch/customers', {
    params: { ...(branch ? { branch } : {}), limit: 1000 },
  });
  return response.data; // { branch, customers[], total, limit }
};

/** Branch manager: marks follow-up done himself (optional call summary). */
export const updateCustomerFollowup = async (userId, followed_up, followed_up_by, call_summary, branch) => {
  const response = await api.patch(`/api/branch/customers/${userId}/followup`, {
    followed_up,
    followed_up_by,
    call_summary,
    branch,
  });
  return response.data;
};

/** Branch manager: assign / reassign a customer to a sales rep. */
export const assignCustomerToSales = async (userId, sales, branch) => {
  const response = await api.patch(`/api/branch/customers/${userId}/assign`, { sales, branch });
  return response.data;
};

/** Branch manager / admin: edit a reception customer's name and/or phone. */
export const editBranchCustomerContact = async (userId, { first_name, phone }) => {
  const response = await api.patch(`/api/branch/customers/${userId}/contact`, { first_name, phone });
  return response.data;
};

/** Branch manager: full lead list for their branch (online + walk-ins).
 *  Optional `q` does a flexible LIKE search over name OR phone. */
export const fetchBranchLeads = async (branch, q) => {
  const response = await api.get('/api/branch/leads', {
    params: { ...(branch ? { branch } : {}), ...(q ? { q } : {}) },
  });
  return response.data; // { branch, count, customers[] }
};

/** Branch manager: flag / un-flag a lead as a duplicate (excludes it from rep
 *  queues + KPIs). `isDuplicate` boolean. */
export const setLeadDuplicate = async (userId, isDuplicate, branch) => {
  const response = await api.patch(`/api/branch/leads/${userId}/duplicate`, {
    is_duplicate: isDuplicate, branch,
  });
  return response.data; // { ok, is_duplicate }
};

/** Branch manager: reassign the POST-visit (showroom) follow-up rep. */
export const assignPostVisitRep = async (userId, sales, branch) => {
  const response = await api.patch(`/api/branch/leads/${userId}/assign-post`, { sales, branch });
  return response.data; // { ok, post_visit_rep }
};

/** Sales rep: customers the manager assigned to me (pending + done). */
export const fetchSalesFollowups = async () => {
  const response = await api.get('/api/sales/followups');
  return response.data; // { branch, customers[] }
};

/** Sales rep: mark an assigned follow-up done + call summary. */
export const submitSalesFollowup = async (userId, followed_up, call_summary) => {
  const response = await api.patch(`/api/sales/followups/${userId}`, { followed_up, call_summary });
  return response.data;
};

/** Sales: tick/untick "بعت" (sent the first outreach message) on a pre-visit lead. */
export const setSalesFollowupSent = async (userId, sent) => {
  const response = await api.patch(`/api/sales/followups/${userId}/sent`, { sent });
  return response.data;
};

/** A customer's full cross-branch journey (visits + purchases + derived owner). */
export const fetchCustomerJourney = async (userId) => {
  const response = await api.get(`/api/customers/${userId}/journey`);
  return response.data; // { first_name, visits[], purchases[], branches[], multi_branch, owner }
};

/** Sales: full pre-visit follow-up history (multiple updates over time). */
export const fetchSalesFollowupLog = async (userId) => {
  const response = await api.get(`/api/sales/followups/${userId}/log`);
  return response.data; // { log: [{ id, sales, call_summary, followed_up_at }] }
};

/** Sales: append a new pre-visit follow-up update. */
export const addSalesFollowupLog = async (userId, note) => {
  const response = await api.post(`/api/sales/followups/${userId}/log`, { note });
  return response.data;
};

/** Branch manager: sales accounts in their branch. */
export const fetchBranchSales = async (branch) => {
  const response = await api.get('/api/branch/sales', {
    params: branch ? { branch } : {},
  });
  return response.data; // { branch, sales[] }
};

/** Branch manager: create a sales account in their branch. */
export const createBranchSales = async (data) => {
  const response = await api.post('/api/branch/sales', data);
  return response.data;
};

/** Branch manager: update a sales account (name/email/password/active). */
export const updateBranchSales = async (id, data) => {
  const response = await api.put(`/api/branch/sales/${id}`, data);
  return response.data;
};

/** Branch manager: delete a sales account in their branch. */
export const deleteBranchSales = async (id) => {
  const response = await api.delete(`/api/branch/sales/${id}`);
  return response.data;
};

/** Sales rep records an offline purchase for a lead. */
export const recordPurchase = async ({ user_id, product_id, product_ids, price, branch, notes, contract_number } = {}) => {
  const response = await api.post('/api/purchases', { user_id, product_id, product_ids, price, branch, notes, contract_number });
  return response.data;
};

/** Fetch purchase history for a single lead. */
export const fetchLeadPurchases = async (userId) => {
  const response = await api.get(`/api/leads/${userId}/purchases`);
  return response.data;
};

// ── Product catalog ─────────────────────────────────────────────────────────
export const fetchProductCategories = async () => {
  const response = await api.get('/api/products/categories');
  return response.data;
};
export const createProductCategory = async (name) => {
  const response = await api.post('/api/products/categories', { name });
  return response.data;
};
export const updateProductCategory = async (id, name) => {
  const response = await api.put(`/api/products/categories/${id}`, { name });
  return response.data;
};
export const deleteProductCategory = async (id) => {
  const response = await api.delete(`/api/products/categories/${id}`);
  return response.data;
};
export const fetchProducts = async (categoryId) => {
  const params = categoryId ? { category_id: categoryId } : {};
  const response = await api.get('/api/products', { params });
  return response.data;
};
export const createProduct = async ({ category_id, name }) => {
  const response = await api.post('/api/products', { category_id, name });
  return response.data;
};
export const updateProduct = async (id, { name, category_id } = {}) => {
  const response = await api.put(`/api/products/${id}`, { name, category_id });
  return response.data;
};
export const deleteProduct = async (id) => {
  const response = await api.delete(`/api/products/${id}`);
  return response.data;
};

// ── Re-visit follow-up (visited but didn't buy) ──────────────────────────────
/** status = 'pending' | 'bought' | 'lost' — scoped server-side by role. */
export const fetchRevisitCustomers = async (status = 'pending') => {
  const response = await api.get('/api/revisit/customers', { params: { status } });
  return response.data; // { status, count, customers }
};

/** Close a customer who won't buy (e.g. bought elsewhere) with a free note. */
export const closeRevisitCustomer = async (userId, note) => {
  const response = await api.post(`/api/revisit/${userId}/close`, { note });
  return response.data;
};

/** Move a closed customer back into the follow-up list. */
export const reopenRevisitCustomer = async (userId) => {
  const response = await api.post(`/api/revisit/${userId}/reopen`, {});
  return response.data;
};

/** Log a re-visit follow-up attempt (customer stays in the pending list). */
export const logRevisitFollowup = async (userId, note) => {
  const response = await api.post(`/api/revisit/${userId}/followup`, { note });
  return response.data; // { ok, followup_count }
};

/** Full re-visit follow-up history for a customer. */
export const fetchRevisitFollowups = async (userId) => {
  const response = await api.get(`/api/revisit/${userId}/followups`);
  return response.data; // { followups }
};

/** Re-visit funnel analytics — scoped server-side by role. */
export const fetchRevisitAnalytics = async () => {
  const response = await api.get('/api/revisit/analytics');
  return response.data; // { summary, byBranch, bySales }
};

/** Admin: per-rep follow-up monitor (pre-visit + post-visit, separated). */
export const fetchSalesFollowupMonitor = async () => {
  const response = await api.get('/api/admin/sales-followup-monitor');
  return response.data.reps || []; // [{ sales_rep, branch, pre:{...}, post:{...} }]
};

// ── Advanced analytics & enterprise admin ────────────────────────────────────
/** Admin: deep analytics (rep conversion, velocity, lost leads, pipeline value). */
export const fetchAdvancedAnalytics = async () => {
  const response = await api.get('/api/analytics/advanced');
  return response.data; // { repConversion, velocity, lostLeads, pipeline }
};

/** Admin: global lead search for the Ctrl+K command palette. */
export const searchLeadsGlobal = async (q) => {
  const response = await api.get('/api/admin/search', { params: { q } });
  return response.data.results || []; // [{ user_id, first_name, phone, lead_class }]
};

/** Admin: infrastructure vitals (DB size, row counts, uptime, memory). */
export const fetchSystemHealth = async () => {
  const response = await api.get('/api/admin/system-health');
  return response.data;
};

/** Stream an authenticated CSV endpoint to a file download (keeps the Bearer token). */
const downloadCsv = async (path, filename) => {
  const res  = await api.get(path, { responseType: 'blob' });
  const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8;' }));
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); window.URL.revokeObjectURL(url);
};
export const exportLeadsCsv     = () => downloadCsv('/api/admin/export/leads.csv',     'leads-export.csv');
export const exportContractsCsv = () => downloadCsv('/api/admin/export/contracts.csv', 'contracts-export.csv');

/** Admin: swap two sales reps — exchange their branch + pre-visit customer lists. */
export const swapReps = async (repA, repB) => {
  const response = await api.post('/api/admin/swap-reps', { repA, repB });
  return response.data; // { ok, rows_swapped, a:{...}, b:{...} }
};

/** Admin: move a sales rep to another branch (old pre-visit customers released). */
export const transferRep = async (repId, newBranch) => {
  const response = await api.post('/api/admin/transfer-rep', { repId, newBranch });
  return response.data; // { ok, rep, from, to, released }
};

/** Admin: Meta CAPI pixel warm-up — bulk-sync all historical leads with phones.
 *  Long timeout: thousands of leads × sequential 500-batches can take minutes. */
export const syncMetaHistorical = async () => {
  const response = await api.post('/api/admin/meta/sync-historical', {}, { timeout: 300000 });
  return response.data; // { ok, total, eligible, sent, batches, failed_batches, errors }
};

// ── Contracts (purchases) ────────────────────────────────────────────────────
/** Contracts list — scoped server-side by role. */
export const fetchContracts = async () => {
  const response = await api.get('/api/contracts');
  return response.data.contracts || [];
};

/** Admin / branch manager updates a contract's price + number. */
export const updateContract = async (id, { price, contract_number, product_ids }) => {
  const response = await api.put(`/api/contracts/${id}`, { price, contract_number, product_ids });
  return response.data;
};

/** Admin / branch manager deletes a contract. */
export const deleteContract = async (id) => {
  const response = await api.delete(`/api/contracts/${id}`);
  return response.data; // { ok, reverted }
};

// ── Account-based cloned sandbox ─────────────────────────────────────────────
/** Admin: clone production into the sandbox + (re)create the 4 demo accounts. */
export const generateDemoAccounts = async () => {
  const response = await api.post('/api/admin/generate-demo-accounts', {});
  return response.data; // { ok, password, accounts }
};

/** Admin: delete the sandbox DB entirely. */
export const wipeDemoAccounts = async () => {
  const response = await api.post('/api/admin/wipe-demo-accounts', {});
  return response.data; // { ok }
};

// ── Audit ledger (admin undo log) ────────────────────────────────────────────
/** Recent admin/manager assignment actions. */
export const fetchAuditLogs = async () => {
  const response = await api.get('/api/admin/audit-logs');
  return response.data.logs || [];
};

/** Revert a logged action — restores the affected row to its old state. */
export const revertAuditLog = async (id) => {
  const response = await api.post(`/api/admin/audit-logs/${id}/revert`, {});
  return response.data;
};

// ── Admin notifications (macro alerts) ───────────────────────────────────────
export const fetchNotifications = async () => {
  const response = await api.get('/api/notifications');
  return response.data; // { notifications, unread }
};

export const markNotificationsRead = async () => {
  const response = await api.post('/api/notifications/read-all', {});
  return response.data;
};

// ── Sales targets ────────────────────────────────────────────────────────────
/** All targets for a month (admin / branch manager). Defaults to current month. */
export const fetchTargets = async (month) => {
  const response = await api.get('/api/admin/targets', { params: month ? { month } : {} });
  return response.data.targets || [];
};

/** Admin sets a branch / sales-rep monthly target (UPSERT). */
export const saveTarget = async ({ scope_type, scope_name, target_amount, target_month }) => {
  const response = await api.post('/api/admin/targets', {
    scope_type, scope_name, target_amount, target_month,
  });
  return response.data;
};

/** Filtered executive KPIs — params: startDate, endDate, branch, rep. */
export const fetchAdminKpis = async (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v));
  const response = await api.get('/api/admin/kpis', { params: clean });
  return response.data; // { total_revenue, total_visits, closing_rate, target, percent_achieved }
};

/** A sales rep's own target + achievement. */
export const fetchMyTarget = async () => {
  const response = await api.get('/api/sales/my-target');
  return response.data; // { target, revenue, percent }
};

/** Scrub leftover data from sales/call reps deleted without scrubbing. */
export const cleanupOrphanReps = async () => {
  const response = await api.post('/api/admin/cleanup-orphan-reps', {});
  return response.data; // { ok, cleaned_count, cleaned }
};

/** Toggle a user's active flag (admin / branch manager). */
export const toggleUserActive = async (id) => {
  const response = await api.patch(`/api/branch/users/${id}/toggle-active`, {});
  return response.data; // { ok, id, active }
};

/** Offboard a user — mode 'archive' (soft, keeps history) or 'scrub' (hard). */
export const offboardUser = async (name, mode = 'archive') => {
  const response = await api.delete(
    `/api/admin/users/sales-rep/${encodeURIComponent(name)}`,
    { params: { mode } }
  );
  return response.data; // { ok, mode, name }
};

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

export const formatLeadClass = (leadClass) => {
  const map = {
    cold:      'بارد',
    warm:      'دافئ',
    hot:       'ساخن',
    visited:   'زار المعرض',
    purchased: 'اشترى',
    converted: 'تم التحويل', // legacy
  };
  return map[leadClass] || leadClass;
};

export const getLeadBadgeClass = (leadClass) => {
  const map = {
    cold:      'badge-cold',
    warm:      'badge-warm',
    hot:       'badge-hot',
    visited:   'badge-visited',
    purchased: 'badge-purchased',
    converted: 'badge-converted', // legacy
  };
  return map[leadClass] || 'badge-cold';
};

// ── Branch cache (populated once from /api/branches) ─────────────────────────
const _BRANCH_FALLBACK = {
  nasr_city:  'نصر سيتي',
  maadi:      'المعادي',
  new_cairo:  'القاهرة الجديدة',
  october:    'أكتوبر',
  alexandria: 'الإسكندرية',
  helwan:     'حلوان',
  faisal:     'فيصل',
  ain_shams:  'عين شمس',
};
let _branchCache = null; // {id → name} after first load

export const fetchBranches = async () => {
  const res = await api.get('/api/branches');
  const list = res.data.branches || [];
  _branchCache = Object.fromEntries(list.map(b => [b.id, b.name]));
  return list; // [{id, name}]
};

export const updateBranches = async (branches) => {
  const res = await api.put('/api/branches', { branches });
  const list = res.data.branches || [];
  _branchCache = Object.fromEntries(list.map(b => [b.id, b.name]));
  return list;
};

// ── Interest categories (reception walk-in form) ─────────────────────────────
export const fetchInterests = async () => {
  const res = await api.get('/api/interests');
  return res.data.interests || []; // string[]
};

export const updateInterests = async (interests) => {
  const res = await api.put('/api/interests', { interests });
  return res.data.interests || [];
};

export const formatBranch = (branch) => {
  if (!branch) return '';
  if (_branchCache && _branchCache[branch] !== undefined) return _branchCache[branch];
  return _BRANCH_FALLBACK[branch] || branch;
};

/** Safe customer display name — never leak the raw user_id (e.g. walkin_… ) to the UI. */
export const customerName = (c) => {
  const n = c?.first_name && String(c.first_name).trim();
  return n || 'عميل بدون اسم';
};

// ✅ FIX: added missing map_click
export const formatEventType = (eventType) => {
  const map = {
    entry_offer: 'دخول العرض',
    entry_catalog: 'دخول الكتالوج',
    category_request: 'اختيار فئة كتالوج',
    entry_location: 'دخول الفروع',
    product_details: 'تفاصيل المنتج',
    location_request: 'طلب الموقع',
    contact_request: 'طلب تواصل',
    branch_selected: 'اختيار فرع',
    map_click: 'نقر على الخريطة',
    visit_confirmed: 'تأكيد الزيارة',
  };
  return map[eventType] || eventType;
};

// ═══════════════════════════════════════════════════════════════════════════
// Auth APIs
// ═══════════════════════════════════════════════════════════════════════════

export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};

export const fetchMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// Analytics APIs
// ═══════════════════════════════════════════════════════════════════════════

export const fetchAnalytics = async (params = {}) => {
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const response = await api.get('/api/analytics', { params: filtered });
  return response.data;
};

// ═══════════════════════════════════════════════════════════════════════════
// Settings & Users APIs (admin only)
// ═══════════════════════════════════════════════════════════════════════════

export const fetchSettings = async () => {
  const response = await api.get('/api/settings');
  return response.data;
};

export const updateSetting = async (key, value) => {
  const response = await api.put(`/api/settings/${key}`, { value });
  return response.data;
};

export const fetchIntegrationStatus = async () => {
  const response = await api.get('/api/integration-status');
  return response.data; // { manychat, missing_flows, webhook }
};

// ── Tasks (rep follow-up reminders) ─────────────────────────────────────────
export const fetchTasks = async (params = {}) => {
  const response = await api.get('/api/tasks', { params });
  return response.data.tasks || [];
};

export const createTask = async ({ lead_id, due_at, note, source }) => {
  const response = await api.post('/api/tasks', { lead_id, due_at, note, source });
  return response.data;
};

export const updateTask = async (id, status) => {
  const response = await api.patch(`/api/tasks/${id}`, { status });
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/api/tasks/${id}`);
  return response.data;
};

export const fetchUsers = async () => {
  const response = await api.get('/api/users');
  return response.data;
};

/** fetchReps — returns string[] of sales rep names. Accessible to all auth users. */
export const fetchReps = async () => {
  const response = await api.get('/api/reps');
  return response.data.reps; // string[]
};

export const createUser = async (data) => {
  const response = await api.post('/api/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/api/users/${id}`, data);
  return response.data;
};

// ── Achievements (admin) ───────────────────────────────────────────────────
export const fetchSalesAchievements = async (params = {}) => {
  const response = await api.get('/api/admin/achievements/sales', { params });
  return response.data; // { weights, rows: [{ sales_rep, branch, score, rank, ... badges }] }
};

export const fetchBranchAchievements = async () => {
  const response = await api.get('/api/admin/achievements/branches');
  return response.data; // { weights, rows: [{ branch, score, rank, ... badges }] }
};

export const fetchRepsAnalytics = async () => {
  const response = await api.get('/api/admin/reps-analytics');
  return response.data; // { rows: [{ name, branch, leads_assigned, ... }] }
};

export const fetchLeadsAging = async () => {
  const response = await api.get('/api/admin/leads-aging');
  return response.data; // { today, week, month, older, total }
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/api/users/${id}`);
  return response.data;
};

export const awardAchievement = async (data) => {
  const response = await api.post('/api/admin/achievements/award', data);
  return response.data;
};

export const fetchAchievementWeights = async () => {
  const response = await api.get('/api/settings/achievement-weights');
  return response.data; // { followup, visit, close }
};

export const updateAchievementWeights = async (weights) => {
  const response = await api.put('/api/settings/achievement-weights', weights);
  return response.data;
};

export const fetchForecastWeights = async () => {
  const response = await api.get('/api/settings/forecast-weights');
  return response.data; // { with_phone, without_phone }
};

export const updateForecastWeights = async (weights) => {
  const response = await api.put('/api/settings/forecast-weights', weights);
  return response.data;
};

export default api;
