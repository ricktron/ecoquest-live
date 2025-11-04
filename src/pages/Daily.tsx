import { useEffect, useState } from 'react';
import { useAppState } from '@/lib/state';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { formatPoints } from '@/lib/scoring';

export default function Daily() {
  const { loading, aggregated, initialize } = useAppState();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    initialize();
  }, []);

  const dailyScores = aggregated
    ? Array.from(aggregated.byDay.values()).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  const toggleExpand = (date: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Get top 5 contributors for a given day (placeholder)
  const getTopContributors = (date: string) => {
    // TODO: Aggregate per-user stats for this specific day
    return ['alice', 'bob', 'charlie'].slice(0, 3);
  };

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Daily Rollup
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily observation totals and top contributors
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : dailyScores.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No data available for this date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyScores.map(day => {
              const isExpanded = expanded.has(day.date);
              return (
                <div key={day.date} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleExpand(day.date)}
                    className="w-full p-4 bg-card hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-semibold">{day.date}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Obs: </span>
                        <span className="font-medium">{day.obsCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Species: </span>
                        <span className="font-medium">{day.speciesCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Participants: </span>
                        <span className="font-medium">{day.participants.size}</span>
                      </div>
                      <div className="font-bold text-primary">{formatPoints(day.points)} pts</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-muted/30 border-t space-y-2">
                      <div className="text-sm font-semibold">Top Contributors:</div>
                      <ul className="text-sm space-y-1">
                        {getTopContributors(day.date).map(login => (
                          <li key={login} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary" />
                            <span>{login}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-2">
                        (Detailed per-day breakdowns coming soon)
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
