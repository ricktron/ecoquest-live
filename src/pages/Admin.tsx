import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/hooks/use-toast';
import { TrophyResults, RosterRow, TrophyWinner, ZoneTrophy } from '@/types/trophies';
import { format, subYears } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ZONES_DEFAULT, ZoneDef } from '@/lib/zones';

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
  setInatResults: (results: any[]) => void;
  setInatParams: (params: { user_id: string; d1: string; d2: string; project_id: string } | null) => void;
  setZoneDefs: (zones: ZoneDef[] | null) => void;
};

export default function Admin({ setTrophies: setAppTrophies, setRoster: setAppRoster, setInatResults, setInatParams, setZoneDefs }: AdminProps) {
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
  const [lastUpdated, setLastUpdated] = useState<Array<{ label: string; last_updated: string }>>([]);
  const [zonesDialogOpen, setZonesDialogOpen] = useState(false);
  const [zonesJson, setZonesJson] = useState('');
  const [scoreChanges, setScoreChanges] = useState<Array<{
    changed_at: string;
    scored_on: string;
    display_label: string | null;
    change_kind: string;
    delta: number;
    new_count: number;
  }>>([]);
  const [loadingScoreChanges, setLoadingScoreChanges] = useState(false);
  const [auditDays, setAuditDays] = useState(30);
  const [auditLimit, setAuditLimit] = useState(200);
  const [verifyLogins, setVerifyLogins] = useState<string[]>([]);
  const [diagDays, setDiagDays] = useState(30);
  const [diagLimit, setDiagLimit] = useState(200);
  const [diagPayload, setDiagPayload] = useState<any>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagVerifyLoginsText, setDiagVerifyLoginsText] = useState('fpelzel,sofiamia41');

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
      loadLastUpdated();
      
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

  async function loadLastUpdated() {
    const { data, error } = await supabase
      .from('daily_scores')
      .select('window_id, updated_at')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error loading last updated:', error);
      return;
    }

    // Get window labels
    const windowIds = [...new Set(data?.map(d => d.window_id) || [])];
    const windowMap = new Map();
    
    for (const wid of windowIds) {
      const { data: winData } = await supabase
        .from('trip_windows')
        .select('label')
        .eq('id', wid)
        .maybeSingle();
      if (winData?.label) {
        windowMap.set(wid, winData.label);
      }
    }

    // Group by window and get max updated_at
    const grouped = new Map<string, string>();
    for (const row of data || []) {
      const label = windowMap.get(row.window_id);
      if (label) {
        if (!grouped.has(label) || row.updated_at > grouped.get(label)!) {
          grouped.set(label, row.updated_at);
        }
      }
    }

    const result = Array.from(grouped.entries()).map(([label, last_updated]) => ({
      label,
      last_updated
    }));
    
    setLastUpdated(result);
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
        user_id: loginListCsv,
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

      // Fetch first page to get total_results
      const firstResponse = await fetch(`https://api.inaturalist.org/v1/observations?${params}&page=1`).then(r => r.json());
      const totalResults = firstResponse.total_results || 0;
      const estimatedPages = Math.min(Math.ceil(totalResults / 200), 10);
      
      toast({ title: `Fetching page 1 of ~${estimatedPages}…` });

      let merged = firstResponse.results || [];
      let currentPage = 1;

      // Continue fetching until we have all results or hit page 10
      while (merged.length < totalResults && currentPage < 10) {
        currentPage++;
        toast({ title: `Fetching page ${currentPage} of ~${estimatedPages}…` });
        
        const pageResponse = await fetch(`https://api.inaturalist.org/v1/observations?${params}&page=${currentPage}`).then(r => r.json());
        const pageResults = pageResponse.results || [];
        
        if (pageResults.length === 0) break;
        
        merged = merged.concat(pageResults);
      }

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
      
      // Persist iNat results and params in app state
      setInatResults(merged);
      setInatParams({
        user_id: loginListCsv,
        d1: windowStart,
        d2: windowEnd,
        project_id: projectIdOutput
      });
      
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

  async function loadVerifyLogins() {
    try {
      const { data, error } = await supabase
        .from('roster')
        .select('inat_login')
        .in('inat_login', ['fpelzel', 'sofiamia41'])
        .order('inat_login');

      if (error) throw error;
      setVerifyLogins(data?.map(r => r.inat_login) || []);
    } catch (e: any) {
      console.error('Error loading verify logins:', e.message);
    }
  }

  async function syncRoster() {
    if (!adminPin) {
      toast({ title: 'Error', description: 'Admin PIN required', variant: 'destructive' });
      return;
    }
    
    setSyncing(true);
    try {
      // Call RPC sync_roster_student_identities
      const { data: rowsTouched, error } = await supabase.rpc('sync_roster_student_identities', {
        p_admin_pin: adminPin
      });

      if (error) throw error;
      
      // Refresh ds_roster_public
      await loadRoster();
      
      // Refresh verify table
      await loadVerifyLogins();
      
      // Run xform_build_inat_payload (update transform inputs only, no iNat fetch)
      updateTransformInputs();
      
      toast({ 
        title: `Roster synced (${rowsTouched || 0} changes).`
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }

  function testLastFiveYears() {
    const today = new Date();
    const fiveYearsAgo = subYears(today, 5);
    
    setUseCustomDates(true);
    setD1Custom(format(fiveYearsAgo, 'yyyy-MM-dd'));
    setD2Custom(format(today, 'yyyy-MM-dd'));
    
    // Run updateTransformInputs on next tick to ensure state is updated
    setTimeout(() => {
      updateTransformInputs();
      toast({ title: 'Using last 5 years (custom dates)' });
    }, 0);
  }

  function openZonesDialog() {
    setZonesJson(JSON.stringify(ZONES_DEFAULT, null, 2));
    setZonesDialogOpen(true);
  }

  function saveZones() {
    try {
      const parsed = JSON.parse(zonesJson);
      if (!Array.isArray(parsed)) {
        throw new Error('Zones must be an array');
      }
      setZoneDefs(parsed);
      setZonesDialogOpen(false);
      toast({ title: 'Zones updated (not persisted)' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  }

  async function loadScoreChanges() {
    if (!adminPin) {
      toast({ title: 'Error', description: 'Admin PIN required', variant: 'destructive' });
      return;
    }

    setLoadingScoreChanges(true);
    try {
      const { data, error } = await supabase.rpc('get_score_changes_admin', {
        p_admin_pin: adminPin,
        p_limit_days: auditDays,
        p_limit_rows: auditLimit,
        p_window_label: windowLabel
      });

      if (error) throw error;

      setScoreChanges(data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoadingScoreChanges(false);
    }
  }

  async function generateDiagnostics() {
    if (!adminPin) {
      toast({ title: 'Error', description: 'Admin PIN required', variant: 'destructive' });
      return;
    }

    setDiagLoading(true);
    try {
      const diagVerifyLoginsArray = diagVerifyLoginsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase.rpc('admin_diag_v2', {
        p_window_label: windowLabel,
        p_limit_days: diagDays,
        p_limit_rows: diagLimit,
        p_verify_logins: diagVerifyLoginsArray
      });

      if (error) throw error;

      const payload = data?.[0]?.payload || data?.payload || data;
      setDiagPayload(payload);
      toast({ title: 'Diagnostics generated.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDiagLoading(false);
    }
  }

  function copyDiagnosticsJSON() {
    if (!diagPayload) {
      toast({ title: 'Error', description: 'No diagnostics data available', variant: 'destructive' });
      return;
    }
    
    navigator.clipboard.writeText(JSON.stringify(diagPayload, null, 2));
    toast({ title: 'Diagnostics JSON copied.' });
  }

  function copyDiagnosticsMarkdown() {
    if (!diagPayload) {
      toast({ title: 'Error', description: 'No diagnostics data available', variant: 'destructive' });
      return;
    }

    let markdown = `# EcoQuest Diagnostics\n`;
    markdown += `- Window: ${diagPayload.window?.label || 'N/A'}\n`;
    markdown += `- Latest snapshot: ${diagPayload.latest_scored_on || 'N/A'}\n`;
    markdown += `- Generated: ${diagPayload.generated_at || 'N/A'}\n\n`;

    markdown += `## Roster summary\n`;
    markdown += `| total | students | adults | exhibition |\n`;
    markdown += `| ---: | ---: | ---: | ---: |\n`;
    const rs = diagPayload.roster_summary || {};
    markdown += `| ${rs.total || 0} | ${rs.students || 0} | ${rs.adults || 0} | ${rs.exhibition || 0} |\n\n`;

    markdown += `### Coverage\n`;
    markdown += `${diagPayload.participants_latest || 0} / ${diagPayload.roster_total || 0}\n\n`;

    markdown += `## Leaderboard (latest)\n`;
    markdown += `| Name | Obs | Exhibition |\n`;
    markdown += `| --- | ---:| :--: |\n`;
    (diagPayload.leaderboard || []).forEach((row: any) => {
      markdown += `| ${row.display_label || ''} | ${row.obs_count || 0} | ${row.exhibition ? '✓' : ''} |\n`;
    });
    markdown += `\n`;

    markdown += `### Verify logins\n`;
    markdown += `| login | in roster | on leaderboard | obs |\n`;
    markdown += `| --- | :--: | :--: | ---: |\n`;
    (diagPayload.verify || []).forEach((row: any) => {
      markdown += `| ${row.login || ''} | ${row.in_roster ? '✓' : ''} | ${row.on_leaderboard ? '✓' : ''} | ${row.obs_count || 0} |\n`;
    });
    markdown += `\n`;

    markdown += `### Anomalies\n`;
    const anom = diagPayload.anomalies || {};
    markdown += `- Duplicate roster logins: ${anom.duplicate_roster_logins?.length || 0}\n`;
    markdown += `- Roster rows missing names: ${anom.roster_missing_names?.length || 0}\n`;
    markdown += `- Active iNat identities not in roster: ${anom.active_ids_not_in_roster?.length || 0}\n`;
    markdown += `- Roster without active iNat identity: ${anom.roster_without_active_id?.length || 0}\n`;
    
    // Add first 25 items from each list
    if (anom.duplicate_roster_logins?.length > 0) {
      markdown += `\n**Duplicate roster logins (first 25):**\n`;
      (anom.duplicate_roster_logins.slice(0, 25) || []).forEach((item: any) => {
        markdown += `- ${item}\n`;
      });
    }
    if (anom.roster_missing_names?.length > 0) {
      markdown += `\n**Roster rows missing names (first 25):**\n`;
      (anom.roster_missing_names.slice(0, 25) || []).forEach((item: any) => {
        markdown += `- ${item}\n`;
      });
    }
    if (anom.active_ids_not_in_roster?.length > 0) {
      markdown += `\n**Active iNat identities not in roster (first 25):**\n`;
      (anom.active_ids_not_in_roster.slice(0, 25) || []).forEach((item: any) => {
        markdown += `- ${item}\n`;
      });
    }
    if (anom.roster_without_active_id?.length > 0) {
      markdown += `\n**Roster without active iNat identity (first 25):**\n`;
      (anom.roster_without_active_id.slice(0, 25) || []).forEach((item: any) => {
        markdown += `- ${item}\n`;
      });
    }
    markdown += `\n`;

    markdown += `## Recent audit (${diagDays} days, up to ${diagLimit})\n`;
    markdown += `| Time | Snapshot | Name | Kind | Δ | New |\n`;
    markdown += `| --- | --- | --- | --- | ---: | ---: |\n`;
    (diagPayload.audit || []).forEach((row: any) => {
      markdown += `| ${row.changed_at || ''} | ${row.scored_on || ''} | ${row.display_label || ''} | ${row.kind || ''} | ${row.delta || 0} | ${row.new || 0} |\n`;
    });
    markdown += `\n`;

    markdown += `## Roster sample (up to 500)\n`;
    markdown += `| Name | iNat | Adult | Exhibition |\n`;
    markdown += `| --- | --- | :--: | :--: |\n`;
    (diagPayload.roster_sample || []).forEach((row: any) => {
      markdown += `| ${row.display_name || ''} | ${row.inat_login || ''} | ${row.is_adult ? '✓' : ''} | ${row.exhibition ? '✓' : ''} |\n`;
    });

    navigator.clipboard.writeText(markdown);
    toast({ title: 'Diagnostics Markdown copied.' });
  }

  function seedMockINat() {
    // Mock observations with turtles and zone-specific observations
    const mockObservations = [
      // Turtle observations
      {
        id: 'mock-1',
        user: { login: 'student1' },
        taxon: {
          name: 'Testudines',
          ancestor_ids: [26036],
          preferred_common_name: 'Turtle'
        },
        geojson: { coordinates: [-84.175, 9.970] }, // river zone
        latitude: 9.970,
        longitude: -84.175
      },
      {
        id: 'mock-2',
        user: { login: 'student1' },
        taxon: {
          name: 'Chelonia mydas',
          ancestor_ids: [26036],
          preferred_common_name: 'Green Sea Turtle'
        },
        geojson: { coordinates: [-84.980, 9.620] }, // beach zone
        latitude: 9.620,
        longitude: -84.980
      },
      {
        id: 'mock-3',
        user: { login: 'instructor1' },
        taxon: {
          name: 'Trachemys scripta',
          ancestor_ids: [26036],
          preferred_common_name: 'Pond Slider'
        },
        geojson: { coordinates: [-84.290, 9.810] }, // hotel zone
        latitude: 9.810,
        longitude: -84.290
      },
      // Mixed observations in different zones
      {
        id: 'mock-4',
        user: { login: 'student2' },
        taxon: {
          name: 'Morpho peleides',
          ancestor_ids: [47157, 47158],
          preferred_common_name: 'Blue Morpho'
        },
        geojson: { coordinates: [-84.180, 9.975] }, // river zone
        latitude: 9.975,
        longitude: -84.180
      },
      {
        id: 'mock-5',
        user: { login: 'student2' },
        taxon: {
          name: 'Alouatta palliata',
          ancestor_ids: [40151],
          preferred_common_name: 'Mantled Howler'
        },
        geojson: { coordinates: [-84.975, 9.615] }, // beach zone
        latitude: 9.615,
        longitude: -84.975
      },
      {
        id: 'mock-6',
        user: { login: 'student3' },
        taxon: {
          name: 'Heliconia',
          ancestor_ids: [47125],
          preferred_common_name: 'Lobster Claw'
        },
        geojson: { coordinates: [-84.295, 9.815] }, // hotel zone
        latitude: 9.815,
        longitude: -84.295
      },
      {
        id: 'mock-7',
        user: { login: 'student3' },
        taxon: {
          name: 'Basiliscus plumifrons',
          ancestor_ids: [26036],
          preferred_common_name: 'Green Basilisk'
        },
        geojson: { coordinates: [-84.185, 9.965] }, // river zone
        latitude: 9.965,
        longitude: -84.185
      }
    ];

    setInatResults(mockObservations);
    setInatParams({
      user_id: 'mock_users',
      d1: windowStart || '2020-10-13',
      d2: windowEnd || '2025-10-13',
      project_id: projectIdOutput || ''
    });

    toast({ title: 'Mock observations loaded' });
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
          onClick={syncRoster}
          disabled={syncing}
          className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync roster'}
        </button>

        {/* Verify logins table */}
        {verifyLogins.length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 border rounded">
            <h4 className="text-xs font-semibold mb-1">Verify Logins</h4>
            <div className="text-xs space-y-0.5">
              {verifyLogins.map((login, i) => (
                <div key={i}>{login}</div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={testLastFiveYears}
          className="px-4 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
        >
          Test: last 5 years
        </button>

        <button 
          onClick={seedMockINat}
          className="px-4 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Seed mock iNat
        </button>

        <Dialog open={zonesDialogOpen} onOpenChange={setZonesDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={openZonesDialog}>
              Edit Zones
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Zone Definitions</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <textarea
                value={zonesJson}
                onChange={e => setZonesJson(e.target.value)}
                className="w-full h-64 border rounded p-2 font-mono text-sm"
                placeholder="Enter zones JSON..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setZonesDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveZones}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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

      {/* Audit section */}
      {adminPin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Audit</CardTitle>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Days:</label>
                <input
                  type="number"
                  value={auditDays}
                  onChange={(e) => setAuditDays(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="1"
                />
                <label className="text-sm font-medium ml-2">Limit:</label>
                <input
                  type="number"
                  value={auditLimit}
                  onChange={(e) => setAuditLimit(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadScoreChanges}
                  disabled={loadingScoreChanges}
                >
                  {loadingScoreChanges ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {scoreChanges.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No score changes yet. Click Refresh to load.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border px-3 py-2 text-left text-sm font-medium">Time</th>
                      <th className="border px-3 py-2 text-left text-sm font-medium">Snapshot</th>
                      <th className="border px-3 py-2 text-left text-sm font-medium">Name</th>
                      <th className="border px-3 py-2 text-left text-sm font-medium">Change</th>
                      <th className="border px-3 py-2 text-right text-sm font-medium">Δ</th>
                      <th className="border px-3 py-2 text-right text-sm font-medium">New</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreChanges.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-muted/50' : ''}>
                        <td className="border px-3 py-2 text-sm">{new Date(row.changed_at).toLocaleString()}</td>
                        <td className="border px-3 py-2 text-sm">{row.scored_on}</td>
                        <td className="border px-3 py-2 text-sm">{row.display_label || '—'}</td>
                        <td className="border px-3 py-2 text-sm">{row.change_kind}</td>
                        <td className={`border px-3 py-2 text-sm text-right font-mono ${
                          row.delta > 0 ? 'text-green-600' : row.delta < 0 ? 'text-red-600' : ''
                        }`}>
                          {row.delta}
                        </td>
                        <td className="border px-3 py-2 text-sm text-right font-mono">{row.new_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnostics section */}
      {adminPin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Diagnostics</CardTitle>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Days:</label>
                <input
                  type="number"
                  value={diagDays}
                  onChange={(e) => setDiagDays(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="1"
                />
                <label className="text-sm font-medium ml-2">Limit:</label>
                <input
                  type="number"
                  value={diagLimit}
                  onChange={(e) => setDiagLimit(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min="1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={generateDiagnostics}
                  disabled={diagLoading}
                >
                  {diagLoading ? 'Generating...' : 'Generate diagnostics'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyDiagnosticsJSON}
                  disabled={!diagPayload}
                >
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyDiagnosticsMarkdown}
                  disabled={!diagPayload}
                >
                  Copy Markdown
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">Verify logins:</label>
              <input
                type="text"
                value={diagVerifyLoginsText}
                onChange={(e) => setDiagVerifyLoginsText(e.target.value)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                placeholder="comma-separated logins (e.g., fpelzel, sofiamia41)"
              />
              <span 
                className="text-muted-foreground cursor-help text-xs"
                title="Checks whether these iNat usernames exist in the roster and appear on the latest leaderboard for the selected window."
              >
                ℹ️
              </span>
            </div>

            {!diagPayload ? (
              <div className="text-center text-muted-foreground py-8">No diagnostics yet. Click Generate diagnostics to load.</div>
            ) : (
              <div className="space-y-4">
                {/* Summary panel */}
                <div className="bg-muted/50 p-4 rounded border">
                  <h4 className="font-semibold text-sm mb-2">Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Latest scored:</span>
                      <div className="font-medium">{diagPayload.latest_scored_on || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coverage:</span>
                      <div className="font-medium">
                        {diagPayload.participants_latest || 0} / {diagPayload.roster_total || 0}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Audit rows:</span>
                      <div className="font-medium">{diagPayload.audit?.length || 0}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Anomalies:</span>
                      <div className="font-medium">
                        {((diagPayload.anomalies?.duplicate_roster_logins?.length || 0) +
                          (diagPayload.anomalies?.roster_missing_names?.length || 0) +
                          (diagPayload.anomalies?.active_ids_not_in_roster?.length || 0) +
                          (diagPayload.anomalies?.roster_without_active_id?.length || 0))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Anomaly details */}
                  {diagPayload.anomalies && (
                    <div className="mt-3 pt-3 border-t space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">• Duplicate roster logins:</span> {diagPayload.anomalies.duplicate_roster_logins?.length || 0}
                      </div>
                      <div>
                        <span className="text-muted-foreground">• Roster rows missing names:</span> {diagPayload.anomalies.roster_missing_names?.length || 0}
                      </div>
                      <div>
                        <span className="text-muted-foreground">• Active IDs not in roster:</span> {diagPayload.anomalies.active_ids_not_in_roster?.length || 0}
                      </div>
                      <div>
                        <span className="text-muted-foreground">• Roster without active ID:</span> {diagPayload.anomalies.roster_without_active_id?.length || 0}
                      </div>
                    </div>
                  )}

                  {/* Verify table */}
                  {diagPayload.verify && diagPayload.verify.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-xs font-semibold mb-2">Verify Logins</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border px-2 py-1 text-left">Login</th>
                              <th className="border px-2 py-1 text-center">In Roster</th>
                              <th className="border px-2 py-1 text-center">On Leaderboard</th>
                              <th className="border px-2 py-1 text-right">Obs</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diagPayload.verify.map((row: any, i: number) => (
                              <tr key={i}>
                                <td className="border px-2 py-1">{row.login}</td>
                                <td className="border px-2 py-1 text-center">{row.in_roster ? '✓' : ''}</td>
                                <td className="border px-2 py-1 text-center">{row.on_leaderboard ? '✓' : ''}</td>
                                <td className="border px-2 py-1 text-right">{row.obs_count || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* JSON preview */}
                <div className="overflow-x-auto">
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                    <code>{JSON.stringify(diagPayload, null, 2)}</code>
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard section */}
      <div>
        <div className="flex items-baseline gap-3 mb-2">
          <h3 className="font-semibold">Unified Leaderboard</h3>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Leaderboards update automatically from the scheduled job.</span>
            <span>
              Last updated: {lastUpdated.find(r => r.label === windowLabel)?.last_updated 
                ? new Date(lastUpdated.find(r => r.label === windowLabel)!.last_updated).toLocaleString()
                : '—'}
            </span>
          </div>
        </div>
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
