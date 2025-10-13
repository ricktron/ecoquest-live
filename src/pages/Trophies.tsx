import { TrophyResults, RosterRow } from '@/types/trophies';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

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

export default function Trophies({ trophies, roster, inatResults, inatParams }: TrophiesProps) {
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
    
    // TODO: replace with real boxes
    const ZONES = [
      { key: 'river', label: 'On the River', sw: [9.950, -84.200], ne: [9.990, -84.150] },
      { key: 'beach', label: 'On the Beach', sw: [9.600, -85.000], ne: [9.640, -84.960] },
      { key: 'hotel', label: 'At the Hotel', sw: [9.800, -84.300], ne: [9.820, -84.280] },
    ];

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
  }, [inatResults, flagsByLogin]);

  // Helper to get display name from roster
  const getDisplayName = (login: string) => {
    const user = roster.find(r => r.inat_login.toLowerCase() === login.toLowerCase());
    return user?.display_name_ui || login;
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Trophies</h2>
        {inatResults.length > 0 && (
          <span className="text-sm text-gray-500">
            ({inatResults.length} observations loaded)
          </span>
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

      {inatResults.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No observations loaded. Click "Fetch from iNaturalist" on the Admin tab to compute trophies.
        </div>
      ) : (
        <>
          {/* New turtle trophy */}
          <div>
            <h3 className="font-semibold mb-3">Most Turtles (Testudines)</h3>
            <div className="border rounded-lg p-4 bg-white">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Student Winner:</span>
                  {trophyTurtles.student ? (
                    <span className="font-medium">
                      {trophyTurtles.student.login} ({trophyTurtles.student.count})
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Winner:</span>
                  {trophyTurtles.overall ? (
                    <span className="font-medium">
                      {trophyTurtles.overall.login} ({trophyTurtles.overall.count})
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>

              {/* Optional: Show all entries for transparency */}
              {trophyTurtles.entries.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-gray-600">Show all entries</summary>
                  <div className="mt-2 space-y-1">
                    {trophyTurtles.entries.map((e, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>{e.login} {e.exhibition && '(exhibition)'}</span>
                        <span>{e.count}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>

          {/* New zone trophies */}
          <div>
            <h3 className="font-semibold mb-3">Zone Trophies</h3>
            <div className="space-y-4">
              {trophyZones.zones.map((z, i) => (
                <div key={i} className="border rounded-lg p-4 bg-white">
                  <h4 className="font-medium mb-3">{z.label}</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Student Winner:</span>
                      {z.student ? (
                        <span className="font-medium">
                          {z.student.login} ({z.student.count})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Overall Winner:</span>
                      {z.overall ? (
                        <span className="font-medium">
                          {z.overall.login} ({z.overall.count})
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Legacy trophies from Admin computation (if available) */}
      {trophies && (
        <>
          <div>
            <h3 className="font-semibold mb-3">Legacy Zone Trophies (from Admin)</h3>
            {trophies.zones.length === 0 ? (
              <div className="text-center text-gray-500 py-8">No zone trophies yet.</div>
            ) : (
              <div className="space-y-4">
                {trophies.zones.map((zone, i) => (
                  <div key={i} className="border rounded-lg p-4 bg-white">
                    <h4 className="font-medium mb-3">{zone.label}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Student Winner:</span>
                        {zone.student ? (
                          <span className="font-medium">
                            {getDisplayName(zone.student.user)} ({zone.student.count})
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Overall Winner:</span>
                        {zone.overall ? (
                          <span className="font-medium">
                            {getDisplayName(zone.overall.user)} ({zone.overall.count})
                            {zone.overall.is_adult && (
                              <span className="ml-2 text-sm text-blue-600">✓ Exhibition</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3">Legacy Species Trophies (from Admin)</h3>
            <div className="border rounded-lg p-4 bg-white">
              <h4 className="font-medium mb-3">Most Turtles</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Student Winner:</span>
                  {trophies.turtles.student ? (
                    <span className="font-medium">
                      {getDisplayName(trophies.turtles.student.user)} ({trophies.turtles.student.count})
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Overall Winner:</span>
                  {trophies.turtles.overall ? (
                    <span className="font-medium">
                      {getDisplayName(trophies.turtles.overall.user)} ({trophies.turtles.overall.count})
                      {trophies.turtles.overall.is_adult && (
                        <span className="ml-2 text-sm text-blue-600">✓ Exhibition</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
