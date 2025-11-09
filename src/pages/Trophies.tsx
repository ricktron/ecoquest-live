import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FLAGS } from '@/env';
import { useAppState } from '@/lib/state';
import { buildScoringContext } from '@/lib/scoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Crown, Info } from 'lucide-react';
import Legend from '@/components/Legend';
import TrophyDetail from './TrophyDetail';
import { getTripTrophies, getDailyTrophies, TrophyDef, TrophyResult } from '@/trophies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isLive } from '@/lib/config/profile';
import { Badge } from '@/components/ui/badge';

type TrophyWithResults = TrophyDef & { results?: TrophyResult[] };

export default function Trophies() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  
  // ALL HOOKS AT TOP - unconditional
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data, error } = await supabase()
          .from('trophies_variety_hero_latest_run_v' as any)
          .select('user_login, unique_species');
        if (error) throw error;
        if (!cancelled) setRows(data ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load trophies');
        if (!cancelled) setRows([]);
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

  // LIVE-aware empty state
  if (isLive && rows.length === 0) {
    return (
      <div className="pb-6 pb-safe-bottom">
        <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              Trophies
            </h1>
          </div>
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <p className="text-lg font-semibold text-muted-foreground mb-2">No winners yet</p>
            <p className="text-sm text-muted-foreground">Trophies populate after the first scoring run.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Variety Hero list
  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Variety Hero
          </h1>
          <p className="text-sm text-muted-foreground">
            Most unique species observed
          </p>
        </div>
        
        <ul className="space-y-3">
          {rows.map((r: any, i: number) => (
            <li key={r.user_login} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                <span className="font-medium">{r.user_login}</span>
              </div>
              <span className="text-primary font-semibold">{r.unique_species} species</span>
            </li>
          ))}
        </ul>
        
        <Legend />
      </div>
    </div>
  );
}
