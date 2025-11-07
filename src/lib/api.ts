import { supabase } from './supabaseClient';

export type LeaderRow = {
  user_login: string;
  display_name?: string | null;
  rank: number | null;
  rank_delta?: number | null;
  obs_count: number | null;
  distinct_taxa?: number | null;
  bingo_points: number | null;
  score?: number | null;
  total_score?: number | null;
  score_total?: number | null;
  manual_points?: number | null;
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
        manual_points: 0
      }));
    } else {
      lastError = v.error ?? lastError;
      console.error('minimal view fallback error', v.error);
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

export async function fetchUserLogins() {
  const r = await supabase().rpc('get_leaderboard_bronze_v1', {});
  if (r.error) return [];
  return (r.data ?? []).map((x: any) => x.user_login);
}
