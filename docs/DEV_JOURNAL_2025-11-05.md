# Dev Journal - 2025-11-05: Bronze Fix Pack

## Summary
Shipped Bronze Fix Pack addressing three critical issues: UI ticker overlap, scoring diminishing returns, and daily trophy calculation timing.

## Changes Made

### 1. Ticker/Header Layout Fix
**Problem**: Ticker component was overlapping header on some viewports, especially iOS notched devices.

**Solution**: 
- Introduced CSS variables `--header-h` and `--ticker-h` with body class toggle
- Made ticker sticky positioned below header with proper z-index layering
- Added safe-area-inset support for iOS notch handling
- Ticker now conditionally renders and toggles `has-ticker` body class

**Risk**: None. Pure CSS change with fallback values.

### 2. Diminishing Returns on Repeat Taxa
**Problem**: Users scoring multiple observations of the same taxon received full points for each, leading to "farming" behavior.

**Solution**:
- Created `config_scoring` table with `repeat_decay` (default 0.70) and `repeat_max_rank` (default 8)
- Updated scoring RPC to apply decay: 1st obs = 2pts (1 base + 1 bonus), 2nd = 0.7pts, 3rd = 0.49pts, etc.
- Decay caps at `repeat_max_rank` to prevent excessive penalization

**Risk**: Moderate. Requires score recompute. Historical scores preserved in existing runs.

### 3. Daily Trophies Based on Observed Date
**Problem**: Daily trophies were computed using sync/upload time rather than when observation was actually made.

**Solution**:
- Created timezone-aware views: `run_day_obs_v`, `daily_variety_candidates_v`, `daily_early_bird_candidates_v`, etc.
- Built `daily_trophies_for(date)` RPC that computes winners per observed date in local timezone
- Trophy types: Variety Hero, Early Bird (4-7am), Night Owl (6pm-midnight), Steady Eddie (hour coverage), First Finder, Rarest Find

**Risk**: Low. Views are read-only and use existing observation data. RPC is security definer.

## Testing Checklist
- [x] Header/ticker layout on desktop (Chrome, Firefox)
- [x] Header/ticker on mobile (iOS Safari with notch)
- [x] Scoring with 3+ repeat taxa shows decay (2, 0.7, 0.49)
- [x] Daily trophies query returns expected winners for sample date
- [x] All docs created/updated

## Rollback Plan
If issues arise:
1. Revert CSS changes in `src/index.css`
2. Run migration rollback for `config_scoring` table
3. Revert RPC changes to original scoring logic
4. Remove daily trophy views/RPC

## Next Steps
- Monitor scoring accuracy in production
- Validate daily trophy winners match expected behavior
- Consider exposing `repeat_decay` in admin UI for tuning
