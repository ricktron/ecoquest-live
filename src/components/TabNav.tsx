import { NavLink, useLocation } from 'react-router-dom';
import { Trophy, BarChart3, Calendar, Map as MapIcon, Bug } from 'lucide-react';
import { FLAGS } from '@/env';
import { useIsMobile } from '@/hooks/use-mobile';

export default function TabNav() {
  const location = useLocation();
  const isMobile = useIsMobile();

  const tabs = [
    { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3, show: true },
    { to: '/trophies', label: 'Trophies', icon: Trophy, show: FLAGS.TROPHIES_ENABLED },
    { to: '/daily', label: 'Daily', icon: Calendar, show: true },
    { to: '/map', label: 'Map', icon: MapIcon, show: true },
    { to: '/debug', label: 'Debug', icon: Bug, show: FLAGS.ADMIN_ENABLED },
  ].filter(t => t.show);

  return (
    <>
      {/* Desktop: horizontal tabs at top */}
      <div className="hidden md:block app-header">
        <div className="max-w-screen-lg mx-auto px-6 h-full flex items-center">
          <nav className="flex gap-6">
            {tabs.map(tab => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`
                }
              >
                <tab.icon className="h-5 w-5" />
                <span className="font-medium">{tab.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile: bottom tab bar */}
      <div className="md:hidden tabbar">
        <nav className="flex justify-around h-14 items-center">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 gap-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <tab.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
}
