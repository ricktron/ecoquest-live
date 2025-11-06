-- Singleton config for active window + timezone
create table if not exists public.config_filters (
  id boolean primary key default true,
  window_start timestamptz not null,
  window_end   timestamptz not null,
  timezone_str text not null default 'America/Chicago',
  night_owl_start_local time not null default '18:00',
  constraint only_one_config check (id = true),
  constraint window_ok check (window_end > window_start)
);

-- Seed if empty (adjust the dates as needed)
insert into public.config_filters (id, window_start, window_end)
values (true, now() - interval '30 days', now())
on conflict (id) do nothing;

-- RLS posture: public read; writes via service role only
alter table public.config_filters enable row level security;

create policy "config_filters_read_public"
on public.config_filters for select
using (true);