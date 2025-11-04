// Trophy registry for EcoQuest Live

import { ObservationData, ScoringContext } from '@/lib/scoring';
import dayjs from 'dayjs';

export type TrophyResult = {
  login: string;
  value: number;
  evidence: string;
  observations?: ObservationData[];
};

export type TrophySpec = {
  slug: string;
  title: string;
  description: string;
  period: 'trip' | 'day';
  evaluate: (observations: ObservationData[], ctx: ScoringContext, date?: string) => TrophyResult[];
};

export const TROPHIES: TrophySpec[] = [
  {
    slug: 'variety-hero',
    title: 'Variety Hero',
    description: 'Most unique species observed',
    period: 'trip',
    evaluate: (obs) => {
      const userSpecies = new Map<string, Set<number>>();
      obs.forEach(o => {
        if (!userSpecies.has(o.userLogin)) {
          userSpecies.set(o.userLogin, new Set());
        }
        if (o.taxonId) userSpecies.get(o.userLogin)!.add(o.taxonId);
      });
      
      return Array.from(userSpecies.entries())
        .map(([login, species]) => ({
          login,
          value: species.size,
          evidence: `${species.size} unique species`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'variety-hero-day',
    title: 'Daily Variety Hero',
    description: 'Most unique species in a single day',
    period: 'day',
    evaluate: (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userSpecies = new Map<string, Set<number>>();
      dayObs.forEach(o => {
        if (!userSpecies.has(o.userLogin)) {
          userSpecies.set(o.userLogin, new Set());
        }
        if (o.taxonId) userSpecies.get(o.userLogin)!.add(o.taxonId);
      });
      
      return Array.from(userSpecies.entries())
        .map(([login, species]) => ({
          login,
          value: species.size,
          evidence: `${species.size} unique species`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'early-bird',
    title: 'Early Bird',
    description: 'Earliest observation of the day',
    period: 'day',
    evaluate: (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      if (dayObs.length === 0) return [];
      
      const earliest = dayObs.reduce((min, o) => {
        const minTime = dayjs(min.timeObservedAt || min.observedOn);
        const oTime = dayjs(o.timeObservedAt || o.observedOn);
        return oTime.isBefore(minTime) ? o : min;
      });
      
      const time = dayjs(earliest.timeObservedAt || earliest.observedOn).format('HH:mm');
      return [{
        login: earliest.userLogin,
        value: dayjs(earliest.timeObservedAt || earliest.observedOn).hour() * 60 + 
               dayjs(earliest.timeObservedAt || earliest.observedOn).minute(),
        evidence: `First observation at ${time}`,
        observations: [earliest],
      }];
    },
  },
  {
    slug: 'trailblazer',
    title: 'Trailblazer',
    description: 'First to observe species during the trip',
    period: 'trip',
    evaluate: (obs, ctx) => {
      const userFirsts = new Map<string, number>();
      ctx.tripFirstByTaxon.forEach((obsId) => {
        const observation = obs.find(o => o.id === obsId);
        if (observation) {
          userFirsts.set(observation.userLogin, (userFirsts.get(observation.userLogin) || 0) + 1);
        }
      });
      
      return Array.from(userFirsts.entries())
        .map(([login, count]) => ({
          login,
          value: count,
          evidence: `First to observe ${count} species`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'rare-find-day',
    title: 'Daily Rare Find',
    description: 'Highest rarity observation of the day',
    period: 'day',
    evaluate: (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userRarity = new Map<string, { total: number; maxObs?: ObservationData }>();
      
      dayObs.forEach(o => {
        if (!o.taxonId) return;
        const rarity = ctx.rarityByTaxon.get(o.taxonId) || 0;
        const current = userRarity.get(o.userLogin) || { total: 0 };
        userRarity.set(o.userLogin, {
          total: current.total + rarity,
          maxObs: !current.maxObs || rarity > (ctx.rarityByTaxon.get(current.maxObs.taxonId!) || 0) ? o : current.maxObs,
        });
      });
      
      return Array.from(userRarity.entries())
        .map(([login, { total, maxObs }]) => ({
          login,
          value: total,
          evidence: `${total.toFixed(1)} rarity points`,
          observations: maxObs ? [maxObs] : [],
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'rare-find-trip',
    title: 'Trip Rare Find',
    description: 'Highest total rarity score',
    period: 'trip',
    evaluate: (obs, ctx) => {
      const userRarity = new Map<string, number>();
      obs.forEach(o => {
        if (!o.taxonId) return;
        const rarity = ctx.rarityByTaxon.get(o.taxonId) || 0;
        userRarity.set(o.userLogin, (userRarity.get(o.userLogin) || 0) + rarity);
      });
      
      return Array.from(userRarity.entries())
        .map(([login, total]) => ({
          login,
          value: total,
          evidence: `${total.toFixed(1)} rarity points`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'night-owl-day',
    title: 'Daily Night Owl',
    description: 'Most nighttime observations (20:00-05:00)',
    period: 'day',
    evaluate: (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userNight = new Map<string, { count: number; obs: ObservationData[] }>();
      
      dayObs.forEach(o => {
        const hour = dayjs(o.timeObservedAt || o.observedOn).hour();
        if (hour >= 20 || hour < 5) {
          const current = userNight.get(o.userLogin) || { count: 0, obs: [] };
          userNight.set(o.userLogin, {
            count: current.count + 1,
            obs: [...current.obs, o],
          });
        }
      });
      
      return Array.from(userNight.entries())
        .map(([login, { count, obs }]) => ({
          login,
          value: count,
          evidence: `${count} nighttime observations`,
          observations: obs.slice(0, 5),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'night-owl-trip',
    title: 'Trip Night Owl',
    description: 'Most nighttime observations during trip',
    period: 'trip',
    evaluate: (obs) => {
      const userNight = new Map<string, number>();
      obs.forEach(o => {
        const hour = dayjs(o.timeObservedAt || o.observedOn).hour();
        if (hour >= 20 || hour < 5) {
          userNight.set(o.userLogin, (userNight.get(o.userLogin) || 0) + 1);
        }
      });
      
      return Array.from(userNight.entries())
        .map(([login, count]) => ({
          login,
          value: count,
          evidence: `${count} nighttime observations`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'macro-master',
    title: 'Macro Master',
    description: 'Highest arthropod observation ratio',
    period: 'trip',
    evaluate: (obs) => {
      const userStats = new Map<string, { total: number; arthropods: number }>();
      obs.forEach(o => {
        const iconic = o.iconicTaxon?.toLowerCase() || '';
        const isArthropod = iconic.includes('insect') || iconic.includes('arach');
        const current = userStats.get(o.userLogin) || { total: 0, arthropods: 0 };
        userStats.set(o.userLogin, {
          total: current.total + 1,
          arthropods: current.arthropods + (isArthropod ? 1 : 0),
        });
      });
      
      return Array.from(userStats.entries())
        .filter(([, { total }]) => total >= 5)
        .map(([login, { total, arthropods }]) => ({
          login,
          value: (arthropods / total) * 100,
          evidence: `${arthropods}/${total} observations (${((arthropods / total) * 100).toFixed(1)}%)`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
  {
    slug: 'steady-eddie',
    title: 'Steady Eddie',
    description: 'Longest consecutive day streak',
    period: 'trip',
    evaluate: (obs) => {
      const userDays = new Map<string, Set<string>>();
      obs.forEach(o => {
        if (!userDays.has(o.userLogin)) {
          userDays.set(o.userLogin, new Set());
        }
        userDays.get(o.userLogin)!.add(o.observedOn);
      });
      
      const userStreaks = new Map<string, number>();
      userDays.forEach((days, login) => {
        const sorted = Array.from(days).sort();
        let maxStreak = 1;
        let currentStreak = 1;
        
        for (let i = 1; i < sorted.length; i++) {
          const prev = dayjs(sorted[i - 1]);
          const curr = dayjs(sorted[i]);
          if (curr.diff(prev, 'day') === 1) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else {
            currentStreak = 1;
          }
        }
        
        userStreaks.set(login, maxStreak);
      });
      
      return Array.from(userStreaks.entries())
        .map(([login, streak]) => ({
          login,
          value: streak,
          evidence: `${streak} consecutive days`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    },
  },
];

export function getTrophyBySlug(slug: string): TrophySpec | undefined {
  return TROPHIES.find(t => t.slug === slug);
}

export function getTripTrophies(): TrophySpec[] {
  return TROPHIES.filter(t => t.period === 'trip');
}

export function getDayTrophies(): TrophySpec[] {
  return TROPHIES.filter(t => t.period === 'day');
}
