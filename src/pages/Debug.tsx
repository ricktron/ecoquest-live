import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  fetchDailySummaryCR2025,
  getLeaderboardCR2025,
  getRosterCR2025,
  fetchObsAllCR2025,
  fetchObsLatest10CR2025,
  fetchTodayTrophiesCR2025,
  fetchTripTrophiesCR2025,
  fetchCabinetCR2025,
  submitAdultPoints,
  getTripParams,
  lastUpdatedCR2025,
  type TripLeaderboardPayload,
  type TripLeaderboardRow,
  type TripDailySummaryRow,
  type TripParams,
  type TripRosterEntry,
} from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Debug() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<TripLeaderboardRow[]>([]);
  const [dailySummary, setDailySummary] = useState<TripDailySummaryRow[]>([]);
  const [params, setParams] = useState<TripParams | null>(null);
  const [roster, setRoster] = useState<TripRosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tz, setTz] = useState<string>('UTC');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [viewCounts, setViewCounts] = useState({
    roster: 0,
    observations: 0,
    latestWindow: 0,
    leaderboard: 0,
    dailySummary: 0,
    trophiesToday: 0,
    trophiesTrip: 0,
    cabinetDays: 0,
  });
  const [hasSilver, setHasSilver] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [adultForm, setAdultForm] = useState({ login: '', points: '', reason: '' });
  const [adultStatus, setAdultStatus] = useState<string | null>(null);
  const [adultError, setAdultError] = useState<string | null>(null);
  const adultPointsEnabled = import.meta.env.VITE_FEATURE_ADULT_POINTS === '1';

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [
          paramsRes,
          rosterRes,
          leaderboardRes,
          dailyRes,
          updatedRes,
          obsRes,
          latestRes,
          trophiesTodayRes,
          trophiesTripRes,
          cabinetRes,
        ] = await Promise.all([
          getTripParams(),
          getRosterCR2025(),
          getLeaderboardCR2025(),
          fetchDailySummaryCR2025(),
          lastUpdatedCR2025(),
          fetchObsAllCR2025(),
          fetchObsLatest10CR2025(),
          fetchTodayTrophiesCR2025(),
          fetchTripTrophiesCR2025(),
          fetchCabinetCR2025(),
        ]);

        if (cancelled) return;

        const tzValue = paramsRes.data?.tz ?? 'UTC';
        setParams(paramsRes.data ?? null);
        setTz(tzValue);
        setRoster(rosterRes.data ?? []);
        const leaderboardPayload: TripLeaderboardPayload = leaderboardRes.data ?? {
          rows: [],
          hasSilver: false,
          lastUpdatedAt: null,
        };
        setHasSilver(Boolean(leaderboardPayload.hasSilver));
        setLeaderboard(leaderboardPayload.rows ?? []);
        setDailySummary(dailyRes.data ?? []);
        setLastUpdated(updatedRes.data ?? null);

        setViewCounts({
          roster: (rosterRes.data ?? []).length,
          observations: (obsRes.data ?? []).length,
          latestWindow: (latestRes.data ?? []).length,
          leaderboard: (leaderboardPayload.rows ?? []).length,
          dailySummary: (dailyRes.data ?? []).length,
          trophiesToday: (trophiesTodayRes.data ?? []).length,
          trophiesTrip: (trophiesTripRes.data ?? []).length,
          cabinetDays: (cabinetRes.data ?? []).length,
        });

        const errors: string[] = [];
        if (paramsRes.error?.message) errors.push(paramsRes.error.message);
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        if (leaderboardRes.error?.message) errors.push(leaderboardRes.error.message);
        if (dailyRes.error?.message) errors.push(dailyRes.error.message);
        if (updatedRes.error?.message) errors.push(updatedRes.error.message);
        if (obsRes.error?.message) errors.push(obsRes.error.message);
        if (latestRes.error?.message) errors.push(latestRes.error.message);
        if (trophiesTodayRes.error?.message) errors.push(trophiesTodayRes.error.message);
        if (trophiesTripRes.error?.message) errors.push(trophiesTripRes.error.message);
        if (cabinetRes.error?.message) errors.push(cabinetRes.error.message);
        setError(errors.length ? errors.join('; ') : null);

        const warningList: string[] = [];
        if (rosterRes.missing) warningList.push('Roster view is unavailable; counts may be incomplete.');
        if (leaderboardRes.missing) warningList.push('Leaderboard view is unavailable.');
        if (dailyRes.missing) warningList.push('Daily summary view is unavailable.');
        if (updatedRes.missing) warningList.push('Latest observation time unavailable; fallback in use.');
        if (obsRes.missing) warningList.push('Observation base view is unavailable.');
        if (latestRes.missing) warningList.push('Latest observation window view is unavailable.');
        if (trophiesTodayRes.missing) warningList.push('Today trophy view is unavailable.');
        if (trophiesTripRes.missing) warningList.push('Trip trophy view is unavailable.');
        if (cabinetRes.missing) warningList.push('Cabinet view is unavailable.');
        setWarnings(warningList);
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
  }, [reloadToken]);

  const participantsCount = useMemo(() => roster.length, [roster]);

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard]
      .sort((a, b) => {
        const totalA = a.silverBreakdown?.total_points ?? a.total_points;
        const totalB = b.silverBreakdown?.total_points ?? b.total_points;
        const pointDiff = totalB - totalA;
        if (pointDiff !== 0) return pointDiff;
        const taxaDiff = b.distinct_taxa - a.distinct_taxa;
        if (taxaDiff !== 0) return taxaDiff;
        const obsDiff = b.obs_count - a.obs_count;
        if (obsDiff !== 0) return obsDiff;
        const nameA = (a.nameForUi || a.user_login).toLowerCase();
        const nameB = (b.nameForUi || b.user_login).toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .slice(0, 5);
  }, [leaderboard]);

  const totalDailyPeople = useMemo(
    () => dailySummary.reduce((sum, row) => sum + (row.people_count ?? 0), 0),
    [dailySummary],
  );

  const bonusTotals = useMemo(() => {
    return leaderboard.reduce<Record<string, number>>((acc, row) => {
      acc[row.user_login] = row.bonus_points;
      return acc;
    }, {});
  }, [leaderboard]);

  const totalBonusPoints = useMemo(
    () => leaderboard.reduce((sum, row) => sum + row.bonus_points, 0),
    [leaderboard],
  );

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null;
    const dt = new Date(lastUpdated);
    if (Number.isNaN(dt.valueOf())) return null;
    return dt.toLocaleString('en-US', {
      timeZone: tz || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }, [lastUpdated, tz]);

  const handleAdultSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdultStatus(null);
    setAdultError(null);

    const login = adultForm.login.trim();
    const pointsValue = Number.parseInt(adultForm.points, 10);
    if (!login) {
      setAdultError('Select a participant.');
      return;
    }
    if (Number.isNaN(pointsValue)) {
      setAdultError('Points must be an integer.');
      return;
    }

    const result = await submitAdultPoints(login, pointsValue, adultForm.reason);
    if ('missingTable' in result && result.missingTable) {
      setAdultError('Adult points table is not available yet. Ask the backend team to enable it.');
      return;
    }
    if (!result.ok) {
      setAdultError(result.error?.message ?? 'Failed to submit adult points.');
      return;
    }

    setAdultStatus('Adult points submitted.');
    setAdultForm({ login: '', points: '', reason: '' });
    setReloadToken((prev) => prev + 1);
  };

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
            <Card>
              <CardHeader>
                <CardTitle>View Health</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center justify-between">
                    <span>Roster</span>
                    <span>{viewCounts.roster}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Observations (base)</span>
                    <span>{viewCounts.observations}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Latest window</span>
                    <span>{viewCounts.latestWindow}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Leaderboard rows</span>
                    <span>{viewCounts.leaderboard}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Daily summary days</span>
                    <span>{viewCounts.dailySummary}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trophies today</span>
                    <span>{viewCounts.trophiesToday}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trophies trip</span>
                    <span>{viewCounts.trophiesTrip}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cabinet days</span>
                    <span>{viewCounts.cabinetDays}</span>
                  </div>
                </div>
                <div>
                  Silver scoring view:{' '}
                  {hasSilver ? (
                    <span className="text-emerald-600 font-medium">available</span>
                  ) : (
                    <span className="text-muted-foreground">not detected (falling back to base totals)</span>
                  )}
                </div>
              </CardContent>
            </Card>
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
                <CardTitle>Latest Observation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {formattedLastUpdated ? (
                  <div>Most recent observation: {formattedLastUpdated}</div>
                ) : (
                  <div>No observations recorded yet.</div>
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
                        <span className="font-medium text-foreground">{member.user_login}</span>
                        {member.display_name && member.display_name.toLowerCase() !== member.user_login.toLowerCase() && (
                          <span className="ml-2 text-xs text-muted-foreground">{member.display_name}</span>
                        )}
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
                  Top 5 of {leaderboard.length} · Total bonus points {totalBonusPoints}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 pr-3 font-medium">Participant</th>
                        <th className="py-2 pr-3 font-medium">Points</th>
                        <th className="py-2 pr-3 font-medium">Obs</th>
                        <th className="py-2 pr-3 font-medium">Species</th>
                        <th className="py-2 pr-3 font-medium">Research</th>
                        <th className="py-2 pr-3 font-medium">Bonus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeaderboard.map((row) => (
                        <tr key={row.user_login} className="border-t">
                          <td className="py-2 pr-3 font-medium">
                            <div className="text-foreground">{row.user_login}</div>
                            {row.display_name && row.display_name.toLowerCase() !== row.user_login.toLowerCase() && (
                              <div className="text-xs text-muted-foreground">{row.display_name}</div>
                            )}
                          </td>
                          <td className="py-2 pr-3">{row.total_points}</td>
                          <td className="py-2 pr-3">{row.obs_count}</td>
                          <td className="py-2 pr-3">{row.distinct_taxa}</td>
                          <td className="py-2 pr-3">{row.research_grade_count}</td>
                          <td className="py-2 pr-3">{row.bonus_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Totals: {dailySummary.reduce((sum, row) => sum + row.obs_count, 0)} observations ·{' '}
                  {dailySummary.reduce((sum, row) => sum + row.distinct_taxa, 0)} species counts · {totalDailyPeople} person-days
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
                <CardTitle>Bonus Points by User</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leaderboard.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No leaderboard data available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 pr-3 font-medium">Participant</th>
                          <th className="py-2 pr-3 font-medium">Bonus Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(bonusTotals)
                          .sort((a, b) => b[1] - a[1])
                          .map(([login, bonus]) => (
                            <tr key={login} className="border-t">
                              <td className="py-2 pr-3 font-medium">{login}</td>
                              <td className="py-2 pr-3">{bonus}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {adultPointsEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Adult-awarded Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={handleAdultSubmit}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-xs font-medium uppercase text-muted-foreground">
                        Participant
                        <select
                          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                          value={adultForm.login}
                          onChange={(event) => setAdultForm((prev) => ({ ...prev, login: event.target.value }))}
                        >
                          <option value="" disabled>
                            Select participant
                          </option>
                          {roster.map((entry) => (
                            <option key={entry.user_login} value={entry.user_login}>
                              {entry.display_name || entry.user_login}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs font-medium uppercase text-muted-foreground">
                        Points
                        <input
                          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                          type="number"
                          value={adultForm.points}
                          onChange={(event) => setAdultForm((prev) => ({ ...prev, points: event.target.value }))}
                          placeholder="e.g. 5"
                        />
                      </label>
                      <div className="hidden sm:block" />
                    </div>
                    <label className="block text-xs font-medium uppercase text-muted-foreground">
                      Reason
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                        type="text"
                        value={adultForm.reason}
                        onChange={(event) => setAdultForm((prev) => ({ ...prev, reason: event.target.value }))}
                        placeholder="Teamwork, extra effort, etc."
                      />
                    </label>
                    {adultStatus && <div className="text-xs text-emerald-600">{adultStatus}</div>}
                    {adultError && <div className="text-xs text-destructive">{adultError}</div>}
                    <Button type="submit" size="sm">
                      Submit adult points
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
