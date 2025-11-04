import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { formatPoints } from '@/lib/scoring';
import DeltaBadge from '@/components/DeltaBadge';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { loading, aggregated, startDate, endDate, initialize } = useAppState();

  useEffect(() => {
    initialize();
  }, []);

  const userScores = aggregated
    ? Array.from(aggregated.byUser.values()).sort((a, b) => b.points - a.points)
    : [];

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

        {/* Leaderboard table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : userScores.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {userScores.map((score, idx) => (
                    <tr 
                      key={score.login} 
                      className="border-b hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/user/${score.login}`)}
                    >
                      <td className="p-3">
                        <span className="font-bold text-lg">{idx + 1}</span>
                      </td>
                      <td className="p-3 font-medium">{score.login}</td>
                      <td className="p-3 text-right">{score.obsCount}</td>
                      <td className="p-3 text-right">{score.speciesCount}</td>
                      <td className="p-3 text-right">{score.researchCount}</td>
                      <td className="p-3 text-right font-bold text-primary">{formatPoints(score.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {userScores.map((score, idx) => (
                <div 
                  key={score.login} 
                  className="p-4 bg-card border rounded-lg space-y-2 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/user/${score.login}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-muted-foreground">#{idx + 1}</span>
                      <span className="font-semibold text-lg">{score.login}</span>
                    </div>
                    <span className="text-xl font-bold text-primary">{formatPoints(score.points)} pts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <div className="text-muted-foreground">Obs</div>
                      <div className="font-medium">{score.obsCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Species</div>
                      <div className="font-medium">{score.speciesCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Research</div>
                      <div className="font-medium">{score.researchCount}</div>
                    </div>
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
