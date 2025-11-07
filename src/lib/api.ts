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

export async function fetchHeaderTexts() {
  const { data, error } = await supabase.rpc('get_header_texts_v1', {});
  if (error) { console.error('header rpc', error); return { ticker: 'EcoQuest Live — ready to play', announce: undefined }; }
  const row = (data && data[0]) || {};
  return { ticker: row.ticker_text || 'EcoQuest Live — ready to play', announce: row.announcement_text || undefined };
}

export async function fetchLeaderboard() {
  const r = await supabase.rpc('get_leaderboard_min_v1', {}); // IMPORTANT: pass {}
  if (r.error) { console.error('min rpc error', r.error); return { data: [], error: r.error }; }
  const rows = (r.data ?? []).map((x: any, i: number) => ({
    user_login: x.user_login,
    rank: i + 1,
    rank_delta: null,
    obs_count: x.obs_count,
    distinct_taxa: x.distinct_taxa,
    bingo_points: 0,
    manual_points: 0,
  }));
  return { data: rows, error: null };
}
