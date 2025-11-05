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
