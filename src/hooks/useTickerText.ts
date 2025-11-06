import { useMemo } from 'react';
import { useAppState } from '@/lib/state';
import { findCloseBattles } from '@/lib/closeBattles';

export function useTickerText(): string {
  const { aggregated, observations } = useAppState();

  const tickerText = useMemo(() => {
    if (!aggregated) return '';

    const userArray = Array.from(aggregated.byUser.values())
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    const items: string[] = [];

    // Close battles
    const battles = findCloseBattles(userArray);
    if (battles.length > 0) {
      const b = battles[0];
      items.push(`🏁 Close race: ${b.a.login} vs ${b.b.login} (Δ${b.d.toFixed(2)} pts)`);
    }

    // Tight lead
    if (userArray.length >= 2) {
      const topTwo = userArray.slice(0, 2);
      if (topTwo[0].points - topTwo[1].points < 5) {
        items.push(`🔄 Tight lead: ${topTwo[0].login} ahead by ${(topTwo[0].points - topTwo[1].points).toFixed(1)} pts`);
      }
    }

    // Research milestones
    const milestoneUser = userArray.find(u => 
      u.researchCount === 10 || u.researchCount === 25 || u.researchCount === 50
    );
    if (milestoneUser) {
      items.push(`🔬 ${milestoneUser.login} reached ${milestoneUser.researchCount} research-grade observations!`);
    }

    // Rare finds from today
    const today = new Date().toISOString().slice(0, 10);
    const todayObs = observations.filter(o => o.observedOn === today);
    if (todayObs.length > 0 && todayObs[0].taxonName) {
      items.push(`🌟 ${todayObs[0].userLogin} spotted ${todayObs[0].taxonName}!`);
    }

    // Daily leaders
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
            items.push(`🏆 ${latestDay} leaders: ${topUsers.join(', ')}`);
          }
        }
      }
    }

    return items.join('  •  ');
  }, [aggregated, observations]);

  return tickerText;
}
