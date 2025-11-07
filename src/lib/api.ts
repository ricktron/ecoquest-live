import { supabase } from './supabase';

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

export async function fetchAnnouncement() {
  const { data, error } = await supabase.rpc('get_announcement_text');
  if (error) { console.error('announce rpc', error); return undefined; }
  return (data ?? '').toString().trim() || undefined;
}

export async function fetchLeaderboard() {
  // Try RPC first (must pass {})
  let data: any[] | null = null;
  let error: any = null;
  const rpc = await supabase.rpc('get_leaderboard_plus_extras_v1', {});
  if (rpc.error) {
    console.error('leaderboard extras rpc error', rpc.error);
    error = rpc.error;
  } else {
    data = rpc.data ?? [];
  }
  // Fallback to view if RPC errored or returned empty
  if (!data || data.length === 0) {
    const cols = 'user_login, rank, rank_delta, obs_count, distinct_taxa, bingo_points, manual_points';
    const sel = await supabase.from('leaderboard_overall_plus_extras_latest_v1').select(cols);
    if (sel.error) {
      console.error('leaderboard view fallback error', sel.error);
      return { data: [], error: sel.error };
    }
    data = sel.data ?? [];
  }
  const out = data.slice().sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (b.obs_count ?? 0) - (a.obs_count ?? 0));
  return { data: out, error: null };
}
