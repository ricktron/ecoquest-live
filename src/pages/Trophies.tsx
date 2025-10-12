import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type TrophyRow = {
  created_at: string;
  display_label: string;
  trophy_title: string;
  points: number;
};

export default function Trophies() {
  const [rows, setRows] = useState<TrophyRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trophies_live_v1')
        .select('created_at, display_label, trophy_title, points')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error('Error loading trophies:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trophies</h2>
        <button 
          onClick={load} 
          className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No trophies yet.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 text-left text-sm">Date</th>
                <th className="px-3 py-2 text-left text-sm">Name</th>
                <th className="px-3 py-2 text-left text-sm">Trophy</th>
                <th className="px-3 py-2 text-right text-sm">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 text-sm">
                    {new Date(row.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-sm">{row.display_label}</td>
                  <td className="px-3 py-2 text-sm">{row.trophy_title}</td>
                  <td className="px-3 py-2 text-right text-sm">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
