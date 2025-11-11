import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchUserObsCR2025,
  fetchLeaderboardCR2025,
  fetchRosterCR2025,
  type TripUserObservationRow,
  type TripLeaderboardRow,
  type TripRosterEntry,
} from '@/lib/api';
import { formatPoints } from '@/lib/scoring';

type TabKey = 'points' | 'date' | 'species';

const QUALITY_ORDER: Record<string, number> = {
  research: 0,
  needs_id: 1,
  casual: 2,
};

const QUALITY_LABEL: Record<string, string> = {
  research: 'Research',
  needs_id: 'Needs ID',
  casual: 'Casual',
};

const QUALITY_CLASS: Record<string, string> = {
  research: 'bg-emerald-100 text-emerald-700',
  needs_id: 'bg-amber-100 text-amber-700',
  casual: 'bg-slate-200 text-slate-700',
};

const OBS_TIME_ZONE = 'America/Costa_Rica';

function qualityRank(grade: string | null | undefined): number {
  const key = (grade ?? '').toLowerCase();
  return QUALITY_ORDER[key] ?? 3;
}

function qualityLabel(grade: string | null | undefined): string {
  const key = (grade ?? '').toLowerCase();
  return QUALITY_LABEL[key] ?? 'Unknown';
}

function qualityClass(grade: string | null | undefined): string {
  const key = (grade ?? '').toLowerCase();
  return QUALITY_CLASS[key] ?? 'bg-muted text-muted-foreground';
}

function formatDayLabel(day: string | null): string {
  if (!day) return 'Undated observations';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: OBS_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${day}T12:00:00`));
}

function formatObserved(iso: string | null | undefined): string {
  if (!iso) return 'Time unknown';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: OBS_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatTaxonLabel(iconic: string | null, taxonId: number | null): string {
  if (taxonId) {
    return iconic ? `${iconic} • #${taxonId}` : `Taxon #${taxonId}`;
  }
  return iconic ?? 'Taxon pending';
}

export default function UserPage() {
  const { login } = useParams<{ login: string }>();
  const navigate = useNavigate();
  const safeLogin = (login ?? '').trim();
  const hasLogin = safeLogin.length > 0;
  const [loading, setLoading] = useState(true);
  const [observations, setObservations] = useState<TripUserObservationRow[]>([]);
  const [userRow, setUserRow] = useState<TripLeaderboardRow | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('points');

  useEffect(() => {
    if (!safeLogin) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [obsRes, leaderboardRes, rosterRes] = await Promise.all([
          fetchUserObsCR2025(safeLogin),
          fetchLeaderboardCR2025(),
          fetchRosterCR2025(),
        ]);

        if (cancelled) return;

        setObservations(obsRes.data ?? []);

        const loginKey = safeLogin.toLowerCase();
        const leaderboardMatch = (leaderboardRes.data ?? []).find(
          (row) => row.user_login.toLowerCase() === loginKey,
        );
        setUserRow(leaderboardMatch ?? null);

        const rosterMatch = (rosterRes.data ?? []).find(
          (row: TripRosterEntry) => row.user_login.toLowerCase() === loginKey,
        );
        setDisplayName(rosterMatch?.display_name ?? null);

        const errors: string[] = [];
        if (obsRes.error?.message) errors.push(obsRes.error.message);
        if (leaderboardRes.error?.message) errors.push(leaderboardRes.error.message);
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        setError(errors.length ? errors.join('; ') : null);

        const warningList: string[] = [];
        if (obsRes.missing) warningList.push('Observation view is unavailable for this user.');
        if (leaderboardRes.missing)
          warningList.push('Leaderboard view is unavailable; totals may be incomplete.');
        if (rosterRes.missing)
          warningList.push('Roster view is unavailable; display name hidden.');
        setWarnings(warningList);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load user observations', err);
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
  }, [safeLogin]);

  const totalObservations = observations.length;
  const distinctTaxa = useMemo(() => {
    const set = new Set<number>();
    observations.forEach((obs) => {
      if (obs.taxon_id != null) {
        set.add(Number(obs.taxon_id));
      }
    });
    return set.size;
  }, [observations]);

  const researchCount = useMemo(
    () =>
      observations.filter(
        (obs) => (obs.quality_grade ?? '').toLowerCase() === 'research',
      ).length,
    [observations],
  );

  const pointsView = useMemo(() => {
    return [...observations].sort((a, b) => {
      const rankDiff = qualityRank(a.quality_grade) - qualityRank(b.quality_grade);
      if (rankDiff !== 0) return rankDiff;
      const timeA = a.observed_at_utc ?? '';
      const timeB = b.observed_at_utc ?? '';
      return timeB.localeCompare(timeA);
    });
  }, [observations]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, TripUserObservationRow[]>();
    observations.forEach((obs) => {
      const key = obs.day_local ?? 'undated';
      const bucket = map.get(key) ?? [];
      bucket.push(obs);
      map.set(key, bucket);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, items]) => ({
        day,
        items: items.sort((a, b) => (b.observed_at_utc ?? '').localeCompare(a.observed_at_utc ?? '')),
      }));
  }, [observations]);

  const speciesGroups = useMemo(() => {
    const map = new Map<
      string,
      { taxonId: number | null; iconic: string | null; items: TripUserObservationRow[] }
    >();
    observations.forEach((obs) => {
      const key = obs.taxon_id != null ? obs.taxon_id.toString() : 'unknown';
      const bucket = map.get(key) ?? {
        taxonId: obs.taxon_id != null ? Number(obs.taxon_id) : null,
        iconic: obs.iconic_taxon_name ?? null,
        items: [],
      };
      bucket.items.push(obs);
      map.set(key, bucket);
    });
    return Array.from(map.values())
      .sort((a, b) => {
        const countDiff = b.items.length - a.items.length;
        if (countDiff !== 0) return countDiff;
        if (a.taxonId != null && b.taxonId != null) {
          return a.taxonId - b.taxonId;
        }
        if (a.taxonId != null) return -1;
        if (b.taxonId != null) return 1;
        return (a.iconic ?? '').localeCompare(b.iconic ?? '');
      });
  }, [observations]);

  const bonusPoints = userRow?.bonus_points ?? 0;
  const totalPoints = userRow?.total_points ?? totalObservations + researchCount + bonusPoints;

  if (!hasLogin) {
    return (
      <div className="pb-6 pb-safe-bottom">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <p className="text-muted-foreground">User not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{safeLogin}</h1>
          {displayName && displayName.toLowerCase() !== safeLogin.toLowerCase() && (
            <p className="text-sm text-muted-foreground">{displayName}</p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {error}
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Observations</p>
            <p className="text-2xl font-semibold">{totalObservations}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Distinct taxa</p>
            <p className="text-2xl font-semibold">{distinctTaxa}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Research grade</p>
            <p className="text-2xl font-semibold">{researchCount}</p>
          </div>
          <div className="rounded-xl border border-primary bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Points</p>
            <p className="text-2xl font-semibold text-primary">{formatPoints(totalPoints)}</p>
            <p className="text-xs text-muted-foreground">
              {totalObservations} obs + {researchCount} RG + {bonusPoints} bonus
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <Skeleton key={idx} className="h-40 w-full" />
            ))}
          </div>
        ) : observations.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              No observations found for this user.
            </p>
            <p className="text-sm text-muted-foreground">
              Observations will appear here after they are recorded.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="points">By Points</TabsTrigger>
              <TabsTrigger value="date">By Date</TabsTrigger>
              <TabsTrigger value="species">By Species</TabsTrigger>
            </TabsList>

            <TabsContent value="points" className="mt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {pointsView.map((obs, index) => {
                  const taxonLabel = formatTaxonLabel(obs.iconic_taxon_name, obs.taxon_id);
                  return (
                    <div
                      key={`${obs.inat_obs_id ?? obs.observed_at_utc ?? index}`}
                      className="rounded-xl border border-border bg-card p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-border capitalize">
                          {taxonLabel}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${qualityClass(obs.quality_grade)}`}>
                          {qualityLabel(obs.quality_grade)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatObserved(obs.observed_at_utc)}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {obs.inat_obs_id ? (
                          <a
                            href={`https://www.inaturalist.org/observations/${obs.inat_obs_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on iNaturalist
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Observation pending sync</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="date" className="mt-4 space-y-4">
              {dateGroups.map(({ day, items }) => (
                <div key={day} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{formatDayLabel(day === 'undated' ? null : day)}</h3>
                    <span className="text-xs text-muted-foreground">{items.length} observations</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((obs, index) => {
                      const taxonLabel = formatTaxonLabel(obs.iconic_taxon_name, obs.taxon_id);
                      return (
                        <div
                          key={`${obs.inat_obs_id ?? obs.observed_at_utc ?? index}`}
                          className="rounded-lg border border-border bg-background p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-border capitalize">
                              {taxonLabel}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${qualityClass(obs.quality_grade)}`}>
                              {qualityLabel(obs.quality_grade)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatObserved(obs.observed_at_utc)}</div>
                          {obs.inat_obs_id && (
                            <a
                              href={`https://www.inaturalist.org/observations/${obs.inat_obs_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View on iNaturalist
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="species" className="mt-4 space-y-4">
              {speciesGroups.map((group, index) => (
                <div key={`${group.taxonId ?? 'unknown'}-${index}`} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border border-border capitalize">
                        {formatTaxonLabel(group.iconic, group.taxonId)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{group.items.length} observations</span>
                  </div>
                  <div className="space-y-2">
                    {group.items.map((obs, obsIndex) => (
                      <div
                        key={`${obs.inat_obs_id ?? obs.observed_at_utc ?? obsIndex}`}
                        className="rounded-lg border border-border bg-background p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${qualityClass(obs.quality_grade)}`}>
                            {qualityLabel(obs.quality_grade)}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatObserved(obs.observed_at_utc)}</span>
                        </div>
                        {obs.inat_obs_id && (
                          <a
                            href={`https://www.inaturalist.org/observations/${obs.inat_obs_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on iNaturalist
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
