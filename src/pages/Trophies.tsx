import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { Crown, Lock } from 'lucide-react';
import Legend from '@/components/Legend';
import TrophyDetail from './TrophyDetail';
import { TROPHIES, TrophySpec } from '@/trophies/registry';
import { isLive } from '@/lib/config/profile';

type Winner = { user_login: string; unique_species?: number; value?: number };

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  // ALL HOOKS AT TOP - unconditional
  const [winnersById, setWinnersById] = useState<Record<string, Winner[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const specsWithViews = TROPHIES.filter(t => !!t.view);
        const results = await Promise.all(specsWithViews.map(async (t): Promise<[string, Winner[]]> => {
          const { data, error } = await supabase()
            .from(t.view as any)
            .select('*');
          if (error) return [t.slug, []];
          const winners: Winner[] = (data ?? []).map((row: any) => ({
            user_login: row.user_login,
            unique_species: row.unique_species,
            value: row.unique_species ?? row.value ?? null
          }));
          return [t.slug, winners];
        }));
        if (!cancelled) {
          const map: Record<string, Winner[]> = {};
          results.forEach(([id, list]) => { map[id] = list; });
          setWinnersById(map);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If we have a slug, render the detail page
  if (slug) {
    return <TrophyDetail />;
  }

  if (!FLAGS.TROPHIES_ENABLED) {
    return (
      <div className="pb-6">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Trophies</h2>
          <p className="text-muted-foreground">
            Trophy features are currently disabled.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pb-6 pb-safe-bottom">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
          <p className="text-sm text-muted-foreground">Loading trophies…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Trophies
          </h1>
          <p className="text-sm text-muted-foreground">
            Recognition for outstanding field observations
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TROPHIES.map((trophy: TrophySpec) => {
            const winners = winnersById[trophy.slug] ?? [];
            const active = isLive ? winners.length > 0 : true;
            
            return (
              <button
                key={trophy.slug}
                onClick={() => active && navigate(`/trophies/${trophy.slug}`)}
                className={`rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-md ${
                  active ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
                disabled={!active}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-lg font-semibold mb-1">{trophy.title}</div>
                    <div className="text-sm text-muted-foreground">{trophy.description}</div>
                  </div>
                  {!active && <Lock className="h-5 w-5 text-muted-foreground ml-2" />}
                </div>
                
                <div className="mt-3">
                  {active ? (
                    <ul className="space-y-2">
                      {winners.slice(0, 3).map((w, i) => (
                        <li key={w.user_login} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">#{i + 1}</span>
                            <span>{w.user_login}</span>
                          </span>
                          <span className="font-semibold text-primary">
                            {w.value ?? w.unique_species}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">
                      Not yet earned
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <Legend />
      </div>
    </div>
  );
}
