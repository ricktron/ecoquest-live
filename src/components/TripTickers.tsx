import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { fetchLeaderboardCR2025, type TripLeaderboardRow } from '@/lib/api';
import { formatPoints } from '@/lib/scoring';

const RANK_STORAGE_KEY = 'ecoqlb:cr2025';
const MIN_NEWS_ITEMS = 12;

function computeRankSnapshot(rows: TripLeaderboardRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const pointDiff = b.total_points - a.total_points;
    if (pointDiff !== 0) return pointDiff;
    const taxaDiff = b.distinct_taxa - a.distinct_taxa;
    if (taxaDiff !== 0) return taxaDiff;
    const obsDiff = b.obs_count - a.obs_count;
    if (obsDiff !== 0) return obsDiff;
    const nameA = a.user_login.toLowerCase();
    const nameB = b.user_login.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const snapshot = sorted.map((row, index) => ({
    login: row.user_login,
    rank: index + 1,
  }));

  return snapshot;
}

function computeRankChanges(rows: TripLeaderboardRow[]) {
  if (typeof window === 'undefined') return [] as { login: string; rank: number; delta: number }[];

  const latestSnapshot = computeRankSnapshot(rows);

  let previous: Record<string, number> | null = null;
  try {
    const raw = window.localStorage.getItem(RANK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { ranks?: Record<string, number> };
      if (parsed && parsed.ranks) previous = parsed.ranks;
    }
  } catch (err) {
    console.warn('rank snapshot parse failed', err);
  }

  const changes = latestSnapshot.map(({ login, rank }) => {
    const prevRank = previous?.[login.toLowerCase()];
    return {
      login,
      rank,
      delta: typeof prevRank === 'number' ? prevRank - rank : 0,
    };
  });

  const snapshotToStore: Record<string, number> = {};
  latestSnapshot.forEach(({ login, rank }) => {
    snapshotToStore[login.toLowerCase()] = rank;
  });

  try {
    window.localStorage.setItem(
      RANK_STORAGE_KEY,
      JSON.stringify({ ranks: snapshotToStore, timestamp: Date.now() }),
    );
  } catch (err) {
    console.warn('rank snapshot store failed', err);
  }

  return changes;
}

function buildLeaderboardItems(rows: TripLeaderboardRow[]): string[] {
  const items: string[] = [];

  const sorted = [...rows]
    .sort((a, b) => {
      const pointDiff = b.total_points - a.total_points;
      if (pointDiff !== 0) return pointDiff;
      const taxaDiff = b.distinct_taxa - a.distinct_taxa;
      if (taxaDiff !== 0) return taxaDiff;
      return a.user_login.localeCompare(b.user_login);
    })
    .slice(0, 12);

  sorted.forEach((row) => {
    items.push(`${row.user_login} has ${formatPoints(row.total_points)} pts`);
    if (row.obs_count > 0) {
      const percent = Math.round((row.research_grade_count / Math.max(row.obs_count, 1)) * 100);
      items.push(`${row.user_login} hit ${percent}% RG`);
    }
  });

  const rankHighlights = computeRankChanges(rows)
    .filter((entry) => entry.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  rankHighlights.forEach(({ login, rank }) => {
    items.push(`${login} moved up to #${rank}`);
  });

  const uniqueItems = items.filter((item, index) => items.indexOf(item) === index);
  const result = uniqueItems.length > 0 ? uniqueItems : ['EcoQuest Live leaderboard is warming up'];

  while (result.length < MIN_NEWS_ITEMS) {
    const needed = MIN_NEWS_ITEMS - result.length;
    const toCopy = result.slice(0, Math.min(result.length, needed));
    if (toCopy.length === 0) break;
    result.push(...toCopy);
  }

  return result.slice(0, Math.max(result.length, MIN_NEWS_ITEMS));
}

function useNewsItems() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const leaderboardRes = await fetchLeaderboardCR2025();

        if (!active) return;

        if (leaderboardRes.missing) {
          setItems(['Leaderboard view unavailable']);
          return;
        }

        if (leaderboardRes.data.length === 0) {
          setItems(['Leaderboard data not yet available']);
          return;
        }

        const news = buildLeaderboardItems(leaderboardRes.data);

        setItems(news.length > 0 ? news : ['EcoQuest Live news feed will be back soon']);
      } catch (err) {
        console.warn('Failed to build news ticker', err);
        if (active) {
          setItems(['EcoQuest Live news feed will be back soon']);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return items;
}

function useBottomItems() {
  return useMemo(
    () => [
      'Trip Mode active: scoring Nov 9–15',
      'Tips: Research Grade adds +1 point each',
      'Adults can award bonus points for field behavior',
      'Remember: log observations before midnight local time',
      'Check the Map tab for the latest sightings',
    ],
    [],
  );
}

type TickerProps = {
  items: string[];
  speedMs?: number;
  className?: string;
};

function Ticker({ items, speedMs = 24000, className }: TickerProps) {
  const [paused, setPaused] = useState(false);

  if (!items || items.length === 0) return null;

  const trackStyle: CSSProperties = {
    animationDuration: `${speedMs}ms`,
    animationPlayState: paused ? 'paused' : 'running',
  };

  return (
    <div className={`relative overflow-hidden border-y border-border bg-background ${className ?? ''}`}>
      <div
        className="flex gap-6 whitespace-nowrap ticker-marquee"
        style={trackStyle}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="text-sm font-medium py-2">
            {item}
          </span>
        ))}
        {items.map((item, index) => (
          <span key={`${item}-dup-${index}`} className="text-sm font-medium py-2">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function TripNewsTicker() {
  const items = useNewsItems();
  return <Ticker items={items} speedMs={28000} className="top-news-ticker" />;
}

export function TripInfoTicker() {
  const items = useBottomItems();
  return <Ticker items={items} speedMs={32000} className="bottom-info-ticker" />;
}

