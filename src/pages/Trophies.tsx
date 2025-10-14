import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';

const LOCATIONS = [
  { id: 'la-quinta-sarapiqui-lodge', label: 'La Quinta Sarapiquí Lodge',       lat: 10.451711204911138, lng: -84.12112003330185, radius_m: 200 },
  { id: 'evergreen-lodge',            label: 'Evergreen Lodge (Tortuguero)',    lat: 10.543011121622126, lng: -83.51277609925263, radius_m: 200 },
  { id: 'cano-palma-station',         label: 'Caño Palma Biological Station',   lat: 10.593844935329683, lng: -83.52763302296113, radius_m: 200 },
  { id: 'la-selva-station',           label: 'La Selva Biological Station',     lat: 10.431557922979602, lng: -84.0035452332552,  radius_m: 600 },
  { id: 'volcan-tortuguero-trail',    label: 'Volcán Tortuguero (trail)',       lat: 10.584099218798833, lng: -83.52811616947487, radius_m: 200 },
  { id: 'san-francisco-town',         label: 'San Francisco (Tortuguero)',      lat: 10.57907817943576,  lng: -83.52360954298479, radius_m: 200 },
  { id: 'sea-turtle-conservancy',     label: 'Sea Turtle Conservancy',          lat: 10.547494714304397, lng: -83.5051400440278,  radius_m: 300 },
];

type LocationWinner = {
  location_key: string;
  location_label: string;
  student_name: string | null;
  student_count: number | null;
  adult_name: string | null;
  adult_count: number | null;
  updated_at: string | null;
};

export default function Trophies() {
  const [windowLabel, setWindowLabel] = useState('');
  const [windows, setWindows] = useState<any[]>([]);
  const [locationWinners, setLocationWinners] = useState<LocationWinner[]>([]);
  const [winnersMap, setWinnersMap] = useState<Map<string, LocationWinner>>(new Map());
  const [showDebug, setShowDebug] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Load windows on mount
  useEffect(() => {
    loadWindows();
  }, []);

  // Load location winners when window changes
  useEffect(() => {
    if (windowLabel) {
      loadLocationWinners();
    }
  }, [windowLabel]);

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
  }

  async function loadLocationWinners() {
    if (!windowLabel) return;

    const { data } = await supabase
      .from('location_trophy_winners_v1')
      .select('*')
      .eq('window_label', windowLabel)
      .order('location_label');

    setLocationWinners(data || []);

    // Build map by location_key for quick lookup
    const map = new Map<string, LocationWinner>();
    (data || []).forEach(winner => {
      map.set(winner.location_key, winner);
    });
    setWinnersMap(map);

    // Calculate last update from data
    if (data && data.length > 0) {
      const times = data
        .map(r => r.updated_at)
        .filter(Boolean)
        .map(t => new Date(t!));
      if (times.length > 0) {
        setLastUpdate(new Date(Math.max(...times.map(d => d.getTime()))));
      } else {
        setLastUpdate(new Date());
      }
    } else {
      setLastUpdate(new Date());
    }
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Trophies</h2>
        {lastUpdate && (
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: {format(lastUpdate, 'MMM d, h:mma')}
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
          <CardContent className="pt-6">
            <div className="text-sm font-semibold mb-2">Debug Counts</div>
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(locationWinners.map(w => ({
                location: w.location_label,
                student: w.student_name,
                student_count: w.student_count,
                adult: w.adult_name,
                adult_count: w.adult_count
              })), null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Location Trophies */}
      <div>
        <h3 className="text-base font-semibold mb-3">Location Trophies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {LOCATIONS.map((location) => {
            const winner = winnersMap.get(location.id);
            const hasStudentWinner = winner?.student_name && (winner?.student_count ?? 0) > 0;
            
            return (
              <Card key={location.id} className={!hasStudentWinner ? 'opacity-60' : ''}>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    {/* Trophy Circle */}
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      hasStudentWinner
                        ? 'bg-gradient-to-br from-teal-200 to-emerald-300' 
                        : 'bg-gradient-to-br from-slate-200 to-slate-300 grayscale'
                    }`}>
                      <MapPin className={`h-10 w-10 ${hasStudentWinner ? 'text-teal-800' : 'text-slate-500'}`} />
                    </div>

                    {/* Location Label */}
                    <h4 className={`font-semibold ${hasStudentWinner ? '' : 'text-slate-400'}`}>
                      {location.label}
                    </h4>

                    {/* Winners */}
                    <div className="w-full space-y-1">
                      {hasStudentWinner ? (
                        <>
                          {/* Primary Student Winner */}
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <strong>{winner.student_name}</strong>
                            <span className="tabular-nums">— {winner.student_count}</span>
                          </div>
                          
                          {/* Won Date */}
                          {winner.updated_at && (
                            <div className="text-xs text-muted-foreground">
                              Won: {format(new Date(winner.updated_at), 'MMM d, h:mma')}
                            </div>
                          )}
                          
                          {/* Adult Winner Footnote */}
                          {winner.adult_name && winner.adult_name !== winner.student_name && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Adult winner: {winner.adult_name} — {winner.adult_count}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-slate-400">No winner yet</div>
                          
                          {/* Show adult footnote even if no student winner */}
                          {winner?.adult_name && (winner?.adult_count ?? 0) > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Adult winner: {winner.adult_name} — {winner.adult_count}
                            </div>
                          )}
                        </>
                      )}
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
