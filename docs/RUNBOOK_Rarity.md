# Rarity Runbook

## Verification Checks

### Buckets Non-Empty

Verify that rarity buckets contain observations:

```sql
select rarity_bucket, count(*) from public.rarity_signal_latest_v1 group by 1 order by 2 desc;
```

Expected result: Rows showing distribution across rarity buckets

### Flag Gates Scoring (Default OFF)

Verify the rarity feature flag status:

```sql
select coalesce((flags->>'rarity_v2'),'off') as rarity_v2 from public.config_filters limit 1;
```

Expected result: `off` (default) or `on` if enabled

## Common Failures

- **Empty buckets**: Rarity calculation not triggered or failed
- **Flag misconfiguration**: Flag not set correctly in config_filters
- **Missing local data**: Rarity scoring requires local observation baseline

## Toggling Rarity V2

### Turn ON:
```sql
update public.config_filters 
set flags = jsonb_set(coalesce(flags, '{}'::jsonb), '{rarity_v2}', '"on"');
```

### Turn OFF:
```sql
update public.config_filters 
set flags = jsonb_set(coalesce(flags, '{}'::jsonb), '{rarity_v2}', '"off"');
```
