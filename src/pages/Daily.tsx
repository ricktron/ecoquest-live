import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { fetchDailyCountsCR } from '@/lib/api';
type DailyRow = {
  user_login: string;
  display_name?: string | null;
  obs_count: number;
  distinct_taxa: number;
};

function formatCostaRicaDate(dayOffset: number) {
  const now = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'America/Costa_Rica',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
}

export default function Daily() {
  const [loading, setLoading] = useState(true);
  const [dayScores, setDayScores] = useState<DailyRow[]>([]);
  const [dayOffset, setDayOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchDailyCountsCR({ dayOffset });
        if (!cancelled) {
          setDayScores(result.data ?? []);
        }
        if (result.error) {
          console.warn('daily counts error', result.error);
        }
      } catch (err) {
        console.warn('Failed to load daily observations', err);
        if (!cancelled) {
          setDayScores([]);
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
  }, [dayOffset]);

  const label = dayOffset === 0 ? 'today' : 'yesterday';
  const dateLabel = formatCostaRicaDate(dayOffset);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Daily
          </h1>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Observations recorded {label} (America/Costa_Rica)
            </p>
            <div className="text-xs text-muted-foreground">{dateLabel}</div>
          </div>
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            {[0, 1].map(offset => (
              <button
                key={offset}
                onClick={() => setDayOffset(offset)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dayOffset === offset
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {offset === 0 ? 'Today' : 'Yesterday'}
              </button>
            ))}
          </div>
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
            {dayScores.map((row, idx) => (
              <div
                key={row.user_login}
                className="p-4 bg-card border rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-8">#{idx + 1}</div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">{row.display_name || row.user_login}</div>
                    <div className="flex gap-2 flex-wrap text-sm">
                      <span className="chip chip--info">🔍 {row.obs_count}</span>
                      <span className="chip chip--info">🌿 {row.distinct_taxa}</span>
                    </div>
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
