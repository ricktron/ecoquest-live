import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchTripLeaderboard,
  fetchTripTrophiesAllDays,
  type TripLeaderboardRow,
  type TripTrophyRow,
} from '@/lib/api';

const TROPHY_LABELS: Record<string, { title: string; icon: string; valueLabel?: string }> = {
  daily_obs_leader: { title: 'Most Observations', icon: '🔍', valueLabel: 'observations' },
  daily_variety_hero: { title: 'Most Species', icon: '🌿', valueLabel: 'species' },
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
  if (key === 'unknown') return 'Date to be announced';
  const date = new Date(`${key}T12:00:00-06:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export default function Cabinet() {
  const [participants, setParticipants] = useState<TripLeaderboardRow[]>([]);
  const [trophiesByUser, setTrophiesByUser] = useState<Record<string, TripTrophyRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [leaderboardRes, trophiesRes] = await Promise.all([
          fetchTripLeaderboard(),
          fetchTripTrophiesAllDays(),
        ]);

        if (cancelled) return;

        setParticipants(leaderboardRes.data ?? []);

        const grouped: Record<string, TripTrophyRow[]> = {};
        (trophiesRes.data ?? []).forEach((row) => {
          if (row.place !== 1) return;
          const login = row.user_login;
          if (!login) return;
          if (!grouped[login]) grouped[login] = [];
          grouped[login].push(row);
        });

        Object.keys(grouped).forEach((login) => {
          grouped[login].sort((a, b) => {
            const keyA = formatCostaRicaKey(a.awarded_at) ?? 'unknown';
            const keyB = formatCostaRicaKey(b.awarded_at) ?? 'unknown';
            return keyB.localeCompare(keyA);
          });
        });

        setTrophiesByUser(grouped);

        const errors: string[] = [];
        if (leaderboardRes.error?.message) errors.push(leaderboardRes.error.message);
        if (trophiesRes.error?.message) errors.push(trophiesRes.error.message);
        setError(errors.length ? errors.join('; ') : null);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load trophy cabinet', err);
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
  }, []);

  const sortedParticipants = [...participants].sort((a, b) => {
    const nameA = (a.display_name || a.user_login).toLowerCase();
    const nameB = (b.display_name || b.user_login).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Trophy Cabinet</h1>
            <p className="text-sm text-muted-foreground">Trophies earned by the EcoQuest roster</p>
          </div>
          <a
            href="/trophies"
            className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors"
          >
            Back to Trophies
          </a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                Trophy cabinet error: {error}
              </div>
            )}
            <div className="space-y-6">
              {sortedParticipants.map((participant) => {
                const login = participant.user_login;
                const displayName = participant.display_name || login;
                const trophies = trophiesByUser[login] ?? [];

                const grouped = new Map<string, TripTrophyRow[]>();
                trophies.forEach((row) => {
                  const key = formatCostaRicaKey(row.awarded_at) ?? 'unknown';
                  const list = grouped.get(key) ?? [];
                  list.push(row);
                  grouped.set(key, list);
                });

                const sortedGroups = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));

                return (
                  <div key={login} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="text-lg font-semibold">{displayName}</div>
                      <div className="text-xs text-muted-foreground">{login}</div>
                    </div>
                    {trophies.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No trophies earned yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {sortedGroups.map(([key, rows]) => (
                          <div key={key} className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">{formatDisplayDate(key)}</div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {rows.map((row, idx) => {
                                const meta = TROPHY_LABELS[row.trophy_id] ?? {
                                  title: row.trophy_id,
                                  icon: '🏆',
                                };
                                return (
                                  <div key={`${row.trophy_id}-${idx}`} className="rounded-xl border border-border bg-background p-3 space-y-2">
                                    <div className="text-sm font-semibold flex items-center gap-2">
                                      <span>{meta.icon}</span>
                                      {meta.title}
                                    </div>
                                    {row.value != null && meta.valueLabel && (
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {meta.valueLabel}: {row.value}
                                      </div>
                                    )}
                                    {row.value != null && !meta.valueLabel && (
                                      <div className="text-xs text-muted-foreground">Value: {row.value}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
