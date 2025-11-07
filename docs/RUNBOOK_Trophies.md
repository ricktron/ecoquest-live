# Trophies Runbook

## Verification Checks

### Trophy Keys Present

Verify that expected trophy keys appear in the system:

Expected keys:
- `participation_10`: 10+ observations
- `taxa_5_plus`: 5+ unique taxa
- `first_of_taxon`: First to observe a taxon
- `early_bird`: Early morning observations
- `night_owl`: Late night observations
- `steady_eddie`: Consistent daily observations

```sql
select user_login, trophy_key, count(*) as n
from public.trophies_latest_v1 group by 1,2 order by n desc limit 10;
```

Expected result: Rows showing users with various trophy keys

## Common Failures

- **Missing trophy types**: Trophy calculation logic not triggered or failed
- **Incorrect criteria**: Trophies awarded incorrectly due to scoring bugs
- **RLS issues**: Users cannot see their trophies
