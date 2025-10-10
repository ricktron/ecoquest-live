import { useEffect, useState } from "react";
import { DEFAULT_AID } from "@/lib/supabase";
import { fetchLeaderboard } from "@/lib/api";

type Item = { title: string; detail: string; };

export default function Ticker() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchLeaderboard(DEFAULT_AID);
        const top3 = data.slice(0, 3);
        const out: Item[] = top3.map(r => ({
          title: r.display_name ?? 'Unknown',
          detail: `${r.points ?? 0} pts`
        }));
        if (alive) setItems(out);
      } catch { /* ignore */ }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!items.length) return null;
  return (
    <div className="w-full overflow-hidden bg-black text-white text-sm py-1">
      <div className="animate-[ticker_20s_linear_infinite] whitespace-nowrap">
        {items.map((it, i) => (
          <span key={i} className="mx-6">
            <span className="font-semibold">{it.title}</span> takes the lead with {it.detail}!
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker {0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}`}</style>
    </div>
  );
}
