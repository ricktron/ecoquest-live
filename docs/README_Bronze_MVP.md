# EcoQuest Live - Bronze MVP

## Scope

The Bronze MVP delivers core field observation scoring and leaderboard functionality for EcoQuest Live, enabling real-time competition tracking across multiple dimensions.

### In Scope
- **Leaderboard**: Overall rankings with observation counts and points
- **Bingo**: 25-cell challenge grid with progress tracking
- **Streaks**: Daily observation streak calculations
- **Trophies**: Achievement system (participation, diversity, timing, first finder)
- **Rarity**: Optional rarity scoring system (feature-flagged, default OFF)

### Out of Scope (Shelved)
- Zone-specific scoring
- Advanced analytics
- Historical comparisons beyond simple deltas
- Real-time push notifications

## Guardrails

### Data Quality
- RLS policies enforce user-specific data access
- Fallback timestamps excluded from streak calculations
- Materialized views ensure consistent performance

### Feature Flags
- `rarity_v2`: Gates rarity scoring (default: OFF)
- Flags stored in `config_filters.flags` JSONB column

### Performance
- Leaderboard uses materialized view (`leaderboard_overall_mv`)
- Refresh triggered via `refresh_leaderboard_overall_mv` RPC
- Sanity checks validate data integrity

## Pipeline

### Data Flow
1. **Ingest**: `ingest_active_run()` fetches observations from iNaturalist API
2. **Compute**: `compute_scores_mvp()` calculates points, trophies, streaks
3. **Refresh**: `refresh_leaderboard_overall_mv` updates materialized view
4. **Audit**: `assert_security_and_perf_ok()` validates RLS and performance
5. **Sanity**: SQL checks verify data integrity across all features

### GitHub Action
`.github/workflows/eql-ingest-and-score.yml` orchestrates the pipeline on:
- Manual trigger (`workflow_dispatch`)
- Push to `main` or `bronze-*` branches

## Definition of Done Checklist

### Data Integrity
- [ ] Leaderboard MV matches view (parity check passes)
- [ ] Top 10 users returned by leaderboard query
- [ ] Bingo board has exactly 25 cells
- [ ] Bingo progress shows at least one hit (if observations exist)
- [ ] Streaks calculated correctly by date
- [ ] Trophy keys present (participation_10, taxa_5_plus, first_of_taxon, early_bird)
- [ ] Rarity buckets non-empty (if flag ON)
- [ ] Rarity flag defaults to OFF

### Security & Performance
- [ ] RLS audit passes (`assert_security_and_perf_ok()`)
- [ ] All tables have appropriate RLS policies
- [ ] Materialized views refresh in <30s
- [ ] No blocked queries in production

### CI/CD
- [ ] GitHub Action runs successfully on push
- [ ] All sanity SQL checks pass
- [ ] Leaderboard snapshot artifact generated
- [ ] No PostgreSQL errors in workflow logs

### Frontend
- [ ] Leaderboard renders with live data
- [ ] Ticker shows current leaders
- [ ] Trophies display with correct counts
- [ ] Map renders observations with correct zoom behavior
- [ ] No console errors in browser

## Commands

### Toggle Rarity V2

**Turn ON:**
```sql
update public.config_filters 
set flags = jsonb_set(coalesce(flags, '{}'::jsonb), '{rarity_v2}', '"on"');
```

**Turn OFF:**
```sql
update public.config_filters 
set flags = jsonb_set(coalesce(flags, '{}'::jsonb), '{rarity_v2}', '"off"');
```

### Manual Pipeline Trigger
1. Go to GitHub Actions
2. Select "EQL Ingest and Score" workflow
3. Click "Run workflow"
4. Select branch (main or bronze-*)

### Verify Installation
```bash
psql "$DB_URL" -f sql/sanity_bronze.sql
```

All checks should return `t` (true) or valid row counts.
