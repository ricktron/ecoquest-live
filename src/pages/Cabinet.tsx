import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TrophySpec } from '@/lib/trophies/registry';
import { loadCatalog } from '@/lib/trophies/loadCatalog';

type VHRow = { user_login: string; unique_species: number; awarded_at?: string };

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTrophyValue(id: string, v: any): string {
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

function formatDateCostaRica(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function Cabinet() {
  const [catalog, setCatalog] = useState<TrophySpec[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [who, setWho] = useState<string>('');
  const [vh, setVh] = useState<VHRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await loadCatalog();
      if (!cancelled) setCatalog(c);
      const { data: cfg }: any = await supabase().from('config_filters' as any).select('flags').eq('id', true).maybeSingle();
      const list = ((cfg?.flags?.student_logins ?? []) as string[]).slice().sort();
      if (!cancelled) setNames(list);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVh(null);
      if (!who) return;
      const { data, error }: any = await supabase()
        .from('trophies_variety_hero_latest_run_v' as any)
        .select('user_login, unique_species, awarded_at')
        .eq('user_login', who)
        .maybeSingle();
      if (!cancelled && !error) setVh(data ?? null);
    })();
    return () => { cancelled = true; };
  }, [who]);

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Trophy Cabinet</h1>
            <p className="text-sm text-muted-foreground">Preview earned trophies for a participant</p>
          </div>
          <a href="/trophies" className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors">Back to Trophies</a>
        </div>

        <div className="mb-4">
          <label className="mr-2 text-sm font-medium">Select user</label>
          <select 
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background" 
            value={who} 
            onChange={(e)=>setWho(e.target.value)}
          >
            <option value="">—</option>
            {names.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {!who ? (
          <div className="rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground text-center">
            Choose a user to see their cabinet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {catalog.map(t => {
              const earned = (t.id === 'variety-hero' && vh) ? true : false;
              const value  = (t.id === 'variety-hero' && vh) ? vh.unique_species : null;
              return (
                <div key={t.id} className={`rounded-2xl border border-border bg-card p-4 ${earned ? '' : 'opacity-70'}`}>
                  <div className="text-lg font-semibold">{t.title}</div>
                  <div className="text-sm text-muted-foreground">{t.subtitle}</div>
                  <div className="mt-3">
                    {earned ? (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm space-y-1">
                        <div><span className="font-semibold text-primary">Earned</span></div>
                        {value !== null && (
                          <div className="text-muted-foreground">
                            Value: {formatTrophyValue(t.id, value)}
                          </div>
                        )}
                        {vh?.awarded_at && (
                          <div className="text-xs text-muted-foreground">
                            Won: {formatDateCostaRica(vh.awarded_at)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/40 p-3 text-center text-sm text-muted-foreground">Not yet earned</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
