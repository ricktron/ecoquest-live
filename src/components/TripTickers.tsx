import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  fetchLeaderboardCR2025,
  fetchTodayTrophiesCR2025,
  fetchDailySummaryCR2025,
  type TripLeaderboardPayload,
  type TripDailySummaryRow,
  type TripTrophyAward,
} from '@/lib/api';
import { formatPoints } from '@/lib/scoring';

const MIN_NEWS_ITEMS = 12;

const TROPHY_LABELS: Record<string, string> = {
  daily_obs_leader: 'Most Observations',
  daily_variety_hero: 'Most Species',
  taxa_birds_champion: 'Bird Specialist',
  taxa_insect_champion: 'Insect Investigator',
  taxa_mammal_champion: 'Mammal Tracker',
  taxa_plant_champion: 'Plant Whisperer',
  taxa_amphibian_champion: 'Amphibian Aficionado',
};

function buildLeaderboardNews(payload: TripLeaderboardPayload | null | undefined): string[] {
  if (!payload) return [];
  const rows = payload.rows ?? [];
  const silverByLogin = payload.silverByLogin ?? {};
  const items: string[] = [];

  rows.slice(0, 3).forEach((row, index) => {
    const login = row.user_login;
    const silver = payload.hasSilver ? silverByLogin[login.toLowerCase()] : undefined;
    const total = silver ? silver.total_points : row.total_points;
    if (index === 0) {
      items.push(`${login} leads with ${formatPoints(total)} pts`);
    } else {
      items.push(`${login} holds #${index + 1} at ${formatPoints(total)} pts`);
    }

    if (row.research_grade_count >= 5) {
      items.push(`${login} logged ${row.research_grade_count} research-grade finds`);
    }
    if (row.distinct_taxa >= 25) {
      items.push(`${login} has noted ${row.distinct_taxa} species so far`);
    }
  });

  return items;
}

function formatDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function buildDailyNews(rows: TripDailySummaryRow[]): string[] {
  if (!rows || rows.length === 0) return [];
  const items: string[] = [];
  const recent = rows.slice(-3);
  recent.forEach((row) => {
    if (!row.day_local) return;
    const dayLabel = formatDayLabel(row.day_local);
    items.push(`${dayLabel}: ${row.obs_count} observations from ${row.people_count} people`);
    if (row.distinct_taxa > 0) {
      items.push(`${dayLabel}: ${row.distinct_taxa} species spotted`);
    }
  });
  return items;
}

function buildTrophyNews(awards: TripTrophyAward[]): string[] {
  if (!awards || awards.length === 0) return [];
  const items: string[] = [];
  awards.forEach((award) => {
    const label = TROPHY_LABELS[award.trophy_id] ?? award.trophy_id.replace(/_/g, ' ');
    items.push(`${award.user_login} earned the ${label} trophy`);
  });
  return items;
}

function padItems(items: string[]): string[] {
  const unique = items.filter((item, index) => items.indexOf(item) === index);
  if (unique.length === 0) {
    return ['Trip updates loading…'];
  }

  const result = [...unique];
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
        const [leaderboardRes, trophiesRes, dailyRes] = await Promise.all([
          fetchLeaderboardCR2025(),
          fetchTodayTrophiesCR2025(),
          fetchDailySummaryCR2025(),
        ]);

        if (!active) return;

        const leaderboardItems = buildLeaderboardNews(leaderboardRes.data);
        const trophyItems = buildTrophyNews(trophiesRes.data ?? []);
        const dailyItems = buildDailyNews(dailyRes.data ?? []);

        const combined = padItems([...leaderboardItems, ...trophyItems, ...dailyItems]);
        setItems(combined);
      } catch (err) {
        console.warn('Failed to load ticker items', err);
        if (active) {
          setItems(['Trip updates will resume shortly']);
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
      'Trip Mode Active — log observations to earn points!',
      'Tip: Research-grade IDs add bonus points',
      'Tip: Novel species earn Silver bonus points',
      'Reminder: Adults can award bonus points in the field',
      'Check the Map for the latest sightings',
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

export default function TripTickers() {
  const newsItems = useNewsItems();
  const bottomItems = useBottomItems();

  return (
    <div className="space-y-2">
      <Ticker items={newsItems} speedMs={20000} className="rounded-lg" />
      <Ticker items={bottomItems} speedMs={26000} className="rounded-lg bg-muted/60" />
    </div>
  );
}
