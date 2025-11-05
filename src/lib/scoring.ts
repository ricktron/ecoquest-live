// Scoring logic with diminishing returns based on time observed

import dayjs from 'dayjs';

export type ObservationData = {
  id: number;
  observedOn: string;
  timeObservedAt?: string;
  qualityGrade: 'research' | 'needs_id' | 'casual';
  userLogin: string;
  lat: number;
  lng: number;
  taxonId?: number;
  taxonName?: string;
  taxonRank?: string;
  iconicTaxon?: string;
  uri?: string;
};

export type UserScore = {
  login: string;
  obsCount: number;
  speciesCount: number;
  needsIdCount: number;
  researchCount: number;
  casualCount: number;
  points: number;
};

export type DayScore = {
  date: string;
  obsCount: number;
  speciesCount: number;
  participants: Set<string>;
  points: number;
};

export type TaxonGroupScores = {
  mammals: UserScore[];
  reptiles: UserScore[];
  birds: UserScore[];
  amphibians: UserScore[];
  spiders: UserScore[];
  insects: UserScore[];
};

export type ScoringContext = {
  byTaxon: Map<number, ObservationData[]>;
  tripFirstByTaxon: Map<number, number>;
  dayFirstByTaxon: Map<string, number>;
  rarityByTaxon: Map<number, number>;
  userDayCounts: Map<string, number>;
  userTrailingPercentile: Map<string, number>;
};

const fmtPts = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export function formatPoints(n: number) {
  return fmtPts.format(n);
}

export type UserRowWithRank = UserScore & { rank: number };

export type TrendData = {
  rank: number;  // positive = moved up, negative = moved down
  pts: number;   // points difference
};

export type UserRowWithTrend = UserRowWithRank & { trend: TrendData };

export function computeTrends(
  current: UserRowWithRank[],
  prior: UserRowWithRank[]
): UserRowWithTrend[] {
  const pIdx = new Map(prior.map(r => [r.login, r]));
  
  return current.map(r => {
    const prev = pIdx.get(r.login);
    if (!prev) {
      return { ...r, trend: { rank: 0, pts: 0 } };
    }
    return {
      ...r,
      trend: {
        rank: prev.rank - r.rank,  // positive means moved up
        pts: +(r.points - prev.points).toFixed(2),
      },
    };
  });
}

const firstNWeights = [1.00, 0.75, 0.55, 0.40, 0.30, 0.20];

function firstNFactor(obs: ObservationData, ctx: ScoringContext): number {
  if (!obs.taxonId) return 1;
  const arr = ctx.byTaxon.get(obs.taxonId) || [];
  const idx = arr.findIndex(o => o.id === obs.id);
  if (idx < 0) return 1;
  return firstNWeights[idx] ?? 0.15;
}

function noveltyTrip(obs: ObservationData, ctx: ScoringContext): number {
  if (!obs.taxonId) return 1;
  return ctx.tripFirstByTaxon.get(obs.taxonId) === obs.id ? 3 :
    (firstNFactor(obs, ctx) >= 0.75 ? 2 : 1);
}

function noveltyDay(obs: ObservationData, ctx: ScoringContext): number {
  if (!obs.taxonId) return 0.3;
  const day = obs.observedOn;
  return ctx.dayFirstByTaxon.get(`${obs.taxonId}|${day}`) === obs.id ? 1.5 :
    (firstNFactor(obs, ctx) >= 0.75 ? 0.75 : 0.3);
}

function rarity(obs: ObservationData, ctx: ScoringContext): number {
  if (!obs.taxonId) return 0;
  return Math.max(0, Math.min(3, ctx.rarityByTaxon.get(obs.taxonId) ?? 0));
}

function researchBonus(q: ObservationData['qualityGrade']): number {
  return q === 'research' ? 1 : q === 'needs_id' ? 0.5 : 0;
}

function fatigue(obs: ObservationData, ctx: ScoringContext): number {
  const day = obs.observedOn;
  const key = `${obs.userLogin}|${day}`;
  const n = ctx.userDayCounts.get(key) ?? 0;
  if (n <= 20) return 1.0;
  if (n <= 50) return 0.6;
  return 0.3;
}

function rubberBand(obs: ObservationData, ctx: ScoringContext): number {
  const p = ctx.userTrailingPercentile.get(obs.userLogin) ?? 1;
  if (p < 0.30) return 1.20;
  if (p < 0.60) return 1.10;
  return 1.00;
}

export function scoreObservation(obs: ObservationData, ctx: ScoringContext): number {
  const base = 1;
  const fN = firstNFactor(obs, ctx);
  const points =
    (base
      + noveltyTrip(obs, ctx)
      + noveltyDay(obs, ctx)
      + rarity(obs, ctx)
      + researchBonus(obs.qualityGrade)
    ) * fN * fatigue(obs, ctx) * rubberBand(obs, ctx);

  return Number(points.toFixed(2));
}

export function buildScoringContext(observations: ObservationData[]): ScoringContext {
  const byTaxon = new Map<number, ObservationData[]>();
  const tripFirstByTaxon = new Map<number, number>();
  const dayFirstByTaxon = new Map<string, number>();
  const rarityByTaxon = new Map<number, number>();
  const userDayCounts = new Map<string, number>();
  
  // Sort by observed time
  const sorted = [...observations].sort((a, b) => {
    const aTime = a.timeObservedAt || a.observedOn;
    const bTime = b.timeObservedAt || b.observedOn;
    return dayjs(aTime).isBefore(dayjs(bTime)) ? -1 : 1;
  });

  // Build byTaxon and first-observed maps
  for (const obs of sorted) {
    if (obs.taxonId) {
      if (!byTaxon.has(obs.taxonId)) {
        byTaxon.set(obs.taxonId, []);
      }
      byTaxon.get(obs.taxonId)!.push(obs);

      if (!tripFirstByTaxon.has(obs.taxonId)) {
        tripFirstByTaxon.set(obs.taxonId, obs.id);
      }

      const dayKey = `${obs.taxonId}|${obs.observedOn}`;
      if (!dayFirstByTaxon.has(dayKey)) {
        dayFirstByTaxon.set(dayKey, obs.id);
      }
    }

    // Count per user per day for fatigue
    const userDayKey = `${obs.userLogin}|${obs.observedOn}`;
    userDayCounts.set(userDayKey, (userDayCounts.get(userDayKey) || 0) + 1);
  }

  // Calculate rarity (inverse of observation count)
  for (const [taxonId, obs] of byTaxon.entries()) {
    const count = obs.length;
    if (count === 1) rarityByTaxon.set(taxonId, 3);
    else if (count <= 3) rarityByTaxon.set(taxonId, 2);
    else if (count <= 10) rarityByTaxon.set(taxonId, 1);
    else rarityByTaxon.set(taxonId, 0);
  }

  // Calculate trailing percentile (users with fewer points in last 24h get boost)
  const last24h = dayjs().subtract(24, 'hour');
  const recentPoints = new Map<string, number>();
  for (const obs of sorted) {
    const obsTime = dayjs(obs.timeObservedAt || obs.observedOn);
    if (obsTime.isAfter(last24h)) {
      recentPoints.set(obs.userLogin, (recentPoints.get(obs.userLogin) || 0) + 1);
    }
  }
  
  const sortedUsers = Array.from(recentPoints.entries()).sort((a, b) => a[1] - b[1]);
  const userTrailingPercentile = new Map<string, number>();
  sortedUsers.forEach(([login], idx) => {
    userTrailingPercentile.set(login, idx / Math.max(1, sortedUsers.length - 1));
  });

  return {
    byTaxon,
    tripFirstByTaxon,
    dayFirstByTaxon,
    rarityByTaxon,
    userDayCounts,
    userTrailingPercentile,
  };
}

export type AggregatedScores = {
  byUser: Map<string, UserScore>;
  byDay: Map<string, DayScore>;
  byTaxonGroup: TaxonGroupScores;
};

export function getNightWindow(date: string, trip: any): { start: string; end: string } {
  // TODO: Integrate trip.solar?.sunset when available
  const fallbackSunset = trip.fallbackSunsetHHMM || '17:30';
  const [hh, mm] = fallbackSunset.split(':').map(Number);
  return {
    start: `${date}T${fallbackSunset}:00`,
    end: `${date}T23:59:59`,
  };
}

export function aggregateScores(observations: ObservationData[]): AggregatedScores {
  const ctx = buildScoringContext(observations);
  const byUser = new Map<string, UserScore>();
  const byDay = new Map<string, DayScore>();
  const byTaxonGroup: TaxonGroupScores = {
    mammals: [],
    reptiles: [],
    birds: [],
    amphibians: [],
    spiders: [],
    insects: [],
  };

  const userSpecies = new Map<string, Set<number>>();

  for (const obs of observations) {
    const points = scoreObservation(obs, ctx);

    if (!byUser.has(obs.userLogin)) {
      byUser.set(obs.userLogin, {
        login: obs.userLogin,
        obsCount: 0,
        speciesCount: 0,
        needsIdCount: 0,
        researchCount: 0,
        casualCount: 0,
        points: 0,
      });
      userSpecies.set(obs.userLogin, new Set());
    }

    const userScore = byUser.get(obs.userLogin)!;
    userScore.obsCount += 1;
    userScore.points = Number((userScore.points + points).toFixed(2));

    if (obs.qualityGrade === 'needs_id') userScore.needsIdCount += 1;
    if (obs.qualityGrade === 'research') userScore.researchCount += 1;
    if (obs.qualityGrade === 'casual') userScore.casualCount += 1;

    if (obs.taxonId) {
      userSpecies.get(obs.userLogin)!.add(obs.taxonId);
    }
  }

  for (const [login, species] of userSpecies.entries()) {
    const userScore = byUser.get(login)!;
    userScore.speciesCount = species.size;
  }

  // Aggregate by day
  const daySpecies = new Map<string, Set<number>>();
  for (const obs of observations) {
    const date = obs.observedOn;
    const points = scoreObservation(obs, ctx);

    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        obsCount: 0,
        speciesCount: 0,
        participants: new Set(),
        points: 0,
      });
      daySpecies.set(date, new Set());
    }

    const dayScore = byDay.get(date)!;
    dayScore.obsCount += 1;
    dayScore.points = Number((dayScore.points + points).toFixed(2));
    dayScore.participants.add(obs.userLogin);

    if (obs.taxonId) {
      daySpecies.get(date)!.add(obs.taxonId);
    }
  }

  for (const [date, species] of daySpecies.entries()) {
    const dayScore = byDay.get(date)!;
    dayScore.speciesCount = species.size;
  }

  // Aggregate by taxon group
  const mammalUsers = new Map<string, UserScore>();
  const reptileUsers = new Map<string, UserScore>();
  const birdUsers = new Map<string, UserScore>();
  const amphibianUsers = new Map<string, UserScore>();
  const spiderUsers = new Map<string, UserScore>();
  const insectUsers = new Map<string, UserScore>();

  for (const obs of observations) {
    const iconic = obs.iconicTaxon?.toLowerCase() || '';
    let targetMap: Map<string, UserScore> | null = null;

    if (iconic.includes('mammal')) targetMap = mammalUsers;
    else if (iconic.includes('reptil')) targetMap = reptileUsers;
    else if (iconic.includes('aves') || iconic.includes('bird')) targetMap = birdUsers;
    else if (iconic.includes('amphib')) targetMap = amphibianUsers;
    else if (iconic.includes('arach')) targetMap = spiderUsers;
    else if (iconic.includes('insect')) targetMap = insectUsers;

    if (targetMap) {
      if (!targetMap.has(obs.userLogin)) {
        targetMap.set(obs.userLogin, {
          login: obs.userLogin,
          obsCount: 0,
          speciesCount: 0,
          needsIdCount: 0,
          researchCount: 0,
          casualCount: 0,
          points: 0,
        });
      }
      const score = targetMap.get(obs.userLogin)!;
      score.obsCount += 1;
      score.points = Number((score.points + scoreObservation(obs, ctx)).toFixed(2));
    }
  }

  byTaxonGroup.mammals = Array.from(mammalUsers.values()).sort((a, b) => b.points - a.points);
  byTaxonGroup.reptiles = Array.from(reptileUsers.values()).sort((a, b) => b.points - a.points);
  byTaxonGroup.birds = Array.from(birdUsers.values()).sort((a, b) => b.points - a.points);
  byTaxonGroup.amphibians = Array.from(amphibianUsers.values()).sort((a, b) => b.points - a.points);
  byTaxonGroup.spiders = Array.from(spiderUsers.values()).sort((a, b) => b.points - a.points);
  byTaxonGroup.insects = Array.from(insectUsers.values()).sort((a, b) => b.points - a.points);

  return { byUser, byDay, byTaxonGroup };
}
