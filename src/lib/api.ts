import { supabase } from './supabase';

export type LeaderRow = {
  assignment_id?: string;
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

export async function fetchLeaderboard(assignmentId: string): Promise<LeaderRow[]> {
  const { data, error } = await supabase
    .from('leaderboard_overall_plus_bingo_latest_v2')
    .select('user_login, rank, rank_delta, obs_count, distinct_taxa, bingo_points, score, total_score, score_total, display_name')
    .order('rank', { ascending: true, nullsFirst: false });
  
  if (error) {
    console.error('Leaderboard fetch failed:', error);
    throw error;
  }

  return (data ?? []) as LeaderRow[];
}
