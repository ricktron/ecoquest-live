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

/**
 * Scoring with diminishing returns based on time observed.
 * Later observations in a window get progressively less points.
 */
export function scoreObservation(
  obs: ObservationData,
  allObsByUser: ObservationData[]
): number {
  let basePoints = 1;

  // Quality grade bonuses
  if (obs.qualityGrade === 'needs_id') basePoints += 1;
  if (obs.qualityGrade === 'research') basePoints += 2;

  // Species-level bonus
  if (obs.taxonRank && ['species', 'subspecies', 'variety'].includes(obs.taxonRank)) {
    basePoints += 1;
  }

  // Diminishing returns: sort user's observations by time_observed_at (or observed_on)
  // and apply a decay factor based on observation order
  const userObs = allObsByUser
    .filter((o) => o.userLogin === obs.userLogin)
    .sort((a, b) => {
      const aTime = a.timeObservedAt || a.observedOn;
      const bTime = b.timeObservedAt || b.observedOn;
      return dayjs(aTime).isBefore(dayjs(bTime)) ? -1 : 1;
    });

  const index = userObs.findIndex((o) => o.id === obs.id);
  if (index === -1) return basePoints; // fallback

  // Apply diminishing returns: decay = 1 / (1 + index * 0.01)
  // First obs gets full points, 10th gets ~90%, 100th gets ~50%, etc.
  const decay = 1 / (1 + index * 0.01);
  return Math.round(basePoints * decay * 100) / 100;
}

export type AggregatedScores = {
  byUser: Map<string, UserScore>;
  byDay: Map<string, DayScore>;
  byTaxonGroup: TaxonGroupScores;
};

export function aggregateScores(observations: ObservationData[]): AggregatedScores {
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

  // Track unique species per user
  const userSpecies = new Map<string, Set<number>>();

  // Aggregate by user with diminishing returns
  for (const obs of observations) {
    const points = scoreObservation(obs, observations);

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
    userScore.points += points;

    if (obs.qualityGrade === 'needs_id') userScore.needsIdCount += 1;
    if (obs.qualityGrade === 'research') userScore.researchCount += 1;
    if (obs.qualityGrade === 'casual') userScore.casualCount += 1;

    // Track unique species
    if (obs.taxonId) {
      userSpecies.get(obs.userLogin)!.add(obs.taxonId);
    }
  }

  // Update species counts
  for (const [login, species] of userSpecies.entries()) {
    const userScore = byUser.get(login)!;
    userScore.speciesCount = species.size;
  }

  // Aggregate by day
  const daySpecies = new Map<string, Set<number>>();
  for (const obs of observations) {
    const date = obs.observedOn;
    const points = scoreObservation(obs, observations);

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
    dayScore.points += points;
    dayScore.participants.add(obs.userLogin);

    if (obs.taxonId) {
      daySpecies.get(date)!.add(obs.taxonId);
    }
  }

  // Update day species counts
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
      score.points += scoreObservation(obs, observations);
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
