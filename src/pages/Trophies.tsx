import { useEffect, useState } from "react";
import { sfetch, q } from "@/lib/supa";
import { ASSIGNMENT_ID, REFRESH_MS } from "@/lib/supa";

export default function Trophies() {
  const [tox, setTox] = useState<any[]>([]);

  const load = async () => {
    const data = await sfetch<any[]>(
      `trophy_toxic_topper_v1?${q({ "assignment_id": `eq.${ASSIGNMENT_ID}` })}`
    ).catch(()=>[]);
    setTox(data ?? []);
  };
  useEffect(()=>{ load(); const t=setInterval(load, REFRESH_MS); return ()=>clearInterval(t); },[]);

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm text-neutral-500">Trophies update as new observations are scored. Look, don't touch. Photos from a safe distance only.</div>
      <section className="space-y-2">
        <h2 className="font-semibold text-lg">Most Poisonous (Toxic Topper)</h2>
        {tox.length ? tox.map((t,i)=>(
          <div key={i} className="rounded-2xl bg-white shadow p-3 flex items-center justify-between">
            <div>Student</div>
            <div className="font-bold">{t.toxic_score ?? 0}</div>
          </div>
        )) : <div className="text-neutral-500">No holder yet.</div>}
      </section>
    </div>
  );
}
