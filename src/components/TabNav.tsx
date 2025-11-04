import { NavLink } from 'react-router-dom';
import { Trophy, BarChart3, Calendar, Map as MapIcon, Bug } from 'lucide-react';
import { FLAGS } from '@/env';

export default function TabNav() {
  const tabs = [
    { to: '/leaderboard', label: 'Leaderboard', icon: BarChart3, show: true },
    { to: '/trophies', label: 'Trophies', icon: Trophy, show: FLAGS.TROPHIES_ENABLED },
    { to: '/daily', label: 'Daily', icon: Calendar, show: true },
    { to: '/map', label: 'Map', icon: MapIcon, show: true },
    { to: '/debug', label: 'Debug', icon: Bug, show: FLAGS.ADMIN_ENABLED },
  ].filter(t => t.show);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
      isActive
        ? 'text-primary border-b-2 md:border-b-2 border-primary'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around">
          {tabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} className={getNavCls}>
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop top nav */}
      <nav className="hidden md:flex bg-background border-b sticky top-0 z-40">
        <div className="flex gap-1 px-6">
          {tabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} className={getNavCls}>
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </div>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
