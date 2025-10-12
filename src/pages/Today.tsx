import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Window = {
  id: string;
  label: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

type OfficialRow = {
  display_label: string;
  obs_count: number;
};

type PublicRow = {
  display_label: string;
  obs_count: number;
  exhibition: boolean;
};

export default function Today() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [windowLabel, setWindowLabel] = useState('');
  const [scoredOn, setScoredOn] = useState<Date>(new Date());
  const [officialRows, setOfficialRows] = useState<OfficialRow[]>([]);
  const [publicRows, setPublicRows] = useState<PublicRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load windows on mount
  useEffect(() => {
    loadWindows();
  }, []);

  // Load data when window or date changes
  useEffect(() => {
    if (windowLabel) {
      loadData();
    }
  }, [windowLabel, scoredOn]);

  async function loadWindows() {
    const { data, error } = await supabase
      .from('windows_select_v1')
      .select('id, label, starts_on, ends_on, is_current')
      .order('starts_on');
    
    if (error) {
      console.error('Error loading windows:', error);
      return;
    }
    
    setWindows(data || []);
    
    const current = (data || []).find(w => w.is_current);
    if (current) {
      setWindowLabel(current.label);
    } else if (data && data.length > 0) {
      setWindowLabel(data[0].label);
    }
  }

  async function loadData() {
    if (!windowLabel) return;
    
    setLoading(true);
    
    try {
      const { data: windowData } = await supabase
        .from('trip_windows')
        .select('id')
        .eq('label', windowLabel)
        .single();
      
      if (!windowData?.id) {
        setOfficialRows([]);
        setPublicRows([]);
        setLoading(false);
        return;
      }

      const scoredOnStr = format(scoredOn, 'yyyy-MM-dd');

      // Load official data
      const { data: official } = await supabase
        .from('public_leaderboard_official_v1')
        .select('display_label, obs_count')
        .eq('window_id', windowData.id)
        .eq('scored_on', scoredOnStr)
        .order('obs_count', { ascending: false })
        .order('display_label', { ascending: true });
      
      setOfficialRows(official || []);

      // Load public data
      const { data: pub } = await supabase
        .from('public_leaderboard_with_flags_v1')
        .select('display_label, obs_count, exhibition')
        .eq('window_id', windowData.id)
        .eq('scored_on', scoredOnStr)
        .order('exhibition', { ascending: true })
        .order('obs_count', { ascending: false })
        .order('display_label', { ascending: true });
      
      setPublicRows(pub || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
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
          <label className="text-sm font-medium">Date:</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[200px] justify-start text-left font-normal",
                  !scoredOn && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {scoredOn ? format(scoredOn, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scoredOn}
                onSelect={(date) => date && setScoredOn(date)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <Button onClick={loadData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Official */}
        <div>
          <h3 className="font-semibold mb-2">Official</h3>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : officialRows.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No scores yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-sm">Name</th>
                    <th className="px-3 py-2 text-right text-sm">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {officialRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-sm">{row.display_label}</td>
                      <td className="px-3 py-2 text-right text-sm">{row.obs_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Public */}
        <div>
          <h3 className="font-semibold mb-2">Public</h3>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading...</div>
          ) : publicRows.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No scores yet.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-3 py-2 text-left text-sm">Exhibition</th>
                    <th className="px-3 py-2 text-left text-sm">Name</th>
                    <th className="px-3 py-2 text-right text-sm">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {publicRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-sm">{row.exhibition ? '✓' : ''}</td>
                      <td className="px-3 py-2 text-sm">{row.display_label}</td>
                      <td className="px-3 py-2 text-right text-sm">{row.obs_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
