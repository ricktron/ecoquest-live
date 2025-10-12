import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';

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

type RosterRow = {
  inat_login: string;
  display_name_ui: string;
  is_adult: boolean;
  exclude_from_scoring: boolean;
};

type LeaderRow = {
  display_label: string;
  obs_count: number;
  exhibition?: boolean;
};

type PreviewRow = {
  user: string;
  obs_count: number;
};

export default function Admin() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [windowLabel, setWindowLabel] = useState('');
  const [scoredOn, setScoredOn] = useState(new Date().toISOString().split('T')[0]);
  const [adminPin, setAdminPin] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [officialLeaderboard, setOfficialLeaderboard] = useState<LeaderRow[]>([]);
  const [publicLeaderboard, setPublicLeaderboard] = useState<LeaderRow[]>([]);
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

  // Load windows and roster on mount
  useEffect(() => {
    loadWindows();
    loadRoster();
  }, []);

  // Load leaderboards and set defaults when window changes
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
  }, [windowLabel, windows]);

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
    
    setRoster(data || []);
  }

  async function loadLeaderboards() {
    if (!windowLabel) return;
    
    // First, get the window_id for the selected label
    const { data: windowData } = await supabase
      .from('trip_windows')
      .select('id')
      .eq('label', windowLabel)
      .single();
    
    if (!windowData?.id) {
      setOfficialLeaderboard([]);
      setPublicLeaderboard([]);
      return;
    }

    // Official leaderboard
    const { data: official } = await supabase
      .from('public_leaderboard_official_v1')
      .select('*')
      .eq('window_id', windowData.id)
      .order('obs_count', { ascending: false })
      .order('display_label', { ascending: true });
    
    setOfficialLeaderboard(official || []);

    // Public leaderboard
    const { data: pub } = await supabase
      .from('public_leaderboard_with_flags_v1')
      .select('*')
      .eq('window_id', windowData.id)
      .order('exhibition', { ascending: true })
      .order('obs_count', { ascending: false })
      .order('display_label', { ascending: true });
    
    setPublicLeaderboard(pub || []);
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
    
    // 5) Build the roster login list, respecting includeAdults
    let filteredRoster = roster;
    if (!includeAdultsComputed) {
      // Filter out rows where exclude_from_scoring=true when includeAdults is false
      filteredRoster = roster.filter(r => !r.exclude_from_scoring);
    }
    
    const logins = filteredRoster.map(r => (r.inat_login || '').trim()).filter(Boolean);
    const loginCsv = logins.join(',');
    
    // Store transform outputs
    setWindowStart(d1);
    setWindowEnd(d2);
    setLoginListCsv(loginCsv);
    setProjectIdOutput(projectId);
    setIncludeAdultsEffective(includeAdultsComputed);
  }

  async function fetchFromINat() {
    setFetching(true);
    try {
      // Update transform first to get latest computed values
      updateTransformInputs();
      
      // Use transform outputs for API calls
      const params = new URLSearchParams({
        user_login: loginListCsv,
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

      // Fetch 3 pages (rest_inat_page1, rest_inat_page2, rest_inat_page3)
      const [page1, page2, page3] = await Promise.all([
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=1`).then(r => r.json()),
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=2`).then(r => r.json()),
        fetch(`https://api.inaturalist.org/v1/observations?${params}&page=3`).then(r => r.json())
      ]);

      const merged = []
        .concat(page1.results || [])
        .concat(page2.results || [])
        .concat(page3.results || []);

      const counts: Record<string, number> = {};
      const seen = new Set<string>();
      
      // Use filtered logins based on includeAdults
      const logins = loginListCsv.split(',').filter(Boolean);
      const loginsLC = logins.map(u => u.toLowerCase());

      for (const obs of merged) {
        const u = (obs?.user?.login || '').toLowerCase();
        if (!u) continue;
        seen.add(u);
        if (!loginsLC.includes(u)) continue;
        counts[u] = (counts[u] || 0) + 1;
      }

      const payload = logins.map(u => ({
        inat_login: u,
        obs_count: counts[u.toLowerCase()] || 0
      }));
      
      // Store diagnostics
      setDebugTotalResults(merged.length);
      setDebugUniqueObservers(Array.from(seen));
      setDebugUnrosteredObservers(Array.from(seen).filter(u => !loginsLC.includes(u)));
      const preview = payload.map(p => ({ user: p.inat_login, obs_count: p.obs_count }));

      setInatPayload(JSON.stringify(payload));
      setPreview(preview);
      
      const uniqueCount = debugUniqueObservers.length;
      toast({ 
        title: 'Fetched', 
        description: `${merged.length} observations for ${uniqueCount} observer${uniqueCount !== 1 ? 's' : ''}`
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
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-1">{row.user}</td>
                    <td className="border px-3 py-1">{row.obs_count}</td>
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

      {/* Leaderboards section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Official Leaderboard</h3>
          {officialLeaderboard.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No scores yet.</div>
          ) : (
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-1 text-left">Display Name</th>
                  <th className="border px-3 py-1 text-left">Obs Count</th>
                </tr>
              </thead>
              <tbody>
                {officialLeaderboard.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-1">{row.display_label}</td>
                    <td className="border px-3 py-1">{row.obs_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Public Leaderboard</h3>
          {publicLeaderboard.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No scores yet.</div>
          ) : (
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-3 py-1 text-left">Exhibition</th>
                  <th className="border px-3 py-1 text-left">Display Name</th>
                  <th className="border px-3 py-1 text-left">Obs Count</th>
                </tr>
              </thead>
              <tbody>
                {publicLeaderboard.map((row, i) => (
                  <tr key={i}>
                    <td className="border px-3 py-1">{row.exhibition ? '✓' : ''}</td>
                    <td className="border px-3 py-1">{row.display_label}</td>
                    <td className="border px-3 py-1">{row.obs_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
