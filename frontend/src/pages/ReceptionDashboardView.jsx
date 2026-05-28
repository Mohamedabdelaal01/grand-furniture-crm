/**
 * ReceptionDashboardView — branch-scoped screen for "reception" accounts.
 * Shows a fast phone-confirm desk only. Branch is locked to the account's branch.
 */
import { Building2, ScanLine } from 'lucide-react';
import ReceptionDesk from '../components/ReceptionDesk';
import SectionHeader from '../components/SectionHeader';
import { useAuth } from '../contexts/AuthContext';
import { formatBranch } from '../services/api';

export default function ReceptionDashboardView() {
  const { user } = useAuth();
  const branch   = user?.branch || null;

  if (!branch) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center" dir="rtl">
        <div className="card p-10 border-amber-500/20 bg-amber-500/5">
          <Building2 className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-white font-black mb-1">الحساب ده مش مربوط بفرع</p>
          <p className="text-dark-400 text-sm">كلّم مدير النظام يحدّد فرع لحساب الاستقبال ده.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-6 h-1 bg-primary-600 rounded-full" />
          <span className="text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
            استقبال
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary-400" />
          فرع {formatBranch(branch)}
        </h1>
        <p className="text-dark-500 text-[11px] mt-1 font-mono" dir="ltr">
          branch id: {branch} — لازم يطابق اللي ManyChat بيبعته بالظبط
        </p>
      </div>

      {/* تأكيد الزيارة بالموبايل */}
      <section className="space-y-4">
        <SectionHeader
          icon={ScanLine}
          title="تأكيد الزيارة"
          subtitle="ابحث برقم الموبايل عند وصول العميل المعرض"
          accent="primary"
        />
        <ReceptionDesk lockedBranch={branch} />
      </section>
    </div>
  );
}
