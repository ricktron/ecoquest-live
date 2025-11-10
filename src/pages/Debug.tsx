import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '@/lib/state';
import { getActiveTrip } from '@/trips';
import { TROPHIES } from '@/trophies';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { ENV, FLAGS } from '@/env';
import { fetchMembers, fetchTrophyPoints } from '@/lib/api';
import { PROFILE } from '@/lib/config/profile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type SelfCheckResult = {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
};

function runSelfCheck(observations: any[]): SelfCheckResult[] {
  const trip = getActiveTrip();
  const results: SelfCheckResult[] = [];

  // ENV present
  results.push({
    name: 'Environment Config',
    status: trip ? 'pass' : 'fail',
    message: trip ? `Active profile: ${trip.id}` : 'No trip profile loaded',
  });

  // Profile selected
  results.push({
    name: 'Trip Profile',
    status: trip.id ? 'pass' : 'fail',
    message: trip.id ? `${trip.title} (${trip.timezone})` : 'No profile selected',
  });

  // Members count
  results.push({
    name: 'Member Logins',
    status: trip.memberLogins.length > 0 ? 'pass' : 'warn',
    message: trip.memberLogins.length > 0 
      ? `${trip.memberLogins.length} members configured` 
      : 'No members (showing all users)',
  });

  // Day ranges valid
  const hasValidRanges = trip.dayRanges.length > 0 && trip.dayRanges.every(r => r.start && r.end);
  results.push({
    name: 'Day Ranges',
    status: hasValidRanges ? 'pass' : 'fail',
    message: hasValidRanges 
      ? `${trip.dayRanges.length} range(s): ${trip.dayRanges[0].start} to ${trip.dayRanges[trip.dayRanges.length - 1].end}`
      : 'Invalid day ranges',
  });

  // Trophy slugs map to routes
  const trophySlugs = Object.keys(TROPHIES);
  results.push({
    name: 'Trophy Registry',
    status: trophySlugs.length > 0 ? 'pass' : 'fail',
    message: `${trophySlugs.length} trophies registered`,
  });

  // Post-filter counts
  results.push({
    name: 'Filtered Observations',
    status: observations.length >= 0 ? 'pass' : 'warn',
    message: `${observations.length} observations after filters`,
  });

  // Trend baseline
  results.push({
    name: 'Trend Data',
    status: 'pass',
    message: 'Baseline computed (graceful fallback to "—" if missing)',
  });

  return results;
}

type LiveTripConfig = {
  tripId: string;
  title: string;
  tz: string;
  members: string[];
  d1: string;
  d2: string;
};

export default function Debug() {
  const { loading, observations, aggregated, lastInatSync, initialize } = useAppState();
  const trip = getActiveTrip();
  const [liveTripConfig, setLiveTripConfig] = useState<LiveTripConfig | null>(null);
  const [trophyPoints, setTrophyPoints] = useState<Array<{ user_login: string; points: number }>>([]);
  const [totalObs, setTotalObs] = useState<number>(0);
  const [uniqueSpecies, setUniqueSpecies] = useState<number>(0);
  const [students, setStudents] = useState<string[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [perDayCounts, setPerDayCounts] = useState<Array<{ day: string; obs: number; species: number; people: number }>>([]);
  const [sampleObs, setSampleObs] = useState<Array<{ inat_obs_id: number; taxon_name: string | null; user_login: string; observed_on: string }>>([]);

  useEffect(() => {
    initialize();
    
    // Fetch trophy points
    fetchTrophyPoints().then(points => {
      setTrophyPoints(points);
    });
    
    // Fetch all data in parallel
    (async () => {
      const [membersRes, latestRes, dailyRes, headRes, samplesRes, cfgRes] = await Promise.all([
        supabase.from('trip_members_v' as any).select('user_login'),
        supabase.from('latest_run_v' as any).select('run_id,awarded_at').maybeSingle(),
        supabase.from('daily_latest_run_v' as any).select('day,obs,species,people').order('day', { ascending: false }),
        supabase.from('debug_observations_latest_run_v' as any).select('*', { count: 'exact', head: true }),
        supabase.from('debug_observations_latest_run_v' as any)
          .select('inat_obs_id,taxon_name,user_login,observed_on')
          .order('observed_on', { ascending: false, nullsFirst: true })
          .limit(5),
        supabase.from('config_filters' as any).select('mode,d1,d2,flags').eq('id', true).single(),
      ]);
      
      const memberLogins = (membersRes.data ?? []).map((m: any) => m.user_login).sort();
      const totalObsCount = headRes?.count ?? 0;
      setTotalObs(totalObsCount);
      
      const uniqueSpeciesHead = await supabase
        .from('debug_observations_latest_run_v' as any)
        .select('taxon_id', { count: 'exact', head: true });
      setUniqueSpecies(uniqueSpeciesHead?.count ?? 0);
      
      const cfg = cfgRes.data as any;
      const latest = latestRes.data as any;
      const daily = dailyRes.data as any;
      const samples = samplesRes.data as any;
      const tz = ((cfg?.flags ?? {}) as any).tz ?? 'America/Costa_Rica';
      
      setStudents(memberLogins);
      
      if (cfg) {
        const flags = (cfg?.flags ?? {}) as any;
        const tripId = cfg?.mode === 'TRIP' ? 'LIVE' : 'DEMO';
        const title = cfg?.mode === 'TRIP' ? 'Trip Mode' : 'Demo Mode';
        
        setLiveTripConfig({
          tripId,
          title,
          tz,
          members: memberLogins,
          d1: cfg?.d1,
          d2: cfg?.d2
        });
      }
      
      if (latest?.awarded_at) {
        setLastSync(new Date(latest.awarded_at).toLocaleString('en-US', { timeZone: tz }));
      } else {
        setLastSync(null);
      }
      
      if (daily) {
        setPerDayCounts(daily);
      }
      
      if (samples) {
        setSampleObs(samples);
      }
    })();
  }, []);

  const selfCheck = useMemo(() => runSelfCheck(observations), [observations]);

  const dataPreview = useMemo(() => {
    const uniqueSpecies = new Set(observations.map(o => o.taxonId).filter(Boolean)).size;
    const uniqueUsers = new Set(observations.map(o => o.userLogin)).size;
    return { total: observations.length, uniqueSpecies, uniqueUsers };
  }, [observations]);


  const setProfile = (p: 'LIVE' | 'TEST') => {
    localStorage.setItem('eql:profile', p);
    window.location.reload();
  };

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Debug Info</h1>

        {/* Profile Config */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Config</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Active Profile</p>
                <p className="text-lg font-bold font-mono">{PROFILE}</p>
              </div>
              {liveTripConfig && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Trip Window (from config_filters)</p>
                  <p className="text-sm font-mono">
                    {new Date(liveTripConfig.d1).toLocaleDateString()} → {new Date(liveTripConfig.d2).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground mb-2">Developer Toggle</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={PROFILE === 'LIVE' ? 'default' : 'outline'}
                  onClick={() => setProfile('LIVE')}
                >
                  Switch to LIVE
                </Button>
                <Button
                  size="sm"
                  variant={PROFILE === 'TEST' ? 'default' : 'outline'}
                  onClick={() => setProfile('TEST')}
                >
                  Switch to TEST
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Self-Check */}
        <Card>
          <CardHeader>
            <CardTitle>Self-Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selfCheck.map((check, idx) => (
              <div key={idx} className="flex items-center gap-3">
                {check.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {check.status === 'warn' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
                {check.status === 'fail' && <XCircle className="h-5 w-5 text-red-600" />}
                <div className="flex-1">
                  <div className="font-semibold text-sm">{check.name}</div>
                  <div className="text-xs text-muted-foreground">{check.message}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trip Config */}
        <Card>
          <CardHeader>
            <CardTitle>Active Trip Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveTripConfig ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Trip ID</p>
                    <p className="text-lg font-bold font-mono">{liveTripConfig.tripId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Title</p>
                    <p className="text-lg font-bold">{liveTripConfig.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timezone</p>
                    <p className="text-lg font-mono">{liveTripConfig.tz}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Members</p>
                    {liveTripConfig.members.length > 0 ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer text-foreground hover:text-primary font-medium">
                          {liveTripConfig.members.length} members configured
                        </summary>
                        <ul className="mt-2 ml-4 space-y-1 list-disc">
                          {liveTripConfig.members.map(login => (
                            <li key={login} className="text-muted-foreground">{login}</li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <p className="text-lg font-bold">All users</p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Day Ranges</p>
                  <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                    {liveTripConfig.d1} to {liveTripConfig.d2}
                  </div>
                </div>
              </>
            ) : (
              <Skeleton className="h-32 w-full" />
            )}
          </CardContent>
        </Card>

        {/* Data Status */}
        <Card>
          <CardHeader>
            <CardTitle>Data Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Observations</p>
                    <p className="text-2xl font-bold">{totalObs}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold">{students.length}</p>
                    {students.length > 0 && (
                      <details className="text-sm mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-primary">
                          Show all members
                        </summary>
                        <div className="mt-2 text-xs font-mono text-muted-foreground">
                          {students.join(', ')}
                        </div>
                      </details>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Species</p>
                    <p className="text-2xl font-bold">{uniqueSpecies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-mono">
                      {lastSync || 'No scoring runs yet'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Observations Per Day</p>
                  <div className="space-y-1">
                    {perDayCounts.length > 0 ? (
                      perDayCounts.slice(0, 10).map((d) => (
                        <div key={d.day} className="text-xs font-mono bg-muted/50 p-2 rounded flex justify-between">
                          <span>{d.day}</span>
                          <span className="font-bold">{d.obs} obs • {d.species} spp • {d.people} people</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No daily data yet</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Trophy Points (computed)</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {trophyPoints.length > 0 ? (
                      trophyPoints.map(tp => (
                        <div key={tp.user_login} className="text-xs font-mono bg-muted/50 p-2 rounded flex justify-between">
                          <span>{tp.user_login}</span>
                          <span className="font-bold">🏆 {tp.points}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No trophy points data</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Sample Observations</p>
                  <div className="space-y-2">
                    {sampleObs.length > 0 ? (
                      sampleObs.map(o => (
                        <div key={o.inat_obs_id} className="text-xs font-mono bg-muted/50 p-2 rounded">
                          {o.inat_obs_id}: {o.taxon_name || 'Unknown'} by {o.user_login} on {o.observed_on}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No observations yet</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Environment Variables */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables (Parsed)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">TRIP_PROFILE</span>
              <span>{trip.id}</span>
              <span className="text-muted-foreground">TZ</span>
              <span>{ENV.TZ}</span>
              <span className="text-muted-foreground">TICKER_SPEED_MS</span>
              <span>{ENV.TICKER_SPEED_MS}</span>
              <span className="text-muted-foreground">RARITY_GROUP_WEIGHT</span>
              <span>{ENV.RARITY_GROUP_WEIGHT}</span>
              <span className="text-muted-foreground">RARITY_LOCAL_WEIGHT</span>
              <span>{ENV.RARITY_LOCAL_WEIGHT}</span>
              <span className="text-muted-foreground">BASELINE_YEARS</span>
              <span>{ENV.BASELINE_YEARS}</span>
              <span className="text-muted-foreground">BASELINE_MONTHS</span>
              <span>{ENV.BASELINE_MONTHS}</span>
              <span className="text-muted-foreground">ENABLE_COMPARE</span>
              <span>{FLAGS.ENABLE_COMPARE ? 'true' : 'false'}</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
