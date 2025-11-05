import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppState } from '@/lib/state';
import { findCloseBattles } from '@/lib/closeBattles';
import { FLAGS } from '@/env';
import type { AggregatedScores, ObservationData } from '@/lib/scoring';

type Announcement = {
  id: string;
  text: string;
};

export default function NewsTicker() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const { aggregated, observations } = useAppState();

  useEffect(() => {
    const hidden = localStorage.getItem('ticker-hidden');
    if (hidden === 'true') setVisible(false);
  }, []);

  const announcements = deriveAnnouncements(aggregated, observations);

  useEffect(() => {
    if (announcements.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % announcements.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [announcements.length]);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('ticker-hidden', 'true');
  };

  if (!FLAGS.TICKER_ENABLED || !visible || announcements.length === 0) return null;

  return (
    <div 
      className="w-full bg-primary text-primary-foreground py-2 px-4 flex items-center gap-3 relative overflow-hidden sticky top-[52px] z-40"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={(e) => {
        const ticker = e.currentTarget.querySelector('.ticker-content') as HTMLElement;
        if (ticker) ticker.style.animationPlayState = 'paused';
      }}
      onMouseLeave={(e) => {
        const ticker = e.currentTarget.querySelector('.ticker-content') as HTMLElement;
        if (ticker) ticker.style.animationPlayState = 'running';
      }}
      onFocus={(e) => {
        const ticker = e.currentTarget.querySelector('.ticker-content') as HTMLElement;
        if (ticker) ticker.style.animationPlayState = 'paused';
      }}
      onBlur={(e) => {
        const ticker = e.currentTarget.querySelector('.ticker-content') as HTMLElement;
        if (ticker) ticker.style.animationPlayState = 'running';
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="ticker-content animate-[ticker_20s_linear_infinite] whitespace-nowrap">
          {announcements[currentIndex]?.text}
        </div>
      </div>
      <button
        onClick={handleClose}
        className="shrink-0 hover:bg-primary-foreground/20 rounded p-1 transition-colors"
        aria-label="Close ticker"
      >
        <X className="w-4 h-4" />
      </button>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function deriveAnnouncements(aggregated: AggregatedScores | null, observations: ObservationData[]): Announcement[] {
  const announcements: Announcement[] = [];

  if (!aggregated) return announcements;

  // Close battles
  const userArray = Array.from(aggregated.byUser.values())
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  const battles = findCloseBattles(userArray);
  battles.forEach((b, i) => {
    announcements.push({
      id: `battle-${i}`,
      text: `🏁 Close race: ${b.a.login} vs ${b.b.login} (Δ${b.d.toFixed(2)} pts)`,
    });
  });

  // Rare finds (top rarity from today)
  const today = new Date().toISOString().slice(0, 10);
  const todayObs = observations.filter(o => o.observedOn === today);
  if (todayObs.length > 0 && aggregated.byUser) {
    const rareTaxons = todayObs
      .filter(o => o.taxonName)
      .slice(0, 3);
    
    rareTaxons.forEach((o, i) => {
      announcements.push({
        id: `rare-${i}`,
        text: `🌟 ${o.userLogin} spotted ${o.taxonName}!`,
      });
    });
  }

  // Daily winners
  const byDay = aggregated.byDay;
  if (byDay && byDay.size > 0) {
    const latestDay = Array.from(byDay.keys()).sort().pop();
    if (latestDay) {
      const dayData = byDay.get(latestDay);
      const topUsers = Array.from(aggregated.byUser.values())
        .filter(u => Array.from(dayData.participants).includes(u.login))
        .sort((a, b) => b.points - a.points)
        .slice(0, 3)
        .map(u => u.login);
      
      if (topUsers.length > 0) {
        announcements.push({
          id: 'daily-winners',
          text: `🏆 ${latestDay} leaders: ${topUsers.join(', ')}`,
        });
      }
    }
  }

  return announcements;
}
