import { supabase } from './supabase';

export async function listAssignments() {
  const { data, error } = await supabase
    .from('assignments')
    .select('id, name')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function getLeaderboard(assignmentId: string) {
  const { data, error } = await supabase
    .from('public_leaderboard_v2')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('points', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function getLeaderboardDelta(assignmentId: string) {
  const { data, error } = await supabase
    .from('public_leaderboard_delta_v2')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('rank_now', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getDailyBoard(assignmentId: string, dayISO: string) {
  const { data, error } = await supabase
    .from('daily_scoreboard_v2')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('day', dayISO)
    .order('points', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTrophies(assignmentId: string) {
  const { data, error } = await supabase
    .from('trophy_events')
    .select('trophy_key, student_id, awarded_for_date, created_at, students(public_handle)')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}
