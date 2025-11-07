import { supabase } from './supabase';

export type LeaderRow = {
  assignment_id: string;
  student_id: string | null;
  display_name: string | null;
  points: number | null;
  rank: number | null;
  delta_rank?: number | null;
  rank_delta?: number | null;
  rank_change?: number | null;
  bingo_points: number | null;
  O?: number | null; 
  U?: number | null; 
  RG?: number | null; 
  SL?: number | null; 
  D?: number | null;
  obs_count?: number | null;
  taxa_count?: number | null;
  checklist_count?: number | null;
  score?: number | null;
  total_score?: number | null;
  score_total?: number | null;
};

export async function fetchLeaderboard(assignmentId: string) {
  const cols = 'assignment_id, student_id, display_name, points, rank, delta_rank, rank_delta, rank_change, bingo_points, O, U, RG, SL, D, obs_count, taxa_count, checklist_count, score, total_score, score_total';
  const { data, error } = await supabase
    .from('leaderboard_overall_plus_bingo_latest_v1')
    .select(cols)
    .eq('assignment_id', assignmentId);
  
  if (error) {
    console.error('Leaderboard fetch failed:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  // Determine which score field exists
  const scoreKey = ['points', 'score', 'total_score', 'score_total'].find(k => k in (data[0] || {}));
  const rankExists = 'rank' in (data[0] || {});

  // Sort by rank if present, else by score, else by obs_count
  if (rankExists) {
    data.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
  } else if (scoreKey) {
    data.sort((a, b) => ((b as any)[scoreKey] ?? 0) - ((a as any)[scoreKey] ?? 0));
  } else {
    data.sort((a, b) => (b.obs_count ?? b.O ?? 0) - (a.obs_count ?? a.O ?? 0));
  }

  return data;
}
