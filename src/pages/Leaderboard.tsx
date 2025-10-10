import { useEffect, useState } from "react";
import { sfetch, q } from "@/lib/supa";
import { ASSIGNMENT_ID, REFRESH_MS } from "@/lib/supa";
import { fmtPts, pickPoints } from "@/lib/format";
import DeltaBadge from "@/components/DeltaBadge";

export default function Leaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [delta, setDelta] = useState<Record<string, number>>({});

  const load = async () => {
    const base = `public_leaderboard_v2?${q({
      "assignment_id": `eq.${ASSIGNMENT_ID}`,
      "order": "total_points.desc"
    })}`;
    const data = await sfetch<any[]>(base).catch(() => []);
    const sorted = [...data].sort((a,b)=>pickPoints(b)-pickPoints(a));
    setRows(sorted);

    const d = await sfetch<any[]>(
      `public_leaderboard_delta_v2?${q({ "assignment_id": `eq.${ASSIGNMENT_ID}` })}`
    ).catch(()=>[]);
    const map: Record<string, number> = {};
    for (const r of d ?? []) {
      const sid = r.student_id ?? r.id ?? "";
      const dv = Number(r.delta_points ?? r.points_delta ?? 0);
      map[sid] = dv;
    }
    setDelta(map);
  };

  useEffect(() => { load(); const t=setInterval(load, REFRESH_MS); return ()=>clearInterval(t); }, []);

  return (
    <div className="p-3 space-y-2">
      {rows.map((r, idx) => {
        const pts = pickPoints(r);
        const name = r.display_name ?? r.public_handle ?? r.name ?? "Student";
        const sid = r.student_id ?? r.id ?? String(idx);
        return (
          <div key={sid} className="rounded-2xl bg-white shadow p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-sm">{idx+1}</div>
              <div className="truncate">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-xs text-neutral-500">{r.public_handle ?? ""}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{fmtPts(pts)}</div>
              <DeltaBadge delta={delta[sid]} />
            </div>
          </div>
        );
      })}
      {!rows.length && <div className="text-center text-neutral-500 py-10">No scores yet.</div>}
    </div>
  );
}
