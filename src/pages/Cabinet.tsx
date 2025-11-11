import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchRosterCR2025,
  fetchCabinetCR2025,
  fetchTrophiesCatalogCR2025,
  getTripParams,
  type TripCabinetDayGroup,
  type TripTrophyCatalogRow,
  type TripRosterEntry,
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
  const [cabinetGroups, setCabinetGroups] = useState<TripCabinetDayGroup[]>([]);
  const [catalogLabels, setCatalogLabels] = useState<Record<string, string>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tz, setTz] = useState<string>('UTC');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [rosterRes, cabinetRes, catalogRes, paramsRes] = await Promise.all([
          fetchRosterCR2025(),
          fetchCabinetCR2025(),
          fetchTrophiesCatalogCR2025(),
          getTripParams(),
        ]);

        if (cancelled) return;

        const rosterMap = (rosterRes.data ?? []).reduce<Record<string, string>>((acc, row: TripRosterEntry) => {
          const key = row.user_login.toLowerCase();
          if (key) {
            acc[key] = row.display_name ?? row.user_login;
          }
          return acc;
        }, {});
        setNameMap(rosterMap);

        const catalogMap = (catalogRes.data ?? []).reduce<Record<string, string>>((acc, row: TripTrophyCatalogRow) => {
          if (row.trophy_id) {
            acc[row.trophy_id] = row.label;
          }
          return acc;
        }, {});
        setCatalogLabels(catalogMap);

        setCabinetGroups(cabinetRes.data ?? []);
        setTz(paramsRes.data?.tz ?? 'UTC');

        const errors: string[] = [];
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        if (cabinetRes.error?.message) errors.push(cabinetRes.error.message);
        if (catalogRes.error?.message) errors.push(catalogRes.error.message);
        if (paramsRes.error?.message) errors.push(paramsRes.error.message);
        setError(errors.length ? errors.join('; ') : null);

        const warningList: string[] = [];
        if (rosterRes.missing) warningList.push('Roster view is unavailable; display names limited.');
        if (catalogRes.missing) warningList.push('Trophy catalog view is unavailable; labels may be limited.');
        if (cabinetRes.missing) warningList.push('Trophy cabinet view is unavailable.');
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

  const getDisplayName = (login: string) => nameMap[login.toLowerCase()] ?? login;
  const getMeta = (id: string) => {
    const base = getTrophyDefinition(id);
    const label = catalogLabels[id];
    return label ? { ...base, title: label } : base;
  };

  const formatDayLabel = (day: string | null) => {
    if (!day) return 'Date to be announced';
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return formatter.format(new Date(`${day}T12:00:00`));
  };

  const formatAwardDateTime = (iso: string | null) => {
    if (!iso) return null;
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  };

  const dayGroups = useMemo(() => {
    return cabinetGroups
      .slice()
      .sort((a, b) => {
        const dayA = a.day_local ?? 'undated';
        const dayB = b.day_local ?? 'undated';
        if (dayA === 'undated' && dayB === 'undated') return 0;
        if (dayA === 'undated') return 1;
        if (dayB === 'undated') return -1;
        return dayB.localeCompare(dayA);
      })
      .map((group) => ({
        day: group.day_local ?? 'undated',
        trophies: group.trophies
          .map((entry) => ({
            trophyId: entry.trophy_id,
            meta: getMeta(entry.trophy_id),
            awards: entry.awards
              .slice()
              .sort((a, b) => {
                const nameA = getDisplayName(a.user_login).toLowerCase();
                const nameB = getDisplayName(b.user_login).toLowerCase();
                if (nameA !== nameB) return nameA.localeCompare(nameB);
                return (a.awarded_at ?? '').localeCompare(b.awarded_at ?? '');
              }),
          }))
          .sort((a, b) => a.meta.title.localeCompare(b.meta.title)),
      }));
  }, [cabinetGroups, catalogLabels, nameMap, getDisplayName, getMeta]);

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
            {dayGroups.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                No trophies have been awarded yet.
              </div>
            ) : (
              <div className="space-y-6">
                {dayGroups.map(({ day, trophies }) => (
                  <div key={day} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                    <div className="text-lg font-semibold">{formatDayLabel(day)}</div>
                    {trophies.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No awards recorded for this day.</div>
                    ) : (
                      <div className="space-y-4">
                        {trophies.map(({ trophyId, meta, awards }) => (
                          <div key={trophyId} className="space-y-2">
                            <div className="text-sm font-semibold flex items-center gap-2">
                              <span>{meta.icon}</span>
                              {meta.title}
                            </div>
                            <div className="space-y-2">
                              {awards.map((award, index) => {
                                const prettyName = getDisplayName(award.user_login);
                                const showSecondary = prettyName.toLowerCase() !== award.user_login.toLowerCase();
                                const awardedAt = formatAwardDateTime(award.awarded_at ?? null);
                                return (
                                  <div
                                    key={`${award.user_login}-${award.awarded_at ?? index}`}
                                    className="rounded-lg border border-border bg-background p-3 text-sm space-y-1"
                                  >
                                    <div className="font-medium">{award.user_login}</div>
                                    {showSecondary && (
                                      <div className="text-xs text-muted-foreground">{prettyName}</div>
                                    )}
                                    {awardedAt && (
                                      <div className="text-xs text-muted-foreground">{awardedAt}</div>
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
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
