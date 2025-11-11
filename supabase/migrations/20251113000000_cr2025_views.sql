-- CR2025 safety views for roster and silver scoring

-- === ROSTER (per-trip shim with is_adult) ===
create or replace view public.trip_members_roster_cr2025_v1 as
select
  r.user_login::text,
  coalesce(r.display_name, r.user_login)::text as display_name,
  coalesce(r.is_adult, false)::boolean        as is_adult
from public.trip_members_roster_v1 r;

comment on view public.trip_members_roster_cr2025_v1 is
'Per-trip roster shim for CR2025. Guarantees (user_login, display_name, is_adult).';

-- === SILVER: per-observation scoring (minimal, safe baseline) ===
-- If you already have a richer trip_points_obs_silver_cr2025_v1, keep it.
-- This version derives from the base/enriched views and exposes the columns the UI expects.

create or replace view public.trip_points_obs_silver_cr2025_v1 as
with obs as (
  select
    o.user_login,
    o.inat_obs_id,
    -- Baseline components; adjust as your enriched view allows
    1.0::numeric as base_points,
    0.0::numeric as novelty_trip_points,
    0.0::numeric as novelty_day_points,
    0.0::numeric as rarity_points,
    case p.quality_grade
      when 'research' then 1.0
      when 'needs_id' then 0.5
      else 0.0
    end::numeric as research_points,
    1.0::numeric as firstn_factor,
    1.0::numeric as fatigue_factor,
    1.0::numeric as rubber_band_factor
  from public.trip_obs_base_cr2025_v1 o
  join public.observations_public_v1 p using (inat_obs_id)
)
select
  user_login,
  inat_obs_id,
  base_points,
  novelty_trip_points,
  novelty_day_points,
  rarity_points,
  research_points,
  firstn_factor,
  fatigue_factor,
  rubber_band_factor,
  -- total points (simple baseline; your richer silver math can replace this)
  round(
    (base_points + novelty_trip_points + novelty_day_points + rarity_points + research_points)
    * firstn_factor * fatigue_factor * rubber_band_factor
  , 2) as total_points
from obs;

comment on view public.trip_points_obs_silver_cr2025_v1 is
'CR2025 per-observation Silver scaffolding. Exposes columns the UI reads.';

-- === SILVER: per-user rollup with the fields the UI reads ===
create or replace view public.trip_points_user_silver_cr2025_v1 as
select
  user_login,
  round(sum(base_points), 2)                 as base_obs,
  round(sum(research_points), 2)             as research,
  round(sum(novelty_trip_points), 2)         as novelty_trip,
  round(sum(novelty_day_points), 2)          as novelty_day,
  round(sum(rarity_points), 2)               as rarity,
  -- multipliers_delta = (total - (base+research+novelties+rarity))
  round(sum(total_points) - sum(base_points + research_points + novelty_trip_points + novelty_day_points + rarity_points), 2)
                                              as multipliers_delta,
  round(sum(total_points), 2)                as total_points
from public.trip_points_obs_silver_cr2025_v1
group by user_login;

comment on view public.trip_points_user_silver_cr2025_v1 is
'CR2025 user-level Silver rollup. Guarantees base_obs and other breakdown fields.';
