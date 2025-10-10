import { supabase } from './supabase';

export type LeaderRow = {
  assignment_id: string;
  student_id: string | null;
  display_name: string | null;
  points: number | null;
  rank: number | null;
  delta_rank: number | null;
  O?: number | null; U?: number | null; RG?: number | null; SL?: number | null; D?: number | null;
};

export async function fetchLeaderboard(assignmentId: string) {
  const { data, error } = await supabase
    .from('public_leaderboard_v2')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('points', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDaily(assignmentId: string) {
  const { data, error } = await supabase
    .from('daily_scoreboard_v2')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('points', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type TrophyRow = {
  assignment_id: string;
  trophy: string;
  winner_student_id: string | null;
  winner_display_name: string | null;
  metric_value: number | null;
  updated_at_utc: string | null;
};

export async function fetchTrophies(assignmentId: string) {
  const { data, error } = await supabase
    .from('trophies_live_v1')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('updated_at_utc', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
