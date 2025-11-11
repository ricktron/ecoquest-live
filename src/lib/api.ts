import { supabase } from './supabaseClient';

export type LeaderRow = {
  user_login: string;
  display_name?: string | null;
  rank: number | null;
  prev_rank?: number | null;
  rank_delta?: number | null;
  obs_count: number | null;
  distinct_taxa?: number | null;
  bingo_points: number | null;
  score?: number | null;
  total_score?: number | null;
  score_total?: number | null;
  manual_points?: number | null;
  trophy_points?: number | null;
};

export async function fetchHeaderTexts() {
  const { data, error } = await supabase().rpc('get_header_texts_v1', {});
  if (error) { console.error('header rpc', error); return { ticker: 'EcoQuest Live — ready to play', announce: undefined }; }
  const row = (data && data[0]) || {};
  return { ticker: row.ticker_text || 'EcoQuest Live — ready to play', announce: row.announcement_text || undefined };
}

export async function fetchLeaderboard() {
  // 1) Bronze RPC (rank + bingo + manual)
  let rows: any[] | null = null;
  let lastError: any = null;

  const r1 = await supabase().rpc('get_leaderboard_bronze_v1', {}); // {} is required
  if (!r1.error && r1.data?.length) {
    rows = r1.data;
  } else {
    lastError = r1.error ?? lastError;
    console.warn('bronze rpc failed/empty', r1.error);
  }

  // 2) Minimal view fallback (guaranteed to exist)
  if (!rows) {
    const v = await supabase()
      .from('leaderboard_overall_latest_v1')
      .select('user_login, obs_count, distinct_taxa, first_observed_at, last_observed_at');
    if (!v.error && v.data?.length) {
      rows = v.data.map((x: any, i: number) => ({
        user_login: x.user_login,
        rank: i + 1,
        obs_count: x.obs_count,
        distinct_taxa: x.distinct_taxa,
        bingo_points: 0,
        manual_points: 0,
        trophy_points: 0
      }));
    } else {
      lastError = v.error ?? lastError;
      console.error('minimal view fallback error', v.error);
    }
  }

  // 3) Fetch trophy points and merge
  if (rows) {
    const { data: trophyData } = await supabase()
      .from('score_entries_trophies_latest_v1' as any)
      .select('user_login, points');
    
    if (trophyData) {
      const trophyMap = new Map(trophyData.map((t: any) => [t.user_login, t.points]));
      rows.forEach(row => {
        row.trophy_points = trophyMap.get(row.user_login) ?? 0;
      });
    }
  }

  if (!rows) return { data: [], error: lastError ?? new Error('No rows from RPC or view') };
  // Always sort by rank, fallback to obs_count
  rows.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (b.obs_count ?? 0) - (a.obs_count ?? 0));
  return { data: rows, error: null };
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
