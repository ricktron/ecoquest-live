import { supabase } from './supabaseClient';

const HIDDEN_LOGINS = new Set(['alishdafish', 'waterlog', 'wormzorm']);

type LeaderboardTripRow = {
  inat_login: string | null;
  display_name?: string | null;
  total_points?: number | null;
  total_obs?: number | null;
  unique_species?: number | null;
  scored_on?: string | null;
  bingo_points?: number | null;
  manual_points?: number | null;
  trophy_points?: number | null;
};

type RosterRow = {
  user_login?: string | null;
  inat_login?: string | null;
  display_name?: string | null;
};

type DailyCountsRow = {
  user_login?: string | null;
  display_name?: string | null;
  obs_count?: number | null;
  distinct_taxa?: number | null;
  cr_date?: string | null;
  bucket_date?: string | null;
  observed_on?: string | null;
  observed_on_cr?: string | null;
  day_offset?: number | null;
};

type TripMapPointRow = {
  inat_obs_id: number | null;
  user_login: string | null;
  lat?: number | null;
  lon?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  taxon_name?: string | null;
  observed_at_utc?: string | null;
  photo_url?: string | null;
};

type DailyTrophyRow = {
  trophy_id: string | null;
  user_login: string | null;
  place?: number | null;
  value?: number | null;
  scope?: string | null;
  awarded_at?: string | null;
};

type TrophyCabinetRow = {
  user_login: string | null;
  display_name?: string | null;
  trophies?: unknown;
};

export type LeaderRow = {
  user_login: string;
  inat_login?: string | null;
  display_name?: string | null;
  rank: number | null;
  prev_rank?: number | null;
  rank_delta?: number | null;
  rankDelta?: number | null;
  total_points?: number | null;
  total_obs?: number | null;
  obs_count?: number | null;
  unique_species?: number | null;
  distinct_taxa?: number | null;
  bingo_points?: number | null;
  score?: number | null;
  total_score?: number | null;
  score_total?: number | null;
  manual_points?: number | null;
  trophy_points?: number | null;
  scored_on?: string | null;
};

export async function fetchHeaderTexts() {
  const { data, error } = await supabase().rpc('get_header_texts_v1', {});
  if (error) { console.error('header rpc', error); return { ticker: 'EcoQuest Live — ready to play', announce: undefined }; }
  const row = (data && data[0]) || {};
  return { ticker: row.ticker_text || 'EcoQuest Live — ready to play', announce: row.announcement_text || undefined };
}

export async function fetchLeaderboard(): Promise<{ data: LeaderRow[]; error: { message?: string } | null }> {
  return fetchLeaderboardTrip();
}

export async function fetchLeaderboardTrip(): Promise<{ data: LeaderRow[]; error: { message?: string } | null }> {
  const client = supabase();

  const [{ data: pointsData, error: pointsError }, { data: rosterData, error: rosterError }] = await Promise.all([
    client
      .from('leaderboard_trip_points_v1')
      .select('inat_login, display_name, total_points, total_obs, unique_species, scored_on, bingo_points, manual_points, trophy_points'),
    client
      .from('public_leaderboard_masked_v1')
      .select('user_login, inat_login, display_name')
  ]);

  if (pointsError) {
    console.warn('leaderboard_trip_points_v1 error', pointsError);
  }

  if (rosterError) {
    console.warn('public_leaderboard_masked_v1 error', rosterError);
  }

  const byLogin = new Map<string, LeaderRow>();

  ((pointsData as LeaderboardTripRow[] | null) ?? []).forEach((row) => {
    const login = (row.inat_login ?? '').toLowerCase();
    if (!login || HIDDEN_LOGINS.has(login)) return;

    byLogin.set(login, {
      user_login: login,
      inat_login: row.inat_login ?? login,
      display_name: row.display_name ?? row.inat_login ?? login,
      total_points: Number(row.total_points ?? 0),
      total_obs: Number(row.total_obs ?? 0),
      obs_count: Number(row.total_obs ?? 0),
      unique_species: Number(row.unique_species ?? 0),
      distinct_taxa: Number(row.unique_species ?? 0),
      prev_rank: null,
      rank: null,
      bingo_points: Number(row.bingo_points ?? 0),
      manual_points: Number(row.manual_points ?? 0),
      trophy_points: Number(row.trophy_points ?? 0),
      score: Number(row.total_points ?? 0),
      total_score: Number(row.total_points ?? 0),
      score_total: Number(row.total_points ?? 0),
      scored_on: row.scored_on ?? null,
    });
  });

  ((rosterData as RosterRow[] | null) ?? []).forEach((row) => {
    const loginRaw = row.user_login || row.inat_login;
    const login = (loginRaw ?? '').toLowerCase();
    if (!login || HIDDEN_LOGINS.has(login) || byLogin.has(login)) return;

    byLogin.set(login, {
      user_login: login,
      inat_login: row.inat_login ?? login,
      display_name: row.display_name ?? row.inat_login ?? row.user_login ?? login,
      total_points: 0,
      total_obs: 0,
      obs_count: 0,
      unique_species: 0,
      distinct_taxa: 0,
      prev_rank: null,
      rank: null,
      bingo_points: 0,
      manual_points: 0,
      trophy_points: 0,
      score: 0,
      total_score: 0,
      score_total: 0,
      scored_on: null,
    });
  });

  const rows = Array.from(byLogin.values());

  rows.sort((a, b) => {
    const pointsDiff = (b.total_points ?? 0) - (a.total_points ?? 0);
    if (pointsDiff !== 0) return pointsDiff;

    const speciesDiff = (b.unique_species ?? 0) - (a.unique_species ?? 0);
    if (speciesDiff !== 0) return speciesDiff;

    const aLogin = (a.inat_login ?? a.user_login ?? '').toLowerCase();
    const bLogin = (b.inat_login ?? b.user_login ?? '').toLowerCase();
    return aLogin.localeCompare(bLogin);
  });

  rows.forEach((row, idx) => {
    row.rank = idx + 1;
  });

  return { data: rows, error: pointsError ?? rosterError ?? null };
}

export async function fetchDailyCountsCR({ dayOffset = 0 }: { dayOffset?: number } = {}) {
  const client = supabase();
  const { data, error } = await client
    .from('daily_counts_cr_v1')
    .select('*');

  if (error) {
    console.warn('daily_counts_cr_v1 error', error);
  }

  const rawRows = ((data as DailyCountsRow[] | null) ?? []).filter(row => {
    const login = row.user_login ?? '';
    if (!login) return false;
    return !HIDDEN_LOGINS.has(login.toLowerCase());
  });

  const targetDate = getCostaRicaDate(dayOffset);
  const dateField = ['cr_date', 'bucket_date', 'observed_on', 'observed_on_cr']
    .find(field => rawRows.some(row => typeof (row as any)[field] === 'string'));
  const offsetField = ['day_offset'].find(field => rawRows.some(row => typeof (row as any)[field] === 'number'));

  const filtered = rawRows.filter(row => {
    if (offsetField && typeof (row as any)[offsetField] === 'number') {
      return Number((row as any)[offsetField]) === dayOffset;
    }
    if (!dateField) {
      return dayOffset === 0;
    }
    const value = (row as any)[dateField];
    if (!value || typeof value !== 'string') return dayOffset === 0;
    return value.startsWith(targetDate);
  });

  const rows = filtered.map(row => ({
    user_login: (row.user_login ?? '').toLowerCase(),
    display_name: row.display_name ?? row.user_login ?? null,
    obs_count: Number(row.obs_count ?? 0),
    distinct_taxa: Number(row.distinct_taxa ?? 0),
  }));

  rows.sort((a, b) => {
    const obsDiff = (b.obs_count ?? 0) - (a.obs_count ?? 0);
    if (obsDiff !== 0) return obsDiff;
    const taxaDiff = (b.distinct_taxa ?? 0) - (a.distinct_taxa ?? 0);
    if (taxaDiff !== 0) return taxaDiff;
    return (a.display_name ?? a.user_login ?? '').localeCompare(b.display_name ?? b.user_login ?? '');
  });

  return { data: rows, error };
}

function getCostaRicaDate(dayOffset: number) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const now = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
  return formatter.format(now);
}

export async function fetchTripTrophiesToday() {
  const client = supabase();
  const [{ data: obsData, error: obsError }, { data: taxonData, error: taxonError }] = await Promise.all([
    client
      .from('trophies_daily_obs_leader_awards_v')
      .select('trophy_id, user_login, place, value, scope'),
    client
      .from('trophies_daily_taxon_multi_v1')
      .select('trophy_id, user_login, place, value, awarded_at, scope'),
  ]);

  if (obsError) {
    console.warn('trophies_daily_obs_leader_awards_v error', obsError);
  }
  if (taxonError) {
    console.warn('trophies_daily_taxon_multi_v1 error', taxonError);
  }

  const rows: DailyTrophyRow[] = [];
  ((obsData as DailyTrophyRow[] | null) ?? []).forEach(row => {
    if (!row?.trophy_id || row.scope && row.scope !== 'daily') return;
    if (!row.user_login) return;
    rows.push({
      trophy_id: row.trophy_id,
      user_login: row.user_login,
      place: typeof row.place === 'number' ? row.place : Number(row.place ?? 0) || null,
      value: row.value != null ? Number(row.value) : null,
      scope: 'daily',
    });
  });

  ((taxonData as DailyTrophyRow[] | null) ?? []).forEach(row => {
    if (!row?.trophy_id || !row.user_login) return;
    if (row.scope && row.scope !== 'today') return;
    rows.push({
      trophy_id: row.trophy_id,
      user_login: row.user_login,
      place: typeof row.place === 'number' ? row.place : Number(row.place ?? 0) || null,
      value: row.value != null ? Number(row.value) : null,
      scope: 'daily',
      awarded_at: row.awarded_at ?? null,
    });
  });

  return { data: rows, error: obsError ?? taxonError ?? null };
}

export type TrophyCabinetEntry = {
  trophy_id: string;
  title?: string;
  awarded_at?: string | null;
  value?: number | string | null;
};

export type TrophyCabinetUser = {
  user_login: string;
  display_name?: string | null;
  trophies: TrophyCabinetEntry[];
};

export async function fetchTrophyCabinet() {
  const client = supabase();
  const { data, error } = await client
    .from('trophies_trip_cabinet_v1')
    .select('user_login, display_name, trophies');

  if (error) {
    console.warn('trophies_trip_cabinet_v1 error', error);
  }

  const rows: TrophyCabinetUser[] = ((data as TrophyCabinetRow[] | null) ?? []).map(row => {
    const login = (row.user_login ?? '').toLowerCase();
    const trophiesRaw = Array.isArray(row.trophies) ? row.trophies : [];
    const trophies: TrophyCabinetEntry[] = trophiesRaw.map((item: any) => ({
      trophy_id: item?.trophy_id ?? item?.id ?? 'unknown',
      title: item?.title ?? item?.trophy_title ?? undefined,
      awarded_at: item?.awarded_at ?? item?.awarded_on ?? null,
      value: item?.value ?? null,
    }));
    return {
      user_login: login,
      display_name: row.display_name ?? row.user_login ?? null,
      trophies,
    };
  }).filter(row => row.user_login && !HIDDEN_LOGINS.has(row.user_login));

  rows.sort((a, b) => (a.display_name ?? a.user_login).localeCompare(b.display_name ?? b.user_login));

  return { data: rows, error };
}

export async function fetchTripMapPoints() {
  const client = supabase();
  const { data, error } = await client
    .from('v_trip_roster_obs_bbox')
    .select('inat_obs_id, user_login, lat, lon, latitude, longitude, taxon_name, observed_at_utc, photo_url');

  if (error) {
    console.warn('v_trip_roster_obs_bbox error', error);
  }

  const points = ((data as TripMapPointRow[] | null) ?? []).filter(row => {
    const lat = row.latitude ?? row.lat;
    const lon = row.longitude ?? row.lon;
    return lat != null && lon != null;
  }).map(row => ({
    inat_obs_id: Number(row.inat_obs_id ?? 0),
    user_login: row.user_login ?? '',
    latitude: Number(row.latitude ?? row.lat ?? 0),
    longitude: Number(row.longitude ?? row.lon ?? 0),
    taxon_name: row.taxon_name ?? null,
    observed_at_utc: row.observed_at_utc ?? null,
    photo_url: row.photo_url ?? null,
  }));

  return { data: points, error };
}

export async function pingBronze() {
  const r = await supabase().rpc('ping_bronze_v1', {});
  return r;
}

export async function fetchBingo(userLogin: string) {
  const { data, error } = await supabase().rpc('get_bingo_for_user', { p_user_login: userLogin });
  if (error) { console.error('bingo rpc', error); return []; }
  return data ?? [];
}

export async function fetchMembers() {
  const { data, error } = await supabase()
    .from('public_leaderboard_masked_v1')
    .select('user_login')
    .order('user_login');
  if (error) {
    console.error('fetchMembers error', error);
    return [];
  }
  return (data ?? []).map((m: any) => m.user_login).filter((login: string | null | undefined) => {
    if (!login) return false;
    return !HIDDEN_LOGINS.has(login.toLowerCase());
  });
}

export async function fetchUserLogins() {
  // Legacy wrapper - use fetchMembers() instead
  return fetchMembers();
}

export async function adminAward({ token, user_login, points, reason, by }: {
  token: string; user_login: string; points: number; reason?: string; by?: string;
}) {
  return supabase().rpc('admin_award_manual_points', {
    p_token: token, p_user_login: user_login, p_points: points, p_reason: reason ?? 'manual', p_awarded_by: by ?? 'admin'
  });
}

export async function adminList(token: string) {
  return supabase().rpc('admin_list_manual_points', { p_token: token });
}

export async function adminDelete(token: string, id: number) {
  return supabase().rpc('admin_delete_manual_point', { p_token: token, p_id: id });
}

export async function fieldAward({ token, user_login, points, reason, by }: {
  token: string; user_login: string; points: number; reason?: string; by?: string;
}) {
  return supabase().rpc('field_award_manual_points', {
    p_token: token, p_user_login: user_login, p_points: points, 
    p_reason: reason ?? 'field-award', p_awarded_by: by ?? 'guide'
  });
}

export async function adminSetSpeeds({ token, primary_ms, announce_ms }: {
  token: string; primary_ms: number; announce_ms: number;
}) {
  return supabase().rpc('admin_set_ticker_speeds', { 
    p_admin_token: token, p_primary_ms: primary_ms, p_announce_ms: announce_ms 
  });
}

export async function adminSetAnnouncement({ token, text }: { token: string; text: string; }) {
  return supabase().rpc('admin_set_announcement', { p_admin_token: token, p_text: text });
}

export async function listRecentAwards() {
  return supabase().from('manual_points_recent_v1').select('*');
}

export async function listWeeklyAwards() {
  return supabase().from('manual_points_weekly_v1').select('*');
}

export async function fetchDisplayFlags() {
  const { data } = await supabase().rpc('get_display_flags_v1', {});
  return data?.[0] ?? { trophies_include_adults: true, score_blackout_until: null };
}

export async function adminSetTrophiesIncludeAdults(token: boolean | string, include: boolean) {
  return supabase().rpc('admin_set_trophies_include_adults', { 
    p_admin_token: String(token), 
    p_include: include 
  });
}

export async function adminSetStudentLogins(token: string, arr: string[] | null) {
  return supabase().rpc('admin_set_student_logins', { 
    p_admin_token: token, 
    p_logins: arr 
  });
}

export async function adminSetBlackoutUntil(token: string, until: string | null) {
  return supabase().rpc('admin_set_blackout_until', { 
    p_admin_token: token, 
    p_until: until 
  });
}

export async function adminSetTrophyPointsEnabled(token: string, enabled: boolean) {
  return supabase().rpc('admin_set_flag', {
    p_admin_token: token,
    p_flag_name: 'trophies_points_v1',
    p_flag_value: enabled
  });
}

export async function fetchTrophyPoints() {
  const { data } = await supabase()
    .from('score_entries_trophies_latest_v1')
    .select('user_login, points');
  return data ?? [];
}
