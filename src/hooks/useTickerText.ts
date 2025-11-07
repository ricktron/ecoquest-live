import { useMemo, useEffect, useState } from 'react';
import { fetchLeaderboard } from '@/lib/api';
import { DEFAULT_AID } from '@/lib/supabase';
import type { LeaderRow } from '@/lib/api';

export function useTickerText(): string {
  const [leaderboardData, setLeaderboardData] = useState<LeaderRow[]>([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await fetchLeaderboard(DEFAULT_AID);
        setLeaderboardData(data.slice(0, 3));
      } catch (err) {
        console.error('Failed to fetch leaderboard for ticker:', err);
      }
    };

    loadLeaderboard();
    const interval = setInterval(loadLeaderboard, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const tickerText = useMemo(() => {
    if (leaderboardData.length === 0) {
      return 'EcoQuest Live - Competition in progress';
    }

    const items: string[] = [];

    // Top 3 leaders
    const top3 = leaderboardData
      .map((row, i) => {
        const name = row.display_name || 'Unknown';
        const count = row.O ?? 0;
        return `#${i + 1} ${name} (${count} obs)`;
      })
      .join(' • ');

    if (top3) {
      items.push(`Leaders: ${top3}`);
    }

    // Close race detection
    if (leaderboardData.length >= 2) {
      const first = leaderboardData[0];
      const second = leaderboardData[1];
      const firstCount = first.O ?? 0;
      const secondCount = second.O ?? 0;
      const gap = firstCount - secondCount;
      if (gap <= 5) {
        const firstName = first.display_name || 'Unknown';
        items.push(`🏁 Tight race! ${firstName} leads by ${gap}`);
      }
    }

    return items.join('  •  ');
  }, [leaderboardData]);

  return tickerText;
}
