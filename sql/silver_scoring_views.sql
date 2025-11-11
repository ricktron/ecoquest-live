-- Silver scoring feature extraction and aggregation views

-- A. Feature extraction per observation
create or replace view public.trip_obs_features_cr2025_v1 as
with b as (
  select * from public.trip_obs_enriched_cr2025_v1
),
-- order per species trip-wide and per day for novelty/firstN
ranks as (
  select
    b.*,
    row_number() over (partition by taxon_id order by observed_at_utc)             as rn_taxon_trip,
    row_number() over (partition by taxon_id, day_local order by observed_at_utc)  as rn_taxon_day,
    count(*)     over (partition by taxon_id)                                      as n_taxon_trip,
    count(*)     over (partition by taxon_id, day_local)                           as n_taxon_day,
    count(*)     over (partition by user_login, day_local)                         as n_user_day
  from b
),
-- rarity: inverse frequency within trip, scaled 0..3
rar as (
  select
    r.*,
    case
      when n_taxon_trip = 1 then 3.0
      when n_taxon_trip <= 3 then 2.0
      when n_taxon_trip <= 5 then 1.0
      when n_taxon_trip <= 10 then 0.5
      else 0.0
    end as rarity_bonus
  from ranks r
),
-- research/needsID bonus
qual as (
  select
    *,
    case quality_grade
      when 'research' then 1.0
      when 'needs_id' then 0.5
      else 0.0
    end as research_bonus
  from rar
),
-- novelty & diminishing returns
nov as (
  select
    *,
    case when rn_taxon_trip = 1 then 3.0 when rn_taxon_trip <= 3 then 2.0 else 0.0 end as novelty_trip,
    case when rn_taxon_day  = 1 then 1.5 when rn_taxon_day  <= 3 then 0.75 else 0.3 end as novelty_day,
    case rn_taxon_day
      when 1 then 1.00
      when 2 then 0.75
      when 3 then 0.55
      when 4 then 0.40
      when 5 then 0.30
      when 6 then 0.20
      else 0.15
    end as firstN_factor
  from qual
),
-- fatigue per user-day
fat as (
  select
    *,
    case
      when n_user_day <= 20 then 1.0
      when n_user_day <= 50 then 0.6
      else 0.3
    end as fatigue_factor
  from nov
),
-- rubber band by current totals-to-date (simple percentile snapshot)
totals as (
  select user_login, sum(1.0) as base_obs
  from fat group by 1
),
perc as (
  select
    t.user_login,
    percent_rank() over (order by t.base_obs) as p
  from totals t
)
select
  f.*,
  case
    when coalesce(p.p,0) < 0.30 then 1.20
    when coalesce(p.p,0) < 0.60 then 1.10
    else 1.00
  end as rubber_band
from fat f
left join perc p on p.user_login = f.user_login;

-- B. Observation points and per-user aggregation
create or replace view public.trip_points_obs_silver_cr2025_v1 as
select
  user_login,
  inat_obs_id,
  round(
    (
      1.0
      + novelty_trip
      + novelty_day
      + rarity_bonus
      + research_bonus
    ) * firstN_factor
      * fatigue_factor
      * rubber_band
  , 2) as points
from public.trip_obs_features_cr2025_v1;

create or replace view public.trip_points_user_silver_cr2025_v1 as
with comp as (
  select
    f.user_login,
    count(*)::int as obs,
    sum(case when quality_grade='research' then 1 else 0 end)::int as rg,
    sum(1.0)                                        as base_obs_pts,
    sum(novelty_trip)                                as novelty_trip_pts,
    sum(novelty_day)                                 as novelty_day_pts,
    sum(rarity_bonus)                                as rarity_pts,
    sum(research_bonus)                              as research_pts,
    sum((1.0+novelty_trip+novelty_day+rarity_bonus+research_bonus)
        * firstN_factor * fatigue_factor * rubber_band) as model_total
  from public.trip_obs_features_cr2025_v1 f
  group by 1
),
bonus as (
  select user_login, coalesce(sum(bonus_points),0)::int as bonus_points
  from public.trip_awards_agg_cr2025_v1
  group by 1
)
select
  c.user_login,
  c.obs,
  c.rg,
  round(c.model_total,2)          as model_points,
  b.bonus_points,
  round(c.model_total + b.bonus_points,2) as total_points
from comp c
left join bonus b using (user_login);

-- C. Simple breakdown view for the popover
create or replace view public.trip_points_breakdown_silver_cr2025_v1 as
select
  user_login,
  round(sum(1.0),2)                                       as base_obs,
  round(sum(novelty_trip),2)                              as novelty_trip,
  round(sum(novelty_day),2)                               as novelty_day,
  round(sum(rarity_bonus),2)                              as rarity,
  round(sum(research_bonus),2)                            as research,
  round(sum((1.0+novelty_trip+novelty_day+rarity_bonus+research_bonus)
            * (firstN_factor * fatigue_factor * rubber_band)) 
       - (sum(1.0+novelty_trip+novelty_day+rarity_bonus+research_bonus)), 2) as multipliers_delta,
  0::numeric as bonus_placeholder
from public.trip_obs_features_cr2025_v1
group by 1;
