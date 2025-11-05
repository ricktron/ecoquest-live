import { useState } from 'react';
import { ENV, FLAGS } from '@/env';
import { useAppState } from '@/lib/state';
import { getActiveTrip } from '@/trips';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function Debug() {
  const [showAppState, setShowAppState] = useState(false);
  const appState = useAppState();
  const trip = getActiveTrip();

  const items: { key: string; label: string; present: boolean; raw?: string }[] = [
    { key: "VITE_TRIP_PROFILE", label: "Active trip profile", present: true, raw: trip.id },
    { key: "VITE_SUPABASE_URL", label: "Supabase project URL", present: !!ENV.SUPABASE_URL },
    { key: "VITE_SUPABASE_ANON_KEY", label: "Supabase anonymous key", present: !!ENV.SUPABASE_ANON_KEY },
    { key: "VITE_DEFAULT_ASSIGNMENT_ID", label: "Default assignment ID", present: !!ENV.DEFAULT_ASSIGNMENT_ID },
    { key: "VITE_FEATURE_TROPHIES", label: "Trophies feature flag", present: ENV.RAW.VITE_FEATURE_TROPHIES != null, raw: String(ENV.RAW.VITE_FEATURE_TROPHIES) },
    { key: "VITE_ENABLE_ADMIN", label: "Admin features flag", present: ENV.RAW.VITE_ENABLE_ADMIN != null, raw: String(ENV.RAW.VITE_ENABLE_ADMIN) },
    { key: "VITE_TZ", label: "Timezone", present: true, raw: trip.timezone },
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      <div className="max-w-screen-lg mx-auto px-3 md:px-6 py-6 space-y-6">
        <h1 className="text-3xl font-bold">Debug &amp; Configuration</h1>
        
        <section>
          <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.key} className="rounded border p-3 bg-card">
                <div className="font-mono text-sm font-medium">{it.key}</div>
                <div className="text-sm text-muted-foreground">{it.label}</div>
                <div className="text-sm mt-1">
                  <span className={it.present ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {it.present ? "Present" : "Missing"}
                  </span>
                </div>
                {it.raw !== undefined && (
                  <div className="text-xs mt-1">
                    Raw: <span className="font-mono text-blue-600 dark:text-blue-400">{it.raw}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Feature Flag Parsing</h2>
          <div className="rounded border p-3 bg-card text-sm space-y-1">
            <div>
              Raw VITE_FEATURE_TROPHIES:{" "}
              <span className="font-mono text-blue-600 dark:text-blue-400">{String(ENV.RAW.VITE_FEATURE_TROPHIES)}</span>
            </div>
            <div>
              Parsed TROPHIES_ENABLED:{" "}
              <span className="font-mono text-green-600 dark:text-green-400">{String(FLAGS.TROPHIES_ENABLED)}</span>
            </div>
            <div className="pt-2">
              Raw VITE_ENABLE_ADMIN:{" "}
              <span className="font-mono text-blue-600 dark:text-blue-400">{String(ENV.RAW.VITE_ENABLE_ADMIN)}</span>
            </div>
            <div>
              Parsed ADMIN_ENABLED:{" "}
              <span className="font-mono text-green-600 dark:text-green-400">{String(FLAGS.ADMIN_ENABLED)}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Active Trip Configuration</h2>
          <div className="rounded border p-4 bg-card space-y-3 text-sm">
            <div>
              <span className="font-semibold">Trip ID:</span> <span className="font-mono ml-2">{trip.id}</span>
            </div>
            <div>
              <span className="font-semibold">Title:</span> <span className="ml-2">{trip.title}</span>
            </div>
            <div>
              <span className="font-semibold">Timezone:</span> <span className="font-mono ml-2">{trip.timezone}</span>
            </div>
            <div>
              <span className="font-semibold">Day Ranges:</span>
              <ul className="ml-6 mt-1 space-y-1">
                {trip.dayRanges.map((range, i) => (
                  <li key={i} className="font-mono">{range.start} to {range.end}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold">Members:</span> 
              <span className="ml-2">{trip.memberLogins.length === 0 ? 'All (no filter)' : trip.memberLogins.length}</span>
            </div>
            <div>
              <span className="font-semibold">Place Filter:</span> 
              <span className="ml-2">
                {trip.placeId ? `iNat Place ID ${trip.placeId}` : trip.bbox ? 'BBox defined' : 'None'}
              </span>
            </div>
            <div>
              <span className="font-semibold">Sunset Fallback:</span> 
              <span className="font-mono ml-2">{trip.fallbackSunsetHHMM || '17:30'}</span>
            </div>
          </div>
        </section>

        <section>
          <Button
            onClick={() => setShowAppState(!showAppState)}
            variant="outline"
            className="mb-4"
          >
            {showAppState ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
            Dump App State
          </Button>
          
          {showAppState && (
            <div className="rounded border p-4 bg-card">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    trip: {
                      id: trip.id,
                      memberCount: trip.memberLogins.length,
                      dayRanges: trip.dayRanges,
                    },
                    filters: {
                      startDate: appState.startDate,
                      endDate: appState.endDate,
                      logins: appState.logins,
                    },
                    loading: appState.loading,
                    observationCount: appState.observations.length,
                    aggregated: appState.aggregated ? {
                      userCount: appState.aggregated.byUser.size,
                      dayCount: appState.aggregated.byDay.size,
                    } : null,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
