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
  minThreshold?: number; // minimum value required to show winner
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    minThreshold: 1,
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
    subtitle: 'Most distinct clock-hours with ≥1 obs',
    minThreshold: 1,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userHours = new Map<string, Set<number>>();
      
      dayObs.forEach(o => {
        const timeStr = o.timeObservedAt || o.observedOn;
        const hour = new Date(timeStr).getHours();
        if (!userHours.has(o.userLogin)) userHours.set(o.userLogin, new Set());
        userHours.get(o.userLogin)!.add(hour);
      });
      
      return Array.from(userHours.entries())
        .map(([login, hours]) => ({
          login,
          value: hours.size,
          evidence: `${hours.size} distinct hours`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'biodiversity-set-trip': {
    slug: 'biodiversity-set-trip',
    scope: 'trip',
    title: 'Biodiversity Champion',
    subtitle: 'Highest Shannon diversity (min 6 obs)',
    minThreshold: 4,
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
  'peer-reviewed-pro': {
    slug: 'peer-reviewed-pro',
    scope: 'daily',
    title: 'Peer-Reviewed Pro',
    subtitle: 'Most research-grade observations (min 3)',
    minThreshold: 3,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const userResearch = new Map<string, number>();
      dayObs.forEach(o => {
        if (o.qualityGrade === 'research') {
          userResearch.set(o.userLogin, (userResearch.get(o.userLogin) || 0) + 1);
        }
      });
      return Array.from(userResearch.entries())
        .filter(([_, count]) => count >= 3)
        .map(([login, count]) => ({
          login,
          value: count,
          evidence: `${count} research-grade observations`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'peer-reviewed-pro-trip': {
    slug: 'peer-reviewed-pro-trip',
    scope: 'trip',
    title: 'Peer-Reviewed Pro',
    subtitle: 'Most research-grade observations (min 10)',
    minThreshold: 10,
    compute: async (obs, ctx) => {
      const userResearch = new Map<string, number>();
      obs.forEach(o => {
        if (o.qualityGrade === 'research') {
          userResearch.set(o.userLogin, (userResearch.get(o.userLogin) || 0) + 1);
        }
      });
      return Array.from(userResearch.entries())
        .filter(([_, count]) => count >= 10)
        .map(([login, count]) => ({
          login,
          value: count,
          evidence: `${count} research-grade observations`,
        }))
        .sort((a, b) => b.value - a.value);
    },
  },
  'first-finder': {
    slug: 'first-finder',
    scope: 'daily',
    title: 'First Finder',
    subtitle: 'Most first-of-day species (earliest time wins)',
    minThreshold: 1,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      const taxonFirstFinder = new Map<number, { login: string; time: string }>();
      
      // Sort by time to identify first finder per species
      const sorted = [...dayObs].sort((a, b) => {
        const aTime = a.timeObservedAt || a.observedOn;
        const bTime = b.timeObservedAt || b.observedOn;
        return aTime.localeCompare(bTime);
      });
      
      sorted.forEach(o => {
        if (o.taxonId && !taxonFirstFinder.has(o.taxonId)) {
          taxonFirstFinder.set(o.taxonId, {
            login: o.userLogin,
            time: o.timeObservedAt || o.observedOn,
          });
        }
      });
      
      const userFirsts = new Map<string, { count: number; earliestTime: string }>();
      taxonFirstFinder.forEach(({ login, time }) => {
        const current = userFirsts.get(login);
        if (!current) {
          userFirsts.set(login, { count: 1, earliestTime: time });
        } else {
          userFirsts.set(login, {
            count: current.count + 1,
            earliestTime: time < current.earliestTime ? time : current.earliestTime,
          });
        }
      });
      
      return Array.from(userFirsts.entries())
        .map(([login, { count, earliestTime }]) => ({
          login,
          value: count,
          evidence: `First to find ${count} species`,
        }))
        .sort((a, b) => {
          if (b.value !== a.value) return b.value - a.value;
          const aTime = userFirsts.get(a.login)?.earliestTime || '';
          const bTime = userFirsts.get(b.login)?.earliestTime || '';
          return aTime.localeCompare(bTime);
        });
    },
  },
  // Taxon-specific trophies (daily)
  'birds-daily': {
    slug: 'birds-daily',
    scope: 'daily',
    title: 'Bird Watcher',
    subtitle: 'Most bird observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['aves', 'bird'], 2);
    },
  },
  'mammals-daily': {
    slug: 'mammals-daily',
    scope: 'daily',
    title: 'Mammal Tracker',
    subtitle: 'Most mammal observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['mammal'], 2);
    },
  },
  'reptiles-daily': {
    slug: 'reptiles-daily',
    scope: 'daily',
    title: 'Reptile Hunter',
    subtitle: 'Most reptile observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['reptil'], 2);
    },
  },
  'amphibians-daily': {
    slug: 'amphibians-daily',
    scope: 'daily',
    title: 'Amphibian Spotter',
    subtitle: 'Most amphibian observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['amphib'], 2);
    },
  },
  'insects-daily': {
    slug: 'insects-daily',
    scope: 'daily',
    title: 'Insect Collector',
    subtitle: 'Most insect observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['insect'], 2);
    },
  },
  'spiders-daily': {
    slug: 'spiders-daily',
    scope: 'daily',
    title: 'Spider Finder',
    subtitle: 'Most spider/arachnid observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['arach'], 2);
    },
  },
  'plants-daily': {
    slug: 'plants-daily',
    scope: 'daily',
    title: 'Botanist',
    subtitle: 'Most plant observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['plant'], 2);
    },
  },
  'fungi-daily': {
    slug: 'fungi-daily',
    scope: 'daily',
    title: 'Mycologist',
    subtitle: 'Most fungi observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['fung'], 2);
    },
  },
  'mollusks-daily': {
    slug: 'mollusks-daily',
    scope: 'daily',
    title: 'Mollusk Maven',
    subtitle: 'Most mollusk observations (min 2)',
    minThreshold: 2,
    compute: async (obs, ctx, date) => {
      const dayObs = date ? obs.filter(o => o.observedOn === date) : obs;
      return computeTaxonTrophy(dayObs, ['mollus'], 2);
    },
  },
  // Taxon-specific trophies (trip)
  'birds-trip': {
    slug: 'birds-trip',
    scope: 'trip',
    title: 'Bird Watcher',
    subtitle: 'Most bird observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['aves', 'bird'], 6);
    },
  },
  'mammals-trip': {
    slug: 'mammals-trip',
    scope: 'trip',
    title: 'Mammal Tracker',
    subtitle: 'Most mammal observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['mammal'], 6);
    },
  },
  'reptiles-trip': {
    slug: 'reptiles-trip',
    scope: 'trip',
    title: 'Reptile Hunter',
    subtitle: 'Most reptile observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['reptil'], 6);
    },
  },
  'amphibians-trip': {
    slug: 'amphibians-trip',
    scope: 'trip',
    title: 'Amphibian Spotter',
    subtitle: 'Most amphibian observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['amphib'], 6);
    },
  },
  'insects-trip': {
    slug: 'insects-trip',
    scope: 'trip',
    title: 'Insect Collector',
    subtitle: 'Most insect observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['insect'], 6);
    },
  },
  'spiders-trip': {
    slug: 'spiders-trip',
    scope: 'trip',
    title: 'Spider Finder',
    subtitle: 'Most spider/arachnid observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['arach'], 6);
    },
  },
  'plants-trip': {
    slug: 'plants-trip',
    scope: 'trip',
    title: 'Botanist',
    subtitle: 'Most plant observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['plant'], 6);
    },
  },
  'fungi-trip': {
    slug: 'fungi-trip',
    scope: 'trip',
    title: 'Mycologist',
    subtitle: 'Most fungi observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['fung'], 6);
    },
  },
  'mollusks-trip': {
    slug: 'mollusks-trip',
    scope: 'trip',
    title: 'Mollusk Maven',
    subtitle: 'Most mollusk observations (min 6)',
    minThreshold: 6,
    compute: async (obs, ctx) => {
      return computeTaxonTrophy(obs, ['mollus'], 6);
    },
  },
};

// Helper for taxon-specific trophies
function computeTaxonTrophy(obs: ObservationData[], keywords: string[], minCount: number): Promise<TrophyResult[]> {
  const userCounts = new Map<string, number>();
  obs.forEach(o => {
    const iconic = o.iconicTaxon?.toLowerCase() || '';
    if (keywords.some(k => iconic.includes(k))) {
      userCounts.set(o.userLogin, (userCounts.get(o.userLogin) || 0) + 1);
    }
  });
  
  return Promise.resolve(
    Array.from(userCounts.entries())
      .filter(([_, count]) => count >= minCount)
      .map(([login, count]) => ({
        login,
        value: count,
        evidence: `${count} observations`,
      }))
      .sort((a, b) => b.value - a.value)
  );
}

export function getTrophyBySlug(slug: string): TrophyDef | undefined {
  return TROPHIES[slug];
}

export function getTripTrophies(): TrophyDef[] {
  return Object.values(TROPHIES).filter(t => t.scope === 'trip');
}

export function getDailyTrophies(): TrophyDef[] {
  return Object.values(TROPHIES).filter(t => t.scope === 'daily');
}
