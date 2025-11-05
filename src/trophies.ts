// Trophy registry with support for custom images
import { ObservationData, ScoringContext } from '@/lib/scoring';

export type TrophyResult = {
  login: string;
  value: number;
  evidence: string;
  observations?: ObservationData[];
};

export type TrophyDef = {
  slug: string;
  scope: 'daily' | 'trip';
  title: string;
  subtitle: string;
  icon?: string;
  imageUrl?: string; // optional custom image from Supabase Storage
  compute: (obs: ObservationData[], ctx: ScoringContext, date?: string) => Promise<TrophyResult[]>;
};

export const TROPHIES: Record<string, TrophyDef> = {
  'daily-variety-hero': {
    slug: 'daily-variety-hero',
    scope: 'daily',
    title: 'Daily Variety Hero',
    subtitle: 'Most biodiverse set in a day',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userSpecies = new Map<string, Set<number>>();
      dayObs.forEach(o => {
        if (!userSpecies.has(o.userLogin)) userSpecies.set(o.userLogin, new Set());
        if (o.taxonId) userSpecies.get(o.userLogin)!.add(o.taxonId);
      });
      return Array.from(userSpecies.entries())
        .map(([login, species]) => ({
          login,
          value: species.size,
          evidence: `${species.size} unique species`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'variety-hero': {
    slug: 'variety-hero',
    scope: 'trip',
    title: 'Variety Hero',
    subtitle: 'Most biodiverse set (trip)',
    compute: async (obs, ctx) => {
      const userSpecies = new Map<string, Set<number>>();
      obs.forEach(o => {
        if (!userSpecies.has(o.userLogin)) userSpecies.set(o.userLogin, new Set());
        if (o.taxonId) userSpecies.get(o.userLogin)!.add(o.taxonId);
      });
      return Array.from(userSpecies.entries())
        .map(([login, species]) => ({
          login,
          value: species.size,
          evidence: `${species.size} unique species`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'daily-rare-find': {
    slug: 'daily-rare-find',
    scope: 'daily',
    title: 'Daily Rare Find',
    subtitle: 'Single rarest observation of the day',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userRarity = new Map<string, { maxRarity: number; maxObs?: ObservationData }>();
      dayObs.forEach(o => {
        if (!o.taxonId) return;
        const rarity = ctx.rarityByTaxon.get(o.taxonId) || 0;
        const current = userRarity.get(o.userLogin);
        if (!current || rarity > current.maxRarity) {
          userRarity.set(o.userLogin, { maxRarity: rarity, maxObs: o });
        }
      });
      return Array.from(userRarity.entries())
        .map(([login, { maxRarity, maxObs }]) => ({
          login,
          value: maxRarity,
          evidence: `Rarity score: ${maxRarity.toFixed(1)}`,
          observations: maxObs ? [maxObs] : [],
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'rare-find': {
    slug: 'rare-find',
    scope: 'trip',
    title: 'Rarest Observation',
    subtitle: 'Single rarest observation (trip)',
    compute: async (obs, ctx) => {
      const userRarity = new Map<string, { maxRarity: number; maxObs?: ObservationData }>();
      obs.forEach(o => {
        if (!o.taxonId) return;
        const rarity = ctx.rarityByTaxon.get(o.taxonId) || 0;
        const current = userRarity.get(o.userLogin);
        if (!current || rarity > current.maxRarity) {
          userRarity.set(o.userLogin, { maxRarity: rarity, maxObs: o });
        }
      });
      return Array.from(userRarity.entries())
        .map(([login, { maxRarity, maxObs }]) => ({
          login,
          value: maxRarity,
          evidence: `Rarity score: ${maxRarity.toFixed(1)}`,
          observations: maxObs ? [maxObs] : [],
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'early-bird': {
    slug: 'early-bird',
    scope: 'daily',
    title: 'Early Bird',
    subtitle: 'Most 4–7am observations (daily)',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userEarly = new Map<string, { count: number; earliestTime?: string; obs: ObservationData[] }>();
      dayObs.forEach(o => {
        const timeStr = o.timeObservedAt || o.observedOn;
        const hour = new Date(timeStr).getHours();
        if (hour >= 4 && hour < 7) {
          const current = userEarly.get(o.userLogin) || { count: 0, obs: [] };
          userEarly.set(o.userLogin, {
            count: current.count + 1,
            earliestTime: !current.earliestTime || timeStr < current.earliestTime ? timeStr : current.earliestTime,
            obs: [...current.obs, o],
          });
        }
      });
      return Array.from(userEarly.entries())
        .map(([login, { count, earliestTime, obs }]) => ({
          login,
          value: count,
          evidence: `${count} early observations, earliest: ${new Date(earliestTime!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          observations: obs.slice(0, 3),
        }))
        .sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          const aTime = userEarly.get(a.login)?.earliestTime || '';
          const bTime = userEarly.get(b.login)?.earliestTime || '';
          return aTime.localeCompare(bTime);
        });
    },
  },
  'night-owl': {
    slug: 'night-owl',
    scope: 'daily',
    title: 'Night Owl',
    subtitle: 'Most evening observations (sunset–midnight)',
    compute: async (obs, ctx, date) => {
      // TODO: integrate trip.solar?.sunset when available
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userNight = new Map<string, { count: number; obs: ObservationData[] }>();
      dayObs.forEach(o => {
        const timeStr = o.timeObservedAt || o.observedOn;
        const hour = new Date(timeStr).getHours();
        // Use fallback window: 17:30 (5:30pm) to 23:59 (midnight)
        if (hour >= 17 || hour < 5) {
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
          evidence: `${count} evening observations`,
          observations: obs.slice(0, 3),
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'trailblazer': {
    slug: 'trailblazer',
    scope: 'trip',
    title: 'Trailblazer',
    subtitle: 'First to observe species during trip',
    compute: async (obs, ctx) => {
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
        .sort((a, b) => b.value - a.value);
    },
  },
  'steady-eddie': {
    slug: 'steady-eddie',
    scope: 'daily',
    title: 'Steady Eddie',
    subtitle: '5+ obs across ≥3 distinct time blocks',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userBlocks = new Map<string, Set<number>>();
      dayObs.forEach(o => {
        const hour = new Date(o.timeObservedAt || o.observedOn).getHours();
        const block = Math.floor(hour / 3); // 0-23 -> 0-7 blocks
        if (!userBlocks.has(o.userLogin)) userBlocks.set(o.userLogin, new Set());
        userBlocks.get(o.userLogin)!.add(block);
      });
      const userCounts = new Map<string, number>();
      dayObs.forEach(o => {
        userCounts.set(o.userLogin, (userCounts.get(o.userLogin) || 0) + 1);
      });
      return Array.from(userBlocks.entries())
        .filter(([login, blocks]) => {
          const count = userCounts.get(login) || 0;
          return count >= 5 && blocks.size >= 3;
        })
        .map(([login, blocks]) => ({
          login,
          value: blocks.size,
          evidence: `${userCounts.get(login)} obs across ${blocks.size} time blocks`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
};

export function getTrophyBySlug(slug: string): TrophyDef | undefined {
  return TROPHIES[slug];
}

export function getTripTrophies(): TrophyDef[] {
  return Object.values(TROPHIES).filter(t => t.scope === 'trip');
}

export function getDailyTrophies(): TrophyDef[] {
  return Object.values(TROPHIES).filter(t => t.scope === 'daily');
}
