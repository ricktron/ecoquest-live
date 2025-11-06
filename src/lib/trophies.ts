import { supabase } from "@/integrations/supabase/client";

export interface DailyTrophiesRow {
  day: string;
  variety_winner: string | null;
  variety_score: number | null;
  rare_winner: string | null;
  early_bird_winner: string | null;
  night_owl_winner: string | null;
  steady_eddie_winner: string | null;
  first_finder_winner: string | null;
}

export async function loadDailyTrophies(dateISO: string): Promise<DailyTrophiesRow | null> {
  // Type assertion needed until Supabase types are regenerated
  const { data, error } = await (supabase.rpc as any)("daily_trophies_for", { d: dateISO });
  if (error) {
    console.error("Error loading daily trophies:", error);
    return null;
  }
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }
  return data[0] as DailyTrophiesRow;
}
