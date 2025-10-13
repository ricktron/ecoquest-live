import { TrophyResults, RosterRow } from '@/types/trophies';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Fish, MapPin } from 'lucide-react';
import { ZONES_DEFAULT, ZoneDef } from '@/lib/zones';

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

export default function Trophies({ trophies, roster, inatResults, inatParams, zoneDefs }: TrophiesProps) {
  const [windowLabel, setWindowLabel] = useState('');
  const [snapshotDate, setSnapshotDate] = useState('');
  const [windows, setWindows] = useState<any[]>([]);
  const [rosterFlags, setRosterFlags] = useState<RosterFlag[]>([]);
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
        {inatParams && (
          <p className="text-xs text-gray-500 mt-1">
            (computed from last Admin fetch: {inatParams.d1} → {inatParams.d2})
          </p>
        )}
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
      </div>

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
