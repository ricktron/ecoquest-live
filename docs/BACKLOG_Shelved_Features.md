# Backlog - Shelved Features

Features considered but deferred for post-Bronze release.

## High Priority (Next Sprint)

### Rarity Scoring v2
**Goal**: Score taxa based on regional/seasonal rarity, not just intra-trip frequency.

**Approach**:
- Fetch historical iNat observations for region (e.g., Costa Rica, last 5 years, Oct-Dec)
- Compute inverse frequency: `rarity_score = 1 / log(historical_count + 1)`
- Bonus points for taxa with <10 sightings in baseline period

**Blockers**:
- Requires pre-computed baseline dataset (~100K obs)
- iNat API rate limits (5000 requests/hour)

**Estimated effort**: 2-3 days

---

### Team Leaderboards
**Goal**: Small-group competitions (3-5 students) within larger trip.

**Schema**:
```sql
CREATE TABLE teams (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  trip_id uuid REFERENCES trips(id)
);

CREATE TABLE team_members (
  team_id uuid REFERENCES teams(id),
  user_login text NOT NULL,
  PRIMARY KEY (team_id, user_login)
);
```

**UI**: Toggle leaderboard view between "Overall" and "My Team"

**Estimated effort**: 1 day

---

### Photo Verification Workflow
**Goal**: Allow admins to flag/approve photos before they count for scoring.

**Approach**:
- Add `observations.verified_at` column
- Scoring filters to `WHERE verified_at IS NOT NULL OR auto_verify = true`
- Admin UI to bulk approve/reject with notes

**Blockers**:
- Requires admin authentication (currently no auth)

**Estimated effort**: 3-4 days

---

## Medium Priority (Future Sprint)

### Bingo Card Challenges
**Goal**: Grid-based achievement cards (e.g., "Bird at dawn," "Reptile selfie," "Aquatic plant").

**Schema**:
```sql
CREATE TABLE bingo_cards (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  grid jsonb NOT NULL -- 3x3 or 5x5 cell definitions
);

CREATE TABLE bingo_progress (
  card_id uuid REFERENCES bingo_cards(id),
  user_login text NOT NULL,
  completed_cells jsonb DEFAULT '[]',
  completed_at timestamptz
);
```

**UI**: Interactive grid with click-to-claim cells, confetti on row/column complete

**Estimated effort**: 5-7 days

---

### Media Mirror (Cloudflare R2)
**Goal**: Cache iNat photos in our own storage to avoid hotlinking issues and speed up load times.

**Approach**:
- Background job: Download photos from `observations.photo_url` to R2 bucket
- Update `observations` with `cached_photo_url`
- Frontend uses cached URL as primary, iNat as fallback

**Blockers**:
- R2 storage costs (~$0.015/GB/month)
- GDPR compliance for storing user photos

**Estimated effort**: 2-3 days

---

### Real-Time Trophy Notifications
**Goal**: Toast notification when user wins/loses a trophy.

**Approach**:
- WebSocket or Supabase Realtime subscription on `trophy_events` table
- Frontend listens for events where `user_login = currentUser`
- Show animated toast with trophy icon

**Blockers**:
- Requires computing trophy state on every score update (performance?)

**Estimated effort**: 2 days

---

## Low Priority (Backlog)

### Advanced Filters on Leaderboard
- Filter by taxon class (birds, insects, plants)
- Filter by date range within trip
- Filter by observation quality grade

**Estimated effort**: 1 day

---

### Export Data as CSV
Allow users to download their observations/scores as CSV for offline analysis.

**Estimated effort**: 0.5 day

---

### Dark Mode
System-preference-aware dark theme toggle.

**Estimated effort**: 1 day

---

### Trophy Prediction (ML)
Use historical data to predict "you're 3 observations away from Early Bird trophy."

**Estimated effort**: 7-10 days (requires ML pipeline)

---

## Rejected Ideas

### Social Sharing to Instagram
**Why rejected**: Privacy concerns, requires OAuth integration, out of scope for education focus.

### Gamified Badges (Level Up System)
**Why rejected**: Trophies already provide recognition. Adding XP/levels dilutes simplicity.

### Live Chat Between Participants
**Why rejected**: Liability risk, moderation burden, out of scope for scoring platform.

---

## Daily Trophy Definitions (Reference)

Implemented in Bronze v0.3 via `daily_trophies_for(date)` RPC:

1. **Variety Hero**: Most distinct taxa in a day
2. **Early Bird**: Most observations 04:00-06:59 local
3. **Night Owl**: Most observations after sunset (configurable start time)
4. **Steady Eddie**: Most distinct clock-hours with ≥1 observation
5. **First Finder**: Most "first of day" species discoveries
6. **Rarest Find**: Single rarest taxon observed that day (inverse frequency)

Future trophy ideas (not yet implemented):
- **Photo Pro**: Best-quality photos (community upvotes?)
- **Habitat Explorer**: Most distinct habitat types (forest, wetland, urban)
- **Taxon Specialist**: Deepest taxonomic ID (species vs genus)

---

**Last Updated**: 2025-11-05  
**Maintained by**: Engineering team
