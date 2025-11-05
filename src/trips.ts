export type TripProfile = 'testing' | 'costa_rica' | 'big_bend' | 'campus';

export type TripConfig = {
  name: string;
  start: string;
  end: string;
  tz: string;
  bbox?: [number, number, number, number];
};

export const TRIPS: Record<TripProfile, TripConfig> = {
  testing: { 
    name: 'Testing', 
    start: '2025-01-10', 
    end: '2025-01-20', 
    tz: 'America/Chicago' 
  },
  costa_rica: { 
    name: 'Costa Rica BioBlitz', 
    start: '2025-11-08', 
    end: '2025-11-15', 
    tz: 'America/Costa_Rica', 
    bbox: [-83.6, 10.2, -83.4, 10.6] 
  },
  big_bend: { 
    name: 'Big Bend', 
    start: '2026-03-10', 
    end: '2026-03-16', 
    tz: 'America/Chicago' 
  },
  campus: { 
    name: 'Campus BioBlitz', 
    start: '2025-04-01', 
    end: '2025-04-30', 
    tz: 'America/Chicago' 
  },
};

export const ACTIVE_TRIP = (import.meta.env.VITE_TRIP_PROFILE as TripProfile) ?? 'testing';
export const TRIP = TRIPS[ACTIVE_TRIP];
