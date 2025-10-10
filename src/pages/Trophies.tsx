import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_AID } from '../lib/supabase';
import { fetchTrophies, TrophyRow } from '../lib/api';

export default function Trophies() {
  const [rows, setRows] = useState<TrophyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assignmentId = DEFAULT_AID;

  async function load() {
    try {
      setLoading(true); setError(null);
      const data = await fetchTrophies(assignmentId);
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load trophies');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const body = useMemo(() => {
    if (loading) return <div className="px-4 py-8 text-gray-500">Refreshing…</div>;
    if (error) return <div className="px-4 py-8 text-red-600">{error}</div>;
    if (!rows.length) return <div className="px-4 py-8 text-gray-500">No trophies yet.</div>;
    return (
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="font-semibold text-lg">{r.trophy}</div>
            <div className="text-sm text-gray-600 mt-1">
              Winner: {r.winner_display_name ?? 'Unknown'}
            </div>
            <div className="text-sm text-gray-600">
              Metric: {r.metric_value ?? 0}
            </div>
            {r.updated_at_utc && (
              <div className="text-xs text-gray-400 mt-2">
                Updated: {new Date(r.updated_at_utc).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }, [rows, loading, error]);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Trophies</div>
        <button onClick={load} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
      </div>
      <div className="text-xs text-gray-500 mb-3">Trophies update as new observations are scored. Look, don't touch. Photos from a safe distance only.</div>
      {body}
    </div>
  );
}
