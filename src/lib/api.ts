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
};

export async function fetchLeaderboard() {
  const cols = 'user_login, display_name, rank, rank_delta, obs_count, distinct_taxa, bingo_points, score, total_score, score_total';
  const { data, error } = await supabase
    .from('leaderboard_overall_plus_bingo_latest_v2')
    .select(cols);
  
  if (error) { 
    console.error('Leaderboard fetch failed', error); 
    return { data: [], error }; 
  }
  
  // Sort by rank; fallback to obs_count if rank missing
  const out = (data ?? []).slice().sort((a, b) => {
    const ra = a.rank ?? 9999;
    const rb = b.rank ?? 9999;
    if (ra !== rb) return ra - rb;
    return (b.obs_count ?? 0) - (a.obs_count ?? 0);
  });
  
  return { data: out as LeaderRow[], error: null };
}
