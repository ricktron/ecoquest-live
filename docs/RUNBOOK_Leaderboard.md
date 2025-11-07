# Leaderboard Runbook

## RPC: `refresh_leaderboard_overall_mv`

Refreshes the materialized view for the overall leaderboard.

## Verification Checks

### MV vs View Parity

This query verifies that the materialized view matches the underlying view:

```sql
with v as (select count(*) as c from public.leaderboard_overall_latest_v1),
     m as (select count(*) as c from public.leaderboard_overall_mv)
select (v.c = m.c) as mv_matches_view from v, m;
```

Expected result: `t` (true)

### Top 10 Query

Verify that the top 10 users are returned:

```sql
select user_login, obs_count
from public.leaderboard_overall_mv
order by obs_count desc limit 10;
```

Expected result: Rows returned with user logins and observation counts

## Common Failures

- **Stale MV**: Materialized view not refreshed after data changes
- **Blocked RLS**: Row-level security policies preventing access
- **Missing data**: No observations ingested yet
