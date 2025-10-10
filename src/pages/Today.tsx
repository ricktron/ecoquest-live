import { useEffect, useState } from "react";
import { sfetch, q } from "@/lib/supa";
import { ASSIGNMENT_ID, REFRESH_MS } from "@/lib/supa";
import { fmtPts } from "@/lib/format";

export default function Today() {
  const [rows, setRows] = useState<any[]>([]);
  const load = async () => {
    const data = await sfetch<any[]>(
      `daily_scoreboard_v2?${q({ "assignment_id": `eq.${ASSIGNMENT_ID}`, "order": "points.desc" })}`
    ).catch(()=>[]);
    setRows(data ?? []);
  };
  useEffect(()=>{ load(); const t=setInterval(load, REFRESH_MS); return ()=>clearInterval(t); },[]);

  return (
    <div className="p-3 space-y-2">
      {rows.map((r,i)=>(
        <div key={i} className="rounded-2xl bg-white shadow p-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">{r.display_name ?? r.public_handle ?? "Student"}</div>
            <div className="text-xs text-neutral-500">Day: {r.day_local ?? r.day ?? ""}</div>
          </div>
          <div className="font-bold">{fmtPts(r.points ?? r.total_points)}</div>
        </div>
      ))}
      {!rows.length && <div className="text-center text-neutral-500 py-10">No activity yet today.</div>}
    </div>
  );
}
