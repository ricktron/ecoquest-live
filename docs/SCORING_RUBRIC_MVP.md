# Scoring Rubric - MVP

## Overview
EcoQuest Live awards points for biodiversity observations using a diminishing-returns model that encourages variety over volume.

## Base Scoring Rules

### Points Per Observation
- **Base**: 1 point per observation
- **First-of-Taxon Bonus**: +1 point for first observation of each taxon per user per run
- **Research Grade Bonus**: +1 point for observations that reach "research grade" quality

### Diminishing Returns (New in v0.3)
To prevent "farming" behavior, repeat observations of the same taxon receive reduced points:

| Observation # | Points Awarded | Calculation |
|--------------|----------------|-------------|
| 1st (new taxon) | 2.0 | 1 base + 1 bonus |
| 2nd | 0.7 | 1 × 0.7^1 (no bonus) |
| 3rd | 0.49 | 1 × 0.7^2 |
| 4th | 0.34 | 1 × 0.7^3 |
| 5th | 0.24 | 1 × 0.7^4 |
| 6th | 0.17 | 1 × 0.7^5 |
| 7th | 0.12 | 1 × 0.7^6 |
| 8th+ | 0.08 | 1 × 0.7^7 (capped) |

**Parameters** (configurable in `config_scoring`):
- `repeat_decay`: 0.70 (70% multiplier)
- `repeat_max_rank`: 8 (decay caps after 8th observation)

### Quality Grades (iNaturalist)
- **Casual**: No community validation, may lack photo/location
- **Needs ID**: Has photo and location, awaiting species confirmation
- **Research Grade**: ≥2 community IDs agree, location verified

## Trophy Bonuses
Trophies are awarded but do not directly add points. They serve as recognition achievements.

## Time-Based Mechanics

### Observation Timing
- Scored by **observed_at** (when photo was taken), not upload time
- Allows post-trip uploads without penalty

### Daily Reset
- Daily trophies computed per calendar date in local timezone
- Leaderboard is cumulative across entire trip/run window

## Example Scenarios

### Scenario 1: Variety Explorer
User observes 10 different species (1 of each):
- Points: 10 × 2 = **20 points**

### Scenario 2: Repeat Observer
User observes same bird species 5 times:
- Points: 2 + 0.7 + 0.49 + 0.34 + 0.24 = **3.77 points**

### Scenario 3: Mixed Strategy
User observes 5 different species, 2 observations each:
- Points: (5 × 2) + (5 × 0.7) = 10 + 3.5 = **13.5 points**

## Strategy Tips
- **Prioritize variety**: First observations of new taxa are worth 2.9× more than repeats
- **Upload daily**: Research grade bonuses can be earned post-trip
- **Document thoroughly**: Quality photos increase research grade likelihood
- **Explore different habitats**: Increases chance of finding new taxa

## Admin Configuration
Decay parameters can be adjusted in `config_scoring` table:
```sql
UPDATE config_scoring 
SET repeat_decay = 0.60, repeat_max_rank = 10
WHERE id = true;
```

Then recompute scores for current run.
