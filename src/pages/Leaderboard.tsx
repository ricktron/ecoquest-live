import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Info, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Legend from '@/components/Legend';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatPoints } from '@/lib/scoring';
import {
  fetchLeaderboardCR2025,
  fetchRosterCR2025,
  fetchDisplayFlags,
  getLastUpdatedTs,
  type TripLeaderboardPayload,
  type TripLeaderboardRow,
  type TripRosterEntry,
  type TripSilverBreakdown,
} from '@/lib/api';
import { isLive } from '@/lib/config/profile';

type RankSnapshot = {
  timestamp: number;
  ranks: Record<string, number>;
};

type RankedRow = TripLeaderboardRow & {
  rank: number;
  rankDelta: number | null;
  rankIndicator: '▲' | '▼' | '—';
  effectiveTotal: number;
  silver?: TripSilverBreakdown;
};

const RANK_STORAGE_KEY = 'cr2025-rank-snapshot-v1';
const RANK_STALE_WINDOW_MS = 10 * 60 * 1000;

function mergeRosterAndLeaderboard(
  roster: TripRosterEntry[],
  leaderboardRows: TripLeaderboardRow[],
): TripLeaderboardRow[] {
  const rosterMap = new Map<string, TripRosterEntry>();
  roster.forEach((entry) => {
    rosterMap.set(entry.user_login.toLowerCase(), entry);
  });

  const leaderboardMap = new Map<string, TripLeaderboardRow>();
  leaderboardRows.forEach((row) => {
    leaderboardMap.set(row.user_login.toLowerCase(), row);
  });

  const merged: TripLeaderboardRow[] = [];

  roster.forEach((entry) => {
    const key = entry.user_login.toLowerCase();
    const leaderboardRow = leaderboardMap.get(key);
    if (leaderboardRow) {
      merged.push({
        ...leaderboardRow,
        display_name: leaderboardRow.display_name ?? entry.display_name ?? leaderboardRow.user_login,
      });
    } else {
      merged.push({
        user_login: entry.user_login,
        display_name: entry.display_name ?? entry.user_login,
        total_points: 0,
        obs_count: 0,
        distinct_taxa: 0,
        research_grade_count: 0,
        bonus_points: 0,
        last_observed_at_utc: null,
      });
    }
  });

  leaderboardRows.forEach((row) => {
    const key = row.user_login.toLowerCase();
    if (!rosterMap.has(key)) {
      merged.push(row);
    }
  });

  return merged;
}

function computeRankedRows(
  rows: TripLeaderboardRow[],
  hasSilver: boolean,
  silverByLogin: Record<string, TripSilverBreakdown>,
): RankedRow[] {
  const decorated = rows.map((row) => {
    const key = row.user_login.toLowerCase();
    const silver = hasSilver ? silverByLogin[key] : undefined;
    const effectiveTotal = silver ? silver.total_points : row.total_points;
    return {
      ...row,
      silver,
      effectiveTotal,
      rank: 0,
      rankDelta: null,
      rankIndicator: '—' as const,
    } satisfies RankedRow;
  });

  decorated.sort((a, b) => {
    if (b.effectiveTotal !== a.effectiveTotal) return b.effectiveTotal - a.effectiveTotal;
    if (b.distinct_taxa !== a.distinct_taxa) return b.distinct_taxa - a.distinct_taxa;
    if (b.obs_count !== a.obs_count) return b.obs_count - a.obs_count;
    return a.user_login.localeCompare(b.user_login);
  });

  const now = typeof window !== 'undefined' ? Date.now() : 0;
  let snapshot: RankSnapshot | null = null;

  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(RANK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as RankSnapshot;
        if (parsed && typeof parsed.timestamp === 'number' && parsed.ranks && typeof parsed.ranks === 'object') {
          snapshot = parsed;
        }
      }
    } catch (err) {
      console.warn('rank snapshot parse error', err);
    }
  }

  const fresh = snapshot ? now - snapshot.timestamp <= RANK_STALE_WINDOW_MS : false;

  const ranked = decorated.map((row, index) => {
    const key = row.user_login.toLowerCase();
    const prevRank = snapshot?.ranks?.[key];
    let rankDelta: number | null = null;
    let rankIndicator: '▲' | '▼' | '—' = '—';

    if (typeof prevRank === 'number') {
      rankDelta = prevRank - (index + 1);
      if (fresh && rankDelta !== 0) {
        rankIndicator = rankDelta > 0 ? '▲' : '▼';
      }
    }

    return {
      ...row,
      rank: index + 1,
      rankDelta,
      rankIndicator,
    } satisfies RankedRow;
  });

  if (typeof window !== 'undefined') {
    const nextSnapshot: RankSnapshot = {
      timestamp: now,
      ranks: {},
    };
    ranked.forEach((row) => {
      const key = row.user_login.toLowerCase();
      if (key) {
        nextSnapshot.ranks[key] = row.rank;
      }
    });
    try {
      window.localStorage.setItem(RANK_STORAGE_KEY, JSON.stringify(nextSnapshot));
    } catch (err) {
      console.warn('rank snapshot store error', err);
    }
  }

  return ranked;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RankedRow[]>([]);
  const [displayNameMap, setDisplayNameMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isBlackout, setIsBlackout] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const [leaderboardResult, rosterResult, flags] = await Promise.all([
          fetchLeaderboardCR2025(),
          fetchRosterCR2025(),
          fetchDisplayFlags(),
        ]);

        if (cancelled) return;

        const leaderboardPayload: TripLeaderboardPayload = leaderboardResult.data ?? {
          rows: [],
          hasSilver: false,
          silverByLogin: {},
        };

        const rosterEntries = rosterResult.data ?? [];
        const rosterMap = rosterEntries.reduce<Record<string, string>>((acc, member) => {
          const key = member.user_login.toLowerCase();
          if (key) {
            acc[key] = member.display_name ?? member.user_login;
          }
          return acc;
        }, {});
        setDisplayNameMap(rosterMap);

        const mergedRows = mergeRosterAndLeaderboard(rosterEntries, leaderboardPayload.rows ?? []);
        const rankedRows = computeRankedRows(mergedRows, leaderboardPayload.hasSilver ?? false, leaderboardPayload.silverByLogin ?? {});
        setRows(rankedRows);

        const updatedIso = getLastUpdatedTs(leaderboardPayload.rows ?? []);
        setLastUpdated(updatedIso ? new Date(updatedIso) : null);

        const warningsList: string[] = [];
        if (leaderboardResult.missing) warningsList.push('Leaderboard view is unavailable.');
        if (rosterResult.missing) warningsList.push('Roster view is unavailable; display names limited.');
        setWarnings(warningsList);

        const errorMessages = [leaderboardResult.error?.message, rosterResult.error?.message]
          .filter((msg): msg is string => Boolean(msg));
        setError(errorMessages.length ? errorMessages.join('; ') : null);

        if (flags?.score_blackout_until) {
          setIsBlackout(new Date() < new Date(flags.score_blackout_until));
        } else {
          setIsBlackout(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch leaderboard:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const topLeaders = useMemo(
    () =>
      rows
        .filter((row) => row.effectiveTotal > 0)
        .slice(0, 3)
        .map((row) => row.user_login)
        .filter(Boolean),
    [rows],
  );

  const renderScoreBreakdown = (row: RankedRow) => {
    const baseTotal = row.obs_count + row.research_grade_count + row.bonus_points;

    if (row.silver) {
      const segments: { label: string; value: number }[] = [
        { label: 'Base observations', value: row.silver.base_obs },
        { label: 'Trip novelty', value: row.silver.novelty_trip },
        { label: 'Daily novelty', value: row.silver.novelty_day },
        { label: 'Rarity bonus', value: row.silver.rarity },
        { label: 'Research grade', value: row.silver.research },
        { label: 'Multiplier delta', value: row.silver.multipliers_delta },
      ];
      const total = row.silver.total_points;

      return (
        <div className="space-y-3">
          <div className="font-semibold text-foreground">Silver Score Breakdown</div>
          <ul className="space-y-1 text-xs">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center justify-between gap-3">
                <span>{segment.label}</span>
                <span className="font-mono">{formatPoints(segment.value)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatPoints(total)}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="font-semibold text-foreground">Base Score Breakdown</div>
        <div className="font-mono text-xs text-muted-foreground">
          {row.obs_count} + {row.research_grade_count} + {row.bonus_points} = {baseTotal}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip chip--info">Obs {row.obs_count}</span>
          <span className="chip chip--info">RG {row.research_grade_count}</span>
          <span className="chip chip--muted">Bonus {row.bonus_points}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">{formatPoints(baseTotal)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground italic">Spot it. Snap it. Score it.</p>
          {isBlackout && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary font-medium">🔒 Final reveal after blackout.</p>
            </div>
          )}
          {!loading && topLeaders.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 font-medium">
              🏅 leaders: {topLeaders.join(', ')}
            </div>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/about/scoring" className="text-sm text-primary hover:underline flex items-center gap-1">
              <Info className="h-4 w-4" />
              How scoring works
            </Link>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
              </span>
            )}
          </div>
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
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">Leaderboard error: {error}</p>
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
            {rows.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-lg font-semibold text-muted-foreground mb-2">
                  {isLive ? 'No leaderboard rows yet' : 'No leaderboard rows for the latest run.'}
                </p>
                {isLive && (
                  <p className="text-sm text-muted-foreground">First scoring run will populate this.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => {
                  const loginKey = row.user_login.toLowerCase();
                  const canonicalDisplay = displayNameMap[loginKey] ?? row.display_name ?? row.user_login;
                  const showSecondary = canonicalDisplay.toLowerCase() !== row.user_login.toLowerCase();
                  const scoreValue = row.effectiveTotal;
                  const hasIndicator = !isBlackout && row.rankIndicator !== '—' && (row.rankDelta ?? 0) !== 0;

                  const handleRowClick = () => {
                    navigate(`/user/${row.user_login}`);
                  };

                  return (
                    <div
                      key={row.user_login}
                      className="p-4 bg-card border rounded-lg flex items-center justify-between transition-shadow hover:shadow-lg"
                      onClick={handleRowClick}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleRowClick();
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-muted-foreground">#{row.rank}</div>
                          <span
                            className={`rank-change text-xs font-medium ${
                              hasIndicator
                                ? row.rankIndicator === '▲'
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                                : 'text-muted-foreground'
                            }`}
                            aria-label="rank change"
                          >
                            {hasIndicator ? (
                              <>
                                <span>{row.rankIndicator}</span>
                                <span>{Math.abs(row.rankDelta ?? 0)}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-lg text-foreground">{row.user_login}</div>
                          {showSecondary && (
                            <div className="text-xs text-muted-foreground">{canonicalDisplay}</div>
                          )}
                          <div className="flex gap-2 flex-wrap text-sm">
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="chip chip--info" aria-label="Observations">
                                  🔍 {row.obs_count}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs text-sm" align="start">
                                <div className="font-medium">Observations</div>
                                <p className="text-xs text-muted-foreground">
                                  Every observation counts for 1 point. Adults can also award extra bonus points.
                                </p>
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="chip chip--info" aria-label="Distinct taxa">
                                  🌿 {row.distinct_taxa}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs text-sm" align="start">
                                <div className="font-medium">Distinct species</div>
                                <p className="text-xs text-muted-foreground">
                                  Species totals break ties between players with the same points.
                                </p>
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger asChild>
                                <span className="chip chip--muted" aria-label="Research grade count">
                                  RG {row.research_grade_count}
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="max-w-xs text-sm" align="start">
                                <div className="font-medium">Research Grade</div>
                                <p className="text-xs text-muted-foreground">
                                  Each research-grade observation adds +1 bonus point to the total.
                                </p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-md px-1 text-right text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                              aria-label="Show point breakdown"
                            >
                              <span className="text-2xl font-bold leading-none">{formatPoints(scoreValue)}</span>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-72 text-sm" onClick={(event) => event.stopPropagation()}>
                            {renderScoreBreakdown(row)}
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Legend />
      </div>
    </div>
  );
}
