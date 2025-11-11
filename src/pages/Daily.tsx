import { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  fetchDailySummaryCR2025,
  getTripBasePoints,
  fetchRosterCR2025,
  type TripDailySummaryRow,
} from '@/lib/api';

function formatCostaRicaDate(day: string): string {
  if (!day) return day;
  const date = new Date(`${day}T12:00:00-06:00`);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

type DetailRow = {
  user_login: string;
  obs_count: number;
  distinct_taxa: number;
};

type DetailState = {
  loading: boolean;
  rows: DetailRow[];
  error: string | null;
};

export default function Daily() {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<string[]>([]);
  const [summaryByDay, setSummaryByDay] = useState<Record<string, TripDailySummaryRow>>({});
  const [details, setDetails] = useState<Record<string, DetailState>>({});
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const currentDetail = useMemo(() => (expandedDay ? details[expandedDay] : undefined), [expandedDay, details]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [summaryRes, rosterRes] = await Promise.all([
          fetchDailySummaryCR2025(),
          fetchRosterCR2025(),
        ]);

        if (cancelled) return;

        const orderedDays = summaryRes.data.map((row) => row.day_local).sort((a, b) => b.localeCompare(a));

        const summaryMap = summaryRes.data.reduce<Record<string, TripDailySummaryRow>>((acc, row) => {
          acc[row.day_local] = row;
          return acc;
        }, {});

        setDays(orderedDays);
        setSummaryByDay(summaryMap);
        const rosterMap = (rosterRes.data ?? []).reduce<Record<string, string>>((acc, row) => {
          const key = row.user_login.toLowerCase();
          if (key) {
            acc[key] = row.display_name ?? row.user_login;
          }
          return acc;
        }, {});
        setNameMap(rosterMap);

        const warningsList: string[] = [];
        if (summaryRes.missing) warningsList.push('Daily summary view is unavailable.');
        if (rosterRes.missing) warningsList.push('Roster view is unavailable; display names limited.');
        setWarnings(warningsList);

        const errors: string[] = [];
        if (summaryRes.error?.message) errors.push(summaryRes.error.message);
        if (rosterRes.error?.message) errors.push(rosterRes.error.message);
        setError(errors.length ? errors.join('; ') : null);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load daily summaries', err);
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

  useEffect(() => {
    if (!expandedDay) return;
    if (currentDetail && (currentDetail.loading || currentDetail.rows.length > 0 || currentDetail.error)) {
      return;
    }

    let cancelled = false;
    setDetails((prev) => ({
      ...prev,
      [expandedDay]: { loading: true, rows: [], error: null },
    }));

    (async () => {
      try {
        const result = await getTripBasePoints({ day: expandedDay });
        if (cancelled) return;

        const aggregated = (result.data ?? []).reduce<Record<string, { obs: number; taxa: Set<number> }>>((acc, row) => {
          const login = row.user_login;
          if (!login) return acc;
          const bucket = acc[login] ?? { obs: 0, taxa: new Set<number>() };
          bucket.obs += 1;
          if (row.taxon_id != null) {
            bucket.taxa.add(Number(row.taxon_id));
          }
          acc[login] = bucket;
          return acc;
        }, {});

        const detailRows = Object.entries(aggregated).map(([login, bucket]) => ({
          user_login: login,
          obs_count: bucket.obs,
          distinct_taxa: bucket.taxa.size,
        } satisfies DetailRow));

        detailRows.sort((a, b) => {
          const obsDiff = b.obs_count - a.obs_count;
          if (obsDiff !== 0) return obsDiff;
          const taxaDiff = b.distinct_taxa - a.distinct_taxa;
          if (taxaDiff !== 0) return taxaDiff;
          const nameA = getDisplayName(a.user_login).toLowerCase();
          const nameB = getDisplayName(b.user_login).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setDetails((prev) => ({
          ...prev,
          [expandedDay]: {
            loading: false,
            rows: detailRows,
            error: result.error?.message ?? null,
          },
        }));
      } catch (err) {
        if (cancelled) return;
        setDetails((prev) => ({
          ...prev,
          [expandedDay]: {
            loading: false,
            rows: [],
            error: err instanceof Error ? err.message : String(err),
          },
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expandedDay, currentDetail]);

  const toggleDay = (day: string) => {
    setExpandedDay((prev) => (prev === day ? null : day));
  };

  const getDisplayName = (login: string) => nameMap[login.toLowerCase()] ?? login;

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Daily
          </h1>
          <p className="text-sm text-muted-foreground">
            Observation highlights for each trip day (America/Costa_Rica)
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                Daily data error: {error}
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
            <div className="space-y-3">
              {days.map((day) => {
                const summary = summaryByDay[day] ?? {
                  day_local: day,
                  obs_count: 0,
                  distinct_taxa: 0,
                  people_count: 0,
                };
                const isOpen = expandedDay === day;
                const detail = details[day];
                const detailRows = detail?.rows ?? [];
                const detailLoading = detail?.loading;
                const detailError = detail?.error;

                return (
                  <div key={day} className="border rounded-xl bg-card overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-accent transition-colors"
                      onClick={() => toggleDay(day)}
                    >
                      <div className="space-y-1">
                        <div className="text-lg font-semibold">{formatCostaRicaDate(day)}</div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span>🔍 {summary.obs_count} observations</span>
                          <span>🌿 {summary.distinct_taxa} species</span>
                          <span>👥 {summary.people_count} people</span>
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4">
                        {detailLoading ? (
                          <div className="space-y-2 mt-3">
                            {[1, 2, 3].map((i) => (
                              <Skeleton key={i} className="h-10 w-full" />
                            ))}
                          </div>
                        ) : detailError ? (
                          <div className="mt-3 text-sm text-destructive">
                            Failed to load participant details: {detailError}
                          </div>
                        ) : detailRows.length === 0 ? (
                          <div className="mt-3 text-sm text-muted-foreground">
                            No participant observations recorded for this day yet.
                          </div>
                        ) : (
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-2 pr-4 font-medium">Participant</th>
                                  <th className="py-2 pr-4 font-medium">Observations</th>
                                  <th className="py-2 pr-4 font-medium">Species</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRows.map((row) => {
                                  const prettyName = getDisplayName(row.user_login);
                                  const showSecondary = prettyName.toLowerCase() !== row.user_login.toLowerCase();
                                  return (
                                    <tr key={row.user_login} className="border-t">
                                      <td className="py-2 pr-4">
                                        <div className="font-semibold text-sm text-foreground">{row.user_login}</div>
                                        {showSecondary && (
                                          <div className="text-xs text-muted-foreground">{prettyName}</div>
                                        )}
                                      </td>
                                      <td className="py-2 pr-4">{row.obs_count}</td>
                                      <td className="py-2 pr-4">{row.distinct_taxa}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
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
