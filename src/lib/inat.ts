// iNaturalist public API client with CORS-safe fetch and fallback to mock data

export type INatObservation = {
  id: number;
  observed_on: string;
  quality_grade: 'research' | 'needs_id' | 'casual';
  user: { login: string };
  location: [number, number]; // [lat, lng]
  taxon?: {
    id: number;
    name: string;
    rank: string;
    iconic_taxon_name?: string;
  };
};

type FetchParams = {
  startDate: string;
  endDate: string;
  logins?: string[];
  quality?: string[];
  projectId?: string;
};

const MOCK_DATA: INatObservation[] = [
  {
    id: 1,
    observed_on: '2025-01-15',
    quality_grade: 'research',
    user: { login: 'alice' },
    location: [10.55, -83.52],
    taxon: { id: 1, name: 'Bufo marinus', rank: 'species', iconic_taxon_name: 'Amphibia' },
  },
  {
    id: 2,
    observed_on: '2025-01-14',
    quality_grade: 'needs_id',
    user: { login: 'bob' },
    location: [10.56, -83.51],
    taxon: { id: 2, name: 'Panthera onca', rank: 'species', iconic_taxon_name: 'Mammalia' },
  },
  {
    id: 3,
    observed_on: '2025-01-13',
    quality_grade: 'research',
    user: { login: 'alice' },
    location: [10.54, -83.53],
    taxon: { id: 3, name: 'Ara macao', rank: 'species', iconic_taxon_name: 'Aves' },
  },
  {
    id: 4,
    observed_on: '2025-01-12',
    quality_grade: 'casual',
    user: { login: 'charlie' },
    location: [10.57, -83.50],
    taxon: { id: 4, name: 'Basiliscus plumifrons', rank: 'species', iconic_taxon_name: 'Reptilia' },
  },
  {
    id: 5,
    observed_on: '2025-01-11',
    quality_grade: 'research',
    user: { login: 'bob' },
    location: [10.55, -83.52],
    taxon: { id: 5, name: 'Morpho peleides', rank: 'species', iconic_taxon_name: 'Insecta' },
  },
];

export async function fetchObservations(params: FetchParams): Promise<INatObservation[]> {
  // TODO: Implement real iNaturalist API call when CORS is resolved
  // For now, return mock data to keep UI functional
  
  console.log('[inat] Using mock data (CORS/network not yet implemented)', params);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return MOCK_DATA;
  
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
    qualityGrade: o.quality_grade,
    userLogin: o.user.login,
    lat: o.location[0],
    lng: o.location[1],
    taxonId: o.taxon?.id,
    taxonName: o.taxon?.name,
    taxonRank: o.taxon?.rank,
    iconicTaxon: o.taxon?.iconic_taxon_name,
  };
}
