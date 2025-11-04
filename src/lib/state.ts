// Global state management for date range, filters, and aggregated scores

import { create } from 'zustand';
import { fetchObservations, toObservation, type INatObservation } from './inat';
import { aggregateScores, type ObservationData, type AggregatedScores } from './scoring';
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
  
  // Actions
  setDateRange: (start: string, end: string) => void;
  setLogins: (logins: string[]) => void;
  refresh: () => Promise<void>;
  initialize: () => void;
};

export const useAppState = create<AppState>((set, get) => ({
  // Default to last 5 years
  startDate: dayjs().subtract(5, 'year').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  logins: [],
  
  loading: false,
  rawObservations: [],
  observations: [],
  aggregated: null,
  
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
      
      const obs = raw.map(toObservation);
      const aggregated = aggregateScores(obs);
      
      set({
        rawObservations: raw,
        observations: obs,
        aggregated,
        loading: false,
      });
    } catch (error) {
      console.error('[state] Failed to refresh:', error);
      set({ loading: false });
    }
  },
  
  initialize: () => {
    // Read from URL params if present
    const url = new URL(window.location.href);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const logins = url.searchParams.get('logins');
    
    if (start && end) {
      set({ startDate: start, endDate: end });
    }
    
    if (logins) {
      set({ logins: logins.split(',').filter(Boolean) });
    }
    
    // Initial load
    get().refresh();
  },
}));
