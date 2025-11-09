/**
 * Bingo claims API operations
 */

import { supabase } from "@/integrations/supabase/client";

export interface BingoClaim {
  user_id: string;
  week_id: string;
  tile_slug: string;
  observation_id?: string | null;
  created_at: string;
}

/**
 * Fetch all claims for a user in a given week
 */
export async function getClaims(
  userId: string,
  weekId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("bingo_claims" as any)
    .select("tile_slug")
    .eq("user_id", userId)
    .eq("week_id", weekId);

  if (error) {
    console.error("Error fetching claims:", error);
    return [];
  }

  return (data || []).map((row: any) => row.tile_slug);
}

/**
 * Toggle a claim: delete if exists, insert if not
 */
export async function toggleClaim(
  userId: string,
  weekId: string,
  tileSlug: string
): Promise<boolean> {
  // Check if claim exists
  const { data: existing, error: checkError } = await supabase
    .from("bingo_claims" as any)
    .select("tile_slug")
    .eq("user_id", userId)
    .eq("week_id", weekId)
    .eq("tile_slug", tileSlug)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking claim:", checkError);
    return false;
  }

  if (existing) {
    // Delete existing claim
    const { error: deleteError } = await supabase
      .from("bingo_claims" as any)
      .delete()
      .eq("user_id", userId)
      .eq("week_id", weekId)
      .eq("tile_slug", tileSlug);

    if (deleteError) {
      console.error("Error deleting claim:", deleteError);
      return false;
    }
  } else {
    // Insert new claim
    const { error: insertError } = await supabase
      .from("bingo_claims" as any)
      .insert({
        user_id: userId,
        week_id: weekId,
        tile_slug: tileSlug,
      });

    if (insertError) {
      console.error("Error inserting claim:", insertError);
      return false;
    }
  }

  return true;
}
