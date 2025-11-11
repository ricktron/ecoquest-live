import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { Crown, Lock } from 'lucide-react';
import TrophyDetail from './TrophyDetail';
import { TrophySpec, TrophyScope } from '@/lib/trophies/registry';
import { loadCatalog } from '@/lib/trophies/loadCatalog';
import { PROFILE } from '@/lib/config/profile';
import { InfoPopover } from '@/components/InfoPopover';

type Winner = { user_login: string; unique_species?: number; value?: number }; 

type TrophyViewRow = {
  user_login: string;
  unique_species?: number | null;
  value?: number | null;
};

type DailyAwardRow = {
  trophy_id: string;
  user_login: string | null;
  place: number | null;
  value: number | null;
  scope?: string | null;
};

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTrophyValue(id: string, v: number | string | null | undefined): string {
  if (v == null) return '—';
  switch (id) {
    case 'early-bird':
      return minutesToHHMM(Math.round(Number(v)));
    case 'daily-rare-find':
      return `1-in-${v}`;
    case 'daily-variety-hero':
      return `${v} unique spp.`;
    case 'daily-obs-leader':
      return `${v} obs`;
    case 'daily-shutterbug':
      return `${v} obs`;
    case 'daily-night-owl':
      return `${v} night obs`;
    default:
      return String(v);
  }
}

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
        const client = supabase();
        const withViews = cat.filter(t => !!t.view);
        const viewPromises = withViews.map(async t => {
          const { data, error } = await client
            .from(t.view!)
            .select('*');
          if (error) {
            console.warn(`trophy view ${t.view} error`, error);
            return [t.id, []] as const;
          }
          const list: Winner[] = ((data as TrophyViewRow[] | null) ?? []).map(r => ({
            user_login: r.user_login,
            unique_species: r.unique_species ?? undefined,
            value: r.unique_species ?? r.value ?? undefined
          }));
          return [t.id, list] as const;
        });

        const dailyPromise = client
          .from('trophies_daily_obs_leader_awards_v')
          .select('trophy_id, user_login, place, value, scope')
          .order('trophy_id', { ascending: true })
          .order('place', { ascending: true });

        const results = await Promise.all(viewPromises);
        const { data: dailyData, error: dailyError } = await dailyPromise;

        if (dailyError) {
          console.warn('trophies_daily_obs_leader_awards_v error', dailyError);
        }

        if (!cancelled) {
          const map: Record<string, Winner[]> = {};

          const groupedDaily = new Map<string, Array<{ winner: Winner; place: number }>>();
          ((dailyData as DailyAwardRow[] | null) ?? []).forEach((row) => {
            if (!row?.trophy_id || (row.scope && row.scope !== 'daily')) return;
            if (!row.user_login) return;
            const place = typeof row.place === 'number' ? row.place : Number(row.place ?? 999);
            const winner: Winner = {
              user_login: row.user_login,
              value: row.value != null ? Number(row.value) : undefined,
            };
            const list = groupedDaily.get(row.trophy_id) ?? [];
            list.push({ winner, place });
            groupedDaily.set(row.trophy_id, list);
          });

          groupedDaily.forEach((list, id) => {
            list.sort((a, b) => (a.place ?? 999) - (b.place ?? 999));
            map[id] = list.map(item => item.winner);
          });

          results.forEach(([id, list]) => {
            map[id] = [...(map[id] ?? []), ...list];
          });

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
                          <span className="text-sm font-medium text-primary">
                            {formatTrophyValue(trophy.id, w.value ?? w.unique_species)}
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
      </div>
    </div>
  );
}
