import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

export default function Leaderboard() {
  const [windows, setWindows] = useState<Window[]>([]);
  const [windowLabel, setWindowLabel] = useState('');
  const [officialRows, setOfficialRows] = useState<OfficialRow[]>([]);
  const [publicRows, setPublicRows] = useState<PublicRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Load windows on mount
  useEffect(() => {
    loadWindows();
  }, []);

  // Load leaderboards when window changes
  useEffect(() => {
    if (windowLabel) {
      loadLeaderboards();
    }
  }, [windowLabel]);

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
    
    // Default logic: 1) is_current=true, 2) first row
    const current = (data || []).find(w => w.is_current);
    if (current) {
      setWindowLabel(current.label);
    } else if (data && data.length > 0) {
      setWindowLabel(data[0].label);
    }
  }

  async function loadLeaderboards() {
    if (!windowLabel) return;
    
    setLoading(true);
    
    try {
      // Get window_id for the selected label
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

      // Load official leaderboard
      const { data: official } = await supabase
        .from('public_leaderboard_official_v1')
        .select('display_label, obs_count')
        .eq('window_id', windowData.id)
        .order('obs_count', { ascending: false })
        .order('display_label', { ascending: true });
      
      setOfficialRows(official || []);

      // Load public leaderboard
      const { data: pub } = await supabase
        .from('public_leaderboard_with_flags_v1')
        .select('display_label, obs_count, exhibition')
        .eq('window_id', windowData.id)
        .order('exhibition', { ascending: true })
        .order('obs_count', { ascending: false })
        .order('display_label', { ascending: true });
      
      setPublicRows(pub || []);
    } catch (e) {
      console.error('Error loading leaderboards:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Window selector */}
      <div className="flex items-center gap-3">
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

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Official Leaderboard */}
        <div>
          <h3 className="font-semibold mb-2">Official Leaderboard</h3>
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

        {/* Public Leaderboard */}
        <div>
          <h3 className="font-semibold mb-2">Public Leaderboard</h3>
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
