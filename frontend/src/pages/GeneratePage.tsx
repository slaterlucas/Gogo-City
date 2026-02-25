import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCities, City } from '../api/cities';
import { generateRoute, GenerateRouteResponse } from '../api/routes';
import { createInstance } from '../api/instances';
import { Sparkles, Clock, MapPin, Zap } from 'lucide-react';

const VIBE_OPTIONS = [
  'foodie', 'cultural', 'nightlife', 'adventurous', 'chill',
  'photography', 'music', 'outdoors', 'social', 'history', 'romantic',
];

export default function GeneratePage() {
  const [cities, setCities] = useState<City[]>([]);
  const [cityId, setCityId] = useState('');
  const [hours, setHours] = useState(4);
  const [budget, setBudget] = useState<'low' | 'medium' | 'high' | 'any'>('any');
  const [vibes, setVibes] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateRouteResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    listCities().then((c) => {
      setCities(c);
      if (c.length > 0) setCityId(c[0].id);
    });
  }, []);

  const toggleVibe = (v: string) => {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const data = await generateRoute({
        city_id: cityId,
        time_available_hours: hours,
        budget,
        vibe_tags: vibes,
        dietary_restrictions: [],
        group_size: 1,
      });
      setResult(data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleStart = async () => {
    if (!result) return;
    setStarting(true);
    try {
      const instance = await createInstance(result.template_id);
      navigate(`/route/${instance.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to start route');
    } finally {
      setStarting(false);
    }
  };

  if (result) {
    return (
      <div className="px-4 pt-6 pb-24">
        <h1 className="text-sm mb-1">{result.title}</h1>
        <p className="font-sans text-sm text-[var(--color-text-muted)] mb-4">{result.city_name}</p>

        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
            <Clock size={14} />
            <span className="text-[10px]">{Math.round(result.estimated_duration_minutes / 60 * 10) / 10}h</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-text-muted)]">
            <MapPin size={14} />
            <span className="text-[10px]">{result.total_tasks} tasks</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {result.tasks.map((task, i) => (
            <div key={task.id} className="card-retro p-3">
              <div className="flex items-start gap-3">
                <span className="text-[10px] bg-[var(--color-surface-light)] w-6 h-6 flex items-center justify-center shrink-0 border border-[var(--color-border)]">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-sm">{task.name}</h3>
                  {task.task_description && (
                    <p className="font-sans text-xs text-[var(--color-text-muted)] mt-1">{task.task_description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[8px] px-1.5 py-0.5 bg-[var(--color-surface-light)] text-[var(--color-text-muted)] border border-[var(--color-border)] uppercase">
                      {task.verification_type}
                    </span>
                    <span className="text-[8px] text-[var(--color-text-muted)]">{task.avg_duration_minutes}min</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setResult(null)} className="flex-1 py-3 bg-white text-[var(--color-text)] text-xs uppercase tracking-widest btn-retro">
            Reroll
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white text-xs uppercase tracking-widest btn-retro flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap size={16} />
            {starting ? 'Starting...' : 'Start Quest'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-sm mb-1 uppercase tracking-widest">Generate Route</h1>
      <p className="font-sans text-xs text-[var(--color-text-muted)] mb-6">Tell us what you're looking for</p>

      <div className="space-y-5">
        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2 uppercase tracking-widest">City</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="w-full px-4 py-3 text-sm">
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2 uppercase tracking-widest">
            Time: <span className="text-[var(--color-primary)]">{hours}h</span>
          </label>
          <input
            type="range" min={1} max={10} step={0.5} value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
          <div className="flex justify-between text-[8px] text-[var(--color-text-muted)]">
            <span>1h</span><span>5h</span><span>10h</span>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2 uppercase tracking-widest">Budget</label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high', 'any'] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBudget(b)}
                className={`flex-1 py-2 text-[9px] uppercase tracking-widest transition-colors border-2 ${
                  budget === b
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary-dark)]'
                    : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                {b === 'any' ? 'Any' : b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2 uppercase tracking-widest">Vibes</label>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => toggleVibe(v)}
                className={`px-3 py-1.5 text-[9px] uppercase tracking-widest transition-colors border-2 ${
                  vibes.includes(v)
                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary-dark)]'
                    : 'bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !cityId}
        className="w-full mt-8 py-4 bg-[var(--color-primary)] text-white text-sm uppercase tracking-widest btn-retro flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Sparkles size={20} />
        {generating ? 'Generating...' : 'Generate Route'}
      </button>

      {generating && (
        <p className="text-center text-[9px] text-[var(--color-text-muted)] mt-3 animate-pulse uppercase tracking-widest">
          AI is building your quest...
        </p>
      )}
    </div>
  );
}
