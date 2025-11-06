import { useEffect, useState, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { useAppState } from '@/lib/state';
import { findCloseBattles } from '@/lib/closeBattles';
import { FLAGS, ENV } from '@/env';
import type { AggregatedScores, ObservationData } from '@/lib/scoring';

type Announcement = {
  id: string;
  text: string;
};

export default function NewsTicker() {
  const [visible, setVisible] = useState(true);
  const [currentItems, setCurrentItems] = useState<Announcement[]>([]);
  const { aggregated, observations } = useAppState();
  const trackRef = useRef<HTMLDivElement>(null);

  const announcements = useMemo(
    () => deriveAnnouncements(aggregated, observations),
    [aggregated, observations]
  );

  // Stable snapshot per loop - update between loops
  useEffect(() => {
    if (announcements.length > 0) {
      setCurrentItems(announcements);
    }
  }, [announcements]);

  const handleAnimationIteration = () => {
    // Refresh items for next loop
    const fresh = deriveAnnouncements(aggregated, observations);
    if (fresh.length > 0) {
      setCurrentItems(fresh);
    }
  };

  if (!visible || currentItems.length === 0) return null;

  const speedMs = ENV.TICKER_SPEED_MS || 30000;

  return (
    <div 
      className="ticker-bar"
      style={{
        position: 'relative',
        background: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        overflow: 'hidden',
        height: '32px',
      }}
    >
      <div
        ref={trackRef}
        className="ticker-track"
        style={{
          display: 'flex',
          gap: '2rem',
          willChange: 'transform',
          animation: `ticker-scroll ${speedMs}ms linear infinite`,
        }}
        onAnimationIteration={handleAnimationIteration}
      >
        {currentItems.map((item) => (
          <div key={item.id} className="ticker-item whitespace-nowrap text-sm font-medium py-1.5 px-2">
            {item.text}
          </div>
        ))}
        {/* Duplicate for seamless loop */}
        {currentItems.map((item) => (
          <div key={`${item.id}-dup`} className="ticker-item whitespace-nowrap text-sm font-medium py-1.5 px-2">
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function deriveAnnouncements(aggregated: AggregatedScores | null, observations: ObservationData[]): Announcement[] {
  const announcements: Announcement[] = [];

  if (!aggregated) return announcements;

  const userArray = Array.from(aggregated.byUser.values())
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ ...u, rank: i + 1 }));

  // Close battles
  const battles = findCloseBattles(userArray);
  battles.forEach((b, i) => {
    announcements.push({
      id: `battle-${i}`,
      text: `🏁 Close race: ${b.a.login} vs ${b.b.login} (Δ${b.d.toFixed(2)} pts)`,
    });
  });

  // Lead changes (detect rank swaps)
  if (userArray.length >= 2) {
    const topTwo = userArray.slice(0, 2);
    if (topTwo[0].points - topTwo[1].points < 5) {
      announcements.push({
        id: 'lead-change',
        text: `🔄 Tight lead: ${topTwo[0].login} ahead by ${(topTwo[0].points - topTwo[1].points).toFixed(1)} pts`,
      });
    }
  }

  // Research milestones
  userArray.forEach(u => {
    if (u.researchCount === 10 || u.researchCount === 25 || u.researchCount === 50) {
      announcements.push({
        id: `research-milestone-${u.login}`,
        text: `🔬 ${u.login} reached ${u.researchCount} research-grade observations!`,
      });
    }
  });

  // Rare finds (top rarity from today)
  const today = new Date().toISOString().slice(0, 10);
  const todayObs = observations.filter(o => o.observedOn === today);
  if (todayObs.length > 0) {
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

  // First finders of the day
  const firstFinderMap = new Map<number, { login: string; taxonName: string }>();
  for (const obs of todayObs) {
    if (obs.taxonId && obs.taxonName && !firstFinderMap.has(obs.taxonId)) {
      firstFinderMap.set(obs.taxonId, { login: obs.userLogin, taxonName: obs.taxonName });
    }
  }
  const firstFinders = Array.from(firstFinderMap.values()).slice(0, 2);
  firstFinders.forEach((ff, i) => {
    announcements.push({
      id: `first-finder-${i}`,
      text: `🥇 ${ff.login} was first to find ${ff.taxonName} today!`,
    });
  });

  // Daily winners
  const byDay = aggregated.byDay;
  if (byDay && byDay.size > 0) {
    const latestDay = Array.from(byDay.keys()).sort().pop();
    if (latestDay) {
      const dayData = byDay.get(latestDay);
      if (dayData) {
        const topUsers = userArray
          .filter(u => Array.from(dayData.participants).includes(u.login))
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
  }

  return announcements;
}
