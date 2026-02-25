import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInstances, InstanceListItem } from '../api/instances';
import { getLeaderboard } from '../api/checkins';
import XPBar from '../components/XPBar';
import { Compass, ChevronRight, Zap } from 'lucide-react';

export default function HomePage() {
  const [instances, setInstances] = useState<InstanceListItem[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [inst, lb] = await Promise.all([listInstances(), getLeaderboard(100)]);
        setInstances(inst);
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const uid = payload.sub;
            const me = lb.find((e) => e.user_id === uid);
            if (me) {
              setUserXP(me.total_xp);
              setUserLevel(me.level);
            }
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const active = instances.filter((i) => i.status === 'active');
  const completed = instances.filter((i) => i.status === 'completed');

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-xl mb-0.5 tracking-tight">GoGoCity</h1>
      <p className="text-[9px] text-[var(--color-text-muted)] mb-4 uppercase tracking-widest">Explore. Complete. Level up.</p>

      <XPBar xp={userXP} level={userLevel} />

      <button
        onClick={() => navigate('/generate')}
        className="w-full mt-5 py-4 bg-[var(--color-primary)] text-white text-sm uppercase tracking-widest btn-retro flex items-center justify-center gap-2"
      >
        <Compass size={20} />
        New Quest
      </button>

      {loading ? (
        <div className="mt-8 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs mb-3 uppercase tracking-widest text-[var(--color-primary)]">Active Quests</h2>
              <div className="space-y-3">
                {active.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => navigate(`/route/${inst.id}`)}
                    className="w-full card-retro p-4 text-left hover:bg-[var(--color-surface-light)] transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm">{inst.title}</h3>
                      <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 progress-retro h-2">
                        <div className="progress-retro-fill h-full" style={{ width: `${inst.progress.percent}%` }} />
                      </div>
                      <span className="text-[9px] text-[var(--color-text-muted)]">
                        {inst.progress.completed_tasks}/{inst.progress.total_tasks}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-6">
              <h2 className="text-xs mb-3 uppercase tracking-widest text-[var(--color-success)] flex items-center gap-1">
                <Zap size={14} />
                Completed
              </h2>
              <div className="space-y-2">
                {completed.map((inst) => (
                  <button
                    key={inst.id}
                    onClick={() => navigate(`/route/${inst.id}`)}
                    className="w-full card-retro p-3 text-left opacity-70"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm">{inst.title}</h3>
                      <span className="text-[9px] text-[var(--color-success)] uppercase">Done</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {instances.length === 0 && (
            <div className="mt-12 text-center">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">No quests yet</p>
              <p className="font-sans text-sm text-[var(--color-text-muted)] mt-2">Generate your first route to get started!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
