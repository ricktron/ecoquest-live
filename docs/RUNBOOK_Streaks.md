# Streaks Runbook

## Verification Checks

### Streaks by Date

Verify that streaks are calculated correctly by date (observed_at), with fallback timestamps excluded:

```sql
select user_login, max(streak_len) as max_streak
from public.streaks_latest_v1 group by 1 order by max_streak desc limit 10;
```

Expected result: Rows showing users with their maximum streak lengths

## Common Failures

- **Fallback timestamps included**: Streaks incorrectly include observations with fallback/system timestamps
- **Date boundary issues**: Streaks calculated incorrectly across date boundaries
- **No data**: No streaks calculated yet
