import { supabase } from './supabaseClient';

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

type MaskedLeaderboardRow = {
  rank: number | null;
  inat_login: string | null;
  total_points: number | null;
  total_obs: number | null;
  unique_species: number | null;
  scored_on: string | null;
};

export async function fetchLeaderboard() {
  let rows: LeaderRow[] | null = null;
  let lastError: any = null;

  const masked = await supabase()
    .from('public_leaderboard_masked_v1')
    .select('rank, inat_login, total_points, total_obs, unique_species, scored_on')
    .order('rank', { ascending: true });

  if (!masked.error && masked.data) {
    rows = masked.data.map((row: MaskedLeaderboardRow) => {
      const login = row.inat_login ?? '';
      return {
        user_login: login,
        inat_login: row.inat_login,
        rank: row.rank,
        total_points: row.total_points ?? 0,
        total_obs: row.total_obs ?? 0,
        obs_count: row.total_obs ?? 0,
        unique_species: row.unique_species ?? 0,
        distinct_taxa: row.unique_species ?? 0,
        scored_on: row.scored_on,
        bingo_points: 0,
        manual_points: 0,
        trophy_points: 0,
      } satisfies LeaderRow;
    });
  } else if (masked.error) {
    lastError = masked.error;
    console.error('masked leaderboard view error', masked.error);
  }

  const bronze = await supabase().rpc('get_leaderboard_bronze_v1', {}); // {} is required

  if (!bronze.error && bronze.data?.length) {
    const bronzeMap = new Map(bronze.data.map((row: any) => [row.user_login, row]));
    if (rows) {
      rows = rows.map(row => {
        const extra = bronzeMap.get(row.user_login);
        if (!extra) return row;
        return {
          ...row,
          display_name: extra.display_name ?? row.display_name,
          prev_rank: extra.prev_rank ?? row.prev_rank,
          rank_delta: extra.rank_delta ?? row.rank_delta,
          bingo_points: extra.bingo_points ?? row.bingo_points,
          manual_points: extra.manual_points ?? row.manual_points,
          trophy_points: extra.trophy_points ?? row.trophy_points,
          score: extra.score ?? row.score,
          total_score: extra.total_score ?? row.total_score,
          score_total: extra.score_total ?? row.score_total,
        } satisfies LeaderRow;
      });
    } else {
      rows = bronze.data as LeaderRow[];
    }
  } else if (bronze.error) {
    if (!rows?.length) {
      lastError = lastError ?? bronze.error;
    }
    console.warn('bronze rpc failed/empty', bronze.error);
  }

  if (!rows) return { data: [], error: lastError ?? new Error('No rows from view or RPC') };

  rows.sort(
    (a, b) =>
      (a.rank ?? 9999) - (b.rank ?? 9999) ||
      (b.total_points ?? b.score ?? 0) - (a.total_points ?? a.score ?? 0)
  );

  return { data: rows, error: lastError };
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
    .from('score_entries_trophies_latest_v1' as any)
    .select('user_login, points');
  return data ?? [];
}
