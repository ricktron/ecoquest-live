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
  // 1) RPC (extras)
  let rows: any[] | null = null;
  let err: any = null;
  const r1 = await supabase.rpc('get_leaderboard_plus_extras_v1', {});
  if (!r1.error && r1.data?.length) rows = r1.data;
  else { err = r1.error || err; console.warn('extras rpc failed/empty', r1.error); }

  // 2) View (extras)
  if (!rows) {
    const cols = 'user_login, rank, rank_delta, obs_count, distinct_taxa, bingo_points, manual_points';
    const r2 = await supabase.from('leaderboard_overall_plus_extras_latest_v1').select(cols);
    if (!r2.error && r2.data?.length) rows = r2.data;
    else { err = r2.error || err; console.warn('extras view failed/empty', r2.error); }
  }

  // 3) Minimal RPC (always available)
  if (!rows) {
    const r3 = await supabase.rpc('get_leaderboard_min_v1', {});
    if (!r3.error && r3.data?.length) {
      // Map into common shape; no rank yet → compute client-side by order
      rows = r3.data.map((r: any, i: number) => ({
        user_login: r.user_login,
        rank: i + 1,
        rank_delta: null,
        obs_count: r.obs_count,
        distinct_taxa: r.distinct_taxa,
        bingo_points: 0,
        manual_points: 0
      }));
    } else { err = r3.error || err; console.error('min rpc failed/empty', r3.error); }
  }

  if (!rows) return { data: [], error: err || new Error('no data after all fallbacks') };
  const out = rows.slice().sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999) || (b.obs_count ?? 0) - (a.obs_count ?? 0));
  return { data: out, error: null };
}
