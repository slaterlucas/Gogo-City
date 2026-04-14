import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '../api/checkins';
import { Trophy, Zap, Crown, Medal } from 'lucide-react';

const MEDAL_COLORS: Record<number, { bg: string; text: string; border: string; icon: string }> = {
  1: { bg: 'from-amber-50 to-yellow-50', text: 'text-amber-600', border: 'border-amber-200', icon: '👑' },
  2: { bg: 'from-slate-50 to-gray-100', text: 'text-slate-500', border: 'border-slate-200', icon: '🥈' },
  3: { bg: 'from-orange-50 to-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '🥉' },
};

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
            <div className="flex items-end justify-center gap-3 mb-6 pt-4">
              {[2, 1, 3].map((rank) => {
                const entry = top3.find((e) => e.rank === rank);
                if (!entry) return <div key={rank} className="w-24" />;
                const medal = MEDAL_COLORS[rank];
                const isMe = entry.user_id === userId;
                const isFirst = rank === 1;
                return (
                  <div
                    key={entry.user_id}
                    className={`flex flex-col items-center ${isFirst ? 'order-2' : rank === 2 ? 'order-1' : 'order-3'}`}
                  >
                    <span className="text-2xl mb-1">{medal.icon}</span>
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${medal.bg} border-2 ${medal.border} flex items-center justify-center mb-2 ${
                        isFirst ? 'scale-110 shadow-lg shadow-amber-500/15' : ''
                      } ${isMe ? 'ring-2 ring-[var(--color-primary)] ring-offset-2' : ''}`}
                    >
                      <span className="text-lg font-bold font-sans">{entry.display_name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    <p className={`text-xs font-sans font-semibold text-center truncate max-w-[80px] ${isMe ? 'text-[var(--color-primary)]' : ''}`}>
                      {entry.display_name}
                    </p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Zap size={10} className="text-[var(--color-primary)]" />
                      <span className="text-[10px] font-sans font-semibold text-[var(--color-primary)] tabular-nums">{entry.total_xp}</span>
                    </div>
                    <span className="text-[8px] font-sans text-[var(--color-text-muted)] mt-0.5">Lv.{entry.level}</span>
                  </div>
                );
              })}
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
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-light)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold font-sans text-[var(--color-text-muted)]">
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
