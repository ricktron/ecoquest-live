export type TripProfile = 'CR_TRIP_2025' | 'TEST';

export type TripLocation = {
  slug: string;
  name: string;
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
};

export type TripConfig = {
  id: TripProfile;
  title: string;
  timezone: string;
  dayRanges: Array<{ start: string; end: string }>;
  memberLogins: string[];
  placeId?: number; // iNat place ID if known
  bbox?: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  fallbackSunsetHHMM?: string;
  locations: TripLocation[];
};

export const TRIPS: Record<TripProfile, TripConfig> = {
  TEST: {
    id: 'TEST',
    title: 'Test Trip',
    timezone: 'America/Chicago',
    dayRanges: [{ start: '2025-01-11', end: '2025-01-15' }],
    memberLogins: ['alice', 'bob', 'charlie'],
    bbox: undefined, // No place filter for TEST
    fallbackSunsetHHMM: '17:30',
    locations: [],
  },
  CR_TRIP_2025: {
    id: 'CR_TRIP_2025',
    title: 'Costa Rica BioBlitz 2025',
    timezone: 'America/Costa_Rica',
    dayRanges: [{ start: '2025-11-08', end: '2025-11-15' }],
    memberLogins: [], // Add actual member logins here
    placeId: 6792, // Costa Rica iNat place ID
    bbox: { minLat: 8.0, minLng: -86.0, maxLat: 11.5, maxLng: -82.5 },
    fallbackSunsetHHMM: '17:30',
    locations: [
      { 
        slug: 'monteverde',
        name: 'Monteverde Cloud Forest',
        bbox: { minLat: 10.25, minLng: -84.85, maxLat: 10.35, maxLng: -84.75 }
      },
      {
        slug: 'arenal',
        name: 'Arenal Volcano Area',
        bbox: { minLat: 10.40, minLng: -84.75, maxLat: 10.50, maxLng: -84.65 }
      },
    ],
  },
};

export const ACTIVE_TRIP = (import.meta.env.VITE_TRIP_PROFILE as TripProfile) ?? 'TEST';
export const TRIP = TRIPS[ACTIVE_TRIP];

export function getActiveTrip(): TripConfig {
  return TRIP;
}

export type TripFilters = {
  dayPredicate: (takenAt: string) => boolean;
  memberPredicate: (login: string) => boolean;
  placePredicate: (lat: number, lng: number) => boolean;
  tz: string;
};

export function getTripFilters() {
  const trip = getActiveTrip();
  
  return {
    tz: trip.timezone,
    dayInRange: (takenAt: string) => {
      const date = takenAt.split('T')[0];
      return trip.dayRanges.some(range => date >= range.start && date <= range.end);
    },
    userAllowed: (login: string) => {
      if (trip.memberLogins.length === 0) return true; // No filter if empty
      return trip.memberLogins.includes(login);
    },
    inPlace: (lat: number, lng: number) => {
      if (!trip.bbox) return true;
      const { minLat, minLng, maxLat, maxLng } = trip.bbox;
      return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    },
    eligibleForAwards: (login: string) => {
      // All users eligible for awards
      return true;
    },
  };
}
