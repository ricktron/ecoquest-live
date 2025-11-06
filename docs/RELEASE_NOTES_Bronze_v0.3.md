# Release Notes - Bronze v0.3

**Release Date**: 2025-11-05  
**Code Name**: Bronze Fix Pack

## 🎯 What's New

### UI Improvements
- **Fixed Ticker Overlay Issue**: Ticker now properly positions below header without overlap on all devices including iOS notch devices
- **Improved Mobile Layout**: Better spacing and safe-area handling for modern smartphones

### Scoring Enhancements
- **Diminishing Returns**: Repeat observations of the same taxon now receive reduced points (default 70% decay per repeat)
  - 1st observation: 2 points (1 base + 1 bonus)
  - 2nd observation: 0.7 points
  - 3rd observation: 0.49 points
  - Decay caps at 8th repeat observation
- **Configurable Parameters**: Admins can adjust decay rate via `config_scoring` table

### Trophy System
- **Observed-Date Based**: Daily trophies now compute based on when observations were made (local timezone), not upload time
- **New Trophy Types**:
  - **Variety Hero**: Most distinct taxa in a day
  - **Early Bird**: Most observations between 4-7am local
  - **Night Owl**: Most observations after sunset (configurable start time)
  - **Steady Eddie**: Most distinct clock-hours with observations
  - **First Finder**: Most "first of day" species discoveries
  - **Rarest Find**: Single rarest species found that day

## 🔧 Technical Changes

### Database
- Added `config_scoring` table for scoring parameters
- Created timezone-aware views for daily trophy calculations
- Added `daily_trophies_for(date)` RPC function

### Frontend
- Updated CSS with proper header/ticker stacking
- Body class toggle for conditional ticker spacing
- Integrated daily trophy RPC into trophies page

## 🐛 Bug Fixes
- Header/ticker z-index overlap on iOS
- Scoring "farming" behavior for repeat taxa
- Trophy timing discrepancies from upload vs observed time

## 📚 Documentation
- Added dev journal entry
- Updated scoring rubric with diminishing returns
- Enhanced runbook with trophy sanity checks
- Captured backlog of shelved features

## ⚠️ Breaking Changes
None. Existing scores are preserved in their original runs.

## 🔮 Coming Soon
- Rarity scoring v2 with regional baseline
- Team leaderboards
- Photo verification workflow
- Bingo card challenges
