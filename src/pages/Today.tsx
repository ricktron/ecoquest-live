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

type UnifiedRow = {
  display_label: string;
  obs_count: number;
  exhibition: boolean;
  official_rank: number | null;
  overall_rank: number;
};

export default function Today() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [windowLabel, setWindowLabel] = useState('');
  const [scoredOn, setScoredOn] = useState<Date>(new Date());
  const [unifiedRows, setUnifiedRows] = useState<UnifiedRow[]>([]);
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
        .maybeSingle();
      
      if (!windowData?.id) {
        setUnifiedRows([]);
        setLoading(false);
        return;
      }

      const scoredOnStr = format(scoredOn, 'yyyy-MM-dd');

      // Load unified data
      const { data: unified } = await supabase
        .from('public_leaderboard_unified_v1')
        .select('display_label, obs_count, exhibition, official_rank, overall_rank')
        .eq('window_id', windowData.id)
        .eq('scored_on', scoredOnStr)
        .order('official_rank', { ascending: true, nullsFirst: false })
        .order('overall_rank', { ascending: true });
      
      setUnifiedRows(unified || []);
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

      {/* Unified Today Leaderboard */}
      <div>
        <h3 className="font-semibold mb-3">Today's Leaderboard</h3>
        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading...</div>
        ) : unifiedRows.length === 0 ? (
          <div className="text-center text-gray-500 py-8">No scores yet.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-3 py-2 text-left text-sm">Student Rank</th>
                  <th className="px-3 py-2 text-left text-sm">Name</th>
                  <th className="px-3 py-2 text-right text-sm">Observations</th>
                  <th className="px-3 py-2 text-center text-sm">Exhibition</th>
                </tr>
              </thead>
              <tbody>
                {unifiedRows.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2 text-sm">{row.official_rank || ''}</td>
                    <td className="px-3 py-2 text-sm">{row.display_label}</td>
                    <td className="px-3 py-2 text-right text-sm">{row.obs_count}</td>
                    <td className="px-3 py-2 text-center text-sm">{row.exhibition ? '✓' : ''}</td>
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
