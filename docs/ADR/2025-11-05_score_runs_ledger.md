# ADR: Score Runs as Immutable Ledger

**Date**: 2025-11-05  
**Status**: Accepted  
**Deciders**: Engineering team

## Context
EcoQuest Live needs to compute scores multiple times during a trip as new observations sync from iNaturalist. We must decide between:
1. **Mutable scores**: Overwrite/update scores in place
2. **Immutable ledger**: Create new score runs, preserve history

## Decision
We will use an **immutable ledger model** with `score_runs` table tracking each computation event.

## Rationale

### Pros of Immutable Ledger
- **Audit trail**: Full history of scoring over time (debugging, disputes)
- **Rollback capability**: Can revert to previous run if computation error
- **A/B testing**: Compare different scoring algorithms on same data
- **Idempotent recomputes**: No risk of partial updates or race conditions
- **Simplified logic**: No complex update/merge logic

### Cons
- **Storage overhead**: ~1-2 KB per observation per run (manageable for <10K obs)
- **Query complexity**: Must filter by `run_id` for current scores
- **Materialized view refresh**: Leaderboard needs explicit refresh after each run

### Alternatives Considered

#### Option A: Mutable Scores (Rejected)
```sql
-- Single scores table with updates
UPDATE scores SET points = ... WHERE observation_id = ...
```
**Why rejected**:
- Hard to debug "why did my score change?"
- Risk of partial updates if computation fails mid-run
- Can't compare algorithm tweaks without losing history

#### Option B: Hybrid (Rejected)
Keep latest run in hot table, archive old runs to cold storage.
**Why rejected**:
- Premature optimization for current scale (<10K obs)
- Adds complexity without clear benefit

## Implementation Details

### Schema
```sql
-- Run metadata
CREATE TABLE score_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running'
);

-- Score entries per run
CREATE TABLE score_entries_obs (
  run_id uuid REFERENCES score_runs(id),
  inat_obs_id bigint REFERENCES observations(id),
  user_login text NOT NULL,
  points numeric NOT NULL,
  reason text,
  PRIMARY KEY (run_id, inat_obs_id)
);
```

### Querying Current Scores
```sql
-- Leaderboard always queries latest run
SELECT * FROM score_entries_obs
WHERE run_id = (SELECT id FROM score_runs ORDER BY started_at DESC LIMIT 1);
```

### Cleanup Strategy
Archive runs older than 30 days after trip:
```sql
DELETE FROM score_entries_obs
WHERE run_id IN (
  SELECT id FROM score_runs 
  WHERE completed_at < now() - interval '30 days'
);
```

## Consequences

### Positive
- ✅ Can revert scoring algorithm changes without data loss
- ✅ Full audit trail for competition disputes
- ✅ Easy to test new scoring formulas in parallel

### Negative
- ⚠️ Must educate queries to always filter by `run_id`
- ⚠️ Storage grows with number of recomputes (mitigated by archival)

## Monitoring
- Track `score_runs` table size monthly
- Alert if `completed_at` is >1 hour behind `started_at` (stalled run)
- Monitor number of runs per day (should be ~48 during active trip)

## Future Enhancements
- Add `algorithm_version` column to `score_runs` for A/B testing
- Implement incremental scoring for performance (only score new obs)
- Add `score_runs.notes` for manual annotation of special runs

## References
- Event sourcing pattern: https://martinfowler.com/eaaDev/EventSourcing.html
- PostgreSQL append-only tables: https://www.postgresql.org/docs/current/ddl-partitioning.html

---
*Supersedes*: Initial "mutable scores" prototype  
*Implemented in*: Migration `20251001_score_runs_init.sql`
