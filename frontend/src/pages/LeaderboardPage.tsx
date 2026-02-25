import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../api/checkins';
import { Trophy, Zap } from 'lucide-react';

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

  const rankLabel = (rank: number) => {
    if (rank === 1) return '1ST';
    if (rank === 2) return '2ND';
    if (rank === 3) return '3RD';
    return `${rank}TH`;
  };

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Trophy size={22} className="text-[var(--color-primary)]" />
        <h1 className="text-sm uppercase tracking-widest">Leaderboard</h1>
      </div>

      {loading ? (
        <p className="text-center text-xs text-[var(--color-text-muted)] uppercase tracking-widest">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">No explorers yet</p>
          <p className="font-sans text-sm text-[var(--color-text-muted)] mt-2">Be the first to earn XP!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => {
            const isMe = entry.user_id === userId;
            const isTop3 = entry.rank <= 3;
            return (
              <div
                key={entry.user_id}
                className={`card-retro flex items-center gap-3 p-3 ${isMe ? 'border-[var(--color-primary)] border-2' : ''} ${isTop3 ? 'border-l-4 border-l-[var(--color-primary)]' : ''}`}
              >
                <span className={`text-[10px] w-10 text-center uppercase ${isTop3 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                  {rankLabel(entry.rank)}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-sm">
                    {entry.display_name}
                    {isMe && <span className="text-[8px] text-[var(--color-primary)] ml-1 uppercase">(you)</span>}
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
    </div>
  );
}
