import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../api/checkins';
import { Trophy, Zap } from 'lucide-react';

const PODIUM: Record<number, { height: string; color: string; windowColor: string }> = {
  1: { height: 'h-32', color: 'bg-[#2d2d2d]', windowColor: 'bg-amber-300' },
  2: { height: 'h-24', color: 'bg-[#444]',    windowColor: 'bg-slate-300' },
  3: { height: 'h-18', color: 'bg-[#555]',    windowColor: 'bg-orange-300' },
};

function Building({ rank, entry, isMe }: { rank: number; entry: LeaderboardEntry; isMe: boolean }) {
  const cfg = PODIUM[rank];
  const rows = rank === 1 ? 4 : rank === 2 ? 3 : 2;

  return (
    <div className={`flex flex-col items-center w-[100px] ${rank === 1 ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}>
      <p className={`text-[10px] font-bold text-center truncate w-full mb-1 ${isMe ? 'text-[var(--color-primary)]' : ''}`}>
        {entry.display_name}
      </p>
      <div className="flex items-center gap-0.5 mb-2">
        <Zap size={9} className="text-[var(--color-primary)]" />
        <span className="text-[9px] font-bold text-[var(--color-primary)] tabular-nums">{entry.total_xp} XP</span>
      </div>

      {/* building */}
      <div className="relative w-[90px]">
        {/* antenna on 1st place */}
        {rank === 1 && (
          <div className="flex justify-center mb-0">
            <div className="w-[2px] h-3 bg-[#2d2d2d]" />
          </div>
        )}
        <div className={`${cfg.height} ${cfg.color} w-full border-2 border-[var(--color-text)] relative`}
          style={{ boxShadow: '3px 3px 0px var(--color-text)' }}>
          {/* windows grid */}
          <div className="absolute inset-1.5 grid grid-cols-3 gap-1 content-start">
            {Array.from({ length: rows * 3 }).map((_, i) => (
              <div key={i} className={`${cfg.windowColor} opacity-70 h-2`} />
            ))}
          </div>
          {/* door */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-5 bg-[var(--color-surface-light)] border-t-2 border-x-2 border-[var(--color-text)]" />
          {/* rank number */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-[var(--color-text)] flex items-center justify-center"
            style={{ boxShadow: '2px 2px 0px var(--color-text)' }}>
            <span className="text-[10px] font-bold">{rank}</span>
          </div>
        </div>
      </div>
      <span className="text-[7px] text-[var(--color-text-muted)] uppercase mt-1.5">Lv.{entry.level}</span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserId(payload.sub);
      } catch { /* ignore */ }
    }
    getLeaderboard(50).then(setEntries).finally(() => setLoading(false));
  }, []);

  const top3 = entries.filter((e) => e.rank <= 3);
  const rest = entries.filter((e) => e.rank > 3);

  return (
    <div className="px-4 pt-6 pb-28 page-enter">
      <div className="flex items-center gap-2.5 mb-6">
        <Trophy size={22} className="text-[var(--color-primary)]" />
        <h1 className="text-sm uppercase tracking-widest">Leaderboard</h1>
      </div>

      {loading ? (
        <p className="text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest animate-pulse mt-12">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">No explorers yet</p>
          <p className="font-sans text-sm text-[var(--color-text-muted)] mt-2">Be the first to earn XP!</p>
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="mb-6">
              {/* skyline */}
              <div className="flex items-end justify-center gap-2 pt-4">
                {[2, 1, 3].map((rank) => {
                  const entry = top3.find((e) => e.rank === rank);
                  if (!entry) return <div key={rank} className="w-[100px]" />;
                  return (
                    <Building
                      key={entry.user_id}
                      rank={rank}
                      entry={entry}
                      isMe={entry.user_id === userId}
                    />
                  );
                })}
              </div>
              {/* ground line */}
              <div className="h-[3px] bg-[var(--color-text)] mx-2 mt-0" />
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((entry, i) => {
                const isMe = entry.user_id === userId;
                return (
                  <div
                    key={entry.user_id}
                    className={`card-retro flex items-center gap-3 p-3.5 transition-all ${
                      isMe ? 'border-[var(--color-primary)] bg-red-50/30' : ''
                    } ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                  >
                    <span className="text-[11px] w-8 text-center text-[var(--color-text-muted)] tabular-nums">
                      {entry.rank}
                    </span>
                    <div className="w-9 h-9 bg-[var(--color-surface-light)] border-2 border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[var(--color-text-muted)]">
                        {entry.display_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">
                        {entry.display_name}
                        {isMe && (
                          <span className="text-[8px] text-[var(--color-primary)] ml-1 uppercase">(you)</span>
                        )}
                      </p>
                      <p className="text-[8px] text-[var(--color-text-muted)] uppercase">Lv.{entry.level}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--color-primary)] text-[10px]">
                      <Zap size={12} />
                      {entry.total_xp}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
