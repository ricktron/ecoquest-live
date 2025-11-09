import { NavLink, useLocation } from 'react-router-dom';
import { Trophy, BarChart3, Calendar, Map as MapIcon, Bug, GitCompare, Grid3x3 } from 'lucide-react';
import { FLAGS } from '@/env';
import { useIsMobile } from '@/hooks/use-mobile';

export default function TabNav() {
  const location = useLocation();
  const isMobile = useIsMobile();

  const tabs = [
    { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3, show: true },
    { to: '/bingo', label: 'Bingo', icon: Grid3x3, show: FLAGS.FEATURE_BINGO },
    { to: '/trophies', label: 'Trophies', icon: Trophy, show: FLAGS.TROPHIES_ENABLED },
    { to: '/daily', label: 'Daily', icon: Calendar, show: true },
    { to: '/map', label: 'Map', icon: MapIcon, show: true },
    { to: '/compare', label: 'Compare', icon: GitCompare, show: FLAGS.ENABLE_COMPARE },
    { to: '/debug', label: 'Debug', icon: Bug, show: FLAGS.ADMIN_ENABLED },
  ].filter(t => t.show);

  return (
    <>
      {/* Top pill tabs - visible on all screens */}
      <nav className="border-b bg-background px-4 py-2 app-header">
        <div className="max-w-screen-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Mobile bottom tabs - icons only */}
      <nav className="md:hidden tabbar">
        <div className="h-14 flex items-center justify-around px-2">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`
              }
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
