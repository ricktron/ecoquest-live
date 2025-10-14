import { TrophyResults, RosterRow } from '@/types/trophies';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';

type TrophiesProps = {
  trophies: TrophyResults | null;
  roster: RosterRow[];
  inatResults: any[];
  inatParams: { user_id: string; d1: string; d2: string; project_id: string } | null;
};

type RosterFlag = {
  inat_login: string;
  exhibition: boolean;
};

type Location = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  radius_m: number;
  active_on?: string[]; // Optional: only count obs on these dates (YYYY-MM-DD)
};

export const LOCATIONS: Location[] = [
  { id: 'la-quinta-sarapiqui-lodge', label: 'La Quinta Sarapiquí Lodge',       lat: 10.451711204911138, lng: -84.12112003330185, radius_m: 200 },
  { id: 'evergreen-lodge',            label: 'Evergreen Lodge (Tortuguero)',    lat: 10.543011121622126, lng: -83.51277609925263, radius_m: 200 },
  { id: 'cano-palma-station',         label: 'Caño Palma Biological Station',   lat: 10.593844935329683, lng: -83.52763302296113, radius_m: 200 },
  { id: 'la-selva-station',           label: 'La Selva Biological Station',     lat: 10.431557922979602, lng: -84.0035452332552,  radius_m: 600 },
  { id: 'volcan-tortuguero-trail',    label: 'Volcán Tortuguero (trail)',       lat: 10.584099218798833, lng: -83.52811616947487, radius_m: 200 },
  { id: 'san-francisco-town',         label: 'San Francisco (Tortuguero)',      lat: 10.57907817943576,  lng: -83.52360954298479, radius_m: 200 },
  { id: 'sea-turtle-conservancy',     label: 'Sea Turtle Conservancy',          lat: 10.547494714304397, lng: -83.5051400440278,  radius_m: 300 },
];

// Haversine distance in meters
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export default function Trophies({ trophies, roster, inatResults, inatParams }: TrophiesProps) {
  const [windowLabel, setWindowLabel] = useState('');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [windows, setWindows] = useState<any[]>([]);
  const [rosterFlags, setRosterFlags] = useState<RosterFlag[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [lastUpdate] = useState(new Date());
  
  // Load windows on mount
  useEffect(() => {
    loadWindows();
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

  // Trophy: Locations (radius circles)
  const trophyLocations = useMemo(() => {
    const obs = inatResults || [];

    const byLocation = LOCATIONS.map(location => {
      const counts: Record<string, { count: number; times: string[] }> = {};

      for (const o of obs) {
        const lat = o?.geojson?.coordinates ? o.geojson.coordinates[1] : o?.latitude;
        const lng = o?.geojson?.coordinates ? o.geojson.coordinates[0] : o?.longitude;
        if (lat == null || lng == null) continue;

        const dist = distanceMeters(lat, lng, location.lat, location.lng);
        if (dist > location.radius_m) continue;

        // Optional: filter by active_on dates
        if (location.active_on && location.active_on.length > 0) {
          const obsDate = o?.observed_on || o?.created_at?.split('T')[0] || o?.created_at_details?.date || '';
          if (!obsDate || !location.active_on.includes(obsDate)) continue;
        }

        const u = (o?.user?.login || '').toLowerCase();
        if (!u) continue;

        if (!counts[u]) counts[u] = { count: 0, times: [] };
        counts[u].count += 1;

        // Extract time for winner_time (earliest obs)
        const timeStr = o?.created_at || o?.observed_on || o?.created_at_details?.date || '';
        if (timeStr) counts[u].times.push(timeStr);
      }

      const entries = Object.entries(counts).map(([u, data]) => {
        const exhibition = !!flagsByLogin[u];
        const earliestTime = data.times.length > 0 
          ? data.times.sort()[0]
          : null;
        return {
          login: u,
          count: data.count,
          exhibition,
          winner_time: earliestTime
        };
      }).sort((a, b) => b.count - a.count || a.login.localeCompare(b.login));

      const overall = entries[0] || null;
      const student = entries.find(e => !e.exhibition) || null;

      return {
        id: location.id,
        label: location.label,
        overall,
        student,
        entries
      };
    });

    return { locations: byLocation };
  }, [inatResults, flagsByLogin]);


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
                locations: trophyLocations.locations.map(l => ({ 
                  location: l.label, 
                  entries: l.entries 
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

      {/* Location Trophies */}
      <div>
        <h3 className="text-base font-semibold mb-3">Location Trophies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trophyLocations.locations.map((location) => {
            const hasWinner = location.overall || location.student;
            return (
              <Card key={location.id} className={!hasWinner ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Trophy Circle */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      hasWinner 
                        ? 'bg-gradient-to-br from-teal-200 to-emerald-300' 
                        : 'bg-gradient-to-br from-slate-200 to-slate-300 grayscale'
                    }`}>
                      <MapPin className={`h-10 w-10 ${hasWinner ? 'text-teal-800' : 'text-slate-500'}`} />
                    </div>

                    {/* Location Label */}
                    <h4 className={`font-semibold ${hasWinner ? '' : 'text-slate-400'}`}>
                      {location.label}
                    </h4>

                    {/* Winners */}
                    <div className="w-full space-y-2 text-sm">
                      <div className={hasWinner ? '' : 'text-slate-400'}>
                        <div className="font-medium text-xs text-muted-foreground mb-1">Student Winner</div>
                        {location.student ? (
                          <>
                            <div className="font-medium">{getDisplayName(location.student.login)}</div>
                            <div className="text-xs">({location.student.count})</div>
                            {location.student.winner_time && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Won: {format(parseISO(location.student.winner_time), 'MMM d, h:mma')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>No winner yet</div>
                        )}
                      </div>

                      <div className={hasWinner ? '' : 'text-slate-400'}>
                        <div className="font-medium text-xs text-muted-foreground mb-1">Overall Winner</div>
                        {location.overall ? (
                          <>
                            <div className="font-medium">{getDisplayName(location.overall.login)}</div>
                            <div className="text-xs">({location.overall.count})</div>
                            {location.overall.winner_time && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Won: {format(parseISO(location.overall.winner_time), 'MMM d, h:mma')}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>No winner yet</div>
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

      {/* Quest Trophies (placeholder) */}
      <div>
        <h3 className="text-base font-semibold mb-3">Quest Trophies</h3>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Coming soon
          </CardContent>
        </Card>
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

    </div>
  );
}
