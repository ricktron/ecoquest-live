import { useEffect, useState } from "react";
import { sfetch, q } from "@/lib/supa";
import { ASSIGNMENT_ID, REFRESH_MS } from "@/lib/supa";

type Item = { title?: string; detail?: string; };

export default function Ticker() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        // Try trophies_live first
        const base = `trophies_live?${q({ "assignment_id": `eq.${ASSIGNMENT_ID}` })}`;
        const data = await sfetch<any[]>(base).catch(() => []);
        let out: Item[] = [];
        if (Array.isArray(data) && data.length) {
          out = data.map(d => ({ title: d.trophy_name ?? "Trophy", detail: d.holder_name ?? d.public_handle ?? "" }));
        } else {
          // Fallback to toxic trophy only
          const tox = await sfetch<any[]>(
            `trophy_toxic_topper_v1?${q({ "assignment_id": `eq.${ASSIGNMENT_ID}` })}`
          ).catch(() => []);
          out = (tox ?? []).map(t => ({ title: "Toxic Topper", detail: t.student_id }));
        }
        if (alive) setItems(out);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!items.length) return null;
  return (
    <div className="w-full overflow-hidden bg-black text-white text-sm py-1">
      <div className="animate-[ticker_20s_linear_infinite] whitespace-nowrap">
        {items.map((it, i) => (
          <span key={i} className="mx-6">
            <span className="font-semibold">{it.title}</span>: {it.detail}
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker {0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}`}</style>
    </div>
  );
}
