// iNaturalist public API client with CORS-safe fetch and fallback to mock data
import mockObservations from '../fixtures/mock-observations.json';
import { ACTIVE_TRIP } from '../trips';

export type INatObservation = {
  id: number;
  observed_on: string;
  time_observed_at?: string;
  quality_grade: 'research' | 'needs_id' | 'casual';
  user: { login: string };
  location: [number, number]; // [lat, lng]
  taxon?: {
    id: number;
    name: string;
    rank: string;
    iconic_taxon_name?: string;
  };
  uri?: string;
};

type FetchParams = {
  startDate: string;
  endDate: string;
  logins?: string[];
  quality?: string[];
  projectId?: string;
};

export async function fetchObservations(params: FetchParams): Promise<INatObservation[]> {
  // In TEST mode, use fixture data
  if (ACTIVE_TRIP === 'TEST') {
    console.log('[inat] Using mock fixture data for TEST profile', params);
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockObservations as INatObservation[];
  }
  
  // TODO: Implement real iNaturalist API call when CORS is resolved
  // For now, return empty array for non-TEST profiles
  console.log('[inat] Network fetch not yet implemented, returning empty data', params);
  await new Promise(resolve => setTimeout(resolve, 500));
  return [];
  
  /* FUTURE: Real API implementation
  try {
    const url = new URL('https://api.inaturalist.org/v1/observations');
    url.searchParams.set('d1', params.startDate);
    url.searchParams.set('d2', params.endDate);
    url.searchParams.set('per_page', '200');
    if (params.logins && params.logins.length > 0) {
      url.searchParams.set('user_login', params.logins.join(','));
    }
    if (params.quality && params.quality.length > 0) {
      url.searchParams.set('quality_grade', params.quality.join(','));
    }
    if (params.projectId) {
      url.searchParams.set('project_id', params.projectId);
    }

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const json = await response.json();
    return json.results || [];
  } catch (error) {
    console.error('[inat] Fetch failed, using mock data:', error);
    return MOCK_DATA;
  }
  */
}

export function toObservation(o: INatObservation) {
  return {
    id: o.id,
    observedOn: o.observed_on,
    timeObservedAt: o.time_observed_at,
    qualityGrade: o.quality_grade,
    userLogin: o.user.login,
    lat: o.location[0],
    lng: o.location[1],
    taxonId: o.taxon?.id,
    taxonName: o.taxon?.name,
    taxonRank: o.taxon?.rank,
    iconicTaxon: o.taxon?.iconic_taxon_name,
    uri: o.uri,
  };
}

/**
 * Fetch local baseline observations for rarity scoring
 * @param locations Array of location bboxes to search
 * @param baselineYears Number of years back to search (default 5)
 * @param baselineMonths Comma-separated month numbers (e.g., "10,11,12")
 */
export async function fetchLocalBaseline(
  locations: Array<{ bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number } }>,
  baselineYears: number = 5,
  baselineMonths: string = "10,11,12"
): Promise<INatObservation[]> {
  // In TEST mode, return empty baseline (or could use a subset of mock data)
  if (ACTIVE_TRIP === 'TEST') {
    console.log('[inat] Using empty baseline for TEST profile');
    return [];
  }
  
  // TODO: Implement real iNaturalist API call for baseline data
  // For now, return empty array for non-TEST profiles
  console.log('[inat] Baseline fetch not yet implemented', { locations, baselineYears, baselineMonths });
  return [];
  
  /* FUTURE: Real API implementation
  try {
    const results: INatObservation[] = [];
    const months = baselineMonths.split(',').map(m => parseInt(m.trim()));
    const endYear = new Date().getFullYear();
    const startYear = endYear - baselineYears;
    
    // Fetch observations for each location bbox
    for (const loc of locations) {
      const { minLat, minLng, maxLat, maxLng } = loc.bbox;
      
      const url = new URL('https://api.inaturalist.org/v1/observations');
      url.searchParams.set('nelat', maxLat.toString());
      url.searchParams.set('nelng', maxLng.toString());
      url.searchParams.set('swlat', minLat.toString());
      url.searchParams.set('swlng', minLng.toString());
      url.searchParams.set('verifiable', 'true');
      url.searchParams.set('has', 'photos');
      url.searchParams.set('month', months.join(','));
      url.searchParams.set('year', `${startYear},${endYear}`);
      url.searchParams.set('per_page', '200');
      
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const json = await response.json();
      results.push(...(json.results || []));
    }
    
    // Dedupe by observation ID
    const uniqueObs = new Map<number, INatObservation>();
    results.forEach(obs => uniqueObs.set(obs.id, obs));
    return Array.from(uniqueObs.values());
  } catch (error) {
    console.error('[inat] Baseline fetch failed:', error);
    return [];
  }
  */
}
