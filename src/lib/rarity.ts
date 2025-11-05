// Rarity scoring based on local baseline data

import type { ObservationData } from './scoring';
import type { INatObservation } from './inat';

export type RarityRow = {
  taxon_id: number;
  name: string;
  ourCount: number;
  localCount: number;
  score: number;
  imageUrl?: string;
};

type RarityWeights = {
  groupWeight: number;
  localWeight: number;
};

export function computeRarity(params: {
  ourObs: ObservationData[];
  localObs: INatObservation[];
  weights: RarityWeights;
}): { rare: RarityRow[]; common: RarityRow[] } {
  const { ourObs, localObs, weights } = params;

  // Count observations per taxon in our set
  const ourCounts = new Map<number, { count: number; name: string }>();
  ourObs.forEach(o => {
    if (o.taxonId && o.taxonName) {
      const existing = ourCounts.get(o.taxonId) || { count: 0, name: o.taxonName };
      ourCounts.set(o.taxonId, { count: existing.count + 1, name: o.taxonName });
    }
  });

  // Count observations per taxon in local baseline
  const localCounts = new Map<number, number>();
  localObs.forEach(o => {
    if (o.taxon?.id) {
      localCounts.set(o.taxon.id, (localCounts.get(o.taxon.id) || 0) + 1);
    }
  });

  // Compute rarity scores
  const rows: RarityRow[] = [];
  ourCounts.forEach((ourData, taxonId) => {
    const localCount = localCounts.get(taxonId) || 0;
    
    // Inverse rank scoring (fewer = rarer = higher score)
    const ourRank = 1 / (ourData.count + 1);
    const localRank = 1 / (localCount + 1);
    
    const score = weights.groupWeight * ourRank + weights.localWeight * localRank;
    
    rows.push({
      taxon_id: taxonId,
      name: ourData.name,
      ourCount: ourData.count,
      localCount,
      score,
      imageUrl: undefined, // TODO: fetch from iNat API
    });
  });

  // Sort by score descending
  rows.sort((a, b) => b.score - a.score);

  // Split into rare (top half) and common (bottom half)
  const midpoint = Math.floor(rows.length / 2);
  return {
    rare: rows.slice(0, midpoint),
    common: rows.slice(midpoint),
  };
}
