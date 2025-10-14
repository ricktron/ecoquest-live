import { TrophyResults, RosterRow } from '@/types/trophies';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Trophy } from 'lucide-react';
import { ZONES_DEFAULT, ZoneDef } from '@/lib/zones';
import { format, parseISO } from 'date-fns';

type TrophiesProps = {
  trophies: TrophyResults | null;
  roster: RosterRow[];
  inatResults: any[];
  inatParams: { user_id: string; d1: string; d2: string; project_id: string } | null;
  zoneDefs: ZoneDef[] | null;
};

type RosterFlag = {
  inat_login: string;
  exhibition: boolean;
};

type TrophyPlace = {
  slug: string;
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  is_active: boolean;
  sort_order: number;
};

// Fallback places matching Supabase seed
const PLACES_FALLBACK: TrophyPlace[] = [
  { slug: 'library', label: 'Library', lat: 40.7589, lng: -73.9851, radius_m: 100, is_active: true, sort_order: 1 },
  { slug: 'park', label: 'Central Park', lat: 40.7829, lng: -73.9654, radius_m: 500, is_active: true, sort_order: 2 },
];

// Haversine distance in meters
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function Trophies({ trophies, roster, inatResults, inatParams, zoneDefs }: TrophiesProps) {
  const [windowLabel, setWindowLabel] = useState('');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [windows, setWindows] = useState<any[]>([]);
  const [rosterFlags, setRosterFlags] = useState<RosterFlag[]>([]);
  const [places, setPlaces] = useState<TrophyPlace[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [lastUpdate] = useState(new Date());
  // Load windows and places on mount
  useEffect(() => {
    loadWindows();
    loadPlaces();
  }, []);

  // Load roster flags when window or snapshot date changes
  useEffect(() => {
    if (windowLabel && snapshotDate) {
      loadRosterFlags();
    }
  }, [windowLabel, snapshotDate]);

  async function loadWindows() {
    const { data } = await supabase
      .from('windows_select_v1')
      .select('id, label, starts_on, ends_on, is_current')
      .order('starts_on');
    
    setWindows(data || []);
    
    const current = (data || []).find(w => w.is_current);
    if (current) {
      setWindowLabel(current.label);
    } else if (data && data.length > 0) {
      setWindowLabel(data[0].label);
    }

    // Set default snapshot date to today
    setSnapshotDate(new Date().toISOString().split('T')[0]);
  }

  async function loadRosterFlags() {
    if (!windowLabel || !snapshotDate) return;

    // Get window_id first
    const { data: windowData } = await supabase
      .from('trip_windows')
      .select('id')
      .eq('label', windowLabel)
      .maybeSingle();

    if (!windowData?.id) {
      setRosterFlags([]);
      return;
    }

    // Load roster flags
    const { data } = await supabase
      .from('public_leaderboard_with_flags_v1')
      .select('inat_login, exhibition')
      .eq('window_id', windowData.id)
      .eq('scored_on', snapshotDate);

    setRosterFlags(data || []);
  }

  async function loadPlaces() {
    const { data, error } = await supabase
      .from('trophy_places')
      .select('slug, label, lat, lng, radius_m, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    if (error || !data || data.length === 0) {
      setPlaces(PLACES_FALLBACK);
    } else {
      setPlaces(data);
    }
  }

  // Transform roster flags into lookup object
  const flagsByLogin = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const r of rosterFlags) {
      map[r.inat_login.toLowerCase()] = !!r.exhibition;
    }
    return map;
  }, [rosterFlags]);

  // Trophy: Most Turtles
  const trophyTurtles = useMemo(() => {
    const obs = inatResults || [];
    
    const isTurtle = (o: any) => {
      const a = o?.taxon?.ancestor_ids || [];
      // 26036 = Testudines (turtles)
      return a.includes(26036) || (o?.taxon?.name || '').toLowerCase().includes('testudines');
    };

    const turtles = obs.filter(isTurtle);

    const counts: Record<string, number> = {};
    for (const o of turtles) {
      const u = (o?.user?.login || '').toLowerCase();
      if (!u) continue;
      counts[u] = (counts[u] || 0) + 1;
    }

    const entries = Object.entries(counts).map(([u, c]) => ({
      login: u,
      count: c,
      exhibition: !!flagsByLogin[u]
    }));

    const overall = entries.sort((a, b) => b.count - a.count || a.login.localeCompare(b.login))[0] || null;
    const students = entries.filter(e => !e.exhibition);
    const student = students.sort((a, b) => b.count - a.count || a.login.localeCompare(b.login))[0] || null;

    return { overall, student, entries };
  }, [inatResults, flagsByLogin]);

  // Trophy: Zones
  const trophyZones = useMemo(() => {
    const obs = inatResults || [];
    
    // Use custom zone defs from state, or fall back to defaults
    const ZONES = zoneDefs || ZONES_DEFAULT;

    const inBox = (lat: number, lng: number, sw: number[], ne: number[]) =>
      lat >= sw[0] && lat <= ne[0] && lng >= sw[1] && lng <= ne[1];

    const byZone = ZONES.map(z => {
      const counts: Record<string, number> = {};
      
      for (const o of obs) {
        const lat = o?.geojson?.coordinates ? o.geojson.coordinates[1] : o?.latitude;
        const lng = o?.geojson?.coordinates ? o.geojson.coordinates[0] : o?.longitude;
        if (lat == null || lng == null) continue;
        if (!inBox(lat, lng, z.sw, z.ne)) continue;

        const u = (o?.user?.login || '').toLowerCase();
        if (!u) continue;
        counts[u] = (counts[u] || 0) + 1;
      }

      const entries = Object.entries(counts).map(([u, c]) => ({
        login: u,
        count: c,
        exhibition: !!flagsByLogin[u]
      })).sort((a, b) => b.count - a.count || a.login.localeCompare(b.login));

      const overall = entries[0] || null;
      const student = entries.find(e => !e.exhibition) || null;

      return { key: z.key, label: z.label, overall, student, entries };
    });

    return { zones: byZone };
  }, [inatResults, flagsByLogin, zoneDefs]);

  // Trophy: Quest (Location radius)
  const trophyQuest = useMemo(() => {
    const obs = inatResults || [];

    const byPlace = places.map(place => {
      const counts: Record<string, { count: number; times: string[] }> = {};

      for (const o of obs) {
        const lat = o?.geojson?.coordinates ? o.geojson.coordinates[1] : o?.latitude;
        const lng = o?.geojson?.coordinates ? o.geojson.coordinates[0] : o?.longitude;
        if (lat == null || lng == null) continue;

        const dist = haversineMeters(lat, lng, place.lat, place.lng);
        if (dist > place.radius_m) continue;

        const u = (o?.user?.login || '').toLowerCase();
        if (!u) continue;

        if (!counts[u]) counts[u] = { count: 0, times: [] };
        counts[u].count += 1;

        // Extract time
        const timeStr = o?.created_at || o?.observed_on || o?.created_at_details?.date || '';
        if (timeStr) counts[u].times.push(timeStr);
      }

      const entries = Object.entries(counts).map(([u, data]) => {
        const exhibition = !!flagsByLogin[u];
        const latestTime = data.times.length > 0 
          ? data.times.sort().reverse()[0]
          : null;
        return {
          login: u,
          count: data.count,
          exhibition,
          winner_time: latestTime
        };
      }).sort((a, b) => b.count - a.count || a.login.localeCompare(b.login));

      const overall = entries[0] || null;
      const student = entries.find(e => !e.exhibition) || null;

      return {
        slug: place.slug,
        label: place.label,
        overall,
        student,
        entries
      };
    });

    return { places: byPlace };
  }, [inatResults, flagsByLogin, places]);

  // Helper to get display name from roster
  const getDisplayName = (login: string) => {
    const user = roster.find(r => r.inat_login.toLowerCase() === login.toLowerCase());
    return user?.display_name_ui || login;
  };

  if (inatResults.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Trophies</h2>
        <div className="text-center text-gray-500 py-8">
          No observations loaded. Click "Fetch from iNaturalist" on the Admin tab to compute trophies.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Trophies</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Computed from iNaturalist observations loaded on this page.
        </p>
        <p className="text-xs text-muted-foreground">
          Last update: {format(lastUpdate, 'MMM d, yyyy h:mm a')}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Window:</label>
          <select 
            value={windowLabel} 
            onChange={e => setWindowLabel(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            {windows.map(w => (
              <option key={w.id} value={w.label}>{w.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Snapshot date:</label>
          <input 
            type="date" 
            value={snapshotDate}
            onChange={e => setSnapshotDate(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          />
        </div>

        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-auto"
        >
          {showDebug ? 'Hide' : 'Show'} debug counts
        </button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm">Debug Counts</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify({
                turtles: trophyTurtles.entries,
                zones: trophyZones.zones.map(z => ({ 
                  zone: z.label, 
                  entries: z.entries 
                })),
                quest: trophyQuest.places.map(p => ({ 
                  place: p.label, 
                  entries: p.entries 
                }))
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Species Trophies */}
      <div>
        <h3 className="text-base font-semibold mb-3">Species Trophies</h3>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fish className="h-5 w-5" />
              Most Turtles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Student Winner</Badge>
                  {trophyTurtles.student ? (
                    <>
                      <span className="font-medium">{trophyTurtles.student.login}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <span className="font-mono text-sm">{trophyTurtles.student?.count || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Overall Winner</Badge>
                  {trophyTurtles.overall ? (
                    <>
                      <span className="font-medium">{trophyTurtles.overall.login}</span>
                      {trophyTurtles.overall.exhibition && (
                        <Badge variant="secondary" className="text-xs">✓ Exhibition</Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <span className="font-mono text-sm">{trophyTurtles.overall?.count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quest Trophies */}
      <div>
        <h3 className="text-base font-semibold mb-3">Quest Trophies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trophyQuest.places.map((place) => {
            const hasWinner = place.overall || place.student;
            return (
              <Card key={place.slug} className={!hasWinner ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Trophy Circle */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      hasWinner 
                        ? 'bg-gradient-to-br from-teal-200 to-emerald-300' 
                        : 'bg-gradient-to-br from-slate-200 to-slate-300 grayscale'
                    }`}>
                      <Trophy className={`h-10 w-10 ${hasWinner ? 'text-teal-800' : 'text-slate-500'}`} />
                    </div>

                    {/* Place Label */}
                    <h4 className={`font-semibold ${hasWinner ? '' : 'text-slate-400'}`}>
                      {place.label}
                    </h4>

                    {/* Winners */}
                    <div className="w-full space-y-2 text-sm">
                      <div className={hasWinner ? '' : 'text-slate-400'}>
                        <div className="font-medium text-xs text-muted-foreground mb-1">Student Winner</div>
                        {place.student ? (
                          <>
                            <div className="font-medium">{getDisplayName(place.student.login)}</div>
                            <div className="text-xs">({place.student.count})</div>
                            {place.student.winner_time && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Won: {format(parseISO(place.student.winner_time), 'MMM d, h:mma')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>—</div>
                        )}
                      </div>

                      <div className={hasWinner ? '' : 'text-slate-400'}>
                        <div className="font-medium text-xs text-muted-foreground mb-1">Overall Winner</div>
                        {place.overall ? (
                          <>
                            <div className="font-medium">{getDisplayName(place.overall.login)}</div>
                            <div className="text-xs">({place.overall.count})</div>
                            {place.overall.winner_time && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Won: {format(parseISO(place.overall.winner_time), 'MMM d, h:mma')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>—</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Plant Trophies (placeholder) */}
      <div>
        <h3 className="text-base font-semibold mb-3">Plant Trophies</h3>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Coming soon
          </CardContent>
        </Card>
      </div>

      {/* Zone Trophies */}
      <div>
        <h3 className="text-base font-semibold mb-3">Zone Trophies</h3>
        <div className="space-y-3">
          {trophyZones.zones.map((z, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5" />
                  {z.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Student Winner</Badge>
                      {z.student ? (
                        <>
                          <span className="font-medium">{z.student.login}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <span className="font-mono text-sm">{z.student?.count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Overall Winner</Badge>
                      {z.overall ? (
                        <>
                          <span className="font-medium">{z.overall.login}</span>
                          {z.overall.exhibition && (
                            <Badge variant="secondary" className="text-xs">✓ Exhibition</Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <span className="font-mono text-sm">{z.overall?.count || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  );
}
