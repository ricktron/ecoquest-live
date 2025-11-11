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

type ApiResult<T> = { data: T; error: PostgrestError | null };

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
  is_adult: boolean;
};

export type TripLeaderboardRow = {
  user_login: string;
  display_name: string | null;
  total_points: number;
  obs_count: number;
  distinct_taxa: number;
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

export async function getTripRoster(): Promise<ApiResult<TripRosterEntry[]>> {
  const { data, error } = await supabase()
    .from('trip_members_roster_v1')
    .select('user_login, display_name, is_adult')
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  const rows: TripRosterEntry[] = (data ?? [])
    .map((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        display_name: row?.display_name ?? null,
        is_adult: Boolean(row?.is_adult),
      } satisfies TripRosterEntry;
    })
    .filter((row): row is TripRosterEntry => Boolean(row));

  return { data: rows, error };
}

export async function getTripLeaderboard(): Promise<ApiResult<TripLeaderboardRow[]>> {
  const client = supabase();

  const [rosterResponse, leaderboardResponse] = await Promise.all([
    client
      .from('trip_members_roster_v1')
      .select('user_login, display_name, is_adult')
      .order('display_name', { ascending: true, nullsFirst: false })
      .order('user_login', { ascending: true, nullsFirst: false }),
    client
      .from('leaderboard_trip_points_cr2025_v1')
      .select('user_login, display_name, total_points, obs_count, distinct_taxa'),
  ]);

  const rosterRows: TripRosterEntry[] = (rosterResponse.data ?? [])
    .map((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        display_name: row?.display_name ?? null,
        is_adult: Boolean(row?.is_adult),
      } satisfies TripRosterEntry;
    })
    .filter((row): row is TripRosterEntry => Boolean(row));

  let leaderboardRows: TripLeaderboardRow[] = [];
  let leaderboardError: PostgrestError | null = leaderboardResponse.error ?? null;

  if (!leaderboardError) {
    leaderboardRows = (leaderboardResponse.data ?? [])
      .map((row: any) => {
        const user_login = (row?.user_login ?? '').toString();
        if (!user_login) return null;
        return {
          user_login,
          display_name: row?.display_name ?? null,
          total_points: toNumber(row?.total_points),
          obs_count: toNumber(row?.obs_count),
          distinct_taxa: toNumber(row?.distinct_taxa),
        } satisfies TripLeaderboardRow;
      })
      .filter((row): row is TripLeaderboardRow => Boolean(row));
  } else if (leaderboardError.code === '42P01') {
    const { data: baseData, error: baseError } = await client
      .from('trip_obs_base_cr2025_v1')
      .select('user_login, taxon_id');

    leaderboardError = baseError ?? null;

    const counts = new Map<string, { obs: number; taxa: Set<number> }>();
    (baseData ?? []).forEach((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      if (!user_login) return;
      const entry = counts.get(user_login) ?? { obs: 0, taxa: new Set<number>() };
      entry.obs += 1;
      const taxonId = row?.taxon_id;
      if (taxonId != null) {
        entry.taxa.add(Number(taxonId));
      }
      counts.set(user_login, entry);
    });

    leaderboardRows = Array.from(counts.entries()).map(([user_login, entry]) => ({
      user_login,
      display_name: null,
      total_points: entry.obs,
      obs_count: entry.obs,
      distinct_taxa: entry.taxa.size,
    }));

    if (leaderboardResponse.error) {
      leaderboardError = baseError ?? null;
    }
  }

  const rosterMap = rosterRows.reduce<Record<string, TripRosterEntry>>((acc, row) => {
    acc[row.user_login.toLowerCase()] = row;
    return acc;
  }, {});

  const leaderboardMap = new Map<string, TripLeaderboardRow>();
  leaderboardRows.forEach((row) => {
    leaderboardMap.set(row.user_login.toLowerCase(), row);
  });

  const combined: TripLeaderboardRow[] = rosterRows.map((member) => {
    const stats = leaderboardMap.get(member.user_login.toLowerCase());
    return {
      user_login: member.user_login,
      display_name: member.display_name ?? stats?.display_name ?? member.user_login,
      total_points: stats?.total_points ?? 0,
      obs_count: stats?.obs_count ?? 0,
      distinct_taxa: stats?.distinct_taxa ?? 0,
    } satisfies TripLeaderboardRow;
  });

  leaderboardRows.forEach((row) => {
    if (!rosterMap[row.user_login.toLowerCase()]) {
      combined.push(row);
    }
  });

  const error = rosterResponse.error ?? leaderboardError ?? null;

  return { data: combined, error };
}

export async function getTripDailySummary(): Promise<ApiResult<TripDailySummaryRow[]>> {
  const { data, error } = await supabase()
    .from('trip_daily_summary_cr2025_v1')
    .select('day_local, obs_count, distinct_taxa, people_count')
    .order('day_local', { ascending: false });

  const rows: TripDailySummaryRow[] = (data ?? [])
    .map((row: any) => ({
      day_local: (row?.day_local ?? '').toString(),
      obs_count: toNumber(row?.obs_count),
      distinct_taxa: toNumber(row?.distinct_taxa),
      people_count: toNumber(row?.people_count),
    }))
    .filter((row) => row.day_local);

  return { data: rows, error };
}

export async function getTripBasePoints(options: { day?: string } = {}): Promise<ApiResult<TripBaseObservationRow[]>> {
  let query = supabase()
    .from('trip_obs_base_cr2025_v1')
    .select('user_login, inat_obs_id, latitude, longitude, taxon_id, quality_grade, observed_at_utc, day_local');

  if (options.day) {
    query = query.eq('day_local', options.day);
  }

  const { data, error } = await query;

  const rows: TripBaseObservationRow[] = (data ?? [])
    .map((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        user_login,
        inat_obs_id: row?.inat_obs_id != null ? Number(row.inat_obs_id) : null,
        latitude: row?.latitude != null ? Number(row.latitude) : null,
        longitude: row?.longitude != null ? Number(row.longitude) : null,
        taxon_id: row?.taxon_id != null ? Number(row.taxon_id) : null,
        quality_grade: row?.quality_grade ?? null,
        observed_at_utc: row?.observed_at_utc ?? null,
        day_local: row?.day_local ?? null,
      } satisfies TripBaseObservationRow;
    })
    .filter((row): row is TripBaseObservationRow => Boolean(row));

  return { data: rows, error };
}

export async function getTripTrophiesToday(tz: string): Promise<ApiResult<TripTrophyAward[]>> {
  const { data, error } = await supabase()
    .from('trophies_daily_trip_cr2025_v1')
    .select('trophy_id, user_login, value, awarded_at');

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayKey = formatter.format(new Date());

  const rows: TripTrophyAward[] = (data ?? [])
    .map((row: any) => {
      const trophy_id = (row?.trophy_id ?? '').toString();
      const user_login = (row?.user_login ?? '').toString();
      if (!trophy_id || !user_login) return null;
      return {
        trophy_id,
        user_login,
        value: row?.value != null ? Number(row.value) : null,
        awarded_at: row?.awarded_at ?? null,
      } satisfies TripTrophyAward;
    })
    .filter((row): row is TripTrophyAward => {
      if (!row) return false;
      if (!row.awarded_at) return false;
      const awardedKey = formatter.format(new Date(row.awarded_at));
      return awardedKey === todayKey;
    });

  return { data: rows, error };
}

export async function getTripTrophiesCumulative(): Promise<ApiResult<TripTrophyAward[]>> {
  const { data, error } = await supabase()
    .from('trophies_daily_trip_cr2025_v1')
    .select('trophy_id, user_login, value, awarded_at');

  const rows: TripTrophyAward[] = (data ?? [])
    .map((row: any) => {
      const trophy_id = (row?.trophy_id ?? '').toString();
      const user_login = (row?.user_login ?? '').toString();
      if (!trophy_id || !user_login) return null;
      return {
        trophy_id,
        user_login,
        value: row?.value != null ? Number(row.value) : null,
        awarded_at: row?.awarded_at ?? null,
      } satisfies TripTrophyAward;
    })
    .filter((row): row is TripTrophyAward => Boolean(row));

  return { data: rows, error };
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
    .from('trip_members_roster_v1')
    .select('user_login')
    .order('display_name', { ascending: true, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('fetchMembers error', error);
    return [];
  }
  return (data ?? []).map((m: any) => m.user_login).filter((login: string | null | undefined) => {
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
