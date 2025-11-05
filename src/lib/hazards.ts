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

// Hazard level weights for scoring
export const HAZARD_WEIGHTS: Record<number, number> = {
  1: 0.5,
  2: 1.0,
  3: 1.5,
  4: 2.5,
  5: 4.0,
};

// Check if observation matches a hazard (direct or ancestor)
export function isHazardMatch(
  taxonId: number | undefined,
  ancestorIds: number[] | undefined,
  hazardTaxonId: number
): boolean {
  if (!taxonId) return false;
  if (taxonId === hazardTaxonId) return true;
  if (ancestorIds && ancestorIds.includes(hazardTaxonId)) return true;
  return false;
}

// Compute hazard score for an observation
export function computeHazardScore(
  taxonId: number | undefined,
  ancestorIds: number[] | undefined,
  hazardsMap: Map<number, HazardDef>
): number {
  let totalScore = 0;
  
  hazardsMap.forEach((hazard, hazardTaxonId) => {
    if (isHazardMatch(taxonId, ancestorIds, hazardTaxonId)) {
      const weight = HAZARD_WEIGHTS[hazard.level] || 0;
      totalScore += weight;
    }
  });
  
  return totalScore;
}
