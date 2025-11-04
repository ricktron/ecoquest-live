import { supa } from './supabase';

export type ZoneRow = {
  zone_id: string;
  slug: string;
  label: string | null;
  zone_type: 'circle' | 'corridor';
  // circle
  radius_km: number | null;
  lat1: number | null;
  lon1: number | null;
  // corridor (line + width)
  lat2: number | null;
  lon2: number | null;
  width_km: number | null;
};

export type Observation = {
  id: number;
  latitude: number;
  longitude: number;
  quality_grade: string;
  observed_on: string;
  user_login: string;
};

export async function fetchOverlays(): Promise<{ circles: ZoneRow[]; corridors: ZoneRow[] }> {
  const { data, error } = await supa
    .from('trophy_zones_v1')
    .select('zone_id,slug,label,zone_type,radius_km,lat1,lon1,lat2,lon2,width_km');
  
  if (error) throw error;
  
  const circles = (data ?? []).filter(z => z.zone_type === 'circle');
  const corridors = (data ?? []).filter(z => z.zone_type === 'corridor');
  
  return { circles, corridors };
}

export async function getZones(): Promise<ZoneRow[]> {
  const { data, error } = await supa
    .from('trophy_zones_v1')
    .select('zone_id,slug,label,zone_type,radius_km,lat1,lon1,lat2,lon2,width_km');
  if (error) throw error;
  return data ?? [];
}

type BboxParams = {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
  dateRange?: { start: string; end: string };
  qg?: string[];
  logins?: string[];
};

let fetchMethod: 'rpc' | 'direct' | null = null;

export async function fetchObsByBbox(params: BboxParams): Promise<Observation[]> {
  const { sw, ne, dateRange, qg, logins } = params;
  
  // Try RPC first
  try {
    const rpcParams: any = {
      min_lat: sw.lat,
      max_lat: ne.lat,
      min_lon: sw.lng,
      max_lon: ne.lng,
    };
    
    if (dateRange) {
      rpcParams.start_date = dateRange.start;
      rpcParams.end_date = dateRange.end;
    }
    
    if (qg && qg.length > 0) {
      rpcParams.quality_grades = qg;
    }
    
    if (logins && logins.length > 0) {
      rpcParams.user_logins = logins;
    }
    
    const { data, error } = await supa.rpc('obs_bbox_v1', rpcParams);
    
    if (!error && data) {
      if (fetchMethod !== 'rpc') {
        fetchMethod = 'rpc';
        console.log('[Bronze] Using RPC method for observations');
      }
      return data as Observation[];
    }
  } catch (err) {
    console.warn('[Bronze] RPC failed, falling back to direct query:', err);
  }
  
  // Fallback to direct query
  if (fetchMethod !== 'direct') {
    fetchMethod = 'direct';
    console.log('[Bronze] Using direct query method for observations');
  }
  
  let query = supa
    .from('observations_public_v1')
    .select('id,latitude,longitude,quality_grade,observed_on,user_login')
    .gte('latitude', sw.lat)
    .lte('latitude', ne.lat)
    .gte('longitude', sw.lng)
    .lte('longitude', ne.lng);
  
  if (dateRange) {
    query = query.gte('observed_on', dateRange.start).lte('observed_on', dateRange.end);
  }
  
  if (qg && qg.length > 0) {
    query = query.in('quality_grade', qg);
  }
  
  if (logins && logins.length > 0) {
    query = query.in('user_login', logins);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return (data ?? []) as Observation[];
}

export function getFetchMethod(): 'rpc' | 'direct' | null {
  return fetchMethod;
}
