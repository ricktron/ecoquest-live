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

// Helper to compute Shannon diversity H'
function computeShannonDiversity(obs: ObservationData[]): number {
  const taxonCounts = new Map<number, number>();
  obs.forEach(o => {
    if (o.taxonId) {
      taxonCounts.set(o.taxonId, (taxonCounts.get(o.taxonId) || 0) + 1);
    }
  });
  const total = obs.length;
  let H = 0;
  for (const count of taxonCounts.values()) {
    const p = count / total;
    H -= p * Math.log(p);
  }
  return H;
}

export const TROPHIES: Record<string, TrophyDef> = {
  'daily-variety-hero': {
    slug: 'daily-variety-hero',
    scope: 'daily',
    title: 'Daily Variety Hero',
    subtitle: 'Most biodiverse set in a day',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userSpecies = new Map<string, Set<number>>();
      const userLastTime = new Map<string, string>();
      
      dayObs.forEach(o => {
        if (!userSpecies.has(o.userLogin)) userSpecies.set(o.userLogin, new Set());
        if (o.taxonId) {
          const isNew = !userSpecies.get(o.userLogin)!.has(o.taxonId);
          userSpecies.get(o.userLogin)!.add(o.taxonId);
          if (isNew) {
            const time = o.timeObservedAt || o.observedOn;
            const current = userLastTime.get(o.userLogin);
            if (!current || time > current) {
              userLastTime.set(o.userLogin, time);
            }
          }
        }
      });
      
      return Array.from(userSpecies.entries())
        .filter(([_, species]) => species.size >= 2)
        .map(([login, species]) => ({
          login,
          value: species.size,
          evidence: `${species.size} unique species`,
        }))
        .sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          const aTime = userLastTime.get(a.login) || '';
          const bTime = userLastTime.get(b.login) || '';
          return aTime.localeCompare(bTime);
        });
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
      const userRarity = new Map<string, { maxRarity: number; maxObs?: ObservationData; time?: string }>();
      dayObs.forEach(o => {
        if (!o.taxonId) return;
        const rarity = ctx.rarityByTaxon.get(o.taxonId) || 0;
        const current = userRarity.get(o.userLogin);
        const time = o.timeObservedAt || o.observedOn;
        if (!current || rarity > current.maxRarity || (rarity === current.maxRarity && time < (current.time || ''))) {
          userRarity.set(o.userLogin, { maxRarity: rarity, maxObs: o, time });
        }
      });
      return Array.from(userRarity.entries())
        .map(([login, { maxRarity, maxObs }]) => ({
          login,
          value: maxRarity,
          evidence: `Rarity score: ${maxRarity.toFixed(1)}`,
          observations: maxObs ? [maxObs] : [],
        }))
        .sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          const aTime = userRarity.get(a.login)?.time || '';
          const bTime = userRarity.get(b.login)?.time || '';
          return aTime.localeCompare(bTime);
        });
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
        .filter(([_, { count }]) => count >= 2)
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
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userNight = new Map<string, { count: number; obs: ObservationData[] }>();
      
      dayObs.forEach(o => {
        const timeStr = o.timeObservedAt || o.observedOn;
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();
        const minute = dateObj.getMinutes();
        
        // Use fallback sunset time 17:30 (5:30pm) to midnight
        const isNightTime = hour > 17 || (hour === 17 && minute >= 30) || hour === 0;
        
        if (isNightTime) {
          const current = userNight.get(o.userLogin) || { count: 0, obs: [] };
          userNight.set(o.userLogin, {
            count: current.count + 1,
            obs: [...current.obs, o],
          });
        }
      });
      
      return Array.from(userNight.entries())
        .filter(([_, { count }]) => count >= 2)
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
    subtitle: 'Most distinct time blocks (≥45m gap)',
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userTimes = new Map<string, string[]>();
      
      dayObs.forEach(o => {
        const timeStr = o.timeObservedAt || o.observedOn;
        if (!userTimes.has(o.userLogin)) userTimes.set(o.userLogin, []);
        userTimes.get(o.userLogin)!.push(timeStr);
      });
      
      const userBlocks = new Map<string, number>();
      for (const [login, times] of userTimes.entries()) {
        const sorted = times.map(t => new Date(t).getTime()).sort((a, b) => a - b);
        let blocks = 1;
        for (let i = 1; i < sorted.length; i++) {
          const gap = (sorted[i] - sorted[i - 1]) / (1000 * 60); // minutes
          if (gap >= 45) blocks++;
        }
        userBlocks.set(login, blocks);
      }
      
      return Array.from(userBlocks.entries())
        .map(([login, blocks]) => ({
          login,
          value: blocks,
          evidence: `${blocks} distinct time blocks`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'biodiversity-set-trip': {
    slug: 'biodiversity-set-trip',
    scope: 'trip',
    title: 'Biodiversity Champion',
    subtitle: 'Highest Shannon diversity (min 6 obs)',
    compute: async (obs, ctx) => {
      const userObs = new Map<string, ObservationData[]>();
      obs.forEach(o => {
        if (!userObs.has(o.userLogin)) userObs.set(o.userLogin, []);
        userObs.get(o.userLogin)!.push(o);
      });
      
      return Array.from(userObs.entries())
        .filter(([_, userObsList]) => userObsList.length >= 6)
        .map(([login, userObsList]) => ({
          login,
          value: computeShannonDiversity(userObsList),
          evidence: `H' = ${computeShannonDiversity(userObsList).toFixed(3)}`,
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
