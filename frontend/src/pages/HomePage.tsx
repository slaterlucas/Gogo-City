import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInstances, deleteInstance, updateInstanceStatus, InstanceListItem } from '../api/instances';
import { getLeaderboard } from '../api/checkins';
import XPBar from '../components/XPBar';
import { Compass, ChevronRight, Zap, Archive, Trash2, X } from 'lucide-react';

const LONG_PRESS_MS = 500;

export default function HomePage() {
  const [instances, setInstances] = useState<InstanceListItem[]>([]);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleArchive = async (id: string) => {
    try {
      await updateInstanceStatus(id, 'archived');
      setActionTarget(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstance(id);
      setConfirmDelete(null);
      setActionTarget(null);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setActionTarget(id);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleCardClick = (id: string) => {
    if (actionTarget) return;
    navigate(`/route/${id}`);
  };

  const active = instances.filter((i) => i.status === 'active');
  const completed = instances.filter((i) => i.status === 'completed');

  const renderCard = (inst: InstanceListItem, variant: 'active' | 'completed') => {
    const isTarget = actionTarget === inst.id;

    return (
      <div key={inst.id} className="relative">
        <button
          onClick={() => handleCardClick(inst.id)}
          onMouseDown={() => startLongPress(inst.id)}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onTouchStart={() => startLongPress(inst.id)}
          onTouchEnd={cancelLongPress}
          onTouchCancel={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); setActionTarget(inst.id); }}
          className={`w-full card-retro ${variant === 'active' ? 'p-4' : 'p-3 opacity-70'} text-left hover:bg-[var(--color-surface-light)] transition-colors select-none`}
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm">{inst.title}</h3>
            {variant === 'active' ? (
              <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
            ) : (
              <span className="text-[9px] text-[var(--color-success)] uppercase">Done</span>
            )}
          </div>
          {variant === 'active' && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 progress-retro h-2">
                <div className="progress-retro-fill h-full" style={{ width: `${inst.progress.percent}%` }} />
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)]">
                {inst.progress.completed_tasks}/{inst.progress.total_tasks}
              </span>
            </div>
          )}
        </button>

        {isTarget && (
          <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2 z-10">
            <button
              onClick={() => setConfirmDelete(inst.id)}
              className="p-2 bg-[var(--color-error)] text-white border-2 border-[var(--color-text)]"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
            {inst.status === 'active' && (
              <button
                onClick={() => handleArchive(inst.id)}
                className="p-2 bg-[var(--color-text-muted)] text-white border-2 border-[var(--color-text)]"
                title="Archive"
              >
                <Archive size={14} />
              </button>
            )}
            <button
              onClick={() => setActionTarget(null)}
              className="p-2 bg-white border-2 border-[var(--color-border)]"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-5 pt-8 pb-24 page-enter">
      <h1 className="text-2xl mb-1 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
          <span className="bg-gradient-to-r from-[#e8832a] to-[#e55a2f] bg-clip-text text-transparent">GoGo</span>
          <span className="text-[#2d2d2d]">City</span>
        </h1>
      <p className="text-[9px] text-[var(--color-text-muted)] mb-5 uppercase tracking-[0.2em]">Explore. Complete. Level up.</p>

      <XPBar xp={userXP} level={userLevel} />

      <button
        onClick={() => navigate('/generate')}
        className="w-full mt-5 py-4 text-white text-sm uppercase tracking-widest btn-retro btn-primary flex items-center justify-center gap-2"
      >
        <Compass size={20} />
        New Quest
      </button>

      {loading ? (
        <div className="mt-8 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mt-7">
              <h2 className="text-xs mb-3 uppercase tracking-[0.15em] text-[var(--color-primary)]">Active Quests</h2>
              <div className="space-y-3">
                {active.map((inst) => renderCard(inst, 'active'))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="mt-7">
              <h2 className="text-xs mb-3 uppercase tracking-[0.15em] text-[var(--color-success)] flex items-center gap-1">
                <Zap size={14} />
                Completed
              </h2>
              <div className="space-y-2">
                {completed.map((inst) => renderCard(inst, 'completed'))}
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

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-[430px] bg-[var(--color-bg)] border-t-2 border-[var(--color-border)] p-6">
            <h3 className="text-sm font-bold mb-2">Delete Quest?</h3>
            <p className="font-sans text-xs text-[var(--color-text-muted)] mb-4">
              This will permanently remove the quest and all progress. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 text-xs uppercase tracking-widest border-2 border-[var(--color-border)] bg-white btn-retro"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-3 text-xs uppercase tracking-widest bg-[var(--color-error)] text-white btn-retro"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
