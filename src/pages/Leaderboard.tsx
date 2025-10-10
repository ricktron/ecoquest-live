import { useEffect, useState } from 'react';
import { getLeaderboard, getLeaderboardDelta, listAssignments } from '@/lib/api';

const DEFAULT_ID = import.meta.env.VITE_DEFAULT_ASSIGNMENT_ID as string | undefined;

export default function Leaderboard() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentId, setAssignmentId] = useState<string>(DEFAULT_ID || '');
  const [rows, setRows] = useState<any[]>([]);
  const [delta, setDelta] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const a = await listAssignments().catch(() => []);
      setAssignments(a);
      if (!assignmentId && a.length) setAssignmentId(a[0].id);
    })();
  }, []);

  async function load() {
    if (!assignmentId) return;
    setLoading(true);
    const [lb, mv] = await Promise.all([
      getLeaderboard(assignmentId),
      getLeaderboardDelta(assignmentId),
    ]);
    const moves: Record<string, number> = {};
    (mv || []).forEach((m: any) => {
      moves[m.student_id] = (m.rank_then ?? 999) - (m.rank_now ?? 999);
    });
    setRows(lb || []);
    setDelta(moves);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [assignmentId]);

  const showPicker = assignments.length > 1;

  return (
    <div className="p-2 space-y-3">
      {showPicker ? (
        <div className="flex gap-2 items-center">
          <select
            className="border rounded px-2 py-1"
            value={assignmentId}
            onChange={e => setAssignmentId(e.target.value)}
          >
            {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button className="border rounded px-3 py-1" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <div className="text-sm text-gray-600">
            Assignment: <span className="font-medium">{assignments[0]?.name ?? 'Current Trip'}</span>
          </div>
          <button className="border rounded px-3 py-1" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">#</th>
            <th>Name</th>
            <th>Points</th>
            <th>Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, i: number) => {
            const move = delta[r.student_id] ?? 0;
            return (
              <tr key={r.student_id} className="border-b">
                <td className="py-2">{i + 1}</td>
                <td>{r.public_handle ?? r.name ?? 'Anonymous'}</td>
                <td>{typeof r.points === 'number' ? r.points.toFixed(2) : r.points}</td>
                <td className={move > 0 ? 'text-green-600' : move < 0 ? 'text-red-600' : 'text-gray-400'}>
                  {move > 0 ? `▲ ${move}` : move < 0 ? `▼ ${Math.abs(move)}` : '—'}
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr><td colSpan={4} className="py-6 text-center text-gray-500">No scores yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
