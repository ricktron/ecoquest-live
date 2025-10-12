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
