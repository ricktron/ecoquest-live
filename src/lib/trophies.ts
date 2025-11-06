import { supabase } from "@/integrations/supabase/client";

export interface DailyTrophyResult {
  day: string;
  variety_winner: string | null;
  variety_score: number | null;
}

export async function loadDailyTrophies(date: Date): Promise<DailyTrophyResult | null> {
  const iso = date.toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc("daily_trophies_for", { d: iso });
  if (error) {
    console.error("Error loading daily trophies:", error);
    return null;
  }
  return data?.[0] ?? null;
}
