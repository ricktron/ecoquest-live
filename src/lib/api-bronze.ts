import { supabase } from './supabase';

export type Obs = {
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
  quality_grade: string;
  observed_at_utc?: string;
  time_observed_at?: string;
  taxon_name?: string;
  species_guess?: string;
  photo_url?: string;
};

export type TripLocation = {
  slug: string;
  label: string;
  radius_km: number;
  lat: number;
  lon: number;
};

export type TripCorridor = {
  slug: string;
  label: string;
  width_km: number;
  lat1: number;
  lon1: number;
  lat2: number;
  lon2: number;
};

export type Overlays = {
  locations: TripLocation[];
  corridors: TripCorridor[];
};

export async function getOverlays(): Promise<Overlays> {
  const [locationsResult, corridorsResult] = await Promise.all([
    supabase.from('trip_locations').select('*'),
    supabase.from('trip_corridors').select('*')
  ]);

  if (locationsResult.error) {
    console.warn('Error fetching trip_locations:', locationsResult.error);
  }
  if (corridorsResult.error) {
    console.warn('Error fetching trip_corridors:', corridorsResult.error);
  }

  return {
    locations: locationsResult.data || [],
    corridors: corridorsResult.data || []
  };
}

type FetchObsParams = {
  swLat: number;
  swLon: number;
  neLat: number;
  neLon: number;
  dFrom?: string;
  dTo?: string;
  qg?: string[];
  logins?: string[];
};

let rpcAvailable: boolean | null = null;

export async function fetchObsByBbox(params: FetchObsParams): Promise<Obs[]> {
  const { swLat, swLon, neLat, neLon, dFrom, dTo, qg, logins } = params;

  // Try RPC if we haven't determined it's unavailable
  if (rpcAvailable !== false) {
    try {
      const { data, error } = await supabase.rpc('obs_bbox_v1', {
        sw_lat: swLat,
        sw_lon: swLon,
        ne_lat: neLat,
        ne_lon: neLon,
        d_from: dFrom,
        d_to: dTo,
        qg: qg,
        logins: logins
      });

      if (error) {
        // Check if it's a missing RPC error
        if (error.code === 'PGRST202' || error.message.includes('not found')) {
          console.log('[API] RPC obs_bbox_v1 not found, falling back to direct query');
          rpcAvailable = false;
        } else {
          throw error;
        }
      } else {
        if (rpcAvailable === null) {
          console.log('[API] Using RPC obs_bbox_v1');
          rpcAvailable = true;
        }
        return normalizeObs(data || []);
      }
    } catch (err) {
      console.error('[API] RPC error:', err);
      rpcAvailable = false;
    }
  }

  // Fallback to direct query
  if (rpcAvailable === null) {
    console.log('[API] Using fallback direct query on observations_public_v1');
    rpcAvailable = false;
  }

  let query = supabase
    .from('observations_public_v1')
    .select('*')
    .gte('latitude', swLat)
    .lte('latitude', neLat)
    .gte('longitude', swLon)
    .lte('longitude', neLon)
    .limit(5000);

  // Apply date filters - check both possible timestamp columns
  if (dFrom) {
    query = query.or(`observed_at_utc.gte.${dFrom},time_observed_at.gte.${dFrom}`);
  }
  if (dTo) {
    query = query.or(`observed_at_utc.lte.${dTo},time_observed_at.lte.${dTo}`);
  }

  // Apply quality grade filter
  if (qg && qg.length > 0) {
    query = query.in('quality_grade', qg);
  }

  // Apply logins filter
  if (logins && logins.length > 0) {
    query = query.in('user_login', logins);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[API] Fallback query error:', error);
    throw error;
  }

  return normalizeObs(data || []);
}

function normalizeObs(data: Record<string, unknown>[]): Obs[] {
  return data as Obs[];
}

export function formatObsForPopup(obs: Obs): {
  name: string;
  observedAt: string;
  user: string;
  qg: string;
  photo?: string;
} {
  const observedAt = obs.observed_at_utc || obs.time_observed_at || '';
  const name = obs.taxon_name || obs.species_guess || 'Unknown';
  
  return {
    name,
    observedAt,
    user: obs.user_login,
    qg: obs.quality_grade,
    photo: obs.photo_url
  };
}
