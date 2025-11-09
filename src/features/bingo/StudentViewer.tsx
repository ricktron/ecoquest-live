import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Option = { id: string; name: string };

export function StudentViewer({
  weekId,
  meUserId,
  value,
  onChange
}: { weekId: string; meUserId?: string | null; value: string | null; onChange: (id: string | null) => void; }) {
  const [tab, setTab] = useState<"me"|"student">("me");
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      // Prefer users with claims this week
      const { data: claimUsers } = await supabase
        .from("bingo_claims")
        .select("user_id")
        .eq("week_id", weekId);
      const ids = Array.from(new Set((claimUsers ?? []).map((r: any) => r.user_id).filter(Boolean)));

      let rows: Option[] = [];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles" as any)
          .select("id, display_name")
          .in("id", ids);
        rows = (profs ?? []).map((p: any) => ({ id: p.id, name: p.display_name || p.id }));
      } else {
        // Fallback to all profiles (light)
        const { data: profs } = await supabase
          .from("profiles" as any)
          .select("id, display_name")
          .limit(1000);
        rows = (profs ?? []).map((p: any) => ({ id: p.id, name: p.display_name || p.id }));
      }
      if (!ignore) setOptions(rows);
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [weekId]);

  // keep current in list
  const opts = useMemo(() => options, [options]);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded border border-border bg-muted">
        <button
          className={`px-3 py-1.5 text-sm rounded transition-colors ${tab==="me"?"bg-background font-semibold shadow-sm":"hover:bg-background/50"}`}
          onClick={() => { setTab("me"); onChange(meUserId ?? null); }}>
          Me
        </button>
        <button
          className={`px-3 py-1.5 text-sm rounded transition-colors ${tab==="student"?"bg-background font-semibold shadow-sm":"hover:bg-background/50"}`}
          onClick={() => setTab("student")}>
          Student…
        </button>
      </div>

      {tab==="student" && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Pick:</span>
          <select
            className="border border-border rounded px-3 py-1.5 text-sm min-w-[12rem] bg-background"
            disabled={loading || !opts.length}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          >
            <option value="">Select a student</option>
            {opts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          {!loading && !opts.length && <span className="text-xs text-muted-foreground">No participants yet.</span>}
        </label>
      )}
    </div>
  );
}
