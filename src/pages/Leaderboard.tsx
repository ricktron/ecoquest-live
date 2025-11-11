import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Info, Clock } from 'lucide-react';
import { formatPoints } from '@/lib/scoring';
import Legend from '@/components/Legend';
import {
  getTripLeaderboard,
  getTripBasePoints,
  fetchDisplayFlags,
  type TripLeaderboardRow,
} from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { isLive } from '@/lib/config/profile';

type RankedLeaderboardRow = TripLeaderboardRow & {
  rank: number;
  rankDelta: number | null;
  rankIndicator: '▲' | '▼' | '—';
};

type RankSnapshot = {
  timestamp: number;
  ranks: Record<string, number>;
};

const RANK_STORAGE_KEY = 'cr2025_rank_snapshot';
const RANK_STALE_WINDOW_MS = 60 * 60 * 1000;

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<RankedLeaderboardRow[]>([]);
  const [error, setError] = useState<{ message?: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isBlackout, setIsBlackout] = useState(false);
  const [rgByLogin, setRgByLogin] = useState<Record<string, number>>({});

  const computeRankedRows = (rows: TripLeaderboardRow[]): RankedLeaderboardRow[] => {
    const sorted = [...rows]
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
      .map((row, idx) => ({
        ...row,
        rank: idx + 1,
        rankDelta: null,
        rankIndicator: '—' as const,
      }));

    if (typeof window === 'undefined') {
      return sorted;
    }

    let snapshot: RankSnapshot | null = null;
    try {
      const raw = window.localStorage.getItem(RANK_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const candidate = parsed as RankSnapshot;
          if (typeof candidate.timestamp === 'number' && candidate.ranks && typeof candidate.ranks === 'object') {
            snapshot = candidate;
          }
        }
      }
    } catch (err) {
      console.warn('rank snapshot parse error', err);
    }

    const now = Date.now();

    const isFresh = snapshot ? now - snapshot.timestamp <= RANK_STALE_WINDOW_MS : false;

    const annotated = sorted.map((row) => {
      const key = row.user_login.toLowerCase();
      const prevRank = snapshot?.ranks?.[key];
      let rankDelta: number | null = null;
      let rankIndicator: '▲' | '▼' | '—' = '—';

      if (typeof prevRank === 'number') {
        rankDelta = prevRank - row.rank;
        if (isFresh && rankDelta !== 0) {
          if (rankDelta > 0) {
            rankIndicator = '▲';
          } else if (rankDelta < 0) {
            rankIndicator = '▼';
          }
        }
      }

      return { ...row, rankDelta, rankIndicator };
    });

    const nextSnapshot: RankSnapshot = {
      timestamp: now,
      ranks: {},
    };
    annotated.forEach((row) => {
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

    return annotated;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [leaderboardResult, baseResult, flags] = await Promise.all([
          getTripLeaderboard(),
          getTripBasePoints(),
          fetchDisplayFlags(),
        ]);
        setLeaderboardData(computeRankedRows(leaderboardResult.data));

        const rgCounts = (baseResult.data ?? []).reduce<Record<string, { total: number; research: number }>>((acc, row) => {
          const key = row.user_login.toLowerCase();
          if (!key) return acc;
          const bucket = acc[key] ?? { total: 0, research: 0 };
          bucket.total += 1;
          if ((row.quality_grade ?? '').toLowerCase() === 'research') {
            bucket.research += 1;
          }
          acc[key] = bucket;
          return acc;
        }, {});

        const rgPercentages = Object.entries(rgCounts).reduce<Record<string, number>>((acc, [key, value]) => {
          if (value.total > 0) {
            acc[key] = Math.round((value.research / value.total) * 100);
          }
          return acc;
        }, {});
        setRgByLogin(rgPercentages);

        const errors: string[] = [];
        if (leaderboardResult.error?.message) errors.push(leaderboardResult.error.message);
        if (baseResult.error?.message) errors.push(baseResult.error.message);
        setError(errors.length ? { message: errors.join('; ') } : null);

        if (!leaderboardResult.error) {
          setLastUpdated(new Date());
        }
        // Check if blackout is active
        if (flags.score_blackout_until) {
          setIsBlackout(new Date() < new Date(flags.score_blackout_until));
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        if (err instanceof Error) {
          setError({ message: err.message });
        } else {
          setError({ message: String(err) });
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const rows = leaderboardData;
  const topLeaders = rows
    .slice(0, 3)
    .map(row => row.display_name || row.user_login)
    .filter((name): name is string => Boolean(name));

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
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  Leaderboard error: {error.message || JSON.stringify(error)}
                </p>
              </div>
            )}
            {!rows || rows.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-lg font-semibold text-muted-foreground mb-2">
                  {isLive ? 'No leaderboard rows yet' : 'No leaderboard rows for the latest run.'}
                </p>
                {isLive && (
                  <p className="text-sm text-muted-foreground">
                    First scoring run will populate this.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => {
                  const score = row.total_points;
                  const totalObservations = row.obs_count;
                  const speciesCount = row.distinct_taxa;
                  const displayName = row.display_name || row.user_login;
                  const rowKey = row.user_login;
                  const hasIndicator = !isBlackout && row.rankIndicator !== '—' && row.rankDelta != null && row.rankDelta !== 0;
                  const rgKey = row.user_login.toLowerCase();
                  const rgPercent = rgByLogin[rgKey];
                  const checkCount = typeof rgPercent === 'number' ? Math.min(5, Math.max(0, Math.round(rgPercent / 20))) : 0;
                  const checkMarks = checkCount > 0 ? '✅'.repeat(checkCount) : '';

                  return (
                    <div
                      key={rowKey}
                      className="p-4 bg-card border rounded-lg flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow group"
                      onClick={() => navigate(`/user/${row.user_login}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="text-2xl font-bold text-muted-foreground">
                            #{row.rank}
                          </div>
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
                          <div className="font-semibold text-lg">{displayName}</div>
                          <div className="flex gap-2 flex-wrap text-sm">
                            <span className="chip chip--info">🔍 {totalObservations}</span>
                            <span className="chip chip--info">🌿 {speciesCount}</span>
                            {totalObservations > 0 && typeof rgPercent === 'number' && (
                              <span className="chip chip--muted">
                                RG {rgPercent}%{checkMarks ? ` ${checkMarks}` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold text-primary">
                          {formatPoints(score)}
                        </div>
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
