import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listInstances, InstanceListItem } from '../api/instances';
import { getLeaderboard } from '../api/checkins';
import XPBar from '../components/XPBar';
import { LogOut, Route, CheckCircle, MapPin } from 'lucide-react';

export default function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [instances, setInstances] = useState<InstanceListItem[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUsername(payload.username || '');
        setDisplayName(payload.display_name || '');
      } catch { /* ignore */ }
    }

    async function load() {
      try {
        const [inst, lb] = await Promise.all([listInstances(), getLeaderboard(100)]);
        setInstances(inst);
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const uid = payload.sub;
          const me = lb.find((e) => e.user_id === uid);
          if (me) {
            setXP(me.total_xp);
            setLevel(me.level);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogout = () => {
    auth.logout();
    navigate('/login');
  };

  const totalRoutes = instances.length;
  const completedRoutes = instances.filter((i) => i.status === 'completed').length;
  const totalTasks = instances.reduce((sum, i) => sum + i.progress.total_tasks, 0);
  const completedTasks = instances.reduce((sum, i) => sum + i.progress.completed_tasks, 0);

  if (loading) return <div className="px-4 pt-6 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</div>;

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-lg font-bold">{displayName || username || 'EXPLORER'}</h1>
          {username && (
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">@{username}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-[var(--color-border)] text-[9px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] hover:border-[var(--color-error)] transition-colors uppercase tracking-widest"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>

      <XPBar xp={xp} level={level} />

      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="card-retro p-3 text-center">
          <Route size={20} className="mx-auto mb-1 text-[var(--color-primary)]" />
          <p className="text-sm font-bold">{totalRoutes}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Quests</p>
        </div>
        <div className="card-retro p-3 text-center">
          <CheckCircle size={20} className="mx-auto mb-1 text-[var(--color-success)]" />
          <p className="text-sm font-bold">{completedRoutes}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Cleared</p>
        </div>
        <div className="card-retro p-3 text-center">
          <MapPin size={20} className="mx-auto mb-1 text-[var(--color-primary)]" />
          <p className="text-sm font-bold">{completedTasks}/{totalTasks}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Tasks</p>
        </div>
      </div>

      {instances.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[10px] text-[var(--color-text-muted)] mb-3 uppercase tracking-widest">Quest History</h2>
          <div className="space-y-2">
            {instances.map((inst) => (
              <button
                key={inst.id}
                onClick={() => navigate(`/route/${inst.id}`)}
                className="w-full card-retro p-3 text-left hover:bg-[var(--color-surface-light)] transition-colors"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">{inst.title}</h3>
                  <span className={`text-[8px] uppercase tracking-widest ${
                    inst.status === 'completed' ? 'text-[var(--color-success)]' : 'text-[var(--color-primary)]'
                  }`}>
                    {inst.status === 'completed' ? 'Done' : `${inst.progress.completed_tasks}/${inst.progress.total_tasks}`}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
