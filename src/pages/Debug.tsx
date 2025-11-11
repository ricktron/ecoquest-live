import { useEffect, useMemo, useState } from 'react';
import {
  getTripLeaderboard,
  getTripDailySummary,
  getTripTrophiesToday,
  getTripBasePoints,
  getTripParams,
  getTripRoster,
  type TripLeaderboardRow,
  type TripDailySummaryRow,
  type TripBaseObservationRow,
  type TripParams,
  type TripRosterEntry,
  type TripTrophyAward,
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TROPHY_LABELS: Record<string, string> = {
  daily_obs_leader: 'Most Observations',
  daily_variety_hero: 'Most Species',
};

export default function Debug() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<TripLeaderboardRow[]>([]);
  const [dailySummary, setDailySummary] = useState<TripDailySummaryRow[]>([]);
  const [todayTrophies, setTodayTrophies] = useState<TripTrophyAward[]>([]);
  const [basePoints, setBasePoints] = useState<TripBaseObservationRow[]>([]);
  const [params, setParams] = useState<TripParams | null>(null);
  const [roster, setRoster] = useState<TripRosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tz, setTz] = useState<string>('UTC');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [paramsRes, rosterRes, leaderboardRes, dailyRes, baseRes] = await Promise.all([
          getTripParams(),
          getTripRoster(),
          getTripLeaderboard(),
          getTripDailySummary(),
          getTripBasePoints(),
        ]);

        if (cancelled) return;

        const tzValue = paramsRes.data?.tz ?? 'UTC';
        setParams(paramsRes.data ?? null);
        setTz(tzValue);
        setRoster(rosterRes.data ?? []);
        setLeaderboard(leaderboardRes.data ?? []);
        setDailySummary(dailyRes.data ?? []);
        setBasePoints(baseRes.data ?? []);

        const todayRes = await getTripTrophiesToday(tzValue);
        if (!cancelled) {
          setTodayTrophies(todayRes.data ?? []);
          const errors: string[] = [];
          if (paramsRes.error?.message) errors.push(paramsRes.error.message);
          if (rosterRes.error?.message) errors.push(rosterRes.error.message);
          if (leaderboardRes.error?.message) errors.push(leaderboardRes.error.message);
          if (dailyRes.error?.message) errors.push(dailyRes.error.message);
          if (baseRes.error?.message) errors.push(baseRes.error.message);
          if (todayRes.error?.message) errors.push(todayRes.error.message);
          setError(errors.length ? errors.join('; ') : null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load debug data', err);
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

  const totalObservations = useMemo(() => basePoints.length, [basePoints]);
  const distinctTaxa = useMemo(() => {
    const taxa = new Set<number>();
    basePoints.forEach((row) => {
      if (row.taxon_id != null) taxa.add(row.taxon_id);
    });
    return taxa.size;
  }, [basePoints]);

  const participantsCount = useMemo(() => roster.length, [roster]);

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard]
      .sort((a, b) => {
        const pointDiff = b.total_points - a.total_points;
        if (pointDiff !== 0) return pointDiff;
        const taxaDiff = b.distinct_taxa - a.distinct_taxa;
        if (taxaDiff !== 0) return taxaDiff;
        const obsDiff = b.obs_count - a.obs_count;
        if (obsDiff !== 0) return obsDiff;
        const nameA = (a.display_name || a.user_login).toLowerCase();
        const nameB = (b.display_name || b.user_login).toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .slice(0, 5);
  }, [leaderboard]);

  const totalDailyPeople = useMemo(
    () => dailySummary.reduce((sum, row) => sum + (row.people_count ?? 0), 0),
    [dailySummary],
  );

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Debug Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live data pulled from the same trip views powering the app tabs.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Trip Parameters</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2 text-muted-foreground">
                <div>Timezone: {tz}</div>
                {params ? (
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div>Start: {params.start_date}</div>
                    <div>End: {params.end_date}</div>
                    <div>Lat range: {params.lat_min} → {params.lat_max}</div>
                    <div>Lon range: {params.lon_min} → {params.lon_max}</div>
                  </div>
                ) : (
                  <div>No parameter record found.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roster ({participantsCount})</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {roster.length === 0 ? (
                  <div>No roster entries.</div>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {roster.map((member) => (
                      <li key={member.user_login}>
                        <span className="font-medium text-foreground">{member.display_name || member.user_login}</span>
                        <span className="ml-2 text-xs">({member.user_login})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leaderboard Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Top 5 of {leaderboard.length} · Total observations {totalObservations} · Distinct taxa {distinctTaxa}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Participant</th>
                        <th className="py-2 pr-3 font-medium">Points</th>
                        <th className="py-2 pr-3 font-medium">Observations</th>
                        <th className="py-2 pr-3 font-medium">Species</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeaderboard.map((row) => (
                        <tr key={row.user_login} className="border-t">
                          <td className="py-2 pr-3 font-medium">{row.display_name || row.user_login}</td>
                          <td className="py-2 pr-3">{row.total_points}</td>
                          <td className="py-2 pr-3">{row.obs_count}</td>
                          <td className="py-2 pr-3">{row.distinct_taxa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base Observation Counts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Totals: {totalObservations} observations · {distinctTaxa} distinct taxa · {totalDailyPeople} person-days
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Day</th>
                        <th className="py-2 pr-3 font-medium">Observations</th>
                        <th className="py-2 pr-3 font-medium">Species</th>
                        <th className="py-2 pr-3 font-medium">People</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummary.map((row) => (
                        <tr key={row.day_local} className="border-t">
                          <td className="py-2 pr-3 font-medium">{row.day_local}</td>
                          <td className="py-2 pr-3">{row.obs_count}</td>
                          <td className="py-2 pr-3">{row.distinct_taxa}</td>
                          <td className="py-2 pr-3">{row.people_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s Trophies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayTrophies.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No trophies recorded for today ({tz}).</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {todayTrophies.map((row, idx) => (
                      <div key={`${row.trophy_id}-${idx}`} className="rounded-lg border border-border bg-background p-3 space-y-1">
                        <div className="text-sm font-semibold">{TROPHY_LABELS[row.trophy_id] ?? row.trophy_id}</div>
                        <div className="text-xs text-muted-foreground">{row.user_login}</div>
                        {row.value != null && (
                          <div className="text-xs text-muted-foreground">Value: {row.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
