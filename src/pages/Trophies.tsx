import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { format } from 'date-fns';

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
        {locationWinners.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No location trophy data available for this window.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locationWinners.map((winner) => {
              const hasWinner = winner.student_name || winner.adult_name;
              return (
                <Card key={winner.location_key} className={!hasWinner ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {/* Trophy Circle */}
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                        hasWinner 
                          ? 'bg-gradient-to-br from-teal-200 to-emerald-300' 
                          : 'bg-gradient-to-br from-slate-200 to-slate-300 grayscale'
                      }`}>
                        <MapPin className={`h-10 w-10 ${hasWinner ? 'text-teal-800' : 'text-slate-500'}`} />
                      </div>

                      {/* Location Label */}
                      <h4 className={`font-semibold ${hasWinner ? '' : 'text-slate-400'}`}>
                        {winner.location_label}
                      </h4>

                      {/* Winners */}
                      <div className="w-full space-y-1 text-sm">
                        {winner.student_name ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{winner.student_name}</span>
                              <span className="font-semibold ml-2">— {winner.student_count}</span>
                            </div>
                            {winner.adult_name && winner.adult_name !== winner.student_name && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                                <span>adult winner: {winner.adult_name}</span>
                                <span className="ml-2">— {winner.adult_count}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-slate-400">No winner yet</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
