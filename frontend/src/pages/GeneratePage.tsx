import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCities, City } from '../api/cities';
import { generateRoute, GenerateRouteResponse } from '../api/routes';
import { createInstance } from '../api/instances';
import { Sparkles, Clock, MapPin, Zap } from 'lucide-react';

const VIBE_OPTIONS: { id: string; label: string; emoji: string }[] = [
  { id: 'foodie', label: 'Foodie', emoji: '🍜' },
  { id: 'cultural', label: 'Cultural', emoji: '🏛️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'adventurous', label: 'Adventure', emoji: '🧗' },
  { id: 'chill', label: 'Chill', emoji: '☕' },
  { id: 'photography', label: 'Photo', emoji: '📸' },
  { id: 'music', label: 'Music', emoji: '🎵' },
  { id: 'outdoors', label: 'Outdoors', emoji: '🌿' },
  { id: 'social', label: 'Social', emoji: '👋' },
  { id: 'history', label: 'History', emoji: '📜' },
  { id: 'romantic', label: 'Romantic', emoji: '💕' },
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

  const toggleVibe = (id: string) => {
    setVibes((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
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
      <div className="px-5 pt-8 pb-28 page-enter">
        <h1 className="text-lg font-sans font-bold mb-1">{result.title}</h1>
        <p className="font-sans text-sm text-[var(--color-text-muted)] mb-4">{result.city_name}</p>

        <div className="flex gap-4 mb-5">
          <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] bg-[var(--color-surface-light)] px-3 py-1.5 rounded-full">
            <Clock size={14} />
            <span className="text-[11px] font-sans font-medium">{Math.round(result.estimated_duration_minutes / 60 * 10) / 10}h</span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] bg-[var(--color-surface-light)] px-3 py-1.5 rounded-full">
            <MapPin size={14} />
            <span className="text-[11px] font-sans font-medium">{result.total_tasks} tasks</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {result.tasks.map((task, i) => (
            <div key={task.id} className="card-retro p-4">
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-sans font-bold bg-gradient-to-br from-orange-50 to-red-50 text-[var(--color-primary)] w-7 h-7 flex items-center justify-center shrink-0 rounded-lg">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-bold text-sm font-sans">{task.name}</h3>
                  {task.task_description && (
                    <p className="font-sans text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">{task.task_description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] px-2 py-0.5 bg-[var(--color-surface-light)] text-[var(--color-text-muted)] rounded-full font-sans font-medium uppercase">
                      {task.verification_type}
                    </span>
                    <span className="text-[9px] text-[var(--color-text-muted)] font-sans">{task.avg_duration_minutes}min</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setResult(null)}
            className="flex-1 py-3.5 bg-white text-[var(--color-text)] text-xs uppercase tracking-widest rounded-xl font-sans font-semibold border border-[var(--color-border)] active:scale-[0.98] transition-transform"
          >
            Reroll
          </button>
          <button
            onClick={handleStart}
            disabled={starting}
            className="flex-1 py-3.5 bg-gradient-to-r from-[#e8832a] to-[#e55a2f] text-white text-xs uppercase tracking-widest rounded-xl font-sans font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Zap size={16} />
            {starting ? 'Starting...' : 'Start Quest'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-28 page-enter">
      <h1 className="text-lg font-sans font-bold mb-1">Generate Route</h1>
      <p className="font-sans text-sm text-[var(--color-text-muted)] mb-7">Tell us what you're looking for</p>

      <div className="space-y-6">
        <div className="card-retro p-4">
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2.5 uppercase tracking-widest font-sans font-medium">
            City
          </label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="w-full px-4 py-3 text-sm font-sans rounded-lg">
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
            ))}
          </select>
        </div>

        <div className="card-retro p-4">
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2.5 uppercase tracking-widest font-sans font-medium">
            Time
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range" min={1} max={10} step={0.5} value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value))}
              className="flex-1 accent-[var(--color-primary)] range-styled"
            />
            <span className="text-lg font-bold font-sans text-[var(--color-primary)] min-w-[48px] text-right tabular-nums">
              {hours}h
            </span>
          </div>
          <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] font-sans mt-1.5 px-0.5">
            <span>Quick</span><span>Half day</span><span>Full day</span>
          </div>
        </div>

        <div className="card-retro p-4">
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2.5 uppercase tracking-widest font-sans font-medium">
            Budget
          </label>
          <div className="flex gap-2">
            {(['low', 'medium', 'high', 'any'] as const).map((b) => {
              const budgetEmoji = { low: '💰', medium: '💳', high: '💎', any: '✨' };
              return (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`flex-1 py-2.5 text-[10px] uppercase tracking-wide transition-all duration-200 rounded-xl font-sans font-medium ${
                    budget === b
                      ? 'bg-gradient-to-r from-[#e8832a] to-[#e55a2f] text-white shadow-md shadow-orange-500/20 scale-[1.02]'
                      : 'bg-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <span className="block text-sm mb-0.5">{budgetEmoji[b]}</span>
                  {b === 'any' ? 'Any' : b}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card-retro p-4">
          <label className="text-[10px] text-[var(--color-text-muted)] block mb-2.5 uppercase tracking-widest font-sans font-medium">
            Vibes
          </label>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => toggleVibe(v.id)}
                className={`px-3 py-2 text-[10px] tracking-wide transition-all duration-200 rounded-xl font-sans font-medium flex items-center gap-1.5 ${
                  vibes.includes(v.id)
                    ? 'bg-gradient-to-r from-[#e8832a] to-[#e55a2f] text-white shadow-md shadow-orange-500/20 scale-[1.02]'
                    : 'bg-[var(--color-surface-light)] text-[var(--color-text-muted)] hover:bg-gray-100'
                }`}
              >
                <span>{v.emoji}</span>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating || !cityId}
        className={`w-full mt-8 py-4 text-white text-sm uppercase tracking-widest rounded-xl font-sans font-semibold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 ${
          generating
            ? 'bg-gradient-to-r from-[#e8832a] to-[#e55a2f] animate-pulse'
            : 'bg-gradient-to-r from-[#e8832a] to-[#e55a2f] shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 active:scale-[0.98]'
        }`}
      >
        <Sparkles size={20} className={generating ? 'animate-spin' : ''} />
        {generating ? 'Generating...' : 'Generate Route'}
      </button>

      {generating && (
        <p className="text-center text-xs text-[var(--color-text-muted)] mt-4 font-sans animate-pulse">
          AI is building your quest...
        </p>
      )}
    </div>
  );
}
