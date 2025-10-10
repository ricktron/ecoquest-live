import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_AID } from '../lib/supabase';
import { fetchDaily, LeaderRow } from '../lib/api';

export default function Today() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const assignmentId = DEFAULT_AID;

  async function load() {
    try {
      setLoading(true); setError(null);
      const data = await fetchDaily(assignmentId);
      setRows(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load daily scores');
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
    if (!rows.length) return <div className="px-4 py-8 text-gray-500">No activity yet today.</div>;
    return (
      <table className="w-full">
        <thead className="text-xs uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-right">Pts</th>
            <th className="px-3 py-2 text-right">Δ</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((r, i) => (
            <tr key={r.student_id ?? i} className="border-t">
              <td className="px-3 py-2">{r.rank ?? i + 1}</td>
              <td className="px-3 py-2">{r.display_name ?? 'Unknown'}</td>
              <td className="px-3 py-2 text-right">{r.points ?? 0}</td>
              <td className={`px-3 py-2 text-right ${ (r.delta_rank ?? 0) < 0 ? 'text-green-600' : (r.delta_rank ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                {r.delta_rank ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }, [rows, loading, error]);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">Today</div>
        <button onClick={load} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
      </div>
      <div className="rounded-lg border">{body}</div>
    </div>
  );
}
