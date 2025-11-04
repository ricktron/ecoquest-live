import { supabase } from './supabase';

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

export async function getZones(): Promise<ZoneRow[]> {
  const { data, error } = await supabase
    .from('trophy_zones_v1')
    .select('zone_id,slug,label,zone_type,radius_km,lat1,lon1,lat2,lon2,width_km');
  if (error) throw error;
  return data ?? [];
}
