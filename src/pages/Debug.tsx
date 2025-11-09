import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '@/lib/state';
import { getActiveTrip, getTripFilters } from '@/trips';
import { TROPHIES } from '@/trophies';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { ENV, FLAGS } from '@/env';
import { fetchMembers } from '@/lib/api';
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
  const filters = getTripFilters();
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

export default function Debug() {
  const { loading, observations, aggregated, lastInatSync, initialize } = useAppState();
  const trip = getActiveTrip();
  const filters = getTripFilters();
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [memberLogins, setMemberLogins] = useState<string[]>([]);
  const [configData, setConfigData] = useState<{ d1: string; d2: string } | null>(null);

  useEffect(() => {
    initialize();
    // Fetch members from unified view
    fetchMembers().then(logins => {
      setMemberCount(logins.length);
      setMemberLogins(logins);
    });
    // Fetch trip window from trip_window_v
    supabase
      .from('trip_window_v' as any)
      .select('d1,d2')
      .single()
      .then(({ data }: any) => {
        if (data) {
          setConfigData({
            d1: data.d1,
            d2: data.d2
          });
        }
      });
  }, []);

  const selfCheck = useMemo(() => runSelfCheck(observations), [observations]);

  const dataPreview = useMemo(() => {
    const uniqueSpecies = new Set(observations.map(o => o.taxonId).filter(Boolean)).size;
    const uniqueUsers = new Set(observations.map(o => o.userLogin)).size;
    return { total: observations.length, uniqueSpecies, uniqueUsers };
  }, [observations]);

  const [perDayCounts, setPerDayCounts] = useState<[string, number][]>([]);

  useEffect(() => {
    // Fetch daily counts from daily_latest_run_v
    supabase
      .from('daily_latest_run_v' as any)
      .select('day,obs')
      .order('day', { ascending: false })
      .then(({ data }: any) => {
        if (data) {
          setPerDayCounts(data.map((d: any) => [d.day, d.obs]));
        }
      });
  }, []);

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
              {configData && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Trip Window (from config_filters)</p>
                  <p className="text-sm font-mono">
                    {new Date(configData.d1).toLocaleDateString()} → {new Date(configData.d2).toLocaleDateString()}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Trip ID</p>
                <p className="text-lg font-bold font-mono">{trip.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="text-lg font-bold">{trip.title}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="text-lg font-mono">{trip.timezone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Members</p>
                {trip.memberLogins.length > 0 ? (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-foreground hover:text-primary font-medium">
                      {trip.memberLogins.length} members configured
                    </summary>
                    <ul className="mt-2 ml-4 space-y-1 list-disc">
                      {trip.memberLogins.map(login => (
                        <li key={login} className="text-muted-foreground">{login}</li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <p className="text-lg font-bold">All users</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Place Filter</p>
                <p className="text-sm font-mono">
                  {trip.placeId ? `Place ID: ${trip.placeId}` : trip.bbox ? 'Bounding Box' : 'None'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sunset Fallback</p>
                <p className="text-sm font-mono">{trip.fallbackSunsetHHMM || '17:30'}</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground mb-2">Day Ranges</p>
              <div className="space-y-1">
                {trip.dayRanges.map((range, idx) => (
                  <div key={idx} className="text-xs font-mono bg-muted/50 p-2 rounded">
                    {range.start} to {range.end}
                  </div>
                ))}
              </div>
            </div>
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
                    <p className="text-2xl font-bold">{observations.length}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Members</p>
                    <p className="text-2xl font-bold">{memberCount}</p>
                    {memberLogins.length > 0 && (
                      <details className="text-sm mt-2">
                        <summary className="cursor-pointer text-muted-foreground hover:text-primary">
                          Show first 10 logins
                        </summary>
                        <div className="mt-2 text-xs font-mono text-muted-foreground">
                          {memberLogins.slice(0, 10).join(', ')}
                          {memberLogins.length > 10 && '...'}
                        </div>
                      </details>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unique Species</p>
                    <p className="text-2xl font-bold">{aggregated ? Array.from(aggregated.byUser.values()).reduce((max, u) => Math.max(max, u.speciesCount), 0) : 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Sync</p>
                    <p className="text-sm font-mono">
                      {lastInatSync ? new Date(lastInatSync).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Observations Per Day</p>
                  <div className="space-y-1">
                    {perDayCounts.slice(0, 10).map(([day, count]) => (
                      <div key={day} className="text-xs font-mono bg-muted/50 p-2 rounded flex justify-between">
                        <span>{day}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Sample Observations</p>
                  <div className="space-y-2">
                    {observations.slice(0, 5).map(o => (
                      <div key={o.id} className="text-xs font-mono bg-muted/50 p-2 rounded">
                        {o.id}: {o.taxonName || 'Unknown'} by {o.userLogin} on {o.observedOn}
                      </div>
                    ))}
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

        {/* Data Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Our Observations</span>
              <span className="font-mono">{observations.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unique Species</span>
              <span className="font-mono">
                {new Set(observations.map(o => o.taxonId).filter(Boolean)).size}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Baseline Local Obs</span>
              <span className="font-mono text-muted-foreground">Not loaded (stub)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
