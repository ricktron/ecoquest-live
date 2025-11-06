# Runbook - Sanity Checks

Quick health checks for EcoQuest Live production system.

## Pre-Trip Checklist

### 1. Configuration Verification
```sql
-- Check active trip dates
SELECT * FROM config_filters LIMIT 1;

-- Verify scoring parameters
SELECT * FROM config_scoring;

-- Expected: window_start and window_end match trip dates
-- Expected: repeat_decay = 0.70, repeat_max_rank = 8
```

### 2. Database Health
```sql
-- Check latest score run
SELECT id, started_at, completed_at, window_start, window_end, status
FROM score_runs 
ORDER BY started_at DESC 
LIMIT 1;

-- Expected: status = 'completed', window_end covers today
```

### 3. Data Ingestion
```sql
-- Count recent observations
SELECT COUNT(*) as total_obs,
       COUNT(DISTINCT user_login) as unique_users,
       MIN(observed_at) as earliest,
       MAX(observed_at) as latest
FROM observations
WHERE observed_at >= (SELECT window_start FROM score_runs ORDER BY started_at DESC LIMIT 1);

-- Expected: obs count increasing daily, 10-30 unique users (trip dependent)
```

## Live Trip Checks

### 4. Leaderboard Status
```sql
-- Top 10 current standings
SELECT rank, user_login, points, obs_count, species_count
FROM leaderboard_overall_mv
ORDER BY rank ASC
LIMIT 10;

-- Spot check: points should align with (obs_count + variety bonuses - repeats decay)
```

### 5. Scoring Integrity
```sql
-- Sample score entries for top user
SELECT user_login, COUNT(*) as scored_obs, SUM(points) as total_points
FROM score_entries_obs
WHERE run_id = (SELECT id FROM score_runs ORDER BY started_at DESC LIMIT 1)
GROUP BY user_login
ORDER BY total_points DESC
LIMIT 5;

-- Cross-check totals match leaderboard_overall_mv
```

### 6. Daily Trophies
```sql
-- Today's trophy winners
SELECT * FROM daily_trophies_for(CURRENT_DATE);

-- Expected: variety_winner, rare_winner, etc. populated if data exists
-- Check: winners should be in leaderboard_overall_mv
```

### 7. Trophy Validation
```sql
-- Verify trophy views have data
SELECT day, COUNT(*) as candidates 
FROM daily_variety_candidates_v 
GROUP BY day 
ORDER BY day DESC 
LIMIT 7;

-- Expected: 1+ candidates per day during active trip

-- Check early bird window
SELECT day, user_login, early_count
FROM daily_early_bird_candidates_v
WHERE day = CURRENT_DATE;

-- Expected: rows if anyone observed between 04:00-06:59 local
```

## Post-Trip Validation

### 8. Final Scores
```sql
-- Overall champion
SELECT user_login, points, obs_count, species_count
FROM leaderboard_overall_mv
ORDER BY rank ASC
LIMIT 1;

-- Total observations processed
SELECT COUNT(*) as total_obs, 
       COUNT(DISTINCT taxon_id) as unique_taxa
FROM observations
WHERE observed_at BETWEEN 
  (SELECT window_start FROM score_runs ORDER BY started_at DESC LIMIT 1)
  AND
  (SELECT window_end FROM score_runs ORDER BY started_at DESC LIMIT 1);
```

### 9. Trophy Summary
```sql
-- Trophy distribution across all days
SELECT day, variety_winner, rare_winner, early_bird_winner
FROM (
  SELECT generate_series(
    (SELECT window_start::date FROM score_runs ORDER BY started_at DESC LIMIT 1),
    (SELECT window_end::date FROM score_runs ORDER BY started_at DESC LIMIT 1),
    '1 day'::interval
  )::date AS day
) days
CROSS JOIN LATERAL daily_trophies_for(days.day) t;

-- Spot check: no nulls for active days, variety_score > 0
```

## Troubleshooting

### Issue: Leaderboard Not Updating
```sql
-- Check last score run status
SELECT * FROM score_runs ORDER BY started_at DESC LIMIT 1;

-- If status != 'completed', check logs or re-run:
-- SELECT compute_scores_mvp(); (admin only)
```

### Issue: Trophy Winners Missing
```sql
-- Verify observations exist for that day
SELECT COUNT(*) as obs_count
FROM observations
WHERE DATE((observed_at AT TIME ZONE 'America/Costa_Rica')) = CURRENT_DATE;

-- If obs_count = 0, data hasn't synced yet
-- If obs_count > 0 but no winner, check view filters
```

### Issue: Scores Don't Match Expected
```sql
-- Inspect a specific user's scores
SELECT inat_obs_id, taxon_id, points, reason
FROM score_entries_obs
WHERE user_login = 'target_user' 
  AND run_id = (SELECT id FROM score_runs ORDER BY started_at DESC LIMIT 1)
ORDER BY points DESC;

-- Check for repeat decay pattern: 2.0, 0.7, 0.49, etc.
```

## Alerts to Watch

- ⚠️ **No observations in 6+ hours**: Check iNat API sync
- 🔴 **Score run failed**: RPC error, investigate logs
- 🟡 **Trophy view empty**: Timezone mismatch or no data in window
- 🔴 **Leaderboard rank gaps**: Data integrity issue, recompute scores

## Contact
For critical issues during live trip, escalate to: [admin email]
