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

export type TripLeaderboardRow = {
  user_login: string;
  display_name: string | null;
  total_points: number;
  obs_count: number;
  distinct_taxa: number;
};

type TripLeaderboardCache = {
  rows: TripLeaderboardRow[];
  map: Record<string, string>;
  fetchedAt: number;
};

let tripLeaderboardCache: TripLeaderboardCache | null = null;

export async function fetchTripLeaderboard(): Promise<{ data: TripLeaderboardRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
    .from('leaderboard_trip_points_cr2025_v1')
    .select('user_login, display_name, total_points, obs_count, distinct_taxa')
    .order('total_points', { ascending: false, nullsFirst: false })
    .order('distinct_taxa', { ascending: false, nullsFirst: false })
    .order('obs_count', { ascending: false, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  const rows: TripLeaderboardRow[] = (data ?? [])
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

  const map: Record<string, string> = rows.reduce<Record<string, string>>((acc, row) => {
    const key = row.user_login.toLowerCase();
    const label = row.display_name?.trim() || row.user_login;
    if (key) {
      acc[key] = label;
    }
    return acc;
  }, {});

  tripLeaderboardCache = { rows, map, fetchedAt: Date.now() };

  return { data: rows, error };
}

export function getCachedTripLeaderboardNameMap(): Record<string, string> {
  return tripLeaderboardCache?.map ?? {};
}

export async function getTripLeaderboardNameMap(): Promise<Record<string, string>> {
  if (!tripLeaderboardCache) {
    await fetchTripLeaderboard();
  }
  return getCachedTripLeaderboardNameMap();
}

export type TripDayRow = {
  day_local: string;
};

export async function fetchTripDays(): Promise<{ data: TripDayRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
    .from('trip_days_cr2025_v1')
    .select('day_local')
    .order('day_local', { ascending: false });

  const rows: TripDayRow[] = (data ?? [])
    .map((row: any) => ({ day_local: (row?.day_local ?? '').toString() }))
    .filter((row) => row.day_local);

  return { data: rows, error };
}

export type TripDailySummaryRow = {
  day_local: string;
  obs_count: number;
  distinct_taxa: number;
  people_count: number;
};

export async function fetchTripDailySummary(): Promise<{ data: TripDailySummaryRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
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

export type TripDailyDetailRow = {
  day_local: string;
  user_login: string;
  obs_count: number;
  distinct_taxa: number;
};

export async function fetchTripDailyDetail(day: string): Promise<{ data: TripDailyDetailRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
    .from('trip_daily_detail_cr2025_v1')
    .select('day_local, user_login, obs_count, distinct_taxa')
    .eq('day_local', day)
    .order('obs_count', { ascending: false, nullsFirst: false })
    .order('distinct_taxa', { ascending: false, nullsFirst: false })
    .order('user_login', { ascending: true, nullsFirst: false });

  const rows: TripDailyDetailRow[] = (data ?? [])
    .map((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      if (!user_login) return null;
      return {
        day_local: (row?.day_local ?? '').toString(),
        user_login,
        obs_count: toNumber(row?.obs_count),
        distinct_taxa: toNumber(row?.distinct_taxa),
      } satisfies TripDailyDetailRow;
    })
    .filter((row): row is TripDailyDetailRow => Boolean(row));

  return { data: rows, error };
}

export type TripMapPointRow = {
  inat_obs_id: number;
  user_login: string;
  latitude: number;
  longitude: number;
};

export async function fetchTripMapPoints(): Promise<{ data: TripMapPointRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
    .from('trip_map_points_cr2025_v1')
    .select('inat_obs_id, user_login, latitude, longitude');

  const rows: TripMapPointRow[] = (data ?? [])
    .map((row: any) => {
      const user_login = (row?.user_login ?? '').toString();
      const lat = row?.latitude;
      const lon = row?.longitude;
      if (!user_login || lat == null || lon == null) return null;
      return {
        inat_obs_id: toNumber(row?.inat_obs_id),
        user_login,
        latitude: Number(lat),
        longitude: Number(lon),
      } satisfies TripMapPointRow;
    })
    .filter((row): row is TripMapPointRow => Boolean(row));

  return { data: rows, error };
}

export type TripTrophyRow = {
  trophy_id: string;
  user_login: string;
  place: number;
  value: number | null;
  awarded_at: string | null;
  scope: string | null;
};

export async function fetchTripTrophiesAllDays(): Promise<{ data: TripTrophyRow[]; error: PostgrestError | null }> {
  const client = supabase();
  const { data, error } = await client
    .from('trophies_daily_trip_cr2025_v1')
    .select('trophy_id, user_login, place, value, awarded_at, scope')
    .order('awarded_at', { ascending: false, nullsFirst: true })
    .order('trophy_id', { ascending: true, nullsFirst: false });

  const rows: TripTrophyRow[] = (data ?? [])
    .map((row: any) => {
      const trophy_id = (row?.trophy_id ?? '').toString();
      const user_login = (row?.user_login ?? '').toString();
      if (!trophy_id || !user_login) return null;
      return {
        trophy_id,
        user_login,
        place: toNumber(row?.place),
        value: row?.value != null ? Number(row.value) : null,
        awarded_at: row?.awarded_at ?? null,
        scope: row?.scope ?? null,
      } satisfies TripTrophyRow;
    })
    .filter((row): row is TripTrophyRow => Boolean(row));

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
    .from('public_leaderboard_masked_v1')
    .select('user_login')
    .order('user_login');
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
