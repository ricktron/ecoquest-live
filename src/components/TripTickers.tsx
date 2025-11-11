import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  fetchLeaderboardCR2025,
  fetchDailySummaryCR2025,
  getTripBasePoints,
  type TripLeaderboardRow,
} from '@/lib/api';

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

function buildNewsItems({
  leaderboard,
  latestDay,
  dayCounts,
}: {
  leaderboard: TripLeaderboardRow[];
  latestDay: string | null;
  dayCounts: Map<string, { obs: number; research: number }>;
}) {
  const items: string[] = [];

  const rankChanges = computeRankChanges(leaderboard)
    .filter((entry) => entry.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5);
  rankChanges.forEach(({ login, rank }) => {
    items.push(`${login} moved up to #${rank}`);
  });

  if (latestDay) {
    const perUser = Array.from(dayCounts.entries())
      .map(([login, value]) => ({ login, obs: value.obs }))
      .sort((a, b) => b.obs - a.obs)
      .slice(0, 5);

    perUser.forEach(({ login, obs }) => {
      if (obs > 0) {
        items.push(`${login} logged ${obs} obs today`);
      }
    });
  }

  const rgLeaders = [...leaderboard]
    .filter((row) => row.obs_count > 0)
    .map((row) => ({
      login: row.user_login,
      percent: Math.round((row.research_grade_count / Math.max(row.obs_count, 1)) * 100),
    }))
    .filter((entry) => entry.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  rgLeaders.forEach(({ login, percent }) => {
    items.push(`${login} hit ${percent}% RG`);
  });

  if (items.length < MIN_NEWS_ITEMS) {
    const fallback = [...leaderboard]
      .slice(0, 5)
      .map((row) => `${row.user_login} has ${row.total_points} pts`);
    for (const entry of fallback) {
      if (items.length >= MIN_NEWS_ITEMS) break;
      items.push(entry);
    }
  }

  while (items.length < MIN_NEWS_ITEMS && items.length > 0) {
    items.push(items[items.length % Math.max(items.length, 1)]);
  }

  return items;
}

function useNewsItems() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [leaderboardRes, dailyRes] = await Promise.all([
          fetchLeaderboardCR2025(),
          fetchDailySummaryCR2025(),
        ]);

        if (!active) return;

        const latestDay = dailyRes.data?.[0]?.day_local;
        let perDayCounts = new Map<string, { obs: number; research: number }>();
        if (latestDay) {
          const baseRes = await getTripBasePoints({ day: latestDay });
          perDayCounts = (baseRes.data ?? []).reduce((acc, row) => {
            if (!row.user_login) return acc;
            const key = row.user_login;
            const existing = acc.get(key) ?? { obs: 0, research: 0 };
            existing.obs += 1;
            if ((row.quality_grade ?? '').toLowerCase() === 'research') {
              existing.research += 1;
            }
            acc.set(key, existing);
            return acc;
          }, new Map<string, { obs: number; research: number }>());
        }

        if (leaderboardRes.missing) {
          setItems(['Leaderboard view unavailable']);
          return;
        }

        if (leaderboardRes.data.length === 0) {
          setItems(['Leaderboard data not yet available']);
          return;
        }

        const news = buildNewsItems({
          leaderboard: leaderboardRes.data,
          latestDay: latestDay ?? null,
          dayCounts: perDayCounts,
        });

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

