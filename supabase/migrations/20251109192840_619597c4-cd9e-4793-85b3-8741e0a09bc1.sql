-- Bingo claims table for per-student tracking
create table if not exists public.bingo_claims(
  user_id uuid not null,
  week_id text not null,
  tile_slug text not null,
  observation_id uuid null,
  created_at timestamptz default now(),
  primary key (user_id, week_id, tile_slug)
);

-- Enable RLS
alter table public.bingo_claims enable row level security;

-- Policy: users can manage their own claims
do $$ 
begin
  if not exists (
    select 1 from pg_policies 
    where tablename='bingo_claims' and policyname='own_rows_rw'
  ) then
    create policy "own_rows_rw" on public.bingo_claims
      for all 
      using (auth.uid() = user_id) 
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Policy: service role can read all
do $$ 
begin
  if not exists (
    select 1 from pg_policies 
    where tablename='bingo_claims' and policyname='service_read_all'
  ) then
    create policy "service_read_all" on public.bingo_claims
      for select 
      using (current_setting('request.jwt.claim.role', true) = 'service_role');
  end if;
end $$;

-- Index for efficient queries by week and tile
create index if not exists bingo_claims_week_tile_idx 
  on public.bingo_claims (week_id, tile_slug);