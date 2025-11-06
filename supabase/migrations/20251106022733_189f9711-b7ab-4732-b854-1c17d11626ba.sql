-- Config table for scoring parameters with diminishing returns
create table if not exists public.config_scoring (
  id boolean primary key default true,
  repeat_decay numeric not null default 0.70,
  repeat_max_rank int not null default 8,
  constraint only_one_config check (id = true)
);

insert into public.config_scoring(id, repeat_decay, repeat_max_rank)
values(true, 0.70, 8)
on conflict (id) do nothing;

comment on table public.config_scoring is 'Configuration for scoring algorithm with diminishing returns';
comment on column public.config_scoring.repeat_decay is 'Multiplier for 2nd+ observations of same taxon by same user (e.g., 0.7 = 70%)';
comment on column public.config_scoring.repeat_max_rank is 'Cap on how far decay applies (e.g., 8th+ obs all get same decay factor)';