const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 1750, 2750, 4000, 5500, 7500, 10000];

function getNextThreshold(xp: number) {
  for (const t of LEVEL_THRESHOLDS) {
    if (xp < t) return t;
  }
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
}

function getPrevThreshold(xp: number) {
  let prev = 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (xp < t) return prev;
    prev = t;
  }
  return prev;
}

interface Props {
  xp: number;
  level: number;
  compact?: boolean;
}

export default function XPBar({ xp, level, compact }: Props) {
  const prev = getPrevThreshold(xp);
  const next = getNextThreshold(xp);
  const progress = next > prev ? ((xp - prev) / (next - prev)) * 100 : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] bg-[var(--color-primary)] text-white px-2 py-0.5 border-2 border-[var(--color-primary-dark)] uppercase">
          Lv.{level}
        </span>
        <div className="flex-1 progress-retro h-2">
          <div className="progress-retro-fill h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-[var(--color-text-muted)]">{xp} XP</span>
      </div>
    );
  }

  return (
    <div className="card-retro p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm bg-[var(--color-primary)] text-white px-3 py-1 border-2 border-[var(--color-primary-dark)] uppercase tracking-widest">
          Level {level}
        </span>
        <span className="text-sm text-[var(--color-primary)]">{xp} XP</span>
      </div>
      <div className="progress-retro h-4">
        <div className="progress-retro-fill h-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-[var(--color-text-muted)]">{prev}</span>
        <span className="text-[8px] text-[var(--color-text-muted)]">{next}</span>
      </div>
    </div>
  );
}
