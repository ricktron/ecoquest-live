# Architecture Overview - EcoQuest Live

## System Design

### High-Level Components
```
┌─────────────────────────────────────────────────┐
│           React Frontend (Vite + TS)            │
│  ┌──────────┬──────────┬──────────┬──────────┐ │
│  │ Leaderbd │ Trophies │ Map      │ Gallery  │ │
│  └──────────┴──────────┴──────────┴──────────┘ │
└──────────────────┬──────────────────────────────┘
                   │ REST / Supabase Client
┌──────────────────▼──────────────────────────────┐
│         Supabase (PostgreSQL + RLS)             │
│  ┌─────────────────────────────────────────┐   │
│  │  Core Tables                            │   │
│  │  - observations                         │   │
│  │  - score_runs                           │   │
│  │  - score_entries_obs                    │   │
│  │  - config_filters                       │   │
│  │  - config_scoring (new v0.3)            │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │  Views & RPCs                           │   │
│  │  - leaderboard_overall_mv               │   │
│  │  - daily_variety_candidates_v           │   │
│  │  - daily_trophies_for(date)             │   │
│  │  - compute_scores_mvp()                 │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Data Flow

### 1. Observation Ingestion
```
iNaturalist API → Observations Table → Score Computation
```

### 2. Score Computation (with Diminishing Returns)
```sql
-- Pseudo-flow in compute_scores_mvp()
1. Filter observations by run window & config_filters
2. Rank observations per (user, taxon) by observed_at
3. Apply decay: points = base × (repeat_decay ^ (rank - 1))
4. Add first-of-taxon bonus (rank=1 only)
5. Insert into score_entries_obs
6. Refresh leaderboard_overall_mv
```

### 3. Trophy Calculation (Observed-Date)
```sql
-- Daily trophy flow
1. Convert observed_at to local timezone (from config)
2. Bucket observations by date
3. Aggregate metrics per trophy type (variety, early_bird, etc.)
4. Rank users per day per trophy
5. Return via daily_trophies_for(date) RPC
```

## Key Tables

### `observations`
Primary storage for iNaturalist observation data.
```sql
- id (bigint): iNat observation ID
- user_login (text): Observer's username
- taxon_id (int): Species/taxon identifier
- observed_at (timestamptz): When photo was taken
- synced_at (timestamptz): When we fetched it
- raw_json (jsonb): Full iNat payload
```

### `score_runs`
Ledger of scoring computation events.
```sql
- id (uuid): Run identifier
- window_start, window_end (timestamptz): Observation window
- started_at, completed_at (timestamptz): Computation timing
- status (text): 'running' | 'completed' | 'failed'
```

### `score_entries_obs`
Individual observation scores for each run.
```sql
- run_id (uuid): FK to score_runs
- inat_obs_id (bigint): FK to observations
- user_login (text): Scorer
- taxon_id (int): Species observed
- points (numeric): Computed score with decay
- reason (text): 'base+first-of-taxon' | 'base*decay'
```

### `config_scoring` (New v0.3)
Scoring algorithm parameters.
```sql
- id (boolean): Singleton primary key
- repeat_decay (numeric): Multiplier for repeat taxa (default 0.70)
- repeat_max_rank (int): Cap on decay application (default 8)
```

## Key Views

### `leaderboard_overall_mv` (Materialized)
Pre-computed leaderboard rankings.
```sql
- rank, user_login, points, obs_count, species_count
- Refreshed after each score run
```

### Trophy Views (New v0.3)
- `daily_variety_candidates_v`: Distinct taxa per user per day
- `daily_early_bird_candidates_v`: 04:00-06:59 observations
- `daily_night_owl_candidates_v`: Sunset-to-midnight observations
- `daily_steady_eddie_candidates_v`: Hour-block coverage
- `daily_first_finder_candidates_v`: First-of-day species discoveries
- `daily_rare_find_candidates_v`: Rarity-scored observations

## Key RPCs

### `compute_scores_mvp()`
Main scoring engine. Security definer, admin-only trigger.
- Reads: `observations`, `score_runs`, `config_scoring`, `config_filters`
- Writes: `score_entries_obs`, refreshes `leaderboard_overall_mv`

### `daily_trophies_for(date)` (New v0.3)
Returns trophy winners for a specific date.
- Security definer, read-only
- Uses timezone from `config_filters.timezone_str`
- Returns: variety_winner, rare_winner, early_bird_winner, etc.

## Security Model

### Row-Level Security (RLS)
- **Observations**: Public read (within trip window)
- **Score entries**: Public read, admin write
- **Config tables**: Admin-only write
- **Leaderboard views**: Public read

### RPC Security
- `compute_scores_mvp()`: `SECURITY DEFINER`, invoked by scheduled job or admin
- `daily_trophies_for(date)`: `SECURITY DEFINER`, public read access

See `docs/SECURITY_RLS.md` for detailed policies.

## Configuration Management

### Trip Window
Set in `config_filters` table:
```sql
UPDATE config_filters 
SET window_start = '2025-11-09 00:00:00-06',
    window_end = '2025-11-15 23:59:59-06',
    timezone_str = 'America/Costa_Rica';
```

### Scoring Parameters
Set in `config_scoring` table:
```sql
UPDATE config_scoring 
SET repeat_decay = 0.70, 
    repeat_max_rank = 8;
```

## Performance Considerations

### Indexes
- `observations(user_login, observed_at)`
- `observations(taxon_id, observed_at)`
- `score_entries_obs(run_id, user_login)`

### Materialized Views
- `leaderboard_overall_mv` refreshed after each score run (~1-2 seconds for 1000 obs)

### Scheduled Jobs
- Observation sync: Every 15 minutes (iNat API)
- Score computation: Every 30 minutes during trip
- Trophy refresh: On-demand via RPC call

## Monitoring

### Health Checks
- Latest score run status
- Observation ingestion rate
- Leaderboard refresh timestamp
- Trophy view population

See `docs/RUNBOOK_SanityChecks.md` for detailed queries.

## Future Enhancements
- Regional rarity scoring (v2)
- Team leaderboards
- Photo verification workflow
- Real-time trophy notifications
- Bingo card challenges

See `docs/BACKLOG_Shelved_Features.md` for full list.
