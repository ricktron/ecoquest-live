import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '@/lib/state';
import { getActiveTrip } from '@/trips';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, ChevronRight } from 'lucide-react';
import { formatPoints } from '@/lib/scoring';

export default function Daily() {
  const navigate = useNavigate();
  const { loading, aggregated, initialize } = useAppState();
  const trip = getActiveTrip();

  useEffect(() => {
    initialize();
  }, []);

  const dayScores = useMemo(() => {
    if (!aggregated) return [];
    
    const allDays = new Set<string>();
    trip.dayRanges.forEach(range => {
      let current = new Date(range.start);
      const end = new Date(range.end);
      while (current <= end) {
        allDays.add(current.toISOString().split('T')[0]);
        current = new Date(current.getTime() + 86400000);
      }
    });
    
    const scores = Array.from(aggregated.byDay.values())
      .filter(day => allDays.has(day.date))
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return scores;
  }, [aggregated, trip]);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Daily Rollup
          </h1>
          <p className="text-sm text-muted-foreground">
            Trip days from {trip.dayRanges[0]?.start} to {trip.dayRanges[trip.dayRanges.length - 1]?.end}
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
            <p className="text-lg font-semibold text-muted-foreground mb-2">No observations yet</p>
            <p className="text-sm text-muted-foreground">Start exploring and documenting species!</p>
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
