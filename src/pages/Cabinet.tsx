import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchRosterCR2025,
  fetchTripTrophiesCR2025,
  getTripParams,
  type TripRosterEntry,
  type TripTrophyAward,
} from '@/lib/api';

type TrophyDefinition = {
  title: string;
  icon: string;
  valueLabel?: string;
};

const TROPHY_DEFINITIONS: Record<string, TrophyDefinition> = {
  daily_obs_leader: { title: 'Most Observations', icon: '🔍', valueLabel: 'observations' },
  daily_variety_hero: { title: 'Most Species', icon: '🌿', valueLabel: 'species' },
  taxa_birds_champion: { title: 'Bird Specialist', icon: '🪶', valueLabel: 'birds observed' },
  taxa_insect_champion: { title: 'Insect Investigator', icon: '🪲', valueLabel: 'insects observed' },
  taxa_mammal_champion: { title: 'Mammal Tracker', icon: '🐾', valueLabel: 'mammals observed' },
  taxa_plant_champion: { title: 'Plant Whisperer', icon: '🌺', valueLabel: 'plants observed' },
  taxa_amphibian_champion: { title: 'Amphibian Aficionado', icon: '🐸', valueLabel: 'amphibians observed' },
};

function getTrophyDefinition(id: string): TrophyDefinition {
  if (TROPHY_DEFINITIONS[id]) return TROPHY_DEFINITIONS[id];
  const title = id
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
  return { title, icon: '🏆' };
}

export default function Cabinet() {
  const [participants, setParticipants] = useState<TripRosterEntry[]>([]);
  const [trophiesByUser, setTrophiesByUser] = useState<Record<string, TripTrophyAward[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tz, setTz] = useState<string>('UTC');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [rosterRes, trophiesRes, paramsRes] = await Promise.all([
          fetchRosterCR2025(),
          fetchTripTrophiesCR2025(),
          getTripParams(),
        ]);

        if (cancelled) return;

        setParticipants(rosterRes.data ?? []);
        setTz(paramsRes.data?.tz ?? 'UTC');

        const grouped: Record<string, TripTrophyAward[]> = {};
        (trophiesRes.data ?? []).forEach((row) => {
          const login = row.user_login;
          if (!login) return;
          if (!grouped[login]) grouped[login] = [];
          grouped[login].push(row);
        });

        Object.keys(grouped).forEach((login) => {
          grouped[login].sort((a, b) => {
            if (!a.awarded_at) return 1;
            if (!b.awarded_at) return -1;
            return b.awarded_at.localeCompare(a.awarded_at);
          });
        });

        setTrophiesByUser(grouped);

        const errors: string[] = [];
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        if (trophiesRes.error?.message) errors.push(trophiesRes.error.message);
        if (paramsRes.error?.message) errors.push(paramsRes.error.message);
        setError(errors.length ? errors.join('; ') : null);

        const warningList: string[] = [];
        if (rosterRes.missing) warningList.push('Roster view is unavailable; display names limited.');
        if (trophiesRes.missing) warningList.push('Trophy view is unavailable.');
        setWarnings(warningList);
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

  const formatAwardDate = (iso: string | null) => {
    if (!iso) return 'Date to be announced';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return formatter.format(new Date(iso));
  };

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
            {warnings.length > 0 && (
              <div className="mb-4 space-y-2">
                {warnings.map((message) => (
                  <div
                    key={message}
                    className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md"
                  >
                    {message}
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-6">
              {sortedParticipants.map((participant) => {
                const login = participant.user_login;
                const displayName = participant.display_name || login;
                const trophies = trophiesByUser[login] ?? [];

                return (
                  <div key={login} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="text-lg font-semibold">{login}</div>
                      {displayName.toLowerCase() !== login.toLowerCase() && (
                        <div className="text-xs text-muted-foreground">{displayName}</div>
                      )}
                    </div>
                    {trophies.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No trophies earned yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {trophies.map((row, idx) => {
                          const meta = getTrophyDefinition(row.trophy_id);
                          return (
                            <div key={`${row.trophy_id}-${idx}`} className="rounded-xl border border-border bg-background p-3 space-y-1">
                              <div className="text-sm font-semibold flex items-center gap-2">
                                <span>{meta.icon}</span>
                                {meta.title}
                              </div>
                              <div className="text-xs text-muted-foreground">{formatAwardDate(row.awarded_at ?? null)}</div>
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
