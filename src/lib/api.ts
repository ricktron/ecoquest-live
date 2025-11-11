import { supabase } from './supabaseClient';

const HIDDEN_LOGINS = new Set(['alishdafish', 'waterlog', 'wormzorm']);

type TripPointsRow = {
  inat_login: string | null;
  display_name?: string | null;
  total_points?: number | null;
  total_obs?: number | null;
  unique_species?: number | null;
  prev_rank?: number | null;
  rank?: number | null;
  bingo_points?: number | null;
  manual_points?: number | null;
  trophy_points?: number | null;
};

type TripRosterRow = {
  inat_login: string | null;
  display_name?: string | null;
};

export type LeaderRow = {
  user_login: string;
  inat_login?: string | null;
  display_name?: string | null;
  rank: number | null;
  prev_rank?: number | null;
  rank_delta?: number | null;
  total_points?: number | null;
  total_obs?: number | null;
  obs_count?: number | null;
  unique_species?: number | null;
  distinct_taxa?: number | null;
  bingo_points?: number | null;
  score?: number | null;
  total_score?: number | null;
  score_total?: number | null;
  manual_points?: number | null;
  trophy_points?: number | null;
  scored_on?: string | null;
};

export async function fetchHeaderTexts() {
  const { data, error } = await supabase().rpc('get_header_texts_v1', {});
  if (error) { console.error('header rpc', error); return { ticker: 'EcoQuest Live — ready to play', announce: undefined }; }
  const row = (data && data[0]) || {};
  return { ticker: row.ticker_text || 'EcoQuest Live — ready to play', announce: row.announcement_text || undefined };
}

export async function fetchLeaderboard(): Promise<{ data: LeaderRow[]; error: { message?: string } | null }> {
  const client = supabase();

  const [{ data: pointsData, error: pointsError }, { data: rosterData, error: rosterError }] = await Promise.all([
    client
      .from('leaderboard_trip_points_v1')
      .select(
        'inat_login, display_name, total_points, total_obs, unique_species, prev_rank, rank, bingo_points, manual_points, trophy_points'
      ),
    client
      .from('trip_members_roster_v1')
      .select('inat_login, display_name')
  ]);

  if (pointsError) {
    console.warn('leaderboard_trip_points_v1 error', pointsError);
  }

  if (rosterError) {
    console.warn('trip_members_roster_v1 error', rosterError);
  }

  const byLogin = new Map<string, LeaderRow>();

  ((pointsData as TripPointsRow[] | null) ?? []).forEach((row) => {
    const login = (row.inat_login ?? '').toLowerCase();
    if (!login || HIDDEN_LOGINS.has(login)) return;

    byLogin.set(login, {
      user_login: login,
      inat_login: row.inat_login ?? login,
      display_name: row.display_name ?? row.inat_login ?? login,
      total_points: Number(row.total_points ?? 0),
      total_obs: Number(row.total_obs ?? 0),
      obs_count: Number(row.total_obs ?? 0),
      unique_species: Number(row.unique_species ?? 0),
      distinct_taxa: Number(row.unique_species ?? 0),
      prev_rank: typeof row.prev_rank === 'number' ? row.prev_rank : null,
      rank: typeof row.rank === 'number' ? row.rank : null,
      bingo_points: Number(row.bingo_points ?? 0),
      manual_points: Number(row.manual_points ?? 0),
      trophy_points: Number(row.trophy_points ?? 0),
      score: Number(row.total_points ?? 0),
      total_score: Number(row.total_points ?? 0),
      score_total: Number(row.total_points ?? 0),
      scored_on: null,
    });
  });

  ((rosterData as TripRosterRow[] | null) ?? []).forEach((row) => {
    const login = (row.inat_login ?? '').toLowerCase();
    if (!login || HIDDEN_LOGINS.has(login) || byLogin.has(login)) return;

    byLogin.set(login, {
      user_login: login,
      inat_login: row.inat_login ?? login,
      display_name: row.display_name ?? row.inat_login ?? login,
      total_points: 0,
      total_obs: 0,
      obs_count: 0,
      unique_species: 0,
      distinct_taxa: 0,
      prev_rank: null,
      rank: null,
      bingo_points: 0,
      manual_points: 0,
      trophy_points: 0,
      score: 0,
      total_score: 0,
      score_total: 0,
      scored_on: null,
    });
  });

  const rows = Array.from(byLogin.values());

  rows.sort((a, b) => {
    const pointsDiff = (b.total_points ?? 0) - (a.total_points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const speciesDiff = (b.unique_species ?? 0) - (a.unique_species ?? 0);
    if (speciesDiff !== 0) return speciesDiff;

    const aLogin = (a.inat_login ?? a.user_login ?? '').toLowerCase();
    const bLogin = (b.inat_login ?? b.user_login ?? '').toLowerCase();
    return aLogin.localeCompare(bLogin);
  });

  rows.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  return { data: rows, error: pointsError ?? rosterError ?? null };
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
    .from('members_latest_v1')
    .select('user_login')
    .order('user_login');
  if (error) { 
    console.error('fetchMembers error', error); 
    return []; 
  }
  return (data ?? []).map(m => m.user_login);
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
