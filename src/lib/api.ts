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
  const cols = 'user_login, display_name, rank, rank_delta, obs_count, distinct_taxa, bingo_points, score, total_score, score_total, manual_points';
  const { data, error } = await supabase
    .from('leaderboard_overall_plus_extras_latest_v1')
    .select(cols);
  if (error) { console.error('leaderboard fetch', error); return []; }
  return (data ?? []).sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
}
