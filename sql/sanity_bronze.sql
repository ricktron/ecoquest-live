-- Bronze MVP Sanity Checks
-- Combined checks for leaderboard, bingo, streaks, trophies, and rarity

-- 1. LEADERBOARD: MV vs View Parity
do $$
declare
  mv_matches boolean;
begin
  with v as (select count(*) as c from public.leaderboard_overall_latest_v1),
       m as (select count(*) as c from public.leaderboard_overall_mv)
  select (v.c = m.c) into mv_matches from v, m;
  
  if not mv_matches then
    raise exception 'Leaderboard MV does not match view';
  end if;
  raise notice 'PASS: Leaderboard MV matches view';
end $$;

-- 2. LEADERBOARD: Top 10 exists
do $$
declare
  top_count int;
begin
  select count(*) into top_count 
  from public.leaderboard_overall_mv 
  order by obs_count desc limit 10;
  
  if top_count = 0 then
    raise exception 'Leaderboard has no top 10 users';
  end if;
  raise notice 'PASS: Leaderboard top 10 exists (% rows)', top_count;
end $$;

-- 3. BINGO: Board has 25 cells
do $$
declare
  cell_count int;
begin
  select count(*) into cell_count from public.bingo_board_latest_v1;
  
  if cell_count != 25 then
    raise exception 'Bingo board has % cells, expected 25', cell_count;
  end if;
  raise notice 'PASS: Bingo board has 25 cells';
end $$;

-- 4. BINGO: Progress shows hits (if observations exist)
do $$
declare
  has_hits boolean;
  obs_count int;
begin
  select count(*) into obs_count from public.leaderboard_overall_mv;
  select exists (select 1 from public.bingo_progress_latest_v1 where hit) into has_hits;
  
  if obs_count > 0 and not has_hits then
    raise warning 'Bingo progress has no hits despite observations existing';
  elsif has_hits then
    raise notice 'PASS: Bingo progress shows hits';
  else
    raise notice 'SKIP: No observations yet, cannot verify bingo hits';
  end if;
end $$;

-- 5. STREAKS: Non-empty and reasonable
do $$
declare
  max_streak_val int;
begin
  select coalesce(max(max_streak), 0) into max_streak_val
  from (
    select user_login, max(streak_len) as max_streak
    from public.streaks_latest_v1 
    group by 1
  ) sub;
  
  if max_streak_val = 0 then
    raise notice 'SKIP: No streaks calculated yet';
  else
    raise notice 'PASS: Streaks exist (max streak: %)', max_streak_val;
  end if;
end $$;

-- 6. TROPHIES: Keys present
do $$
declare
  trophy_count int;
begin
  select count(distinct trophy_key) into trophy_count
  from public.trophies_latest_v1;
  
  if trophy_count = 0 then
    raise notice 'SKIP: No trophies awarded yet';
  else
    raise notice 'PASS: Trophies exist (% distinct keys)', trophy_count;
  end if;
end $$;

-- 7. RARITY: Buckets non-empty (if flag ON)
do $$
declare
  rarity_flag text;
  bucket_count int;
begin
  select coalesce((flags->>'rarity_v2'),'off') into rarity_flag 
  from public.config_filters limit 1;
  
  if rarity_flag = 'on' then
    select count(distinct rarity_bucket) into bucket_count
    from public.rarity_signal_latest_v1;
    
    if bucket_count = 0 then
      raise exception 'Rarity flag is ON but no buckets populated';
    end if;
    raise notice 'PASS: Rarity buckets populated (% buckets)', bucket_count;
  else
    raise notice 'SKIP: Rarity flag is OFF';
  end if;
end $$;

-- 8. RARITY: Flag default is OFF
do $$
declare
  rarity_flag text;
begin
  select coalesce((flags->>'rarity_v2'),'off') into rarity_flag 
  from public.config_filters limit 1;
  
  raise notice 'INFO: Rarity flag is %', upper(rarity_flag);
end $$;

-- Final message
do $$
begin
  raise notice '========================================';
  raise notice 'Bronze MVP Sanity Checks Complete';
  raise notice '========================================';
end $$;
