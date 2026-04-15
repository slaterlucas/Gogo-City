import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listInstances, InstanceListItem, getInstance, Instance } from '../api/instances';
import { getLeaderboard } from '../api/checkins';
import { getAchievements, Achievement } from '../api/achievements';
import { updateMe } from '../api/auth';
import XPBar from '../components/XPBar';
import { LogOut, Route, CheckCircle, MapPin, Pencil, PlusCircle, Shield, Database, ChevronDown, Award } from 'lucide-react';

export default function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [instances, setInstances] = useState<InstanceListItem[]>([]);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [xp, setXP] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [statsView, setStatsView] = useState<'quests' | 'cleared' | 'tasks' | null>(null);
  const [instanceDetails, setInstanceDetails] = useState<Record<string, Instance>>({});
  const [loadingTasks, setLoadingTasks] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setEditValue(displayName || username || '');
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveDisplayName = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const { access_token } = await updateMe(trimmed);
      auth.login(access_token);
      setDisplayName(trimmed);
    } catch (err) {
      console.error('Failed to update display name', err);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

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
        const [inst, lb, achData] = await Promise.all([
          listInstances(),
          getLeaderboard(100),
          getAchievements().catch(() => null),
        ]);
        setInstances(inst);
        if (achData) {
          setAchievements(achData.achievements);
          setUnlockedCount(achData.unlocked);
        }
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
  const clearedInstances = instances.filter((i) => i.status === 'completed');

  const handleStatsViewClick = async (view: 'quests' | 'cleared' | 'tasks') => {
    const nextView = statsView === view ? null : view;
    setStatsView(nextView);
    if (nextView !== 'tasks' || loadingTasks || Object.keys(instanceDetails).length > 0 || instances.length === 0) {
      return;
    }

    setLoadingTasks(true);
    try {
      const details = await Promise.all(
        instances.map(async (inst) => {
          const full = await getInstance(inst.id);
          return [inst.id, full] as const;
        })
      );
      setInstanceDetails(Object.fromEntries(details));
    } catch (err) {
      console.error('Failed to load task details', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const formatAchievementBlurb = (description: string) => {
    return description
      .replace(/^Complete\b/i, 'completing')
      .replace(/^Reach\b/i, 'reaching')
      .replace(/^Rate\b/i, 'rating');
  };

  if (loading) return <div className="px-4 pt-6 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</div>;

  return (
    <div className="px-5 pt-8 pb-28 page-enter">
      <div className="flex justify-between items-start mb-6">
        <div>
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveDisplayName}
              onKeyDown={(e) => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditing(false); }}
              disabled={saving}
              maxLength={50}
              className="text-lg font-bold bg-transparent border-b-2 border-[var(--color-primary)] outline-none w-full"
            />
          ) : (
            <button onClick={startEditing} className="flex items-center gap-1.5 group">
              <h1 className="text-lg font-bold">{displayName || username || 'EXPLORER'}</h1>
              <Pencil size={14} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
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

      <div className="flex gap-2 mt-5 mb-4">
        <button
          onClick={() => navigate('/submit-task')}
          className="flex-1 py-3 bg-white text-[9px] uppercase tracking-widest border border-[var(--color-border)] rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-[var(--color-surface-light)] transition-colors"
        >
          <PlusCircle size={16} />
          Suggest
        </button>
        {auth.isAdmin && (
          <>
            <button
              onClick={() => navigate('/admin/submissions')}
              className="flex-1 py-3 text-white text-[9px] uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-1 transition-colors hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Shield size={16} />
              Review
            </button>
            <button
              onClick={() => navigate('/admin/tasks')}
              className="flex-1 py-3 text-white text-[9px] uppercase tracking-widest rounded-lg flex flex-col items-center justify-center gap-1 transition-colors hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              <Database size={16} />
              Tasks DB
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => handleStatsViewClick('quests')}
          className={`card-retro p-3 text-center transition-colors hover:bg-[var(--color-surface-light)] ${statsView === 'quests' ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}`}
        >
          <Route size={20} className="mx-auto mb-1 text-[var(--color-primary)]" />
          <p className="text-sm font-bold">{totalRoutes}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Quests</p>
        </button>
        <button
          type="button"
          onClick={() => handleStatsViewClick('cleared')}
          className={`card-retro p-3 text-center transition-colors hover:bg-[var(--color-surface-light)] ${statsView === 'cleared' ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}`}
        >
          <CheckCircle size={20} className="mx-auto mb-1 text-[var(--color-success)]" />
          <p className="text-sm font-bold">{completedRoutes}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Cleared</p>
        </button>
        <button
          type="button"
          onClick={() => handleStatsViewClick('tasks')}
          className={`card-retro p-3 text-center transition-colors hover:bg-[var(--color-surface-light)] ${statsView === 'tasks' ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}`}
        >
          <MapPin size={20} className="mx-auto mb-1 text-[var(--color-primary)]" />
          <p className="text-sm font-bold">{completedTasks}/{totalTasks}</p>
          <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-widest">Tasks</p>
        </button>
      </div>

      {statsView && (
        <section className="mt-3">
          <div className="card-retro p-3 space-y-2">
            {statsView === 'quests' && (
              <>
                <h3 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">All Quests</h3>
                {instances.length === 0 ? (
                  <p className="text-xs">No quests yet.</p>
                ) : (
                  instances.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => navigate(`/route/${inst.id}`)}
                      className="w-full text-left p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-light)] transition-colors"
                    >
                      <p className="text-sm font-bold">{inst.title}</p>
                      <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mt-0.5">
                        {inst.progress.completed_tasks}/{inst.progress.total_tasks} tasks
                      </p>
                    </button>
                  ))
                )}
              </>
            )}
            {statsView === 'cleared' && (
              <>
                <h3 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Cleared Quests</h3>
                {clearedInstances.length === 0 ? (
                  <p className="text-xs">No cleared quests yet.</p>
                ) : (
                  clearedInstances.map((inst) => (
                    <button
                      key={inst.id}
                      onClick={() => navigate(`/route/${inst.id}`)}
                      className="w-full text-left p-2 border border-[var(--color-border)] rounded hover:bg-[var(--color-surface-light)] transition-colors"
                    >
                      <p className="text-sm font-bold">{inst.title}</p>
                      <p className="text-[9px] uppercase tracking-widest text-[var(--color-success)] mt-0.5">
                        Cleared
                      </p>
                    </button>
                  ))
                )}
              </>
            )}
            {statsView === 'tasks' && (
              <>
                <h3 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">Tasks by Quest</h3>
                {loadingTasks ? (
                  <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading tasks...</p>
                ) : (
                  instances.map((inst) => {
                    const detail = instanceDetails[inst.id];
                    return (
                      <div key={inst.id} className="p-2 border border-[var(--color-border)] rounded">
                        <p className="text-sm font-bold">{inst.title}</p>
                        {detail?.tasks?.length ? (
                          <ul className="mt-1 space-y-1">
                            {detail.tasks.map((task) => (
                              <li key={task.id} className="text-xs flex justify-between gap-2">
                                <span className="truncate">{task.name}</span>
                                <span className={`uppercase tracking-widest text-[8px] ${task.is_completed ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                                  {task.is_completed ? 'Done' : 'Todo'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            {instances.length === 0 ? 'No tasks yet.' : 'Task details unavailable.'}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </section>
      )}

      {achievements.length > 0 && (
        <section className="mt-6">
          <button
            onClick={() => {
              const willOpen = !achievementsOpen;
              setAchievementsOpen(willOpen);
              if (!willOpen) {
                setSelectedAchievement(null);
              }
            }}
            className="flex items-center gap-1.5 mb-3 w-full text-left"
          >
            <Award size={14} className="text-[var(--color-primary)]" />
            <h2 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
              Achievements ({unlockedCount}/{achievements.length})
            </h2>
            <ChevronDown
              size={14}
              className={`text-[var(--color-text-muted)] ml-auto transition-transform duration-200 ${achievementsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {achievementsOpen && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {achievements.map((ach) => (
                  <button
                    key={ach.id}
                    type="button"
                    onClick={() => setSelectedAchievement(ach)}
                    className={`card-retro p-2 text-center transition-colors hover:bg-[var(--color-surface-light)] ${
                      ach.unlocked ? '' : 'opacity-30 grayscale'
                    } ${
                      selectedAchievement?.id === ach.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''
                    }`}
                    title={`${ach.name}: ${ach.description}`}
                  >
                    <span className="text-xl block">{ach.icon}</span>
                    <p className="text-[7px] text-[var(--color-text-muted)] uppercase tracking-wide mt-1 truncate">
                      {ach.name}
                    </p>
                    {!ach.unlocked && (
                      <div className="progress-retro h-1 mt-1">
                        <div
                          className="progress-retro-fill h-full"
                          style={{ width: `${(ach.progress / ach.threshold) * 100}%` }}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {selectedAchievement && (
                <div className="card-retro mt-3 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedAchievement.icon}</span>
                    <div>
                      <h3 className="font-bold text-sm">{selectedAchievement.name}</h3>
                      <p className="text-[8px] uppercase tracking-widest text-[var(--color-text-muted)]">
                        {selectedAchievement.unlocked ? 'Unlocked' : 'Locked'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs mt-2">
                    Earn this badge by {formatAchievementBlurb(selectedAchievement.description)}
                  </p>
                  {!selectedAchievement.unlocked && (
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">
                      Progress: {Math.min(selectedAchievement.progress, selectedAchievement.threshold)} / {selectedAchievement.threshold}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {instances.length > 0 && (
        <section className="mt-6">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-1.5 mb-3 w-full text-left"
          >
            <h2 className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest">
              Quest History ({instances.length})
            </h2>
            <ChevronDown
              size={14}
              className={`text-[var(--color-text-muted)] ml-auto transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
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
          )}
        </section>
      )}
    </div>
  );
}
