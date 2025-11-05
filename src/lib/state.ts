// Global state management for date range, filters, and aggregated scores

import { create } from 'zustand';
import { fetchObservations, toObservation, type INatObservation } from './inat';
import { aggregateScores, type ObservationData, type AggregatedScores } from './scoring';
import { getActiveTrip, getTripFilters } from '@/trips';
import { loadHazardsFromSupabase, type HazardDef } from './hazards';
import dayjs from 'dayjs';

type AppState = {
  // Filters
  startDate: string;
  endDate: string;
  logins: string[];
  
  // Data
  loading: boolean;
  rawObservations: INatObservation[];
  observations: ObservationData[];
  aggregated: AggregatedScores | null;
  lastInatSync: number | null;  // timestamp of last fetch
  hazardsByTaxon: Map<number, HazardDef>;
  
  // Actions
  setDateRange: (start: string, end: string) => void;
  setLogins: (logins: string[]) => void;
  refresh: () => Promise<void>;
  initialize: () => void;
  fetchPriorPeriod: (windowDays: number) => Promise<AggregatedScores | null>;
};

export const useAppState = create<AppState>((set, get) => {
  const trip = getActiveTrip();
  const defaultStart = trip.dayRanges[0]?.start || dayjs().subtract(5, 'year').format('YYYY-MM-DD');
  const defaultEnd = trip.dayRanges[trip.dayRanges.length - 1]?.end || dayjs().format('YYYY-MM-DD');
  
  return {
  startDate: defaultStart,
  endDate: defaultEnd,
  logins: trip.memberLogins,
  
  loading: false,
  rawObservations: [],
  observations: [],
  aggregated: null,
  lastInatSync: null,
  hazardsByTaxon: new Map(),
  
  setDateRange: (start, end) => {
    set({ startDate: start, endDate: end });
    
    // Update URL params
    const url = new URL(window.location.href);
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    window.history.replaceState({}, '', url.toString());
    
    get().refresh();
  },
  
  setLogins: (logins) => {
    set({ logins });
    
    // Update URL params
    const url = new URL(window.location.href);
    if (logins.length > 0) {
      url.searchParams.set('logins', logins.join(','));
    } else {
      url.searchParams.delete('logins');
    }
    window.history.replaceState({}, '', url.toString());
    
    get().refresh();
  },
  
  refresh: async () => {
    const { startDate, endDate, logins } = get();
    set({ loading: true });
    
    try {
      const raw = await fetchObservations({
        startDate,
        endDate,
        logins: logins.length > 0 ? logins : undefined,
      });
      
      const filters = getTripFilters();
      const filteredRaw = raw.filter(r => {
        const takenAt = r.time_observed_at || r.observed_on;
        const login = r.user?.login || '';
        const lat = r.location?.[0] || 0;
        const lng = r.location?.[1] || 0;
        
        return filters.dayInRange(takenAt) && 
               filters.userAllowed(login) && 
               filters.inPlace(lat, lng);
      });
      
      const obs = filteredRaw.map(toObservation);
      const aggregated = aggregateScores(obs);
      
      set({
        rawObservations: filteredRaw,
        observations: obs,
        aggregated,
        loading: false,
        lastInatSync: Date.now(),
      });
    } catch (error) {
      console.error('[state] Failed to refresh:', error);
      set({ loading: false });
    }
  },
  
  fetchPriorPeriod: async (windowDays: number) => {
    const { startDate, endDate, logins } = get();
    const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day');
    
    const priorEnd = dayjs(startDate).subtract(1, 'day').format('YYYY-MM-DD');
    const priorStart = dayjs(priorEnd).subtract(daysDiff, 'day').format('YYYY-MM-DD');
    
    try {
      const raw = await fetchObservations({
        startDate: priorStart,
        endDate: priorEnd,
        logins: logins.length > 0 ? logins : undefined,
      });
      
      const obs = raw.map(toObservation);
      return aggregateScores(obs);
    } catch (error) {
      console.error('[state] Failed to fetch prior period:', error);
      return null;
    }
  },
  
  initialize: async () => {
    // Load hazards cache
    const hazards = await loadHazardsFromSupabase();
    const hazardsMap = new Map(hazards.map(h => [h.taxon_id, h]));
    set({ hazardsByTaxon: hazardsMap });
    
    // Initial data load
    get().refresh();
  },
}});
