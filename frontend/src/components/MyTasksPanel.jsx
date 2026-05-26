import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ListTodo, Trash2 } from 'lucide-react';
import { fetchTasks, updateTask, deleteTask } from '../services/api';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const TaskRow = ({ task, onDone, onDelete, navigate }) => {
  const today = todayStr();
  const overdue = task.due_at < today;
  const isToday = task.due_at === today;
  const tone = overdue
    ? { bd: 'border-rose-500/30', bg: 'bg-rose-500/5', dot: 'text-rose-400', Icon: AlertCircle }
    : isToday
      ? { bd: 'border-amber-500/30', bg: 'bg-amber-500/5', dot: 'text-amber-400', Icon: Clock }
      : { bd: 'border-dark-700', bg: 'bg-dark-800/40', dot: 'text-dark-500', Icon: Clock };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${tone.bd} ${tone.bg}`}>
      <tone.Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tone.dot}`} />
      <div className="flex-1 min-w-0">
        <button
          onClick={() => navigate(`/leads/${task.lead_id}`)}
          className="text-white font-black text-sm hover:text-primary-400 transition-colors truncate block text-right"
        >
          {task.lead_name || task.lead_id}
        </button>
        {task.note && <p className="text-dark-300 text-xs mt-1 leading-relaxed">{task.note}</p>}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[11px] font-bold ${tone.dot}`}>
            {overdue ? 'متأخرة • ' : isToday ? 'النهاردة • ' : ''}{task.due_at}
          </span>
          {task.source === 'reschedule' && (
            <span className="text-[10px] bg-dark-800 text-dark-400 px-2 py-0.5 rounded-full">من مكالمة</span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={() => onDone(task.id)}
          title="تم"
          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          title="حذف"
          className="p-1.5 rounded-lg text-dark-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default function MyTasksPanel() {
  const navigate = useNavigate();
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await fetchTasks({ status: 'pending' }));
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'تعذّر تحميل المهام');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDone = async (id) => {
    setTasks(t => t.filter(x => x.id !== id));
    try { await updateTask(id, 'done'); } catch { load(); }
  };
  const handleDelete = async (id) => {
    setTasks(t => t.filter(x => x.id !== id));
    try { await deleteTask(id); } catch { load(); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-10 text-center border-rose-500/20 bg-rose-500/5">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-white font-black mb-1">تعذّر تحميل المهام</p>
        <p className="text-dark-400 text-sm mb-5">{error}</p>
        <button onClick={load} className="btn-primary">إعادة المحاولة</button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="card p-16 text-center">
        <ListTodo className="w-12 h-12 text-dark-700 mx-auto mb-4" />
        <p className="text-dark-400 font-bold">مفيش مهام مفتوحة</p>
        <p className="text-dark-600 text-sm mt-1">
          أي "اتصل لاحقاً" أو تذكير تضيفه من صفحة العميل هيظهر هنا
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo className="w-5 h-5 text-primary-400" />
        <h3 className="text-white font-black">مهامي ({tasks.length})</h3>
      </div>
      <div className="space-y-2.5">
        {tasks.map(task => (
          <TaskRow
            key={task.id}
            task={task}
            onDone={handleDone}
            onDelete={handleDelete}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}
