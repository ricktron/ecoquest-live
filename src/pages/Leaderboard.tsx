import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Info } from 'lucide-react';
import { formatPoints, computeTrends, type UserRowWithTrend, type UserRowWithRank } from '@/lib/scoring';
import { findCloseBattles } from '@/lib/closeBattles';
import { UI } from '@/uiConfig';
import Chip from '@/components/Chip';
import Legend from '@/components/Legend';
import { Card, CardContent } from '@/components/ui/card';
import { fetchLeaderboard, type LeaderRow } from '@/lib/api';
import { DEFAULT_AID } from '@/lib/supabase';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderRow[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data } = await fetchLeaderboard();
        setLeaderboardData(data);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const rows = leaderboardData;

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground italic">Spot it. Snap it. Score it.</p>
          <div className="flex items-center gap-2">
            <Link to="/about/scoring" className="text-sm text-primary hover:underline flex items-center gap-1">
              <Info className="h-4 w-4" />
              How scoring works
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No observations found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const d = row.rank_delta;
              const trend = d == null ? '–' : d < 0 ? '↑' : d > 0 ? '↓' : '–';
              const trendClass = d == null ? '' : d < 0 ? 'trend trend--up' : d > 0 ? 'trend trend--down' : '';
              const score = row.score ?? row.total_score ?? row.score_total ?? row.obs_count ?? 0;
              
              return (
                <div
                  key={row.user_login}
                  className="p-4 bg-card border rounded-lg flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow group"
                  onClick={() => row.display_name && navigate(`/user/${row.display_name}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="text-2xl font-bold text-muted-foreground w-8">
                        #{row.rank ?? idx + 1}
                      </div>
                      {trendClass ? (
                        <span className={trendClass} title={`Rank change: ${d}`}>
                          {trend}
                        </span>
                      ) : (
                        <span className="text-muted-foreground" title="No rank change data">
                          {trend}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">{row.display_name || row.user_login}</div>
                      <div className="flex gap-2 flex-wrap">
                        <Chip variant="default" title={`${row.obs_count ?? 0} total observations`}>
                          🔍 {row.obs_count ?? 0}
                        </Chip>
                        <Chip variant="primary" title={`${row.distinct_taxa ?? 0} unique species`}>
                          🌿 {row.distinct_taxa ?? 0}
                        </Chip>
                        {(row.bingo_points ?? 0) > 0 && (
                          <span className="chip chip--bingo" title="Bingo points (hits + lines + blackout)">
                            🎯 {row.bingo_points}
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

        <Legend />
      </div>
    </div>
  );
}
