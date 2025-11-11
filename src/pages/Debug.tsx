import { useEffect, useMemo, useState } from 'react';
import {
  fetchTripLeaderboard,
  fetchTripDailySummary,
  fetchTripTrophiesAllDays,
  fetchTripMapPoints,
  fetchTripDailyDetail,
  type TripLeaderboardRow,
  type TripDailySummaryRow,
  type TripDailyDetailRow,
  type TripTrophyRow,
  type TripMapPointRow,
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TROPHY_LABELS: Record<string, string> = {
  daily_obs_leader: 'Most Observations',
  daily_variety_hero: 'Most Species',
};

function formatDisplayDate(key: string): string {
  const date = new Date(`${key}T12:00:00-06:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function getCostaRicaDateKey(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

type DetailState = {
  rows: TripDailyDetailRow[];
  loading: boolean;
  error: string | null;
};

export default function Debug() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<TripLeaderboardRow[]>([]);
  const [dailySummary, setDailySummary] = useState<TripDailySummaryRow[]>([]);
  const [trophies, setTrophies] = useState<TripTrophyRow[]>([]);
  const [mapPoints, setMapPoints] = useState<TripMapPointRow[]>([]);
  const [dailyDetail, setDailyDetail] = useState<Record<string, DetailState>>({});
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [leaderboardRes, dailyRes, trophiesRes, mapRes] = await Promise.all([
          fetchTripLeaderboard(),
          fetchTripDailySummary(),
          fetchTripTrophiesAllDays(),
          fetchTripMapPoints(),
        ]);

        if (cancelled) return;

        setLeaderboard(leaderboardRes.data ?? []);
        setDailySummary(dailyRes.data ?? []);
        setTrophies(trophiesRes.data ?? []);
        setMapPoints(mapRes.data ?? []);
        setSelectedDay((prev) => prev || dailyRes.data?.[0]?.day_local || '');

        const errors: string[] = [];
        if (leaderboardRes.error?.message) errors.push(leaderboardRes.error.message);
        if (dailyRes.error?.message) errors.push(dailyRes.error.message);
        if (trophiesRes.error?.message) errors.push(trophiesRes.error.message);
        if (mapRes.error?.message) errors.push(mapRes.error.message);
        setError(errors.length ? errors.join('; ') : null);
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

  const detailState = selectedDay ? dailyDetail[selectedDay] : undefined;

  useEffect(() => {
    if (!selectedDay) return;
    const current = dailyDetail[selectedDay];
    if (current && (current.loading || current.rows.length > 0 || current.error)) {
      return;
    }

    let cancelled = false;
    setDailyDetail((prev) => ({
      ...prev,
      [selectedDay]: { loading: true, rows: [], error: null },
    }));

    (async () => {
      try {
        const detailRes = await fetchTripDailyDetail(selectedDay);
        if (cancelled) return;
        setDailyDetail((prev) => ({
          ...prev,
          [selectedDay]: {
            loading: false,
            rows: detailRes.data ?? [],
            error: detailRes.error?.message ?? null,
          },
        }));
      } catch (err) {
        if (!cancelled) {
          setDailyDetail((prev) => ({
            ...prev,
            [selectedDay]: {
              loading: false,
              rows: [],
              error: err instanceof Error ? err.message : String(err),
            },
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDay, dailyDetail]);

  const totalPoints = useMemo(
    () => leaderboard.reduce((acc, row) => acc + (row.total_points ?? 0), 0),
    [leaderboard],
  );

  const totalObservations = useMemo(
    () => leaderboard.reduce((acc, row) => acc + (row.obs_count ?? 0), 0),
    [leaderboard],
  );

  const totalSpecies = useMemo(
    () => leaderboard.reduce((acc, row) => acc + (row.distinct_taxa ?? 0), 0),
    [leaderboard],
  );

  const trophiesByDate = useMemo(() => {
    const map = new Map<string, TripTrophyRow[]>();
    trophies
      .filter((row) => row.place === 1)
      .forEach((row) => {
        const key = getCostaRicaDateKey(row.awarded_at);
        if (!key) return;
        const list = map.get(key) ?? [];
        list.push(row);
        map.set(key, list);
      });
    return map;
  }, [trophies]);

  const days = useMemo(() => dailySummary.map((row) => row.day_local), [dailySummary]);

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
                <CardTitle>Leaderboard Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {leaderboard.length} participants · {totalObservations} observations · {totalSpecies} species · {totalPoints}{' '}
                  total points
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
                      {leaderboard.map((row) => (
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
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>Daily Summary</CardTitle>
                <Select value={selectedDay} onValueChange={setSelectedDay} disabled={days.length === 0}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day) => (
                      <SelectItem key={day} value={day}>
                        {formatDisplayDate(day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 font-medium">Observations</th>
                        <th className="py-2 pr-3 font-medium">Species</th>
                        <th className="py-2 pr-3 font-medium">People</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailySummary.map((row) => (
                        <tr key={row.day_local} className="border-t">
                          <td className="py-2 pr-3 font-medium">{formatDisplayDate(row.day_local)}</td>
                          <td className="py-2 pr-3">{row.obs_count}</td>
                          <td className="py-2 pr-3">{row.distinct_taxa}</td>
                          <td className="py-2 pr-3">{row.people_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedDay && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Participants on {formatDisplayDate(selectedDay)}</h3>
                    {detailState?.loading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : detailState?.error ? (
                      <div className="text-sm text-destructive">{detailState.error}</div>
                    ) : detailState && detailState.rows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="py-2 pr-3 font-medium">Participant</th>
                              <th className="py-2 pr-3 font-medium">Observations</th>
                              <th className="py-2 pr-3 font-medium">Species</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailState.rows.map((row) => (
                              <tr key={row.user_login} className="border-t">
                                <td className="py-2 pr-3">{row.user_login}</td>
                                <td className="py-2 pr-3">{row.obs_count}</td>
                                <td className="py-2 pr-3">{row.distinct_taxa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No participant records for this day.</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trophies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(trophiesByDate.entries())
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([dateKey, rows]) => (
                    <div key={dateKey} className="rounded-lg border border-border bg-background p-4 space-y-2">
                      <div className="text-sm font-semibold text-muted-foreground">{formatDisplayDate(dateKey)}</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {rows.map((row, idx) => (
                          <div key={`${row.trophy_id}-${idx}`} className="rounded-lg border border-border bg-card p-3 space-y-1">
                            <div className="text-sm font-semibold">
                              {TROPHY_LABELS[row.trophy_id] ?? row.trophy_id}
                            </div>
                            <div className="text-xs text-muted-foreground">{row.user_login}</div>
                            {row.value != null && (
                              <div className="text-xs text-muted-foreground">Value: {row.value}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Map Points</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {mapPoints.length} observations with map coordinates.
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
