import { supabase } from "@/integrations/supabase/client";

export interface DailyTrophyResult {
  day: string;
  variety_winner: string | null;
  variety_score: number | null;
}

export async function loadDailyTrophies(date: Date): Promise<DailyTrophyResult | null> {
  const iso = date.toISOString().slice(0, 10);
  // Type assertion needed until Supabase types are regenerated
  const { data, error } = await (supabase.rpc as any)("daily_trophies_for", { d: iso });
  if (error) {
    console.error("Error loading daily trophies:", error);
    return null;
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0] as DailyTrophyResult;
}
