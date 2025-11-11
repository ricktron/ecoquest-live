export type TrophyScope = 'daily' | 'trip';

export type TrophySpec = {
  id: string;                 // route segment
  title: string;
  subtitle: string;
  scope: TrophyScope;         // 'daily' or 'trip'
  metric?: string;            // label for the value
  view?: string | null;       // Supabase view for winners (optional)
  info: string;               // tooltip/help text
};

export const TROPHIES: TrophySpec[] = [
  { id: 'variety-hero',        title: 'Variety Hero',        subtitle: 'Most unique species observed',          scope: 'trip',  metric: 'unique spp.', view: 'trophies_variety_hero_latest_run_v', info: 'Trip-long ranking by number of distinct taxa observed.' },
  { id: 'daily-variety-hero',  title: 'Daily Variety Hero',  subtitle: 'Most unique species in a day',          scope: 'daily', metric: 'unique spp.', view: null, info: 'Per-day version of Variety Hero. Visible daily; winners appear after scoring.' },
  { id: 'early-bird',          title: 'Early Bird',          subtitle: 'Earliest observation of the day',       scope: 'daily', metric: 'time',        view: null, info: 'First verified observation time in the day window (local trip timezone).' },
  { id: 'trailblazer',         title: 'Trailblazer',         subtitle: 'First to observe new species (trip)',   scope: 'trip',  metric: 'firsts',      view: null, info: 'Counts how many species you were first to record during the trip.' },
  { id: 'daily-rare-find',     title: 'Daily Rare Find',     subtitle: 'Highest rarity observation of the day', scope: 'daily', metric: 'rarity',      view: null, info: 'Top rarity score for the day (uses rarity_v2 when enabled).' },
  { id: 'trip-rare-find',      title: 'Trip Rare Find',      subtitle: 'Highest total rarity score (trip)',     scope: 'trip',  metric: 'rarity',      view: null, info: 'Sum of rarity scores across your trip observations.' },
  { id: 'daily-night-owl',     title: 'Daily Night Owl',     subtitle: 'Most nighttime observations',           scope: 'daily', metric: 'obs',         view: null, info: 'Night window is 20:00–05:00 in the trip timezone.' },
  { id: 'trip-night-owl',      title: 'Trip Night Owl',      subtitle: 'Most nighttime observations (trip)',    scope: 'trip',  metric: 'obs',         view: null, info: 'Nighttime observations across the entire trip window.' },
  { id: 'shutterbug',          title: 'Shutterbug',          subtitle: 'Most observations with photos',         scope: 'trip',  metric: 'obs',         view: null, info: 'Photo-backed observations only.' },
  { id: 'sound-scout',         title: 'Sound Scout',         subtitle: 'Most observations with sounds',         scope: 'trip',  metric: 'obs',         view: null, info: 'Sound-backed observations only.' },
  { id: 'daily_mammal_maven',  title: 'Mammal Maven',        subtitle: '≥2 mammal species today',               scope: 'daily', metric: 'species',     view: null, info: 'Awarded for recording at least two distinct mammal species today.' },
  { id: 'daily_bird_blitz',    title: 'Bird Blitz',          subtitle: '≥5 bird species today',                 scope: 'daily', metric: 'species',     view: null, info: 'Awarded for recording at least five distinct bird species today.' },
  { id: 'daily_herp_hunter',   title: 'Herp Hunter',         subtitle: '≥3 reptile or amphibian species today', scope: 'daily', metric: 'species',     view: null, info: 'Awarded for recording at least three reptile or amphibian species today.' },
  { id: 'daily_bug_bonanza',   title: 'Bug Bonanza',         subtitle: '≥6 insect species today',               scope: 'daily', metric: 'species',     view: null, info: 'Awarded for recording at least six distinct insect species today.' },
];
