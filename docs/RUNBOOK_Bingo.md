# Bingo Runbook

## Verification Checks

### Board has 25 cells

Verify that the bingo board contains exactly 25 cells:

```sql
select count(*) = 25 as is_25 from public.bingo_board_latest_v1;
```

Expected result: `t` (true)

### Progress shows hits

Verify that there are hit cells in the bingo progress:

```sql
select exists (select 1 from public.bingo_progress_latest_v1 where hit) as has_any_hits;
```

Expected result: `t` (true) if any users have made progress

## Common Failures

- **Empty board**: Bingo board generation failed or not triggered
- **No hits**: No observations match bingo criteria yet
- **RLS issues**: Users cannot see their progress due to policy errors
