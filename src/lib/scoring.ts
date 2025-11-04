// Scoring logic and aggregation for observations

export type ObservationData = {
  id: number;
  observedOn: string;
  qualityGrade: 'research' | 'needs_id' | 'casual';
  userLogin: string;
  lat: number;
  lng: number;
  taxonId?: number;
  taxonName?: string;
  taxonRank?: string;
  iconicTaxon?: string;
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

// TODO: Refine scoring rules based on project requirements
export function scoreObservation(obs: ObservationData): number {
  let points = 1; // base point per observation
  
  if (obs.qualityGrade === 'needs_id') points += 1;
  if (obs.qualityGrade === 'research') points += 2;
  
  // Bonus for species-level or lower
  if (obs.taxonRank && ['species', 'subspecies', 'variety'].includes(obs.taxonRank)) {
    points += 1;
  }
  
  return points;
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

  // Aggregate by user
  for (const obs of observations) {
    const points = scoreObservation(obs);
    
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
    }
    
    const userScore = byUser.get(obs.userLogin)!;
    userScore.obsCount += 1;
    userScore.points += points;
    
    if (obs.qualityGrade === 'needs_id') userScore.needsIdCount += 1;
    if (obs.qualityGrade === 'research') userScore.researchCount += 1;
    if (obs.qualityGrade === 'casual') userScore.casualCount += 1;
    
    // Count unique species per user (simple approximation)
    if (obs.taxonId) {
      userScore.speciesCount += 1; // TODO: deduplicate by taxonId
    }
  }

  // Aggregate by day
  for (const obs of observations) {
    const date = obs.observedOn;
    const points = scoreObservation(obs);
    
    if (!byDay.has(date)) {
      byDay.set(date, {
        date,
        obsCount: 0,
        speciesCount: 0,
        participants: new Set(),
        points: 0,
      });
    }
    
    const dayScore = byDay.get(date)!;
    dayScore.obsCount += 1;
    dayScore.points += points;
    dayScore.participants.add(obs.userLogin);
    
    if (obs.taxonId) {
      dayScore.speciesCount += 1; // TODO: deduplicate by taxonId
    }
  }

  // Aggregate by taxon group (simple placeholders for now)
  // TODO: Properly group by iconic taxon and build leaderboards per group
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
      score.points += scoreObservation(obs);
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
