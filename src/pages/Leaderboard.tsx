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

export default function Leaderboard() {
  const navigate = useNavigate();
  const { loading, aggregated, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const current = useMemo<UserRowWithRank[]>(() => {
    if (!aggregated) return [];
    return Array.from(aggregated.byUser.values())
      .sort((a, b) => b.points - a.points)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [aggregated]);

  // TODO: Fetch prior period for trends (24h ago or yesterday)
  const prior = useMemo<UserRowWithRank[]>(() => {
    return [];
  }, []);

  const rows = useMemo(() => computeTrends(current, prior), [current, prior]);

  const closeBattles = useMemo(() => {
    return findCloseBattles(current);
  }, [current]);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <div className="flex items-center gap-2">
            <Link to="/about/scoring" className="text-sm text-primary hover:underline flex items-center gap-1">
              <Info className="h-4 w-4" />
              How scoring works
            </Link>
          </div>
        </div>

        {/* Who's Close Panel */}
        {closeBattles.length > 0 && (
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-2 text-sm">Who's Close?</h3>
            <div className="space-y-1 text-sm">
              {closeBattles.map((b, i) => (
                <div key={i}>
                  <span className="font-medium">{b.a.login}</span> vs{' '}
                  <span className="font-medium">{b.b.login}</span>{' '}
                  <span className="text-muted-foreground">(Δ{b.d.toFixed(2)} pts)</span>
                </div>
              ))}
            </div>
          </Card>
        )}

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
            {rows.map((row, idx) => (
              <div
                key={row.login}
                className="p-4 bg-card border rounded-lg flex items-center justify-between cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate(`/user/${row.login}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-8">
                    #{idx + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">{row.login}</div>
                    <div className="flex gap-2 flex-wrap">
                      <Chip variant="default" title={`${row.obsCount} total observations`}>
                        🔍 {row.obsCount}
                      </Chip>
                      <Chip variant="primary" title={`${row.speciesCount} unique species`}>
                        🌿 {row.speciesCount}
                      </Chip>
                      {row.researchCount > 0 && (
                        <Chip variant="secondary" title={`${row.researchCount} research-grade observations`}>
                          ✅ {row.researchCount}
                        </Chip>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Trend column */}
                  {row.trend.pts !== 0 && (
                    <div className={`text-sm font-medium ${row.trend.pts > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {row.trend.pts > 0 ? '+' : ''}{row.trend.pts}
                    </div>
                  )}
                  <div className="text-2xl font-bold text-primary">
                    {formatPoints(row.points)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Legend />
      </div>
    </div>
  );
}
