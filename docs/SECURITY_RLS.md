# Security - Row Level Security (RLS)

## Overview
EcoQuest Live uses Supabase Row-Level Security (RLS) to control data access. Most data is publicly readable during active trips, with admin-only write access.

## RLS Policies

### Public Tables

#### `observations`
**Read**: Public (anyone can view observations within active trip window)
```sql
CREATE POLICY "observations_read_public" ON observations
  FOR SELECT USING (
    observed_at BETWEEN 
      (SELECT window_start FROM config_filters LIMIT 1) 
      AND 
      (SELECT window_end FROM config_filters LIMIT 1)
  );
```

**Write**: Admin-only (via service role)
```sql
-- No public insert/update policy
-- Observations synced by scheduled job with service role key
```

#### `score_entries_obs`
**Read**: Public (leaderboard display)
```sql
CREATE POLICY "scores_read_public" ON score_entries_obs
  FOR SELECT USING (
    run_id = (SELECT id FROM score_runs ORDER BY started_at DESC LIMIT 1)
  );
```

**Write**: Admin-only
```sql
-- Scores written by compute_scores_mvp() RPC (security definer)
```

### Admin Tables

#### `config_filters`
**Read**: Public (needed for timezone, window checks)
```sql
CREATE POLICY "config_read_public" ON config_filters
  FOR SELECT USING (true);
```

**Write**: Admin-only
```sql
-- No public policy; service role only
```

#### `config_scoring`
**Read**: Public (needed for UI display of rules)
```sql
CREATE POLICY "config_scoring_read_public" ON config_scoring
  FOR SELECT USING (true);
```

**Write**: Admin-only
```sql
-- No public policy; service role only
```

### Materialized Views

#### `leaderboard_overall_mv`
**Read**: Public (core feature)
```sql
-- Materialized views don't have RLS; table is publicly readable
-- Refreshed by admin-triggered RPC
```

### Trophy Views (New v0.3)
All trophy views are regular views, not tables, so no RLS applies:
- `daily_variety_candidates_v`
- `daily_early_bird_candidates_v`
- `daily_night_owl_candidates_v`
- `daily_steady_eddie_candidates_v`
- `daily_first_finder_candidates_v`
- `daily_rare_find_candidates_v`

These views read from `observations` table, inheriting its RLS policies.

## RPC Function Security

### `compute_scores_mvp()`
```sql
CREATE OR REPLACE FUNCTION compute_scores_mvp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with creator's permissions (admin)
AS $$...$$;

-- Invocation permissions
REVOKE EXECUTE ON FUNCTION compute_scores_mvp() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION compute_scores_mvp() TO authenticated;
```

**Access**: Authenticated admin users only (via scheduled job or manual trigger)

### `daily_trophies_for(date)`
```sql
CREATE OR REPLACE FUNCTION daily_trophies_for(d date)
RETURNS TABLE(...)
LANGUAGE sql
SECURITY DEFINER  -- Ensures consistent read access
STABLE            -- Result doesn't change within transaction
AS $$...$$;

GRANT EXECUTE ON FUNCTION daily_trophies_for(date) TO PUBLIC;
```

**Access**: Public read (anyone can query trophy winners)

## Service Role vs Anon Key

### Anon Key (Public Client)
Used by frontend React app:
- ✅ Read observations (within trip window)
- ✅ Read leaderboard
- ✅ Read trophy views
- ✅ Call `daily_trophies_for(date)` RPC
- ❌ Write to any table
- ❌ Call `compute_scores_mvp()`

### Service Role Key
Used by backend jobs:
- ✅ Insert/update observations (from iNat sync)
- ✅ Trigger `compute_scores_mvp()` scoring
- ✅ Update config tables
- ✅ Refresh materialized views
- ⚠️ Bypasses all RLS policies

## Data Exposure Risk Assessment

### Low Risk
- **Observations**: Already public on iNaturalist
- **Leaderboard**: Expected to be public during trip
- **Trophy winners**: Public recognition is core feature

### Medium Risk
- **Config values**: Revealing scoring parameters could enable gaming
  - Mitigation: Read-only public access, write requires service role

### High Risk
- **Service role key**: Full database access if exposed
  - Mitigation: Store in secure environment variables, never in frontend code

## Audit Log
Currently no audit logging implemented. Consider adding for v1.0:
- Track config changes (who/when)
- Log score recomputation triggers
- Monitor unusual query patterns

## Security Checklist

Before production deployment:
- [ ] Verify RLS enabled on all user-facing tables
- [ ] Test anon key can't write to observations/scores
- [ ] Confirm service role key stored in secure secrets (not git)
- [ ] Validate `daily_trophies_for()` only reads (no data leaks)
- [ ] Check no PII (emails, IP addresses) in public observations table
- [ ] Enable Supabase rate limiting on public API endpoints
- [ ] Review Supabase logs for unauthorized access attempts

## Incident Response
If service role key is compromised:
1. Rotate key immediately in Supabase dashboard
2. Update all backend job configurations
3. Audit database for unauthorized changes (use `pg_stat_activity`)
4. Force refresh of all materialized views
5. Notify participants if data integrity affected

## References
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
