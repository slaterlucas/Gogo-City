import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInstance, Instance } from '../api/instances';
import { getProgress, ProgressDetail } from '../api/checkins';
import CheckInModal from '../components/CheckInModal';
import RouteMap from '../components/RouteMap';
import { ArrowLeft, MapPin, Camera, Shield, Zap, Check, Share2, List, Map, ChevronDown } from 'lucide-react';

const VERIFY_ICON = {
  gps: MapPin,
  photo: Camera,
  both: Shield,
};

export default function RoutePage() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [progress, setProgress] = useState<ProgressDetail | null>(null);
  const [checkInTaskId, setCheckInTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    if (!instanceId) return;
    try {
      const [inst, prog] = await Promise.all([getInstance(instanceId), getProgress(instanceId)]);
      setInstance(inst);
      setProgress(prog);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [instanceId]);

  if (loading) return <div className="px-4 pt-6 text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</div>;
  if (!instance || !progress) return <div className="px-4 pt-6 text-center text-xs text-[var(--color-error)] uppercase">Quest not found</div>;

  const checkInTask = instance.tasks.find((t) => t.id === checkInTaskId);

  const handleShare = async () => {
    if (!instance.share_code) return;
    const url = `${window.location.origin}/import/${instance.share_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
  };

  return (
    <div className="px-5 pt-8 pb-24 page-enter">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] uppercase tracking-widest">
          <ArrowLeft size={14} /> Back
        </button>
        {instance.share_code && (
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-3 py-1.5 text-[9px] uppercase tracking-widest border-2 border-[var(--color-border)] bg-white hover:bg-[var(--color-surface-light)] btn-retro"
          >
            <Share2 size={12} />
            {copied ? 'Copied!' : 'Share'}
          </button>
        )}
      </div>

      <h1 className="text-sm font-bold">{instance.title}</h1>
      <p className="font-sans text-xs text-[var(--color-text-muted)] mb-3">{instance.description}</p>

      <div className="card-retro p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] uppercase tracking-widest">{progress.completed}/{progress.total} Tasks</span>
          <span className="text-[10px] text-[var(--color-primary)] flex items-center gap-1">
            <Zap size={12} />
            {progress.xp_earned}/{progress.xp_possible} XP
          </span>
        </div>
        <div className="progress-retro h-4">
          <div className="progress-retro-fill h-full transition-all duration-500" style={{ width: `${progress.progress_pct}%` }} />
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setView('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-widest border-2 transition-colors ${
            view === 'list'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]'
          }`}
        >
          <List size={14} /> List
        </button>
        <button
          onClick={() => setView('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] uppercase tracking-widest border-2 transition-colors ${
            view === 'map'
              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
              : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[var(--color-surface-light)]'
          }`}
        >
          <Map size={14} /> Map
        </button>
      </div>

      {view === 'map' ? (
        <RouteMap tasks={instance.tasks} onTaskClick={(id) => setCheckInTaskId(id)} />
      ) : (
      <div className="space-y-3">
        {instance.tasks.map((task) => {
          const progTask = progress.tasks.find((t) => t.task_id === task.id);
          const completed = task.is_completed;
          const Icon = VERIFY_ICON[task.verification_type as keyof typeof VERIFY_ICON] || MapPin;

          const isExpanded = expandedTaskId === task.id;

          return (
            <div
              key={task.id}
              className={`card-retro p-4 border-l-4 ${completed ? 'border-[var(--color-success)]' : 'border-[var(--color-primary)]'}`}
            >
              <div
                className={`flex items-start gap-3 ${completed ? 'cursor-pointer' : ''}`}
                onClick={completed ? () => setExpandedTaskId(isExpanded ? null : task.id) : undefined}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  completed
                    ? 'bg-[var(--color-success)] text-white shadow-sm'
                    : 'bg-[var(--color-surface-light)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                }`}>
                  {completed ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{task.name}</h3>
                  {task.task_description && (
                    <p className="font-sans text-xs text-[var(--color-text-muted)] mt-1">{task.task_description}</p>
                  )}
                  {task.verification_hint && !completed && (
                    <p className="font-sans text-xs text-[var(--color-primary)] mt-1 italic">Hint: {task.verification_hint}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[8px] px-1.5 py-0.5 bg-[var(--color-surface-light)] text-[var(--color-text-muted)] border border-[var(--color-border)] uppercase">
                      {task.verification_type}
                    </span>
                    <span className="text-[8px] text-[var(--color-primary)]">{task.xp || progTask?.xp || 0} XP</span>
                    {completed && progTask?.verified_by && (
                      <span className="text-[8px] text-[var(--color-success)] uppercase">Verified: {progTask.verified_by}</span>
                    )}
                  </div>
                </div>
                {!completed ? (
                  <button
                    onClick={() => setCheckInTaskId(task.id)}
                    className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-[9px] uppercase tracking-widest btn-retro shrink-0"
                  >
                    Check In
                  </button>
                ) : (
                  <ChevronDown size={16} className={`text-[var(--color-text-muted)] shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                )}
              </div>

              {completed && isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  {progTask?.photo_url ? (
                    <img
                      src={progTask.photo_url}
                      alt={`Evidence for ${task.name}`}
                      className="w-full rounded border-2 border-[var(--color-border)]"
                    />
                  ) : (
                    <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest text-center py-3">
                      {progTask?.verified_by === 'gps' ? 'Verified by GPS — no photo' : 'No photo available'}
                    </p>
                  )}
                  {progTask?.checked_in_at && (
                    <p className="text-[8px] text-[var(--color-text-muted)] uppercase tracking-widest mt-2">
                      Completed {new Date(progTask.checked_in_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {checkInTask && (
        <CheckInModal
          task={checkInTask}
          onClose={() => setCheckInTaskId(null)}
          onSuccess={() => { setCheckInTaskId(null); load(); }}
        />
      )}
    </div>
  );
}
