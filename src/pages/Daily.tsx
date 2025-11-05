import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import DateRange from '@/components/DateRange';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronRight } from 'lucide-react';
import { formatPoints } from '@/lib/scoring';

export default function Daily() {
  const navigate = useNavigate();
  const { loading, aggregated, startDate, endDate, initialize } = useAppState();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    initialize();
  }, []);

  const dayScores = aggregated
    ? Array.from(aggregated.byDay.values()).sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Daily Rollup
          </h1>
          <p className="text-sm text-muted-foreground">
            Showing results from {startDate} to {endDate}
          </p>
        </div>


        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : dayScores.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-muted-foreground">No observations found in this date range.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayScores.map(day => (
              <div 
                key={day.date} 
                className="p-4 bg-card border rounded-lg space-y-2 cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => navigate(`/daily/${day.date}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-lg">{day.date}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xl font-bold text-primary">{formatPoints(day.points)}</div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Obs</div>
                    <div className="font-medium">{day.obsCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Species</div>
                    <div className="font-medium">{day.speciesCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">People</div>
                    <div className="font-medium">{day.participants.size}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
