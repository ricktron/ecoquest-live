import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FLAGS } from '@/env';
import { Crown } from 'lucide-react';
import TrophyDetail from './TrophyDetail';
import {
  fetchTripTrophiesAllDays,
  getTripLeaderboardNameMap,
  type TripTrophyRow,
} from '@/lib/api';

const TRIP_DAY_RANGE = [
  '2025-11-15',
  '2025-11-14',
  '2025-11-13',
  '2025-11-12',
  '2025-11-11',
  '2025-11-10',
  '2025-11-09',
];

const TROPHY_META = {
  daily_obs_leader: { title: 'Most Observations', icon: '🔍', valueLabel: 'observations' },
  daily_variety_hero: { title: 'Most Species', icon: '🌿', valueLabel: 'species' },
} as const;

type TrophyId = keyof typeof TROPHY_META;

type DayGroup = {
  dateKey: string;
  displayDate: string;
  trophies: Partial<Record<TrophyId, TripTrophyRow>>;
};

function formatCostaRicaKey(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDisplayDate(key: string): string {
  const date = new Date(`${key}T12:00:00-06:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();

  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) return; // Detail view handles its own data

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [result, displayMap] = await Promise.all([
          fetchTripTrophiesAllDays(),
          getTripLeaderboardNameMap(),
        ]);

        if (cancelled) return;

        const filtered = (result.data ?? []).filter(
          (row) =>
            row.place === 1 &&
            (row.trophy_id === 'daily_obs_leader' || row.trophy_id === 'daily_variety_hero'),
        );

        const grouped = new Map<string, Partial<Record<TrophyId, TripTrophyRow>>>();
        filtered.forEach((row) => {
          const key = formatCostaRicaKey(row.awarded_at);
          if (!key) return;
          const existing = grouped.get(key) ?? {};
          existing[row.trophy_id as TrophyId] = row;
          grouped.set(key, existing);
        });

        const ordered = TRIP_DAY_RANGE.slice().sort((a, b) => b.localeCompare(a)).map((key) => ({
          dateKey: key,
          displayDate: formatDisplayDate(key),
          trophies: grouped.get(key) ?? {},
        }));

        setGroups(ordered);
        setNameMap(displayMap);
        setError(result.error?.message ?? null);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load trophies', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const getDisplayName = (login: string) => nameMap[login.toLowerCase()] ?? login;

  if (slug) {
    return <TrophyDetail />;
  }

  if (!FLAGS.TROPHIES_ENABLED) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Trophies</h2>
          <p className="text-muted-foreground">Trophy features are currently disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              Trophies
            </h1>
            <p className="text-sm text-muted-foreground">
              Daily heroes across the Costa Rica 2025 field week
            </p>
          </div>
          <a
            href="/cabinet"
            className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors"
          >
            View Trophy Cabinet
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                Trophy data error: {error}
              </div>
            )}
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.dateKey} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-lg font-semibold">{group.displayDate}</div>
                    <div className="text-xs text-muted-foreground">America/Costa_Rica</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(Object.keys(TROPHY_META) as TrophyId[]).map((id) => {
                      const meta = TROPHY_META[id];
                      const row = group.trophies[id];
                      return (
                        <div key={id} className="rounded-xl border border-border bg-background p-4 space-y-2">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span>{meta.icon}</span>
                            {meta.title}
                          </div>
                          {row ? (
                            <>
                              <div className="text-base font-medium">{getDisplayName(row.user_login)}</div>
                              <div className="text-xs text-muted-foreground">{row.user_login}</div>
                              {row.value != null && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {meta.valueLabel}: {row.value}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-sm text-muted-foreground">No winner recorded.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
