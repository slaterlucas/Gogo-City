import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Compass, Trophy, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'HOME' },
  { path: '/generate', icon: Compass, label: 'EXPLORE' },
  { path: '/leaderboard', icon: Trophy, label: 'RANKS' },
  { path: '/profile', icon: User, label: 'PROFILE' },
];

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeIndex = tabs.findIndex((t) => t.path === location.pathname);

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 px-4 pb-4 pt-2 pointer-events-none">
      <nav className="pointer-events-auto navbar-glass rounded-2xl border border-white/30 px-2 py-1.5">
        <div className="relative flex justify-around">
          {activeIndex >= 0 && (
            <div
              className="absolute top-0 h-full rounded-xl bg-[var(--color-primary)]/10 transition-all duration-300 ease-out"
              style={{
                width: `${100 / tabs.length}%`,
                left: `${(activeIndex / tabs.length) * 100}%`,
              }}
            />
          )}
          {tabs.map((tab) => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`relative z-10 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-[var(--color-primary)] scale-105'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] active:scale-95'
                }`}
              >
                <tab.icon size={22} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[7px] uppercase tracking-widest transition-all duration-200 ${active ? 'font-bold' : ''}`}>
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
