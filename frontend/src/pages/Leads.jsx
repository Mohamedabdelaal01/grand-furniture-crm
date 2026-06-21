import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, ChevronLeft, ChevronRight,
  Eye, Download, RefreshCw, SlidersHorizontal, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchLeads, formatLeadClass, getLeadBadgeClass, formatBranch, exportLeadsCsv } from '../services/api';
import useBranches from '../hooks/useBranches';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZES = [25, 50, 100];

const CLASS_OPTIONS = [
  { value: '',          label: 'كل التصنيفات' },
  { value: 'cold',      label: 'بارد'         },
  { value: 'warm',      label: 'دافئ'         },
  { value: 'hot',       label: 'ساخن'         },
  { value: 'visited',   label: 'زار المعرض'   },
  { value: 'purchased', label: 'اشترى'        },
  { value: 'lost',      label: 'مغلق (Lost)'  },
];


function RelativeTime({ iso }) {
  if (!iso) return <span className="text-muted">—</span>;
  const seconds = Math.floor((Date.now() - new Date(iso.replace(' ', 'T') + 'Z').getTime()) / 1000);
  let text;
  if (seconds < 60)        text = `${seconds}ث`;
  else if (seconds < 3600) text = `${Math.floor(seconds / 60)}د`;
  else if (seconds < 86400) text = `${Math.floor(seconds / 3600)}س`;
  else                     text = `${Math.floor(seconds / 86400)}ي`;
  return <span className="text-muted text-xs">{text}</span>;
}

function ScoreBar({ score, max = 200 }) {
  const pct = Math.min(Math.round((score / max) * 100), 100);
  const color = pct >= 70 ? 'bg-rose-500' : pct >= 40 ? 'bg-amber-500' : 'bg-surface-tertiary';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-foreground text-xs tabular-nums">{score}</span>
    </div>
  );
}

const TableRowSkeleton = () => (
  <tr className="border-b border-border/50">
    <td className="py-3 px-4"><div className="w-4 h-4 bg-surface-tertiary rounded animate-pulse" /></td>
    <td className="py-3 px-4">
      <div className="space-y-2">
        <div className="h-4 bg-surface-tertiary rounded w-24 animate-pulse" />
        <div className="h-3 bg-surface-secondary rounded w-16 animate-pulse" />
      </div>
    </td>
    <td className="py-3 px-4"><div className="w-12 h-5 bg-surface-tertiary rounded-full animate-pulse" /></td>
    <td className="py-3 px-4"><div className="w-16 h-2 bg-surface-tertiary rounded-full animate-pulse" /></td>
    <td className="py-3 px-4 hidden md:table-cell"><div className="w-16 h-4 bg-surface-tertiary rounded animate-pulse" /></td>
    <td className="py-3 px-4 hidden lg:table-cell"><div className="w-20 h-4 bg-surface-tertiary rounded animate-pulse" /></td>
    <td className="py-3 px-4 hidden lg:table-cell"><div className="w-16 h-4 bg-surface-tertiary rounded animate-pulse" /></td>
    <td className="py-3 px-4 hidden sm:table-cell"><div className="w-10 h-4 bg-surface-tertiary rounded animate-pulse" /></td>
    <td className="py-3 px-4 text-center"><div className="w-12 h-6 bg-surface-tertiary rounded-lg mx-auto animate-pulse" /></td>
  </tr>
);

export default function Leads() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Read filters from URL
  const search       = searchParams.get('search')       || '';
  const leadClass    = searchParams.get('class')        || '';
  const branch       = searchParams.get('branch')       || '';
  const hasPhone     = searchParams.get('has_phone')    || '';
  const registration = searchParams.get('registration') || '';
  const platform     = searchParams.get('platform')     || '';
  const page         = parseInt(searchParams.get('page')  || '1', 10);
  const limit        = parseInt(searchParams.get('limit') || '50', 10);

  const { branches } = useBranches();
  const { user } = useAuth();
  const branchOptions = [
    { value: '', label: 'كل الفروع' },
    ...branches.map(b => ({ value: b.id, label: b.name })),
  ];

  const [localSearch, setLocalSearch] = useState(search);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLeads({
        search:       search       || undefined,
        class:        leadClass    || undefined,
        branch:       branch       || undefined,
        has_phone:    hasPhone     || undefined,
        registration: registration || undefined,
        platform:     platform     || undefined,
        page,
        limit,
      });
      setData(result);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [search, leadClass, branch, hasPhone, registration, platform, page, limit]);

  useEffect(() => { load(); }, [load]);

  // Scroll back to top when navigating between pages
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  // Listen for global search event from Navbar
  useEffect(() => {
    const handler = (e) => {
      setLocalSearch(e.detail || '');
      setParam('search', e.detail || '');
    };
    window.addEventListener('search:global', handler);
    return () => window.removeEventListener('search:global', handler);
  }, []);

  // Debounce local search
  useEffect(() => {
    const t = setTimeout(() => { setParam('search', localSearch); }, 350);
    return () => clearTimeout(t);
  }, [localSearch]);

  // CSV export
  const exportCSV = () => {
    // Admins get the FULL dataset straight from the backend (UTF-8 BOM for Excel);
    // other roles export the rows currently loaded on the page.
    if (user?.role === 'admin') {
      toast.promise(exportLeadsCsv(), { loading: 'جاري التصدير...', success: 'تم تنزيل الملف', error: 'فشل التصدير' });
      return;
    }
    if (!data?.leads?.length) return;
    const headers = ['الاسم', 'التصنيف', 'النقاط', 'الفرع', 'الحملة', 'رقم التليفون', 'آخر نشاط'];
    const rows = data.leads.map(l => [
      l.first_name || '—',
      formatLeadClass(l.lead_class),
      l.total_score,
      formatBranch(l.preferred_branch || l.requested_branch) || '—',
      l.campaign_source || '—',
      l.phone || l.visit_code || '—',
      l.last_activity || '—',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const leads      = data?.leads      || [];
  const total      = data?.total      || 0;
  const totalPages = data?.total_pages || 1;
  const pageStart  = (page - 1) * limit + 1;
  const pageEnd    = Math.min(page * limit, total);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-12" dir="rtl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-1 bg-accent rounded-full" />
            <span className="text-accent font-black text-[10px] uppercase tracking-[0.2em]">إدارة العملاء</span>
          </div>
          <h1 className="text-3xl font-black text-foreground">العملاء المحتملون</h1>
          {!loading && (
            <p className="text-muted text-sm mt-1">
              {total.toLocaleString()} عميل إجمالاً
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={user?.role !== 'admin' && !leads.length}
            className="btn-secondary text-xs disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير إلى Excel
          </button>
          <button onClick={load} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <SlidersHorizontal className="w-4 h-4 text-muted flex-shrink-0" />

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="ابحث باسم العميل..."
            className="input-field w-full pr-9 text-sm py-2"
          />
        </div>

        {/* Class filter */}
        <select
          value={leadClass}
          onChange={(e) => setParam('class', e.target.value)}
          className="input-field text-sm py-2 pr-3 min-w-[140px]"
        >
          {CLASS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Branch filter */}
        <select
          value={branch}
          onChange={(e) => setParam('branch', e.target.value)}
          className="input-field text-sm py-2 pr-3 min-w-[140px]"
        >
          {branchOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Left-a-phone filter */}
        <select
          value={hasPhone}
          onChange={(e) => setParam('has_phone', e.target.value)}
          className="input-field text-sm py-2 pr-3 min-w-[140px]"
        >
          <option value="">كل العملاء</option>
          <option value="yes">ساب رقمه</option>
          <option value="no">مساب رقمش</option>
        </select>

        {/* Registration type filter */}
        <select
          value={registration}
          onChange={(e) => setParam('registration', e.target.value)}
          className="input-field text-sm py-2 pr-3 min-w-[150px]"
        >
          <option value="">كل طرق التسجيل</option>
          <option value="online">تسجيل أونلاين</option>
          <option value="manual">تسجيل يدوي (استقبال)</option>
        </select>

        {/* Platform filter — ManyChat source channel */}
        <select
          value={platform}
          onChange={(e) => setParam('platform', e.target.value)}
          className="input-field text-sm py-2 pr-3 min-w-[150px]"
        >
          <option value="">كل المنصات</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
        </select>

        {/* Page size */}
        <select
          value={limit}
          onChange={(e) => setParam('limit', e.target.value)}
          className="input-field text-sm py-2 pr-3 w-24"
        >
          {PAGE_SIZES.map(s => (
            <option key={s} value={s}>{s} / صفحة</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {error ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-foreground font-black mb-1">تعذّر تحميل العملاء</p>
            <p className="text-muted text-sm mb-6">{error}</p>
            <button onClick={load} className="btn-primary">
              <RefreshCw className="w-4 h-4" /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            {/* Desktop / tablet: full table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted border-b border-border text-right text-[11px] uppercase font-black tracking-wider">
                    <th className="py-3 px-4 w-10">#</th>
                    <th className="py-3 px-4">الاسم</th>
                    <th className="py-3 px-4">التصنيف</th>
                    <th className="py-3 px-4">النقاط</th>
                    <th className="py-3 px-4 hidden md:table-cell">الفرع</th>
                    <th className="py-3 px-4 hidden lg:table-cell">الحملة</th>
                    <th className="py-3 px-4 hidden lg:table-cell">رقم التليفون</th>
                    <th className="py-3 px-4 hidden sm:table-cell">آخر نشاط</th>
                    <th className="py-3 px-4 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !data ? (
                    Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} />)
                  ) : leads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Users className="w-10 h-10 text-muted mx-auto mb-3" />
                        <p className="text-muted font-bold">لا توجد نتائج</p>
                      </td>
                    </tr>
                  ) : leads.map((lead, i) => (
                    <tr
                      key={lead.user_id}
                      onClick={() => navigate(`/leads/${lead.user_id}`)}
                      className="border-b border-border/50 hover:bg-surface-secondary/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 text-muted text-xs tabular-nums">
                        {pageStart + i}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-foreground font-bold truncate max-w-[140px] group-hover:text-accent transition-colors">
                          {lead.first_name || '—'}
                        </p>
                        <p className="text-muted text-[10px] font-mono truncate max-w-[140px]">
                          {lead.user_id}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs px-2.5 py-0.5 rounded-full font-black ${getLeadBadgeClass(lead.lead_class)}`}>
                          {formatLeadClass(lead.lead_class)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <ScoreBar score={lead.total_score} />
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-foreground text-xs">
                        {formatBranch(lead.preferred_branch || lead.requested_branch) || '—'}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {lead.campaign_source
                          ? <span className="text-accent text-xs font-mono">{lead.campaign_source}</span>
                          : <span className="text-muted text-xs">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {(lead.phone || lead.visit_code)
                          ? <code className="text-emerald-400 text-xs tracking-wider bg-emerald-500/5 px-2 py-0.5 rounded" dir="ltr">{lead.phone || lead.visit_code}</code>
                          : <span className="text-muted text-xs">—</span>
                        }
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <RelativeTime iso={lead.last_activity} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-bold transition-all group-hover:bg-accent group-hover:text-white"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards (no hidden columns — everything visible) */}
            <div className="md:hidden divide-y divide-border/50">
              {loading && !data ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse space-y-3">
                    <div className="h-4 w-32 bg-surface-tertiary rounded" />
                    <div className="h-3 w-20 bg-surface-tertiary rounded" />
                    <div className="h-2 w-full bg-surface-tertiary rounded-full" />
                  </div>
                ))
              ) : leads.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-muted font-bold">لا توجد نتائج</p>
                </div>
              ) : leads.map((lead, i) => (
                <button
                  key={lead.user_id}
                  onClick={() => navigate(`/leads/${lead.user_id}`)}
                  className="w-full text-right p-4 active:bg-surface-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-foreground font-bold truncate">
                        <span className="text-muted text-xs tabular-nums ml-1">{pageStart + i}.</span>
                        {lead.first_name || '—'}
                      </p>
                      <p className="text-muted text-[10px] font-mono truncate">{lead.user_id}</p>
                    </div>
                    <span className={`badge text-[11px] px-2.5 py-0.5 rounded-full font-black flex-shrink-0 ${getLeadBadgeClass(lead.lead_class)}`}>
                      {formatLeadClass(lead.lead_class)}
                    </span>
                  </div>
                  <div className="mb-3"><ScoreBar score={lead.total_score} /></div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <div><span className="text-muted">الفرع: </span><span className="text-foreground">{formatBranch(lead.preferred_branch || lead.requested_branch) || '—'}</span></div>
                    <div><span className="text-muted">آخر نشاط: </span><span className="text-foreground"><RelativeTime iso={lead.last_activity} /></span></div>
                    <div className="truncate"><span className="text-muted">الحملة: </span><span className="text-accent font-mono">{lead.campaign_source || '—'}</span></div>
                    <div><span className="text-muted">رقم التليفون: </span>{(lead.phone || lead.visit_code) ? <code className="text-emerald-400 tracking-wider" dir="ltr">{lead.phone || lead.visit_code}</code> : <span className="text-muted">—</span>}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-muted text-xs">
                  {pageStart}–{pageEnd} من {total.toLocaleString()}
                </p>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setParam('page', String(page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                    const p     = start + i;
                    if (p > totalPages) return null;
                    return (
                      <button
                        key={p}
                        onClick={() => setParam('page', String(p))}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          p === page
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'text-muted hover:text-foreground hover:bg-surface-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setParam('page', String(page + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
