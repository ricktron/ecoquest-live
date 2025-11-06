-- Patch scoring to apply diminishing returns via config_scoring
create or replace function public.compute_scores_mvp()
returns void
language plpgsql
security definer
as $$
begin
  with cfg as (
    select repeat_decay, repeat_max_rank from public.config_scoring limit 1
  ),
  ranked as (
    select
      o.id as inat_obs_id,
      o.user_login,
      o.taxon_id,
      o.observed_at,
      row_number() over (
        partition by o.user_login, o.taxon_id
        order by o.observed_at
      ) as repeat_rank
    from public.observations o
    join public.app_window_v w on o.observed_at between w.window_start and w.window_end
  ),
  weighted as (
    select
      r.inat_obs_id, r.user_login, r.taxon_id, r.observed_at, r.repeat_rank,
      pow(cfg.repeat_decay, greatest(least(r.repeat_rank, cfg.repeat_max_rank)-1, 0)) as mult
    from ranked r cross join cfg
  )
  insert into public.score_entries_obs (run_id, inat_obs_id, user_login, taxon_id, points, reason)
  select
    (select id from public.score_runs order by started_at desc nulls last, id desc limit 1) as run_id,
    w.inat_obs_id, w.user_login, w.taxon_id,
    (1 * w.mult) + case when w.repeat_rank = 1 then 1 else 0 end as points,
    case when w.repeat_rank = 1 then 'base+first-of-taxon' else 'base*decay' end as reason
  from weighted w
  on conflict (run_id, inat_obs_id) do update
  set points = excluded.points, reason = excluded.reason;
end;
$$;