import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';
import { TrophyResults, RosterRow, TrophyWinner, ZoneTrophy } from '@/types/trophies';

type Window = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
  inat_project: string | null;
  use_project_filter: boolean;
  include_adults_default: boolean;
};

type Zone = {
  id: string;
  label: string;
  kind: 'box' | 'circle';
  min_lat?: number;
  max_lat?: number;
  min_lng?: number;
  max_lng?: number;
  center_lat?: number;
  center_lng?: number;
  radius_m?: number;
  is_active: boolean;
};


type UnifiedRow = {
  display_label: string;
  obs_count: number;
  exhibition: boolean;
  official_rank: number | null;
  overall_rank: number;
};

type PreviewRow = {
  user: string;
  obs_count: number;
  is_adult: boolean;
};


type AdminProps = {
  setTrophies: (trophies: TrophyResults | null) => void;
  setRoster: (roster: RosterRow[]) => void;
};

export default function Admin({ setTrophies: setAppTrophies, setRoster: setAppRoster }: AdminProps) {
  const [windows, setWindows] = useState<Window[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [windowLabel, setWindowLabel] = useState('');
  const [scoredOn, setScoredOn] = useState(new Date().toISOString().split('T')[0]);
  const [adminPin, setAdminPin] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [unifiedLeaderboard, setUnifiedLeaderboard] = useState<UnifiedRow[]>([]);
  const [inatPayload, setInatPayload] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [loginListCsv, setLoginListCsv] = useState('');
  const [debugTotalResults, setDebugTotalResults] = useState(0);
  const [debugUniqueObservers, setDebugUniqueObservers] = useState<string[]>([]);
  const [debugUnrosteredObservers, setDebugUnrosteredObservers] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [filterByProject, setFilterByProject] = useState<boolean | undefined>(undefined);
  const [projectIdOrSlug, setProjectIdOrSlug] = useState('');
  const [includeAdults, setIncludeAdults] = useState<boolean | undefined>(undefined);
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [d1Custom, setD1Custom] = useState('');
  const [d2Custom, setD2Custom] = useState('');
  const [projectIdOutput, setProjectIdOutput] = useState('');
  const [includeAdultsEffective, setIncludeAdultsEffective] = useState(false);
  const [debugParams, setDebugParams] = useState<Record<string, string>>({});

  // Load windows, roster, and zones on mount
  useEffect(() => {
    loadWindows();
    loadRoster();
    loadZones();
  }, []);

  // Load leaderboards and set defaults when window or scoredOn changes
  useEffect(() => {
    if (windowLabel) {
      loadLeaderboards();
      
      // Find the selected window row
      const selectedWindow = windows.find(w => w.label === windowLabel);
      if (selectedWindow) {
        // Set filter_by_project if unset
        if (filterByProject === undefined) {
          setFilterByProject(selectedWindow.use_project_filter);
        }
        // Set project_id_or_slug if empty
        if (!projectIdOrSlug && selectedWindow.inat_project) {
          setProjectIdOrSlug(selectedWindow.inat_project);
        }
        // Set include_adults if unset
        if (includeAdults === undefined) {
          setIncludeAdults(selectedWindow.include_adults_default);
        }
      }
    }
  }, [windowLabel, scoredOn, windows]);

  async function loadWindows() {
    const { data, error } = await supabase
      .from('windows_select_v1')
      .select('id, label, starts_on, ends_on, is_current, inat_project, use_project_filter, include_adults_default')
      .order('starts_on');
    
    if (error) {
      console.error('Error loading windows:', error);
      return;
    }
    
    setWindows(data || []);
    
    // Default logic: 1) is_current=true, 2) 'Costa Rica 2025 (demo)', 3) first row
    const current = (data || []).find(w => w.is_current);
    if (current) {
      setWindowLabel(current.label);
    } else {
      const demo = (data || []).find(w => w.label === 'Costa Rica 2025 (demo)');
      if (demo) {
        setWindowLabel(demo.label);
      } else if (data && data.length > 0) {
        setWindowLabel(data[0].label);
      }
    }
  }

  async function loadRoster() {
    const { data, error } = await supabase
      .from('roster_public_v1')
      .select('inat_login, display_name_ui, is_adult, exclude_from_scoring')
      .order('display_name_ui');
    
    if (error) {
      console.error('Error loading roster:', error);
      return;
    }
    
    const rosterData = data || [];
    setRoster(rosterData);
    setAppRoster(rosterData);
  }

  async function loadZones() {
    const { data, error } = await supabase
      .from('trophy_zones')
      .select('*')
      .eq('is_active', true);
    
    if (error) {
      console.error('Error loading zones:', error);
      return;
    }
    
    setZones(data || []);
  }

  async function loadLeaderboards() {
    if (!windowLabel) return;
    
    // First, get the window_id for the selected label
    const { data: windowData } = await supabase
      .from('trip_windows')
      .select('id')
      .eq('label', windowLabel)
      .maybeSingle();
    
    if (!windowData?.id) {
      setUnifiedLeaderboard([]);
      return;
    }

    // Unified leaderboard
    const { data: unified } = await supabase
      .from('public_leaderboard_unified_v1')
      .select('display_label, obs_count, exhibition, official_rank, overall_rank')
      .eq('window_id', windowData.id)
      .eq('scored_on', scoredOn)
      .order('official_rank', { ascending: true, nullsFirst: false })
      .order('overall_rank', { ascending: true });
    
    setUnifiedLeaderboard(unified || []);
  }

  // Update transform inputs without calling iNat API
  function updateTransformInputs() {
    // 1) Read the selected window row from ds_windows by label
    const win = windows.find(r => r.label === windowLabel);
    
    // 2) Compute dates: use window's starts_on/ends_on unless ui.use_custom_dates is true
    const d1 = useCustomDates ? d1Custom : (win ? win.starts_on : scoredOn);
    const d2 = useCustomDates ? d2Custom : (win ? win.ends_on : scoredOn);
    
    // 3) Compute includeAdults
    const includeAdultsComputed = (includeAdults !== undefined) ? includeAdults : (win?.include_adults_default ?? false);
    
    // 4) Compute project filter
    const projectEnabled = (filterByProject === true) || (win?.use_project_filter === true);
    const projectId = projectEnabled ? (projectIdOrSlug || win?.inat_project || '') : '';
    
    // 5) Build roster login lists - ALWAYS include ALL users
    const allLogins = roster.map(r => (r.inat_login || '').trim()).filter(Boolean);
    const studentLogins = roster.filter(r => !r.exclude_from_scoring).map(r => (r.inat_login || '').trim()).filter(Boolean);
    const loginCsv = allLogins.join(',');
    
    // Store transform outputs
    setWindowStart(d1);
    setWindowEnd(d2);
    setLoginListCsv(loginCsv);
    setProjectIdOutput(projectId);
    setIncludeAdultsEffective(includeAdultsComputed);
    
    // 6) Add debug params output
    setDebugParams({
      user_id: loginCsv,
      d1: d1,
      d2: d2,
      project_id: projectId
    });
  }

  async function fetchFromINat() {
    setFetching(true);
    try {
      // 1) Run transform first
      updateTransformInputs();
      
      // 2) Check if login_list_csv is empty
      if (!loginListCsv) {
        toast({
          title: "No roster usernames to fetch",
          variant: "destructive"
        });
        setFetching(false);
        return;
      }
      
      // Use transform outputs for API calls
      const params = new URLSearchParams({
        user_id: loginListCsv,  // Changed from user_login to user_id
        d1: windowStart,
        d2: windowEnd,
        per_page: '200',
        order: 'desc',
        order_by: 'created_at'
      });
      
      // Add project_id only if not empty
      if (projectIdOutput) {
        params.set('project_id', projectIdOutput);
      }

      // 3-5) Fetch 3 pages
      const [page1, page2, page3] = await Promise.all([
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=1`).then(r => r.json()),
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=2`).then(r => r.json()),
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=3`).then(r => r.json())
      ]);

      const merged = []
        .concat(page1.results || [])
        .concat(page2.results || [])
        .concat(page3.results || []);

      // Count observations for ALL roster users
      const counts: Record<string, number> = {};
      const seen = new Set<string>();
      
      const allLogins = loginListCsv.split(',').filter(Boolean);
      const allLoginsLC = allLogins.map(u => u.toLowerCase());

      // Build user meta for trophy computation
      const userMeta: Record<string, { isAdult: boolean }> = {};
      for (const r of roster) {
        const login = (r.inat_login || '').toLowerCase();
        if (login) {
          userMeta[login] = { isAdult: !!r.exclude_from_scoring };
        }
      }

      for (const obs of merged) {
        const u = (obs?.user?.login || '').toLowerCase();
        if (!u) continue;
        seen.add(u);
        if (allLoginsLC.includes(u)) {
          counts[u] = (counts[u] || 0) + 1;
        }
      }

      // Build payload using ALL logins
      const payload = allLogins.map(u => ({
        inat_login: u,
        obs_count: counts[u.toLowerCase()] || 0
      }));
      
      // Build preview with is_adult flag
      const preview = roster.map(r => ({
        user: r.inat_login,
        obs_count: counts[(r.inat_login || '').toLowerCase()] || 0,
        is_adult: !!r.exclude_from_scoring
      }));

      // Compute trophies
      const getLatLng = (o: any) => {
        if (o.geojson?.coordinates && Array.isArray(o.geojson.coordinates)) {
          const [lng, lat] = o.geojson.coordinates;
          return { lat, lng };
        }
        if (typeof o.location === 'string' && o.location.includes(',')) {
          const [latS, lngS] = o.location.split(',');
          return { lat: +latS, lng: +lngS };
        }
        if (o.latitude && o.longitude) {
          return { lat: +o.latitude, lng: +o.longitude };
        }
        return null;
      };

      const inBox = (pt: { lat: number; lng: number }, z: Zone) => {
        return pt.lat >= (z.min_lat || 0) && pt.lat <= (z.max_lat || 0) &&
               pt.lng >= (z.min_lng || 0) && pt.lng <= (z.max_lng || 0);
      };

      const inCircle = (pt: { lat: number; lng: number }, z: Zone) => {
        const R = 6371000;
        const dLat = (pt.lat - (z.center_lat || 0)) * Math.PI / 180;
        const dLng = (pt.lng - (z.center_lng || 0)) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos((z.center_lat || 0) * Math.PI / 180) * 
                  Math.cos(pt.lat * Math.PI / 180) * 
                  Math.sin(dLng / 2) ** 2;
        const d = 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return d <= (z.radius_m || 0);
      };

      const isTurtle = (o: any) => {
        const t = o.taxon || {};
        const n1 = (t.name || '').toLowerCase();
        const n2 = (t.preferred_common_name || '').toLowerCase();
        return n1.includes('testudines') || n1.includes('cheloni') || n2.includes('turtle');
      };

      const zoneCounts: Record<string, Record<string, number>> = {};
      const turtleCounts: Record<string, number> = {};

      for (const o of merged) {
        const u = (o?.user?.login || '').toLowerCase();
        if (!u) continue;

        const pt = getLatLng(o);
        if (pt) {
          for (const z of zones) {
            const hit = z.kind === 'box' ? inBox(pt, z) : inCircle(pt, z);
            if (hit) {
              zoneCounts[z.label] ??= {};
              zoneCounts[z.label][u] = (zoneCounts[z.label][u] || 0) + 1;
            }
          }
        }

        if (isTurtle(o)) {
          turtleCounts[u] = (turtleCounts[u] || 0) + 1;
        }
      }

      const isAdult = (u: string) => !!userMeta[u]?.isAdult;

      const winner = (map: Record<string, number>, studentsOnly: boolean): TrophyWinner => {
        let bestU: string | null = null;
        let best = 0;
        for (const [u, c] of Object.entries(map)) {
          if (studentsOnly && isAdult(u)) continue;
          if (c > best) {
            best = c;
            bestU = u;
          }
        }
        return bestU ? { user: bestU, count: best, is_adult: isAdult(bestU) } : null;
      };

      const zoneTrophies = zones.map(z => {
        const counts = zoneCounts[z.label] || {};
        return {
          label: z.label,
          overall: winner(counts, false),
          student: winner(counts, true)
        };
      });

      const turtleOverall = winner(turtleCounts, false);
      const turtleStudent = winner(turtleCounts, true);

      const trophyResults: TrophyResults = {
        zones: zoneTrophies,
        turtles: {
          overall: turtleOverall,
          student: turtleStudent
        }
      };
      
      // Store diagnostics
      const uniqueObservers = Array.from(seen);
      setDebugTotalResults(merged.length);
      setDebugUniqueObservers(uniqueObservers);
      setDebugUnrosteredObservers(uniqueObservers.filter(u => !allLoginsLC.includes(u)));

      setInatPayload(JSON.stringify(payload));
      setPreview(preview);
      setAppTrophies(trophyResults);
      
      // 7) Show success toast
      toast({ 
        title: `Fetched ${merged.length} observations for ${uniqueObservers.length} users`
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }

  async function saveSnapshot() {
    if (!adminPin) {
      toast({ title: 'Error', description: 'Admin PIN required', variant: 'destructive' });
      return;
    }
    
    if (!inatPayload) {
      toast({ title: 'Error', description: 'No data to save. Fetch from iNaturalist first.', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      // ds_upsert_scores: call public.upsert_daily_scores RPC
      const { data, error } = await supabase.rpc('upsert_daily_scores', {
        p_window_label: windowLabel,
        p_scored_on: scoredOn,
        p_payload: JSON.parse(inatPayload),
        p_admin_pin: adminPin
      });

      if (error) throw error;

      const upsertedCount = data || 0;
      toast({ title: 'Success', description: `Saved ${upsertedCount} rows` });
      
      // Refresh both leaderboards
      loadLeaderboards();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function syncRoster() {
    if (!adminPin) {
      toast({ title: 'Error', description: 'Admin PIN required', variant: 'destructive' });
      return;
    }
    
    setSyncing(true);
    try {
      // ds_sync_roster: Call RPC sync_roster_student_identities
      const { data, error } = await supabase.rpc('sync_roster_student_identities', {
        p_admin_pin: adminPin
      });

      if (error) throw error;

      // Handle different possible response structures
      const insertedCount = typeof data === 'number' ? data : (data?.[0]?.sync_roster_student_identities || data?.[0]?.count || data || 0);
      
      // Refresh ds_roster_public
      await loadRoster();
      
      // Run xform_build_inat_payload (update transform inputs only, no iNat fetch)
      updateTransformInputs();
      
      toast({ 
        title: 'Roster synced', 
        description: `Added ${insertedCount} new user${insertedCount !== 1 ? 's' : ''}. Preview updated.`
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Top bar */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">Window</label>
          <select 
            value={windowLabel} 
            onChange={e => setWindowLabel(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {windows.map(w => (
              <option key={w.id} value={w.label}>{w.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Snapshot date</label>
          <input 
            type="date" 
            value={scoredOn}
            onChange={e => setScoredOn(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Admin PIN</label>
          <input 
            type="password" 
            value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>

        <button 
          onClick={fetchFromINat}
          disabled={fetching}
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {fetching ? 'Fetching...' : 'Fetch from iNaturalist'}
        </button>

        <button 
          onClick={saveSnapshot}
          disabled={saving || !inatPayload}
          className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Snapshot'}
        </button>

        <button 
          onClick={syncRoster}
          disabled={syncing}
          className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync roster'}
        </button>
      </div>

      {/* Preview section - xform_build_inat_payload.preview_rows */}
      {preview.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Preview counts</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-1 text-left">User</th>
                  <th className="border px-3 py-1 text-left">Obs Count</th>
                  <th className="border px-3 py-1 text-left">Adult</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-1">{row.user}</td>
                    <td className="border px-3 py-1">{row.obs_count}</td>
                    <td className="border px-3 py-1">{row.is_adult ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Debug card */}
      {(windowStart || windowEnd || loginListCsv) && (
        <div className="bg-gray-50 border rounded p-3">
          <h3 className="font-semibold mb-2 text-sm">Debug</h3>
          <div className="text-xs space-y-1 font-mono">
            <div><span className="font-semibold">Window:</span> {windowLabel}</div>
            <div><span className="font-semibold">Params:</span> {JSON.stringify(debugParams)}</div>
            <div><span className="font-semibold">d1:</span> {windowStart}</div>
            <div><span className="font-semibold">d2:</span> {windowEnd}</div>
            <div><span className="font-semibold">logins:</span> {loginListCsv}</div>
            {debugTotalResults > 0 && (
              <>
                <div className="mt-2 pt-2 border-t">
                  <span className="font-semibold">Total results:</span> {debugTotalResults}
                </div>
                <div>
                  <span className="font-semibold">Unique observers:</span> {debugUniqueObservers.join(', ')}
                </div>
                {debugUnrosteredObservers.length > 0 && (
                  <div className="text-orange-600">
                    <span className="font-semibold">Unrostered:</span> {debugUnrosteredObservers.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard section */}
      <div>
        <h3 className="font-semibold mb-2">Unified Leaderboard</h3>
        {unifiedLeaderboard.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No scores yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-1 text-left">Student Rank</th>
                  <th className="border px-3 py-1 text-left">Name</th>
                  <th className="border px-3 py-1 text-left">Obs Count</th>
                  <th className="border px-3 py-1 text-center">Exhibition</th>
                </tr>
              </thead>
              <tbody>
                {unifiedLeaderboard.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-1">{row.official_rank || ''}</td>
                    <td className="border px-3 py-1">{row.display_label}</td>
                    <td className="border px-3 py-1">{row.obs_count}</td>
                    <td className="border px-3 py-1 text-center">{row.exhibition ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
