import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, CheckCircle2, Trash2, Clock, AlertCircle } from 'lucide-react';
import { fetchTasks, createTask, updateTask, deleteTask } from '../services/api';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * LeadTasks — per-lead reminders shown on the lead profile page.
 * Lets a rep add a manual follow-up task and tick off existing ones.
 */
export default function LeadTasks({ userId }) {
  const [tasks, setTasks] = useState([]);
  const [adding, setAdding] = useState(false);
  const [due, setDue]   = useState(plusDays(1));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { setTasks(await fetchTasks({ lead_id: userId, status: 'all' })); }
    catch { /* silent — section is non-critical */ }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!due) return;
    setSaving(true);
    try {
      await createTask({ lead_id: userId, due_at: due, note, source: 'manual' });
      setNote(''); setDue(plusDays(1)); setAdding(false);
      load();
    } catch (_) { /* keep form open on failure */ }
    setSaving(false);
  };

  const toggle = async (t) => {
    const next = t.status === 'done' ? 'pending' : 'done';
    setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: next } : x));
    try { await updateTask(t.id, next); } catch { load(); }
  };
  const remove = async (id) => {
    setTasks(ts => ts.filter(x => x.id !== id));
    try { await deleteTask(id); } catch { load(); }
  };

  const today = todayStr();

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-black text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          المهام والتذكيرات
        </h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> أضف تذكير
          </button>
        )}
      </div>

      {adding && (
        <div className="bg-dark-800/50 border border-dark-700 rounded-xl p-4 mb-4 space-y-3" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-dark-300 text-xs font-bold mb-1.5">التاريخ</label>
              <input type="date" value={due} min={today}
                onChange={(e) => setDue(e.target.value)}
                className="input-field w-full" dir="ltr" />
            </div>
            <div>
              <label className="block text-dark-300 text-xs font-bold mb-1.5">ملاحظة</label>
              <input type="text" value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: متابعة عرض الأنتريه"
                className="input-field w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !due} className="btn-primary text-sm">
              {saving ? '...' : 'حفظ'}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-dark-500 text-sm text-center py-6">لا توجد مهام لهذا العميل</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const overdue = t.status !== 'done' && t.due_at < today;
            return (
              <div key={t.id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  t.status === 'done'
                    ? 'border-dark-800 bg-dark-800/30 opacity-60'
                    : overdue
                      ? 'border-rose-500/30 bg-rose-500/5'
                      : 'border-dark-700 bg-dark-800/40'
                }`}>
                <button onClick={() => toggle(t)} title="تبديل الحالة"
                  className={`flex-shrink-0 ${t.status === 'done' ? 'text-emerald-400' : 'text-dark-500 hover:text-emerald-400'}`}>
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t.status === 'done' ? 'text-dark-500 line-through' : 'text-white'}`}>
                    {t.note || 'متابعة'}
                  </p>
                  <p className="text-[11px] mt-0.5 flex items-center gap-1.5">
                    {overdue
                      ? <span className="text-rose-400 font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />متأخرة</span>
                      : <Clock className="w-3 h-3 text-dark-500" />}
                    <span className="text-dark-400">{t.due_at}</span>
                    <span className="text-dark-600">• {t.rep_name}</span>
                    {t.source === 'reschedule' && <span className="text-dark-600">• من مكالمة</span>}
                  </p>
                </div>
                <button onClick={() => remove(t.id)} title="حذف"
                  className="flex-shrink-0 p-1.5 rounded-lg text-dark-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
