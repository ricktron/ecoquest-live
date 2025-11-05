// Hazard taxa integration - read-only cache from Supabase

export type HazardDef = {
  taxon_id: number;
  level: number;
  label?: string;
  notes?: string;
};

export async function loadHazardsFromSupabase(): Promise<HazardDef[]> {
  try {
    // TODO: Implement Supabase query when table is created
    // const { data, error } = await supabase
    //   .from('hazard_taxa')
    //   .select('*')
    //   .order('level', { ascending: false });
    
    // if (error) throw error;
    // return data || [];
    
    console.log('[hazards] Table not yet created, returning empty');
    return [];
  } catch (error) {
    console.error('[hazards] Failed to load:', error);
    return [];
  }
}

export function getHazardLevel(taxonId: number, hazardsMap: Map<number, HazardDef>): number {
  return hazardsMap.get(taxonId)?.level || 0;
}
