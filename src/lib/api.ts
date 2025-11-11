import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const HIDDEN_LOGINS = new Set(['alishdafish', 'waterlog', 'wormzorm']);

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

type ApiResult<T> = { data: T; error: PostgrestError | null; missing?: boolean };

type NumericLike = string | number | null | undefined;

function isMissingView(error: PostgrestError | null): boolean {
  return (error?.code ?? '').toString() === '42P01';
}

export type TripParams = {
  tz: string;
  start_date: string;
  end_date: string;
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
};

export type TripRosterEntry = {
  user_login: string;
  display_name: string | null;
  is_adult?: boolean;
};

export type TripLeaderboardRow = {
  user_login: string;
  display_name: string | null;
  total_points: number;
  obs_count: number;
  distinct_taxa: number;
  research_grade_count: number;
  bonus_points: number;
  last_observed_at_utc: string | null;
};

export type TripSilverBreakdown = {
  user_login: string;
  total_points: number;
  base_obs: number;
  novelty_trip: number;
  novelty_day: number;
  rarity: number;
  research: number;
  multipliers_delta: number;
};

export type TripLeaderboardPayload = {
  rows: TripLeaderboardRow[];
  hasSilver: boolean;
  silverByLogin: Record<string, TripSilverBreakdown>;
};

export type TripDailySummaryRow = {
  day_local: string;
  obs_count: number;
  distinct_taxa: number;
  people_count: number;
};

export type TripBaseObservationRow = {
  user_login: string;
  inat_obs_id: number | null;
  latitude: number | null;
  longitude: number | null;
  taxon_id: number | null;
  quality_grade: string | null;
  observed_at_utc: string | null;
  day_local: string | null;
};

export type TripTrophyAward = {
  trophy_id: string;
  user_login: string;
  value: number | null;
  awarded_at: string | null;
};

export type TripDayPeopleRow = {
  day_local: string;
  user_login: string;
  obs_count: number;
  distinct_taxa: number;
  research_grade_count: number;
};

export type TripUserObservationRow = {
  user_login: string;
  inat_login: string | null;
  inat_obs_id: number | null;
  taxon_id: number | null;
  iconic_taxon_name: string | null;
  quality_grade: string | null;
  observed_at_utc: string | null;
  day_local: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type TripTaxaTrophyRow = {
  trophy_id: string;
  user_login: string;
  awarded_at: string | null;
  day_local: string | null;
};

export type TripTrophyCabinetRow = {
  trophy_id: string;
  user_login: string;
  awarded_at: string | null;
  day_local: string | null;
};

export type TripCabinetDayGroup = {
  day_local: string | null;
  trophies: {
    trophy_id: string;
    awards: TripTrophyCabinetRow[];
  }[];
};

export type TripTrophyCatalogRow = {
  trophy_id: string;
  label: string;
};

export type TripLatestObservationRow = {
  user_login: string;
  inat_obs_id: number | null;
  observed_at_utc: string | null;
  latitude: number | null;
  longitude: number | null;
};

type RawTripBaseObservationRow = {
  user_login?: string | null;
  inat_obs_id?: NumericLike;
  latitude?: NumericLike;
  longitude?: NumericLike;
  taxon_id?: NumericLike;
  quality_grade?: string | null;
  observed_at_utc?: string | null;
  day_local?: string | null;
};

type RawTripRosterRow = {
  user_login?: string | null;
  display_name?: string | null;
  is_adult?: boolean | null;
};

type RawTripLeaderboardRow = {
  user_login?: string | null;
  display_name?: string | null;
  total_points?: NumericLike;
  obs_count?: NumericLike;
  distinct_taxa?: NumericLike;
  research_grade_count?: NumericLike;
  bonus_points?: NumericLike;
  last_observed_at_utc?: string | null;
};

type RawTripSilverRow = {
  user_login?: string | null;
  total_points?: NumericLike;
  base_obs?: NumericLike;
  novelty_trip?: NumericLike;
  novelty_day?: NumericLike;
  rarity?: NumericLike;
  research?: NumericLike;
  multipliers_delta?: NumericLike;
};

type RawTripDailySummaryRow = {
  day_local?: string | null;
  obs_count?: NumericLike;
  distinct_taxa?: NumericLike;
  people_count?: NumericLike;
};

type RawTripDayPeopleRow = {
  day_local?: string | null;
  user_login?: string | null;
  obs_count?: NumericLike;
  distinct_taxa?: NumericLike;
  research_grade_count?: NumericLike;
};

type RawTripUserObservationRow = RawTripBaseObservationRow & {
  inat_login?: string | null;
  iconic_taxon_name?: string | null;
};

type RawTripTaxaTrophyRow = {
  trophy_id?: string | null;
  user_login?: string | null;
  awarded_at?: string | null;
  day_local?: string | null;
};

type RawTripTrophyCabinetRow = RawTripTaxaTrophyRow;

type RawTripTrophyCatalogRow = {
  trophy_id?: string | null;
  label?: string | null;
};

type RawTripLatestObservationRow = {
  user_login?: string | null;
  inat_obs_id?: NumericLike;
  observed_at_utc?: string | null;
  latitude?: NumericLike;
  longitude?: NumericLike;
};

function mapObservationRows(
  source: unknown[] | null | undefined,
): TripBaseObservationRow[] {
  const rows = Array.isArray(source)
    ? (source as RawTripBaseObservationRow[])
    : [];

  return rows
    .map((row) => {
      const user_login = (row.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        inat_obs_id: row.inat_obs_id != null ? Number(row.inat_obs_id) : null,
        latitude: row.latitude != null ? Number(row.latitude) : null,
        longitude: row.longitude != null ? Number(row.longitude) : null,
        taxon_id: row.taxon_id != null ? Number(row.taxon_id) : null,
        quality_grade: row.quality_grade ?? null,
        observed_at_utc: row.observed_at_utc ?? null,
        day_local: row.day_local ?? null,
      } satisfies TripBaseObservationRow;
    })
    .filter((row): row is TripBaseObservationRow => Boolean(row));
}

export async function getTripParams(): Promise<ApiResult<TripParams | null>> {
  const { data, error } = await supabase()
    .from('trip_params_cr2025_v1')
    .select('tz, start_date, end_date, lat_min, lat_max, lon_min, lon_max')
    .maybeSingle();

  if (!data) {
    return { data: null, error };
  }

  return {
    data: {
      tz: data.tz ?? 'UTC',
      start_date: data.start_date ?? '',
      end_date: data.end_date ?? '',
      lat_min: Number(data.lat_min ?? 0),
      lat_max: Number(data.lat_max ?? 0),
      lon_min: Number(data.lon_min ?? 0),
      lon_max: Number(data.lon_max ?? 0),
    },
    error,
  };
}

export async function fetchRosterCR2025(): Promise<ApiResult<TripRosterEntry[]>> {
  const baseQuery = supabase()
    .from('trip_members_roster_cr2025_v1')
    .select('user_login, display_name, is_adult')
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  let { data, error } = await baseQuery;
  let missing = false;

  if (isMissingView(error)) {
    missing = true;
    const fallback = await supabase()
      .from('trip_members_roster_v1')
      .select('user_login, display_name')
      .order('display_name', { ascending: true, nullsFirst: false })
      .order('user_login', { ascending: true, nullsFirst: false });

    data = fallback.data as RawTripRosterRow[] | null;
    error = fallback.error;
  }

  const rawRows = (data ?? []) as RawTripRosterRow[];
  const rows: TripRosterEntry[] = rawRows
    .map((row) => {
      const user_login = (row.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        display_name: row.display_name ?? null,
        is_adult: row.is_adult != null ? Boolean(row.is_adult) : false,
      } satisfies TripRosterEntry;
    })
    .filter((row): row is TripRosterEntry => Boolean(row));

  return { data: rows, error, ...(missing ? { missing: true } : {}) };
}

export async function getTripRoster(): Promise<ApiResult<TripRosterEntry[]>> {
  return fetchRosterCR2025();
}

export async function fetchLeaderboardCR2025(): Promise<ApiResult<TripLeaderboardPayload>> {
  const { data, error } = await supabase()
    .from('trip_leaderboard_cr2025_v1')
    .select('user_login, display_name, total_points, obs_count, distinct_taxa, research_grade_count, bonus_points, last_observed_at_utc')
    .order('total_points', { ascending: false, nullsFirst: false })
    .order('obs_count', { ascending: false, nullsFirst: false });

  if (isMissingView(error)) {
    return {
      data: { rows: [], hasSilver: false, silverByLogin: {} },
      error: null,
      missing: true,
    };
  }

  const rawRows = (data ?? []) as RawTripLeaderboardRow[];
  const rows: TripLeaderboardRow[] = rawRows
    .map((row) => {
      const user_login = (row.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        display_name: row.display_name ?? null,
        total_points: toNumber(row.total_points),
        obs_count: toNumber(row.obs_count),
        distinct_taxa: toNumber(row.distinct_taxa),
        research_grade_count: toNumber(row.research_grade_count),
        bonus_points: toNumber(row.bonus_points),
        last_observed_at_utc: row.last_observed_at_utc ?? null,
      } satisfies TripLeaderboardRow;
    })
    .filter((row): row is TripLeaderboardRow => Boolean(row));

  let hasSilver = false;
  const silverByLogin: Record<string, TripSilverBreakdown> = {};
  let silverError: PostgrestError | null = null;

  try {
    const { data: silverData, error: silverQueryError } = await supabase()
      .from('trip_points_user_silver_cr2025_v1')
      .select('user_login, total_points, base_obs, novelty_trip, novelty_day, rarity, research, multipliers_delta');

    if (isMissingView(silverQueryError)) {
      hasSilver = false;
    } else if (silverQueryError) {
      silverError = silverQueryError;
    } else {
      const rawSilverRows = (silverData ?? []) as RawTripSilverRow[];
      rawSilverRows.forEach((row) => {
        const user_login = (row.user_login ?? '').toString();
        if (!user_login) return;
        silverByLogin[user_login.toLowerCase()] = {
          user_login,
          total_points: toNumber(row.total_points),
          base_obs: toNumber(row.base_obs),
          novelty_trip: toNumber(row.novelty_trip),
          novelty_day: toNumber(row.novelty_day),
          rarity: toNumber(row.rarity),
          research: toNumber(row.research),
          multipliers_delta: toNumber(row.multipliers_delta),
        } satisfies TripSilverBreakdown;
      });
      hasSilver = Object.keys(silverByLogin).length > 0;
    }
  } catch (err) {
    console.error('Silver leaderboard probe failed', err);
  }

  return {
    data: {
      rows,
      hasSilver,
      silverByLogin,
    },
    error: error ?? silverError,
  };
}

export async function getTripLeaderboard(): Promise<ApiResult<TripLeaderboardPayload>> {
  return fetchLeaderboardCR2025();
}

export function getLastUpdatedTs(rows: TripLeaderboardRow[]): string | null {
  let latest: string | null = null;
  rows.forEach((row) => {
    if (!row.last_observed_at_utc) return;
    if (!latest) {
      latest = row.last_observed_at_utc;
      return;
    }
    if (new Date(row.last_observed_at_utc).getTime() > new Date(latest).getTime()) {
      latest = row.last_observed_at_utc;
    }
  });
  return latest;
}

export async function fetchDailySummaryCR2025(): Promise<ApiResult<TripDailySummaryRow[]>> {
  const { data, error } = await supabase()
    .from('trip_daily_summary_cr2025_v1')
    .select('day_local, obs_count, distinct_taxa, people_count')
    .order('day_local', { ascending: true });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripDailySummaryRow[];
  const rows: TripDailySummaryRow[] = rawRows
    .map((row) => ({
      day_local: (row.day_local ?? '').toString(),
      obs_count: toNumber(row.obs_count),
      distinct_taxa: toNumber(row.distinct_taxa),
      people_count: toNumber(row.people_count),
    }))
    .filter((row) => row.day_local);

  return { data: rows, error };
}

export async function getTripDailySummary(): Promise<ApiResult<TripDailySummaryRow[]>> {
  return fetchDailySummaryCR2025();
}

export async function fetchDayPeopleCR2025(day: string): Promise<ApiResult<TripDayPeopleRow[]>> {
  const { data, error } = await supabase()
    .from('trip_day_people_cr2025_v1')
    .select('day_local, user_login, obs_count, distinct_taxa, research_grade_count')
    .eq('day_local', day)
    .order('obs_count', { ascending: false, nullsFirst: false })
    .order('distinct_taxa', { ascending: false, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripDayPeopleRow[];
  const rows: TripDayPeopleRow[] = rawRows
    .map((row) => {
      const user_login = (row.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        day_local: (row.day_local ?? '').toString(),
        user_login,
        obs_count: toNumber(row.obs_count),
        distinct_taxa: toNumber(row.distinct_taxa),
        research_grade_count: toNumber(row.research_grade_count),
      } satisfies TripDayPeopleRow;
    })
    .filter((row): row is TripDayPeopleRow => Boolean(row));

  return { data: rows, error };
}

export async function fetchObsAllCR2025(options: { day?: string } = {}): Promise<ApiResult<TripBaseObservationRow[]>> {
  let query = supabase()
    .from('trip_obs_base_cr2025_v1')
    .select('user_login, inat_obs_id, latitude, longitude, taxon_id, quality_grade, observed_at_utc, day_local');

  if (options.day) {
    query = query.eq('day_local', options.day);
  }

  const { data, error } = await query;

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  return { data: mapObservationRows(data), error };
}

export async function getTripBasePoints(options: { day?: string } = {}): Promise<ApiResult<TripBaseObservationRow[]>> {
  return fetchObsAllCR2025(options);
}

export async function fetchUserObsCR2025(login: string): Promise<ApiResult<TripUserObservationRow[]>> {
  const { data, error } = await supabase()
    .from('trip_user_obs_cr2025_v1')
    .select('user_login, inat_login, inat_obs_id, taxon_id, iconic_taxon_name, quality_grade, observed_at_utc, day_local, latitude, longitude')
    .eq('user_login', login)
    .order('observed_at_utc', { ascending: false, nullsFirst: false });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripUserObservationRow[];
  const rows: TripUserObservationRow[] = rawRows
    .map((row) => ({
      user_login: (row.user_login ?? '').toString(),
      inat_login: row.inat_login ?? null,
      inat_obs_id: row.inat_obs_id != null ? Number(row.inat_obs_id) : null,
      taxon_id: row.taxon_id != null ? Number(row.taxon_id) : null,
      iconic_taxon_name: row.iconic_taxon_name ?? null,
      quality_grade: row.quality_grade ?? null,
      observed_at_utc: row.observed_at_utc ?? null,
      day_local: row.day_local ?? null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    }))
    .filter((row) => row.user_login === login);

  return { data: rows, error };
}

export async function fetchObsLatest10CR2025(): Promise<ApiResult<TripLatestObservationRow[]>> {
  const { data, error } = await supabase()
    .from('trip_obs_latest10_cr2025_v1')
    .select('user_login, inat_obs_id, observed_at_utc, latitude, longitude')
    .order('observed_at_utc', { ascending: false, nullsFirst: false });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripLatestObservationRow[];
  const rows: TripLatestObservationRow[] = rawRows
    .map((row) => ({
      user_login: (row.user_login ?? '').toString(),
      inat_obs_id: row.inat_obs_id != null ? Number(row.inat_obs_id) : null,
      observed_at_utc: row.observed_at_utc ?? null,
      latitude: row.latitude != null ? Number(row.latitude) : null,
      longitude: row.longitude != null ? Number(row.longitude) : null,
    }))
    .filter((row) => Boolean(row.user_login));

  return { data: rows, error };
}

export async function fetchLatest10CR2025(): Promise<ApiResult<TripLatestObservationRow[]>> {
  return fetchObsLatest10CR2025();
}

export async function fetchTodayTrophiesCR2025(tz = 'UTC'): Promise<ApiResult<TripTrophyAward[]>> {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = formatter.format(new Date());

  const [dailyResult, taxaResult] = await Promise.all([
    supabase()
      .from('trophies_daily_trip_cr2025_v1')
      .select('trophy_id, user_login, value, awarded_at'),
    supabase()
      .from('trophies_taxa_daily_cr2025_v1')
      .select('trophy_id, user_login, awarded_at, day_local'),
  ]);

  const rows: TripTrophyAward[] = [];

  let missingDaily = false;
  let missingTaxa = false;
  let combinedError: PostgrestError | null = null;

  if (isMissingView(dailyResult.error)) {
    missingDaily = true;
  } else if (dailyResult.error) {
    combinedError = dailyResult.error;
  } else {
    const rawDaily = (dailyResult.data ?? []) as (RawTripTaxaTrophyRow & { value?: NumericLike })[];
    rawDaily.forEach((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return;
      const awardedAt = row.awarded_at ?? null;
      const awardedKey = awardedAt ? formatter.format(new Date(awardedAt)) : null;
      if (awardedKey && awardedKey !== todayKey) return;
      rows.push({
        trophy_id,
        user_login,
        value: row.value != null ? Number(row.value) : null,
        awarded_at: awardedAt,
      });
    });
  }

  if (isMissingView(taxaResult.error)) {
    missingTaxa = true;
  } else if (taxaResult.error) {
    combinedError = combinedError ?? taxaResult.error;
  } else {
    const rawTaxa = (taxaResult.data ?? []) as RawTripTaxaTrophyRow[];
    rawTaxa.forEach((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return;
      const dayLocal = row.day_local ?? null;
      if (dayLocal && dayLocal !== todayKey) return;
      rows.push({
        trophy_id,
        user_login,
        value: null,
        awarded_at: row.awarded_at ?? null,
      });
    });
  }

  return {
    data: rows,
    error: combinedError,
    ...(missingDaily && missingTaxa ? { missing: true } : {}),
  };
}

export async function fetchTripTrophiesCR2025(): Promise<ApiResult<TripTrophyAward[]>> {
  const [dailyResult, taxaResult] = await Promise.all([
    supabase()
      .from('trophies_daily_trip_cr2025_v1')
      .select('trophy_id, user_login, value, awarded_at'),
    supabase()
      .from('trophies_taxa_daily_cr2025_v1')
      .select('trophy_id, user_login, awarded_at, day_local'),
  ]);

  const rows: TripTrophyAward[] = [];
  let missingDaily = false;
  let missingTaxa = false;
  let combinedError: PostgrestError | null = null;

  if (isMissingView(dailyResult.error)) {
    missingDaily = true;
  } else if (dailyResult.error) {
    combinedError = dailyResult.error;
  } else {
    const rawDaily = (dailyResult.data ?? []) as (RawTripTaxaTrophyRow & { value?: NumericLike })[];
    rawDaily.forEach((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return;
      rows.push({
        trophy_id,
        user_login,
        value: row.value != null ? Number(row.value) : null,
        awarded_at: row.awarded_at ?? null,
      });
    });
  }

  if (isMissingView(taxaResult.error)) {
    missingTaxa = true;
  } else if (taxaResult.error) {
    combinedError = combinedError ?? taxaResult.error;
  } else {
    const rawTaxa = (taxaResult.data ?? []) as RawTripTaxaTrophyRow[];
    rawTaxa.forEach((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return;
      rows.push({
        trophy_id,
        user_login,
        value: null,
        awarded_at: row.awarded_at ?? null,
      });
    });
  }

  rows.sort((a, b) => {
    const aTime = a.awarded_at ? new Date(a.awarded_at).getTime() : 0;
    const bTime = b.awarded_at ? new Date(b.awarded_at).getTime() : 0;
    return aTime - bTime;
  });

  return {
    data: rows,
    error: combinedError,
    ...(missingDaily && missingTaxa ? { missing: true } : {}),
  };
}

export async function fetchTaxaTrophiesTodayCR2025(): Promise<ApiResult<TripTaxaTrophyRow[]>> {
  const { data, error } = await supabase()
    .from('trophies_taxa_daily_cr2025_v1')
    .select('trophy_id, user_login, awarded_at, day_local')
    .order('trophy_id', { ascending: true })
    .order('awarded_at', { ascending: false, nullsFirst: false });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripTaxaTrophyRow[];
  const rows: TripTaxaTrophyRow[] = rawRows
    .map((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return null;
      return {
        trophy_id,
        user_login,
        awarded_at: row.awarded_at ?? null,
        day_local: row.day_local ?? null,
      } satisfies TripTaxaTrophyRow;
    })
    .filter((row): row is TripTaxaTrophyRow => Boolean(row));

  return { data: rows, error };
}

export async function fetchTrophyCabinetCR2025(): Promise<ApiResult<TripTrophyCabinetRow[]>> {
  const { data, error } = await supabase()
    .from('trophies_cabinet_cr2025_v1')
    .select('trophy_id, user_login, awarded_at, day_local')
    .order('day_local', { ascending: false, nullsFirst: false })
    .order('trophy_id', { ascending: true, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripTrophyCabinetRow[];
  const rows: TripTrophyCabinetRow[] = rawRows
    .map((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      const user_login = (row.user_login ?? '').toString();
      if (!trophy_id || !user_login) return null;
      return {
        trophy_id,
        user_login,
        awarded_at: row.awarded_at ?? null,
        day_local: row.day_local ?? null,
      } satisfies TripTrophyCabinetRow;
    })
    .filter((row): row is TripTrophyCabinetRow => Boolean(row));

  return { data: rows, error };
}

export async function fetchCabinetCR2025(): Promise<ApiResult<TripCabinetDayGroup[]>> {
  const base = await fetchTrophyCabinetCR2025();

  if (base.missing) {
    return { data: [], error: null, missing: true };
  }

  const dayMap = new Map<string | null, Map<string, TripTrophyCabinetRow[]>>();

  (base.data ?? []).forEach((row) => {
    const dayKey = row.day_local ?? null;
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, new Map());
    }
    const trophies = dayMap.get(dayKey)!;
    if (!trophies.has(row.trophy_id)) {
      trophies.set(row.trophy_id, []);
    }
    trophies.get(row.trophy_id)!.push(row);
  });

  const grouped: TripCabinetDayGroup[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return b.localeCompare(a);
    })
    .map(([day_local, trophies]) => ({
      day_local,
      trophies: Array.from(trophies.entries())
        .map(([trophy_id, awards]) => ({
          trophy_id,
          awards: awards
            .slice()
            .sort((a, b) => {
              const nameA = a.user_login.toLowerCase();
              const nameB = b.user_login.toLowerCase();
              if (nameA !== nameB) return nameA.localeCompare(nameB);
              return (a.awarded_at ?? '').localeCompare(b.awarded_at ?? '');
            }),
        }))
        .sort((a, b) => a.trophy_id.localeCompare(b.trophy_id)),
    }));

  return {
    data: grouped,
    error: base.error ?? null,
  };
}

export async function fetchTrophiesCatalogCR2025(): Promise<ApiResult<TripTrophyCatalogRow[]>> {
  const { data, error } = await supabase()
    .from('trophies_catalog_cr2025_v1')
    .select('trophy_id, label')
    .order('trophy_id', { ascending: true });

  if (isMissingView(error)) {
    return { data: [], error: null, missing: true };
  }

  const rawRows = (data ?? []) as RawTripTrophyCatalogRow[];
  const rows: TripTrophyCatalogRow[] = rawRows
    .map((row) => {
      const trophy_id = (row.trophy_id ?? '').toString();
      if (!trophy_id) return null;
      return {
        trophy_id,
        label: row.label ?? trophy_id,
      } satisfies TripTrophyCatalogRow;
    })
    .filter((row): row is TripTrophyCatalogRow => Boolean(row));

  return { data: rows, error };
}

export async function getTripTrophiesToday(tz: string): Promise<ApiResult<TripTrophyAward[]>> {
  return fetchTodayTrophiesCR2025(tz);
}

export async function getTripTrophiesCumulative(): Promise<ApiResult<TripTrophyAward[]>> {
  return fetchTripTrophiesCR2025();
}

export async function submitAdultPoints(user_login: string, points: number, reason: string) {
  const payload = {
    user_login,
    points,
    reason: reason?.trim() || 'manual-award',
  };

  const { error } = await supabase()
    .from('trip_awards_manual_cr2025')
    .insert([payload]);

  if (isMissingView(error)) {
    return { ok: false, missingTable: true as const };
  }

  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

export async function lastUpdatedCR2025(): Promise<ApiResult<string | null>> {
  const { data, error } = await supabase()
    .from('trip_obs_latest10_cr2025_v1')
    .select('observed_at_utc')
    .order('observed_at_utc', { ascending: false, nullsFirst: false })
    .limit(1);

  if (isMissingView(error)) {
    return { data: null, error: null, missing: true };
  }

  const candidate = Array.isArray(data) && data.length > 0 ? data[0]?.observed_at_utc : null;
  const iso = typeof candidate === 'string' && candidate ? candidate : null;

  return { data: iso ?? null, error };
}

export async function fetchHeaderTexts() {
  const { data, error } = await supabase().rpc('get_header_texts_v1', {});
  if (error) { console.error('header rpc', error); return { ticker: 'EcoQuest Live — ready to play', announce: undefined }; }
  const row = (data && data[0]) || {};
  return { ticker: row.ticker_text || 'EcoQuest Live — ready to play', announce: row.announcement_text || undefined };
}

export async function pingBronze() {
  const r = await supabase().rpc('ping_bronze_v1', {});
  return r;
}

export async function fetchBingo(userLogin: string) {
  const { data, error } = await supabase().rpc('get_bingo_for_user', { p_user_login: userLogin });
  if (error) { console.error('bingo rpc', error); return []; }
  return data ?? [];
}

export async function fetchMembers() {
  const { data, error } = await supabase()
    .from('trip_members_roster_cr2025_v1')
    .select('user_login')
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });
  if (isMissingView(error)) {
    return [];
  }
  if (error) {
    console.error('fetchMembers error', error);
    return [];
  }
  const rawRows = (data ?? []) as RawTripRosterRow[];
  return rawRows
    .map((m) => m.user_login ?? null)
    .filter((login): login is string => {
      if (!login) return false;
      return !HIDDEN_LOGINS.has(login.toLowerCase());
    });
}

export async function fetchUserLogins() {
  // Legacy wrapper - use fetchMembers() instead
  return fetchMembers();
}

export async function adminAward({ token, user_login, points, reason, by }: {
  token: string; user_login: string; points: number; reason?: string; by?: string;
}) {
  return supabase().rpc('admin_award_manual_points', {
    p_token: token, p_user_login: user_login, p_points: points, p_reason: reason ?? 'manual', p_awarded_by: by ?? 'admin'
  });
}

export async function adminList(token: string) {
  return supabase().rpc('admin_list_manual_points', { p_token: token });
}

export async function adminDelete(token: string, id: number) {
  return supabase().rpc('admin_delete_manual_point', { p_token: token, p_id: id });
}

export async function fieldAward({ token, user_login, points, reason, by }: {
  token: string; user_login: string; points: number; reason?: string; by?: string;
}) {
  return supabase().rpc('field_award_manual_points', {
    p_token: token, p_user_login: user_login, p_points: points, 
    p_reason: reason ?? 'field-award', p_awarded_by: by ?? 'guide'
  });
}

export async function adminSetSpeeds({ token, primary_ms, announce_ms }: {
  token: string; primary_ms: number; announce_ms: number;
}) {
  return supabase().rpc('admin_set_ticker_speeds', { 
    p_admin_token: token, p_primary_ms: primary_ms, p_announce_ms: announce_ms 
  });
}

export async function adminSetAnnouncement({ token, text }: { token: string; text: string; }) {
  return supabase().rpc('admin_set_announcement', { p_admin_token: token, p_text: text });
}

export async function listRecentAwards() {
  return supabase().from('manual_points_recent_v1').select('*');
}

export async function listWeeklyAwards() {
  return supabase().from('manual_points_weekly_v1').select('*');
}

export async function fetchDisplayFlags() {
  const { data } = await supabase().rpc('get_display_flags_v1', {});
  return data?.[0] ?? { trophies_include_adults: true, score_blackout_until: null };
}

export async function adminSetTrophiesIncludeAdults(token: boolean | string, include: boolean) {
  return supabase().rpc('admin_set_trophies_include_adults', { 
    p_admin_token: String(token), 
    p_include: include 
  });
}

export async function adminSetStudentLogins(token: string, arr: string[] | null) {
  return supabase().rpc('admin_set_student_logins', { 
    p_admin_token: token, 
    p_logins: arr 
  });
}

export async function adminSetBlackoutUntil(token: string, until: string | null) {
  return supabase().rpc('admin_set_blackout_until', { 
    p_admin_token: token, 
    p_until: until 
  });
}

export async function adminSetTrophyPointsEnabled(token: string, enabled: boolean) {
  return supabase().rpc('admin_set_flag', {
    p_admin_token: token,
    p_flag_name: 'trophies_points_v1',
    p_flag_value: enabled
  });
}

export async function fetchTrophyPoints() {
  const { data } = await supabase()
    .from('score_entries_trophies_latest_v1')
    .select('user_login, points');
  return data ?? [];
}
