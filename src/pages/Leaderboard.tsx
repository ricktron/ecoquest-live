import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Info, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Legend from '@/components/Legend';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatPoints } from '@/lib/scoring';
import {
  diffLeaderboard,
  fetchDisplayFlags,
  getLeaderboardCR2025,
  getLeaderboardHashCR2025,
  getSilverRow,
  getLastUpdatedTs,
  type LBRow,
  type TripLeaderboardPayload,
  type TripLeaderboardRow,
  type TripSilverBreakdown,
} from '@/lib/api';
import { isLive } from '@/lib/config/profile';
import { supabase } from '@/lib/supabaseClient';

const SNAP_KEY = 'EQL_RANK_SNAPSHOT_CR2025';
const SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;
const HASH_POLL_MS = 45 * 1000;
const MISSING_VIEW_WARNING = 'Leaderboard view is unavailable.';
const FADE_FLOOR = 0.35;
const FADE_WINDOW_MIN = 10;

type RankSnapshot = {
  at: number;
  ranks: Record<string, number>;
  lastChangeAt: Record<string, number>;
};

function deltaOpacity(changedAt?: number) {
  if (!changedAt) return 1;
  const mins = Math.max(0, (Date.now() - changedAt) / 60000);
  return Math.max(FADE_FLOOR, 1 - (mins / FADE_WINDOW_MIN) * (1 - FADE_FLOOR));
}

type RankedRow = TripLeaderboardRow & {
  rank: number;
  effectiveTotal: number;
};

function computeRankedRows(rows: TripLeaderboardRow[]): RankedRow[] {
  const decorated = rows.map((row) => {
    const effectiveTotal = row.silverBreakdown?.total_points ?? row.total_points;
    return {
      ...row,
      effectiveTotal,
      rank: 0,
    } satisfies RankedRow;
  });

  decorated.sort((a, b) => {
    if (b.effectiveTotal !== a.effectiveTotal) return b.effectiveTotal - a.effectiveTotal;
    if (b.species_count !== a.species_count) return b.species_count - a.species_count;
    if (b.obs_count !== a.obs_count) return b.obs_count - a.obs_count;
    return a.user_login.localeCompare(b.user_login);
  });

  return decorated.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [baseRows, setBaseRows] = useState<TripLeaderboardRow[]>([]);
  const [rankDeltas, setRankDeltas] = useState<Record<string, number>>({});
  const [showRankIndicators, setShowRankIndicators] = useState(false);
  const [hasSilver, setHasSilver] = useState(false);
  const [silverCache, setSilverCache] = useState<Record<string, TripSilverBreakdown>>({});
  const [silverLoading, setSilverLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isBlackout, setIsBlackout] = useState(false);
  const [heartbeat, setHeartbeat] = useState(0);
  const [lastChangeAt, setLastChangeAt] = useState<Record<string, number>>({});
  const [lbHash, setLbHash] = useState<string | null>(null);
  const [hashComputedAt, setHashComputedAt] = useState<string | null>(null);
  const [lastHashCheck, setLastHashCheck] = useState<Date | null>(null);
  const [pulseVersion, setPulseVersion] = useState(0);
  const [changedSinceRefresh, setChangedSinceRefresh] = useState<
    Map<string, { obs?: number; spp?: number; rg?: number; bonus?: number; total?: number }>
  >(() => new Map());

  const showUpdatedPulse = pulseVersion > 0;
  const isDev = import.meta.env.DEV;

  const rows = useMemo(() => computeRankedRows(baseRows), [baseRows]);

  const toLBRows = useCallback((list: TripLeaderboardRow[]): LBRow[] => {
    return list.map((row) => {
      const obs = row.obs_count ?? 0;
      const research = row.research_grade_count ?? row.research_count ?? 0;
      const bonus = row.bonus_points ?? row.adult_points ?? 0;
      return {
        user_login: row.user_login,
        obs_count: obs,
        distinct_taxa: row.distinct_taxa ?? row.species_count ?? 0,
        research_grade_count: research,
        bonus_points: bonus,
        total_points: row.total_points ?? row.silverBreakdown?.total_points ?? obs + research + bonus,
      } satisfies LBRow;
    });
  }, []);

  useEffect(() => {
    const iso = getLastUpdatedTs(baseRows);
    setLastUpdated(iso ? new Date(iso) : null);
  }, [baseRows]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const client = supabase();
        const [leaderboardResult, flags, hash] = await Promise.all([
          getLeaderboardCR2025(),
          fetchDisplayFlags(),
          getLeaderboardHashCR2025(client),
        ]);

        if (cancelled) return;

        const leaderboardPayload: TripLeaderboardPayload = leaderboardResult.data ?? {
          rows: [],
          hasSilver: false,
          lastUpdatedAt: null,
        };

        const payloadRows = leaderboardPayload.rows ?? [];
        setBaseRows(payloadRows);
        setHasSilver(Boolean(leaderboardPayload.hasSilver));

        const initialSilver = payloadRows.reduce<Record<string, TripSilverBreakdown>>((acc, row) => {
          if (row.silverBreakdown) {
            acc[row.user_login.toLowerCase()] = row.silverBreakdown;
          }
          return acc;
        }, {});
        setSilverCache(initialSilver);
        setSilverLoading({});
        setLbHash(hash.lb_hash ?? null);
        setHashComputedAt(hash.computed_utc ?? null);
        setLastHashCheck(new Date());
        setChangedSinceRefresh(new Map());
        setPulseVersion(0);

        const warningsList: string[] = [];
        if (leaderboardResult.missing) warningsList.push(MISSING_VIEW_WARNING);
        setWarnings(warningsList);

        const errorMessages = [leaderboardResult.error?.message]
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

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const id = window.setInterval(() => {
      setHeartbeat((prev) => prev + 1);
    }, HEARTBEAT_MS);
    return () => {
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (pulseVersion === 0) return undefined;
    if (typeof window === 'undefined') return undefined;
    const timeout = window.setTimeout(() => {
      setPulseVersion(0);
      setChangedSinceRefresh(new Map());
    }, 4000);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [pulseVersion]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    let cancelled = false;
    const client = supabase();

    const syncMissingWarning = (missing?: boolean) => {
      setWarnings((prev) => {
        const has = prev.includes(MISSING_VIEW_WARNING);
        if (missing) {
          if (has) return prev;
          return [...prev, MISSING_VIEW_WARNING];
        }
        if (!has) return prev;
        return prev.filter((message) => message !== MISSING_VIEW_WARNING);
      });
    };

    const tick = async () => {
      try {
        const hash = await getLeaderboardHashCR2025(client);
        if (cancelled) return;
        setLastHashCheck(new Date());
        setHashComputedAt(hash.computed_utc ?? null);

        const nextHash = hash.lb_hash ?? null;
        if (!nextHash) {
          setLbHash(null);
          setChangedSinceRefresh(new Map());
          return;
        }
        if (nextHash === lbHash) return;

        const leaderboardResult = await getLeaderboardCR2025();
        if (cancelled) return;

        const leaderboardPayload: TripLeaderboardPayload = leaderboardResult.data ?? {
          rows: [],
          hasSilver: false,
          lastUpdatedAt: null,
        };
        const payloadRows = leaderboardPayload.rows ?? [];

        const diffs = diffLeaderboard(toLBRows(baseRows), toLBRows(payloadRows));
        setChangedSinceRefresh(new Map(diffs));
        setBaseRows(payloadRows);
        setHasSilver(Boolean(leaderboardPayload.hasSilver));

        const silverFromRows = payloadRows.reduce<Record<string, TripSilverBreakdown>>((acc, row) => {
          if (row.silverBreakdown) {
            acc[row.user_login.toLowerCase()] = row.silverBreakdown;
          }
          return acc;
        }, {});
        if (Object.keys(silverFromRows).length > 0) {
          setSilverCache((prev) => ({ ...prev, ...silverFromRows }));
        }

        syncMissingWarning(leaderboardResult.missing);
        const errorMessages = [leaderboardResult.error?.message]
          .filter((msg): msg is string => Boolean(msg));
        setError(errorMessages.length ? errorMessages.join('; ') : null);

        setLbHash(nextHash);
        setPulseVersion((prev) => prev + 1);
      } catch (err) {
        if (!cancelled) {
          console.warn('Leaderboard hash poll failed', err);
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void tick();
    }, HASH_POLL_MS);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [baseRows, lbHash, toLBRows]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rows.length) {
      setRankDeltas({});
      setShowRankIndicators(false);
      setLastChangeAt({});
      return;
    }

    const now = Date.now();
    const currentRanks = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.user_login] = row.rank;
      return acc;
    }, {});

    const raw = window.localStorage.getItem(SNAP_KEY);
    let snapshot: RankSnapshot | null = null;
    try {
      snapshot = raw ? (JSON.parse(raw) as RankSnapshot) : null;
    } catch {
      snapshot = null;
    }

    const createSnapshot = () => {
      const nextSnapshot: RankSnapshot = { at: now, ranks: currentRanks, lastChangeAt: {} };
      try {
        window.localStorage.setItem(SNAP_KEY, JSON.stringify(nextSnapshot));
      } catch {
        // Ignore quota/storage errors
      }
      setRankDeltas({});
      setShowRankIndicators(false);
      setLastChangeAt({});
    };

    if (!snapshot) {
      createSnapshot();
      return;
    }

    const prevRanks = snapshot.ranks ?? {};
    const prevLogins = Object.keys(prevRanks);
    const currentLogins = Object.keys(currentRanks);
    const hasRosterChange =
      prevLogins.length !== currentLogins.length ||
      currentLogins.some((login) => !(login in prevRanks)) ||
      prevLogins.some((login) => !(login in currentRanks));

    if (hasRosterChange) {
      createSnapshot();
      return;
    }

    const lastMap = { ...(snapshot.lastChangeAt ?? {}) };
    const deltas: Record<string, number> = {};
    rows.forEach((row) => {
      const login = row.user_login;
      const previousRank = prevRanks[login];
      const delta = previousRank == null ? 0 : previousRank - row.rank;
      deltas[login] = delta;
      if (delta !== 0) {
        lastMap[login] = now;
      }
    });

    setRankDeltas(deltas);
    setLastChangeAt(lastMap);

    const elapsed = now - (snapshot.at ?? 0);
    const thresholdReached = snapshot.at != null && elapsed >= SNAPSHOT_INTERVAL_MS;
    setShowRankIndicators(thresholdReached);

    const nextSnapshot: RankSnapshot = thresholdReached
      ? { at: now, ranks: currentRanks, lastChangeAt: lastMap }
      : { at: snapshot.at ?? now, ranks: snapshot.ranks ?? {}, lastChangeAt: lastMap };

    try {
      window.localStorage.setItem(SNAP_KEY, JSON.stringify(nextSnapshot));
    } catch {
      // Ignore quota/storage errors
    }
  }, [rows, heartbeat]);

  const ensureSilverBreakdown = async (row: TripLeaderboardRow) => {
    if (!hasSilver) return null;
    const key = row.user_login.toLowerCase();
    if (silverCache[key]) return silverCache[key];
    if (silverLoading[key]) return null;

    setSilverLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await getSilverRow(row.user_login);
      const breakdown = result.data ?? null;
      if (breakdown) {
        setSilverCache((prev) => ({ ...prev, [key]: breakdown }));
        setBaseRows((prev) =>
          prev.map((existing) =>
            existing.user_login.toLowerCase() === key
              ? {
                  ...existing,
                  silverBreakdown: breakdown,
                  last_observed_at_utc: breakdown.last_observed_at_utc ?? existing.last_observed_at_utc,
                }
              : existing,
          ),
        );
      }
      return breakdown;
    } finally {
      setSilverLoading((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const renderScoreBreakdown = (row: RankedRow) => {
    const key = row.user_login.toLowerCase();
    const breakdown = silverCache[key] ?? row.silverBreakdown ?? null;
    const loading = silverLoading[key];
    const researchCount = row.research_count ?? row.research_grade_count;
    const adultPoints = row.adult_points ?? row.bonus_points ?? 0;
    const baseTotal = row.obs_count + researchCount + adultPoints;

    if (loading) {
      return <div className="text-sm text-muted-foreground">Loading silver breakdown…</div>;
    }

    if (breakdown) {
      const segments: { label: string; value: number }[] = [
        { label: 'Base observations', value: breakdown.base_obs },
        { label: 'Research grade', value: breakdown.research },
        { label: 'Daily novelty', value: breakdown.novelty_day },
        { label: 'Trip novelty', value: breakdown.novelty_trip },
        { label: 'Rarity bonus', value: breakdown.rarity },
        { label: 'Multiplier delta', value: breakdown.multipliers_delta },
      ];

      return (
        <div className="space-y-3">
          <div className="font-semibold text-foreground">Silver Score Breakdown</div>
          <table className="w-full text-xs">
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.label}>
                  <td className="py-1 pr-3 text-muted-foreground">{segment.label}</td>
                  <td className="py-1 text-right font-mono">{formatPoints(segment.value)}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-2 text-sm font-semibold">Total</td>
                <td className="pt-2 text-right font-mono text-sm font-semibold">
                  {formatPoints(breakdown.total_points)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="font-semibold text-foreground">Base Score Breakdown</div>
        <div className="font-mono text-xs text-muted-foreground">
          {row.obs_count} + {researchCount} + {adultPoints} = {baseTotal}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip chip--info">Obs {row.obs_count}</span>
          <span className="chip chip--info">RG {researchCount}</span>
          <span className="chip chip--muted">Adult points {adultPoints}</span>
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
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/about/scoring" className="text-sm text-primary hover:underline flex items-center gap-1">
              <Info className="h-4 w-4" />
              How scoring works
            </Link>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
                {showUpdatedPulse && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600 updated-pulse"
                    role="status"
                    aria-live="polite"
                  >
                    <span aria-hidden="true" className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    Leaderboard updated · Live
                  </span>
                )}
              </span>
            )}
          </div>
          {isDev && (
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Hash: {lbHash ?? '—'} · Last check:
              {' '}
              {lastHashCheck ? formatDistanceToNow(lastHashCheck, { addSuffix: true }) : '—'}
              {hashComputedAt
                ? ` · Computed ${formatDistanceToNow(new Date(hashComputedAt), { addSuffix: true })}`
                : ''}
            </div>
          )}
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
                  const primaryName = row.nameForUi;
                  const showSecondary = primaryName.toLowerCase() !== row.user_login.toLowerCase();
                  const scoreValue = row.effectiveTotal;
                  const delta = rankDeltas[row.user_login] ?? 0;
                  const indicator = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
                  const hasIndicator = !isBlackout && showRankIndicators && delta !== 0;
                  const indicatorMagnitude = Math.abs(delta);
                  const arrowStyle = { opacity: deltaOpacity(lastChangeAt[row.user_login]) };
                  const adultPoints = row.adult_points ?? row.bonus_points ?? 0;
                  const researchCount = row.research_count ?? row.research_grade_count ?? 0;
                  const change = changedSinceRefresh.get(row.user_login);
                  const rowChanged = Boolean(change);
                  const formatDelta = (value: number | undefined, label: string) => {
                    if (!value) return null;
                    const prefix = value > 0 ? '+' : '';
                    return `${prefix}${value} ${label}`;
                  };
                  const deltaBadges = change
                    ? [
                        formatDelta(change.obs, 'obs'),
                        formatDelta(change.rg, 'RG'),
                        formatDelta(change.spp, 'spp'),
                        formatDelta(change.bonus, 'bonus'),
                        formatDelta(change.total, 'total'),
                      ].filter((value): value is string => Boolean(value))
                    : [];

                  const metricChips = [
                    {
                      key: 'obs',
                      label: `🔍 ${row.obs_count}`,
                      ariaLabel: 'Observations',
                      title: 'Observations',
                      description: 'Count of all trip observations.',
                      className:
                        'chip chip--info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
                    },
                    {
                      key: 'species',
                      label: `🌿 ${row.species_count}`,
                      ariaLabel: 'Distinct taxa',
                      title: 'Distinct species',
                      description: 'Distinct taxa observed.',
                      className:
                        'chip chip--info focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
                    },
                    {
                      key: 'rg',
                      label: `RG ${researchCount}`,
                      ariaLabel: 'Research grade count',
                      title: 'Research Grade',
                      description: 'Research-grade observations.',
                      className:
                        'chip chip--muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
                    },
                  ];

                  if (adultPoints > 0) {
                    metricChips.push({
                      key: 'adult',
                      label: `⭐ ${adultPoints}`,
                      ariaLabel: 'Adult-awarded points',
                      title: 'Adult-awarded points',
                      description:
                        'Points granted by trip adults for sportsmanship, helpfulness, or notable field contributions.',
                      className:
                        'chip chip--trophy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
                    });
                  }

                  const stopChipClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                  };

                  const handleChipKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.stopPropagation();
                    }
                  };

                  const handleRowClick = () => {
                    navigate(`/user/${row.user_login}`);
                  };

                  return (
                    <div
                      key={row.user_login}
                      className={`p-4 border rounded-lg flex items-center justify-between transition-shadow hover:shadow-lg ${
                        rowChanged ? 'bg-emerald-50/80 border-emerald-300 updated-pulse' : 'bg-card'
                      }`}
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
                                ? indicator === '▲'
                                  ? 'text-emerald-600'
                                  : 'text-rose-600'
                                : 'text-muted-foreground'
                            }`}
                            aria-label="rank change"
                          >
                            {!showRankIndicators || isBlackout ? (
                              ' '
                            ) : hasIndicator ? (
                              <>
                                <span style={arrowStyle}>{indicator}</span>
                                <span>{indicatorMagnitude}</span>
                              </>
                            ) : (
                              '—'
                            )}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="font-semibold text-lg text-foreground">{primaryName}</div>
                          {showSecondary && (
                            <div className="text-xs text-muted-foreground">{row.user_login}</div>
                          )}
                          <div className="flex gap-2 flex-wrap text-sm">
                            {metricChips.map((chip) => (
                              <Popover key={chip.key}>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={chip.className}
                                    aria-label={chip.ariaLabel}
                                    title={chip.title}
                                    onClick={stopChipClick}
                                    onKeyDown={handleChipKeyDown}
                                  >
                                    {chip.label}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="max-w-xs text-sm" align="start">
                                  <div className="font-medium">{chip.title}</div>
                                  <p className="text-xs text-muted-foreground">{chip.description}</p>
                                </PopoverContent>
                              </Popover>
                            ))}
                          </div>
                          {deltaBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 text-xs font-semibold text-emerald-700">
                              {deltaBadges.map((badge) => (
                                <span
                                  key={badge}
                                  className="rounded-full bg-emerald-100/80 px-2 py-0.5"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Popover
                          onOpenChange={(open) => {
                            if (open) {
                              ensureSilverBreakdown(row);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1 rounded-md px-1 text-right text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => event.stopPropagation()}
                              aria-label="Show point breakdown"
                            >
                              <span className="text-2xl font-bold leading-none">{formatPoints(scoreValue)}</span>
                              <span className="text-xs text-muted-foreground">ⓘ</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-72 text-sm" onClick={(event) => event.stopPropagation()}>
                            {renderScoreBreakdown(row)}
                          </PopoverContent>
                        </Popover>
                        {change?.total && (
                          <div className="text-xs font-semibold text-emerald-700" aria-live="polite">
                            {change.total > 0 ? '+' : ''}
                            {change.total} total
                          </div>
                        )}
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
