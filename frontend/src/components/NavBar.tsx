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

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t-2 border-[var(--color-text)] z-50">
      <div className="flex justify-around py-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              <tab.icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[7px] uppercase tracking-widest">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
