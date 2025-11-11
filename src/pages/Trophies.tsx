import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FLAGS } from '@/env';
import { Crown } from 'lucide-react';
import TrophyDetail from './TrophyDetail';
import {
  fetchTodayTrophiesCR2025,
  fetchTripTrophiesCR2025,
  fetchRosterCR2025,
  getTripParams,
  type TripTrophyAward,
} from '@/lib/api';

type TrophyDefinition = {
  title: string;
  icon: string;
  valueLabel?: string;
  category: 'core' | 'taxa';
};

const TROPHY_DEFINITIONS: Record<string, TrophyDefinition> = {
  daily_obs_leader: { title: 'Most Observations', icon: '🔍', valueLabel: 'observations', category: 'core' },
  daily_variety_hero: { title: 'Most Species', icon: '🌿', valueLabel: 'species', category: 'core' },
  taxa_birds_champion: { title: 'Bird Specialist', icon: '🪶', valueLabel: 'birds observed', category: 'taxa' },
  taxa_insect_champion: { title: 'Insect Investigator', icon: '🪲', valueLabel: 'insects observed', category: 'taxa' },
  taxa_mammal_champion: { title: 'Mammal Tracker', icon: '🐾', valueLabel: 'mammals observed', category: 'taxa' },
  taxa_plant_champion: { title: 'Plant Whisperer', icon: '🌺', valueLabel: 'plants observed', category: 'taxa' },
  taxa_amphibian_champion: { title: 'Amphibian Aficionado', icon: '🐸', valueLabel: 'amphibians observed', category: 'taxa' },
};

const DEFAULT_TROPHY_DEFINITION: TrophyDefinition = {
  title: 'Special Award',
  icon: '🏆',
  category: 'taxa',
};

const CORE_TROPHY_IDS = Object.keys(TROPHY_DEFINITIONS).filter(
  (id) => TROPHY_DEFINITIONS[id]?.category === 'core',
);

function getTrophyDefinition(id: string): TrophyDefinition {
  if (TROPHY_DEFINITIONS[id]) return TROPHY_DEFINITIONS[id];
  const title = id
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { ...DEFAULT_TROPHY_DEFINITION, title };
}

function sortTrophyIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const defA = getTrophyDefinition(a);
    const defB = getTrophyDefinition(b);
    if (defA.category !== defB.category) {
      return defA.category === 'core' ? -1 : 1;
    }
    return defA.title.localeCompare(defB.title);
  });
}

type TodayGroups = Record<string, TripTrophyAward[]>;

type TripWinner = {
  user_login: string;
  count: number;
  totalValue: number | null;
  lastAwardedAt: string | null;
};

type TripGroups = Record<string, TripWinner[]>;

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'today' | 'trip'>('today');
  const [todayGroups, setTodayGroups] = useState<TodayGroups>({});
  const [tripGroups, setTripGroups] = useState<TripGroups>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [tz, setTz] = useState<string>('UTC');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [availableTrophyIds, setAvailableTrophyIds] = useState<string[]>([]);
  const [awardedTrophyIds, setAwardedTrophyIds] = useState<string[]>([]);

  useEffect(() => {
    if (slug) return; // Detail view handles its own data

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [paramsRes, rosterRes] = await Promise.all([
          getTripParams(),
          fetchRosterCR2025(),
        ]);

        if (cancelled) return;

        const tzValue = paramsRes.data?.tz ?? 'UTC';
        setTz(tzValue);

        const [todayRes, tripRes] = await Promise.all([
          fetchTodayTrophiesCR2025(tzValue),
          fetchTripTrophiesCR2025(),
        ]);

        if (cancelled) return;

        const rosterMap = (rosterRes.data ?? []).reduce<Record<string, string>>((acc, row) => {
          const key = row.user_login.toLowerCase();
          if (key) {
            acc[key] = row.display_name ?? row.user_login;
          }
          return acc;
        }, {});
        setNameMap(rosterMap);

        const groupedToday = (todayRes.data ?? []).reduce<TodayGroups>((acc, award) => {
          const id = award.trophy_id;
          if (!acc[id]) acc[id] = [];
          acc[id].push(award);
          return acc;
        }, {} as TodayGroups);
        setTodayGroups(groupedToday);

        type MutableWinner = TripWinner & { hasValue: boolean };

        const tripAggregate = (tripRes.data ?? []).reduce<Map<string, Map<string, MutableWinner>>>(
          (acc, award) => {
            const trophyId = award.trophy_id;
            const login = award.user_login;
            if (!acc.has(trophyId)) {
              acc.set(trophyId, new Map());
            }
            const winners = acc.get(trophyId)!;
            const existing = winners.get(login) ?? {
              user_login: login,
              count: 0,
              totalValue: 0,
              lastAwardedAt: null,
              hasValue: false,
            };
            existing.count += 1;
            if (award.value != null) {
              existing.totalValue = (existing.hasValue ? existing.totalValue : 0) + Number(award.value);
              existing.hasValue = true;
            }
            if (!existing.lastAwardedAt || (award.awarded_at && award.awarded_at > existing.lastAwardedAt)) {
              existing.lastAwardedAt = award.awarded_at;
            }
            winners.set(login, existing);
            return acc;
          },
          new Map(),
        );

        const tripGrouped: TripGroups = {};
        tripAggregate.forEach((winners, trophyId) => {
          tripGrouped[trophyId] = Array.from(winners.values()).map((winner) => ({
            user_login: winner.user_login,
            count: winner.count,
            totalValue: winner.hasValue ? winner.totalValue : null,
            lastAwardedAt: winner.lastAwardedAt,
          }));
        });

        setTripGroups(tripGrouped);

        const seenIds = new Set<string>();
        (todayRes.data ?? []).forEach((award) => {
          if (award?.trophy_id) seenIds.add(award.trophy_id);
        });
        (tripRes.data ?? []).forEach((award) => {
          if (award?.trophy_id) seenIds.add(award.trophy_id);
        });

        const activeSet = new Set<string>(CORE_TROPHY_IDS);
        seenIds.forEach((id) => activeSet.add(id));
        setAvailableTrophyIds(Array.from(activeSet));
        setAwardedTrophyIds(Array.from(seenIds));

        const errors: string[] = [];
        if (paramsRes.error?.message) errors.push(paramsRes.error.message);
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        if (todayRes.error?.message) errors.push(todayRes.error.message);
        if (tripRes.error?.message) errors.push(tripRes.error.message);
        setError(errors.length ? errors.join('; ') : null);

        const warningList: string[] = [];
        if (rosterRes.missing) warningList.push('Roster view is unavailable; display names limited.');
        if (todayRes.missing && tripRes.missing) {
          warningList.push('Trophy view is unavailable.');
        } else if (todayRes.missing || tripRes.missing) {
          warningList.push('Some trophy data views are unavailable.');
        }
        setWarnings(warningList);
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

  const awardedSet = new Set(awardedTrophyIds);
  const activeIds = sortTrophyIds(
    availableTrophyIds.length > 0 ? availableTrophyIds : CORE_TROPHY_IDS,
  );
  const allPossibleIds = sortTrophyIds(
    Array.from(
      new Set<string>([
        ...Object.keys(TROPHY_DEFINITIONS),
        ...availableTrophyIds,
        ...awardedTrophyIds,
      ]),
    ),
  );

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
              {mode === 'today' ? 'Daily heroes for today' : 'Cumulative field-week champions'} ({tz})
            </p>
          </div>
          <a
            href="/cabinet"
            className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors"
          >
            View Trophy Cabinet
          </a>
        </div>

        <div className="inline-flex rounded-lg border border-border p-1 bg-muted/60">
          {['today', 'trip'].map((value) => (
            <button
              key={value}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === value
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setMode(value as 'today' | 'trip')}
            >
              {value === 'today' ? 'Today' : 'Trip'}
            </button>
          ))}
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
            {warnings.length > 0 && (
              <div className="space-y-2">
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
            {mode === 'today' ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeIds.map((id) => {
                  const meta = getTrophyDefinition(id);
                  const winners = todayGroups[id] ?? [];
                  return (
                    <div key={id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span>{meta.icon}</span>
                        {meta.title}
                      </div>
                      {winners.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No winners recorded today.</div>
                      ) : (
                        <div className="space-y-3">
                          {winners.map((winner, index) => {
                            const prettyName = getDisplayName(winner.user_login);
                            const showSecondary = prettyName.toLowerCase() !== winner.user_login.toLowerCase();
                            return (
                              <div key={`${winner.user_login}-${index}`} className="rounded-lg border border-border bg-background p-3 space-y-1">
                                <div className="text-base font-medium">{winner.user_login}</div>
                                {showSecondary && (
                                  <div className="text-xs text-muted-foreground">{prettyName}</div>
                                )}
                              {winner.value != null && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  {meta.valueLabel ?? 'Value'}: {winner.value}
                                </div>
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
            ) : (
              <div className="space-y-4">
                {activeIds.map((id) => {
                  const meta = getTrophyDefinition(id);
                  const winners = tripGroups[id] ?? [];
                  const sortedWinners = [...winners].sort((a, b) => {
                    const countDiff = b.count - a.count;
                    if (countDiff !== 0) return countDiff;
                    const valueDiff = (b.totalValue ?? 0) - (a.totalValue ?? 0);
                    if (valueDiff !== 0) return valueDiff;
                    const nameA = getDisplayName(a.user_login).toLowerCase();
                    const nameB = getDisplayName(b.user_login).toLowerCase();
                    return nameA.localeCompare(nameB);
                  });
                  return (
                    <div key={id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span>{meta.icon}</span>
                        {meta.title}
                      </div>
                      {sortedWinners.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No winners yet.</div>
                      ) : (
                        <div className="space-y-2">
                          {sortedWinners.map((winner) => {
                            const prettyName = getDisplayName(winner.user_login);
                            const showSecondary = prettyName.toLowerCase() !== winner.user_login.toLowerCase();
                            return (
                              <div key={winner.user_login} className="rounded-lg border border-border bg-background p-3 space-y-1">
                                <div className="text-base font-medium">{winner.user_login}</div>
                                {showSecondary && (
                                  <div className="text-xs text-muted-foreground">{prettyName}</div>
                                )}
                              <div className="text-xs text-muted-foreground">Wins: {winner.count}</div>
                              {winner.totalValue != null && meta.valueLabel && (
                                <div className="text-xs text-muted-foreground capitalize">
                                  Total {meta.valueLabel}: {winner.totalValue}
                                </div>
                              )}
                              {winner.lastAwardedAt && (
                                <div className="text-[11px] text-muted-foreground">
                                  Last awarded: {new Date(winner.lastAwardedAt).toLocaleString('en-US', { timeZone: tz })}
                                </div>
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
            )}

            <div className="pt-4 space-y-3">
              <h2 className="text-lg font-semibold">All possible trophies</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {allPossibleIds.map((id) => {
                  const meta = getTrophyDefinition(id);
                  const isAwarded = awardedSet.has(id);
                  return (
                    <div
                      key={id}
                      className={`rounded-xl border border-border p-4 ${
                        isAwarded ? 'bg-card' : 'bg-muted/40 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          <span>{meta.icon}</span>
                          {meta.title}
                        </div>
                        {!isAwarded && <span className="text-xs text-muted-foreground">Coming soon</span>}
                      </div>
                      {meta.valueLabel && (
                        <div className="text-xs text-muted-foreground mt-2 capitalize">
                          Tracks {meta.valueLabel}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
