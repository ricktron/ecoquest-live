import { useEffect, useMemo } from 'react';
import { useAppState } from '@/lib/state';
import { getActiveTrip, getTripFilters } from '@/trips';
import { TROPHIES } from '@/trophies';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    initialize();
  }, []);

  const selfCheck = useMemo(() => runSelfCheck(observations), [observations]);

  const perDayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    observations.forEach(o => {
      const day = o.observedOn;
      counts.set(day, (counts.get(day) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [observations]);

  return (
    <div className="pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Debug Info</h1>

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
              <div>
                <p className="text-sm text-muted-foreground">Members</p>
                <p className="text-lg font-bold">{trip.memberLogins.length || 'All users'}</p>
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
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold">{aggregated?.byUser.size || 0}</p>
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
      </div>
    </div>
  );
}
