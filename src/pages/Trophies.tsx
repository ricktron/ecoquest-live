import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { Crown, Lock } from 'lucide-react';
import Legend from '@/components/Legend';
import TrophyDetail from './TrophyDetail';
import { TrophySpec, TrophyScope } from '@/lib/trophies/registry';
import { loadCatalog } from '@/lib/trophies/loadCatalog';
import { PROFILE } from '@/lib/config/profile';
import { InfoPopover } from '@/components/InfoPopover';

type Winner = { user_login: string; unique_species?: number; value?: number };

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  // ALL HOOKS AT TOP - unconditional
  const [scope, setScope] = useState<TrophyScope>('daily');
  const [catalog, setCatalog] = useState<TrophySpec[]>([]);
  const [winnersById, setWinnersById] = useState<Record<string, Winner[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cat = await loadCatalog();
        if (!cancelled) setCatalog(cat);
        
        const { supabase } = await import('@/lib/supabaseClient');
        const withViews = cat.filter(t => !!t.view);
        const results = await Promise.all(withViews.map(async t => {
          const { data, error } = await supabase()
            .from(t.view as any)
            .select('*');
          if (error) return [t.id, []] as const;
          const list: Winner[] = (data ?? []).map((r: any) => ({
            user_login: r.user_login,
            unique_species: r.unique_species,
            value: r.unique_species ?? r.value ?? null
          }));
          return [t.id, list] as const;
        }));
        if (!cancelled) {
          const map: Record<string, Winner[]> = {};
          results.forEach(([id, list]) => { map[id] = [...list]; });
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

  const specs = catalog.filter(t => t.scope === scope);

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
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              Trophies
            </h1>
            <p className="text-sm text-muted-foreground">
              Recognition for outstanding field observations
            </p>
          </div>
          <a href="/cabinet" className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors">
            View Trophy Cabinet
          </a>
        </div>

        {/* Scope switcher */}
        <div className="inline-flex rounded-xl border border-border p-1 bg-card">
          {(['daily', 'trip'] as TrophyScope[]).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                scope === s 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {s === 'daily' ? 'Today' : 'Trip'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {specs.map((trophy: TrophySpec) => {
            const winners = winnersById[trophy.id] ?? [];
            const hasWinners = PROFILE === 'LIVE' ? winners.length > 0 : true;
            
            return (
              <button
                key={trophy.id}
                onClick={() => hasWinners && navigate(`/trophies/${trophy.id}`)}
                className={`rounded-2xl border bg-card p-4 text-left transition-all hover:shadow-md ${
                  hasWinners ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-60 cursor-not-allowed'
                }`}
                disabled={!hasWinners}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="text-lg font-semibold mb-1 flex items-center">
                      {trophy.title}
                      <InfoPopover text={trophy.info} />
                    </div>
                    <div className="text-sm text-muted-foreground">{trophy.subtitle}</div>
                  </div>
                  {!hasWinners && <Lock className="h-5 w-5 text-muted-foreground ml-2" />}
                </div>
                
                <div className="mt-3">
                  {hasWinners ? (
                    <ul className="space-y-2">
                      {winners.slice(0, 3).map((w, i) => (
                        <li key={w.user_login} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-muted-foreground font-medium">#{i + 1}</span>
                            <span>{w.user_login}</span>
                          </span>
                          <span className="font-semibold text-primary">
                            {w.value ?? w.unique_species}{trophy.metric ? ` ${trophy.metric}` : ''}
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
