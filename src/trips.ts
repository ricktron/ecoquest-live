export type TripProfile = 'testing' | 'costa_rica' | 'big_bend' | 'campus';

export type TripConfig = {
  name: string;
  start: string;
  end: string;
  tz: string;
  bbox?: [number, number, number, number];
  fallbackSunsetHHMM?: string;
  dayRanges: { start: string; end: string }[];
};

export const TRIPS: Record<TripProfile, TripConfig> = {
  testing: { 
    name: 'Testing', 
    start: '2025-01-10', 
    end: '2025-01-20', 
    tz: 'America/Chicago',
    fallbackSunsetHHMM: '17:30',
    dayRanges: [{ start: '2025-01-10', end: '2025-01-20' }],
  },
  costa_rica: { 
    name: 'Costa Rica BioBlitz', 
    start: '2025-11-08', 
    end: '2025-11-15', 
    tz: 'America/Costa_Rica', 
    bbox: [-83.6, 10.2, -83.4, 10.6],
    fallbackSunsetHHMM: '17:30',
    dayRanges: [{ start: '2025-11-08', end: '2025-11-15' }],
  },
  big_bend: { 
    name: 'Big Bend', 
    start: '2026-03-10', 
    end: '2026-03-16', 
    tz: 'America/Chicago',
    fallbackSunsetHHMM: '18:00',
    dayRanges: [{ start: '2026-03-10', end: '2026-03-16' }],
  },
  campus: { 
    name: 'Campus BioBlitz', 
    start: '2025-04-01', 
    end: '2025-04-30', 
    tz: 'America/Chicago',
    fallbackSunsetHHMM: '19:00',
    dayRanges: [{ start: '2025-04-01', end: '2025-04-30' }],
  },
};

export const ACTIVE_TRIP = (import.meta.env.VITE_TRIP_PROFILE as TripProfile) ?? 'testing';
export const TRIP = TRIPS[ACTIVE_TRIP];

export function getActiveTrip(): TripConfig {
  return TRIP;
}
