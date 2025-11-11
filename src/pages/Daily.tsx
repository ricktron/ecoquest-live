import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type DailyRow = {
  inat_login: string;
  total_obs: number;
  unique_species: number;
};

type ObservationRow = {
  inat_login: string | null;
  user_login: string | null;
  taxon_id: number | null;
};

function getCostaRicaWindow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);

  const year = parts.find(p => p.type === 'year')?.value ?? '1970';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  const dateString = `${year}-${month}-${day}`;

  const start = new Date(`${dateString}T00:00:00-06:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const label = new Intl.DateTimeFormat(undefined, {
    timeZone: 'America/Costa_Rica',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(now);

  return { start, end, label };
}

export default function Daily() {
  const [loading, setLoading] = useState(true);
  const [dayScores, setDayScores] = useState<DailyRow[]>([]);
  const [dateLabel, setDateLabel] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      try {
        const { start, end, label } = getCostaRicaWindow();
        if (!cancelled) {
          setDateLabel(label);
        }

        const client = supabase();
        const { data, error } = await client
          .from('observations_public_v1')
          .select('inat_login:lower(user_login), user_login, taxon_id')
          .gte('observed_at_utc', start.toISOString())
          .lt('observed_at_utc', end.toISOString())
          .gte('latitude', 8.0)
          .lte('latitude', 11.5)
          .gte('longitude', -86.0)
          .lte('longitude', -82.0);

        if (error) {
          console.warn('observations_public_v1 daily query error', error);
        }

        const observations = (data as ObservationRow[] | null) ?? [];
        const aggregate = new Map<string, { login: string; total: number; taxa: Set<number> }>();

        observations.forEach(row => {
          const loginRaw = row.inat_login || row.user_login;
          if (!loginRaw) return;
          const login = loginRaw.toLowerCase();
          const existing = aggregate.get(login) ?? { login: loginRaw, total: 0, taxa: new Set<number>() };
          existing.total += 1;
          if (row.taxon_id != null) {
            existing.taxa.add(Number(row.taxon_id));
          }
          aggregate.set(login, existing);
        });

        const rows: DailyRow[] = Array.from(aggregate.values()).map(entry => ({
          inat_login: entry.login,
          total_obs: entry.total,
          unique_species: entry.taxa.size,
        }));

        rows.sort((a, b) => {
          if (b.total_obs !== a.total_obs) return b.total_obs - a.total_obs;
          if (b.unique_species !== a.unique_species) return b.unique_species - a.unique_species;
          return a.inat_login.localeCompare(b.inat_login);
        });

        if (!cancelled) {
          setDayScores(rows);
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
  }, []);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Daily
          </h1>
          {dateLabel && (
            <p className="text-sm text-muted-foreground">
              Observations recorded today ({dateLabel}, America/Costa_Rica)
            </p>
          )}
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
                key={row.inat_login}
                className="p-4 bg-card border rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-muted-foreground w-8">#{idx + 1}</div>
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">{row.inat_login}</div>
                    <div className="flex gap-2 flex-wrap text-sm">
                      <span className="chip chip--info">🔍 {row.total_obs}</span>
                      <span className="chip chip--info">🌿 {row.unique_species}</span>
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
