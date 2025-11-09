/**
 * Load trophy catalog: prefer trophy_catalog_v from Supabase, fallback to local registry.
 * Filter out any sound trophy.
 */

import { supabase } from '@/lib/supabaseClient';
import { TROPHIES, TrophySpec } from './registry';

export async function loadCatalog(): Promise<TrophySpec[]> {
  try {
    const { data, error } = await supabase()
      .from('trophy_catalog_v' as any)
      .select('*');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Map from DB rows to TrophySpec format
      const specs: TrophySpec[] = data.map((row: any) => ({
        id: row.trophy_id || row.id,
        title: row.title,
        subtitle: row.subtitle || row.description || '',
        scope: (row.scope || 'trip') as 'daily' | 'trip',
        metric: row.metric || undefined,
        view: row.view_name || null,
        info: row.info || row.description || ''
      }));
      
      // Filter out sound trophies
      return specs.filter(t => !t.id.includes('sound'));
    }
  } catch (err) {
    console.warn('trophy_catalog_v not available, falling back to local registry', err);
  }
  
  // Fallback to local registry, filter out sound trophies
  return TROPHIES.filter(t => !t.id.includes('sound'));
}
