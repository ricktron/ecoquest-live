import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { formatPoints, computeTrends, type UserRowWithTrend } from '@/lib/scoring';
import { findCloseBattles } from '@/lib/closeBattles';
import { UI } from '@/uiConfig';
import Chip from '@/components/Chip';
import { Card, CardContent } from '@/components/ui/card';
import dayjs from 'dayjs';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { loading, aggregated, startDate, endDate, initialize, fetchPriorPeriod, observations, lastInatSync } = useAppState();
  const [userScoresWithTrend, setUserScoresWithTrend] = useState<UserRowWithTrend[]>([]);
  const [closeBattles, setCloseBattles] = useState<ReturnType<typeof findCloseBattles>>([]);
  const [showOfflineHint, setShowOfflineHint] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!aggregated) return;

    const currentRows = Array.from(aggregated.byUser.values())
      .sort((a, b) => b.points - a.points)
      .map((user, idx) => ({ ...user, rank: idx + 1 }));

    // Compute trends vs prior period
    fetchPriorPeriod(UI.trendWindowDays).then(priorAgg => {
      if (priorAgg) {
        const priorRows = Array.from(priorAgg.byUser.values())
          .sort((a, b) => b.points - a.points)
          .map((user, idx) => ({ ...user, rank: idx + 1 }));
        
        const withTrends = computeTrends(currentRows, priorRows);
        setUserScoresWithTrend(withTrends);
        
        // Compute close battles
        const battles = findCloseBattles(withTrends);
        setCloseBattles(battles);
      } else {
        // No prior data, just use current without trends
        setUserScoresWithTrend(currentRows.map(r => ({ ...r, trend: { rank: 0, pts: 0 } })));
        setCloseBattles(findCloseBattles(currentRows));
      }
    });

    // Check for offline hint
    const now = Date.now();
    const hasRecentUploads = observations.some(obs => {
      const created = dayjs(obs.observedOn).valueOf();
      const observed = dayjs(obs.timeObservedAt || obs.observedOn).valueOf();
      return Math.abs(created - observed) > 30 * 60 * 1000; // >30min difference
    });
    
    const recentSync = lastInatSync && (now - lastInatSync < 15 * 60 * 1000); // <15min
    setShowOfflineHint(recentSync && hasRecentUploads);
  }, [aggregated, observations, lastInatSync]);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Showing results from {startDate} to {endDate}
          </p>
        </div>

        {/* Date controls */}
        <DateRange />

        {/* Offline hint */}
        {showOfflineHint && (
          <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Heads up: uploads may still be syncing to iNaturalist, scores will update shortly.</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Close battles widget */}
        {!loading && closeBattles.length > 0 && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-3 px-4">
              <div className="text-sm font-semibold mb-2">🔥 Who's Close:</div>
              <div className="space-y-1 text-sm">
                {closeBattles.map((battle, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-muted-foreground">{idx + 1})</span>
                    <span
                      className="font-medium hover:underline cursor-pointer"
                      onClick={() => navigate(`/user/${battle.a.login}`)}
                    >
                      {UI.showAliases && UI.aliases[battle.a.login] ? UI.aliases[battle.a.login] : battle.a.login}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span
                      className="font-medium hover:underline cursor-pointer"
                      onClick={() => navigate(`/user/${battle.b.login}`)}
                    >
                      {UI.showAliases && UI.aliases[battle.b.login] ? UI.aliases[battle.b.login] : battle.b.login}
                    </span>
                    <span className="text-xs text-muted-foreground">(Δ{formatPoints(battle.d)} pts)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : userScoresWithTrend.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No observations found in this date range.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Rank</th>
                    <th className="text-left p-3 font-semibold">User</th>
                    <th className="text-right p-3 font-semibold">Obs</th>
                    <th className="text-right p-3 font-semibold">Species</th>
                    <th className="text-right p-3 font-semibold">Research</th>
                    <th className="text-right p-3 font-semibold">Points</th>
                    <th className="text-center p-3 font-semibold">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {userScoresWithTrend.map((score) => (
                    <tr 
                      key={score.login} 
                      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/user/${score.login}`)}
                    >
                      <td className="p-3">
                        <span className="font-bold text-lg">{score.rank}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">
                          {UI.showAliases && UI.aliases[score.login] ? UI.aliases[score.login] : score.login}
                        </div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Chip variant="default">🐾 {score.speciesCount}</Chip>
                          <Chip variant="default">{score.obsCount} obs</Chip>
                        </div>
                      </td>
                      <td className="p-3 text-right">{score.obsCount}</td>
                      <td className="p-3 text-right">{score.speciesCount}</td>
                      <td className="p-3 text-right">{score.researchCount}</td>
                      <td className="p-3 text-right">
                        <div className="font-bold text-primary">{formatPoints(score.points)}</div>
                        {score.trend.pts !== 0 && (
                          <div className={`text-xs ${score.trend.pts > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {score.trend.pts > 0 ? '+' : ''}{formatPoints(score.trend.pts)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {score.trend.rank > 0 ? (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-medium">+{score.trend.rank}</span>
                          </div>
                        ) : score.trend.rank < 0 ? (
                          <div className="flex items-center justify-center gap-1 text-red-600">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-sm font-medium">{score.trend.rank}</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-muted-foreground">
                            <Minus className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {userScoresWithTrend.map((score) => (
                <div 
                  key={score.login} 
                  className="p-4 bg-card border rounded-lg space-y-2 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/user/${score.login}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">#{score.rank}</span>
                      <div>
                        <div className="font-semibold text-lg">
                          {UI.showAliases && UI.aliases[score.login] ? UI.aliases[score.login] : score.login}
                        </div>
                        {score.trend.rank !== 0 && (
                          <div className={`flex items-center gap-1 text-xs ${score.trend.rank > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {score.trend.rank > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3" />
                                <span>+{score.trend.rank}</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-3 w-3" />
                                <span>{score.trend.rank}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">{formatPoints(score.points)}</div>
                      {score.trend.pts !== 0 && (
                        <div className={`text-xs ${score.trend.pts > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {score.trend.pts > 0 ? '+' : ''}{formatPoints(score.trend.pts)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Chip variant="primary">🐾 {score.speciesCount}</Chip>
                    <Chip variant="default">{score.obsCount} obs</Chip>
                    <Chip variant="default">✓ {score.researchCount}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
