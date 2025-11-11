import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TrophySpec } from '@/lib/trophies/registry';
import { loadCatalog } from '@/lib/trophies/loadCatalog';
import { fetchTrophyCabinet, type TrophyCabinetUser, type TrophyCabinetEntry } from '@/lib/api';

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

function getDateKey(iso: string | null | undefined): string {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatDateHeading(key: string): string {
  if (key === 'unknown') return 'Date to be announced';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function Cabinet() {
  const [catalog, setCatalog] = useState<TrophySpec[]>([]);
  const [cabinet, setCabinet] = useState<TrophyCabinetUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const c = await loadCatalog();
      if (!cancelled) setCatalog(c);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchTrophyCabinet();
        if (!cancelled) {
          setCabinet(result.data ?? []);
        }
        if (result.error) {
          console.warn('trophy cabinet error', result.error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const catalogMap = useMemo(() => {
    const map = new Map<string, TrophySpec>();
    catalog.forEach(spec => map.set(spec.id, spec));
    return map;
  }, [catalog]);

  return (
    <div className="pb-6 pb-safe-bottom">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Trophy Cabinet</h1>
            <p className="text-sm text-muted-foreground">Trophies earned by the EcoQuest roster</p>
          </div>
          <a href="/trophies" className="text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors">Back to Trophies</a>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {cabinet.map(user => {
              const displayName = user.display_name || user.user_login;
              const grouped = new Map<string, TrophyCabinetEntry[]>();
              user.trophies.forEach(trophy => {
                const key = getDateKey(trophy.awarded_at ?? null);
                const list = grouped.get(key) ?? [];
                list.push(trophy);
                grouped.set(key, list);
              });
              const sortedGroups = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));

              return (
                <div key={user.user_login} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="text-lg font-semibold">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{user.user_login}</div>
                  </div>
                  {user.trophies.length === 0 ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sortedGroups.map(([key, trophies]) => (
                        <div key={key} className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">{formatDateHeading(key)}</div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {trophies.map((trophy, idx) => {
                              const spec = trophy.trophy_id ? catalogMap.get(trophy.trophy_id) : undefined;
                              const title = trophy.title || spec?.title || trophy.trophy_id;
                              const subtitle = spec?.subtitle ?? '';
                              return (
                                <div key={`${trophy.trophy_id}-${idx}`} className="rounded-xl border border-border bg-background p-3 space-y-2">
                                  <div className="text-sm font-semibold">{title}</div>
                                  {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
                                  {trophy.value != null && (
                                    <div className="text-xs text-muted-foreground">
                                      Value: {formatTrophyValue(trophy.trophy_id ?? 'unknown', trophy.value)}
                                    </div>
                                  )}
                                  {trophy.awarded_at && (
                                    <div className="text-[11px] text-muted-foreground">
                                      Awarded {formatDateCostaRica(trophy.awarded_at)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
