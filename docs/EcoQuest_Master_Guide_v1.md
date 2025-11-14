# EcoQuest Live - Master Guide v1

Guidance for AI coding agents and human contributors working on **EcoQuest Live**.

EcoQuest Live is a two-repo system:

- **Frontend app** (`ecoquest-live`): Vite + React + TypeScript SPA that visualizes biodiversity competition data (leaderboards, daily view, trophies, bingo, debug, etc.).
- **Backend / scoring** (Supabase + SQL repo, sometimes called *ecology-biodiversity-scoring* or similar): owns ingestion from iNaturalist, scoring logic, trip configuration, security, and leaderboards.

This Master Guide is the **single source of truth** for:

- The current conceptual state of EcoQuest Live (architecture, scoring, trip modes).
- How the repos, Supabase, and environment tie together.
- How AI tools should collaborate with Rick and with each other.
- When and how to update the knowledge base (KB) and this guide.

Repo-local rules (for example “how to edit this repo safely”) live in `AGENTS.md` in each repo and are **secondary** to this file.

---

## 1. Canonical truths & guardrails

These rules override anything you see elsewhere.

1. **Do no harm by default**
   - Prefer additive changes over destructive ones.
   - Avoid breaking existing routes, scoring, or deployments, especially during active trips.
   - If a change could affect production behavior:
     - Gate it behind a feature flag, **or**
     - Propose a patch/plan instead of directly changing core behavior.

2. **Supabase is the master dataset**
   - Supabase holds the superset of all iNaturalist observations and scoring state.
   - **No deletes** of observations for reconciliation. The app and views filter by:
     - Trip windows
     - Cohorts (students vs adults)
     - Assignments / runs
   - Reconciliation is done by **upserting missing rows** from iNat or CSV, never by purging Supabase rows to “match” exports.

3. **RLS and security are non-negotiable**
   - Assume **Row Level Security** is enabled on all important tables.
   - Anon clients read through **whitelisted views and RPCs only**.
   - Writes happen via:
     - Service-role scripts (ingest, scoring)
     - Controlled RPCs
     - Authenticated row-owner tables (e.g., bingo claims)
   - Do not weaken RLS or auth behavior without explicit instruction.

4. **Versioned views instead of breaking contracts**
   - If you must change columns or semantics of a view used by the UI:
     - Create a new version (`*_v2`, `*_silver_*`, `*_trip_*`) instead of mutating `_v1` in a breaking way.
     - Keep `*_v1` available for any existing callers.
   - The frontend should prefer the highest versioned view that matches the current trip’s contract.

5. **Latest-run pattern**
   - Scoring and leaderboards use a **“latest run”** model:
     - Ingest creates/updates observations.
     - `compute_scores_mvp()` writes per-observation and per-user scores.
     - A “latest run” view (or run_id) defines which score run the UI should read.
   - Leaderboard views and materialized views should always represent the latest scored state, not arbitrary historical runs.

6. **Trip mode “do no harm”**
   - Within ~1 week of a live trip (Costa Rica, Big Bend):
     - No schema-breaking migrations.
     - No RLS relaxations.
     - No new heavy joins in critical views.
   - Only low-risk, reversible changes are allowed:
     - Read-only debug views
     - Docs and runbooks
     - Feature flags defaulted to off

7. **Feature flags default to off**
   - New scoring or UX behavior must be:
     - Flagged in config tables or env flags, and
     - Off by default until tested and clearly requested to turn on.
   - Examples:
     - `rarity_v2` scoring flag
     - Trophies being enabled
     - Bingo claims writing
     - Admin / debug panels

8. **Adults vs students**
   - Adults (Rick, Cindy, Federico, etc.):
     - Are in roster tables.
     - Are generally **excluded from competition scoring** but may appear in exhibition views.
   - Student competition leaderboards join on **student-only participant views** (`v_competition_participants_current` or trip-specific equivalents).

---

## 2. Architecture and data flow

High level pipeline:

1. **Ingest**
   - Scripts (Node or server-side) call iNaturalist APIs for:
     - Trip/project
     - User lists
     - Time windows
   - Observations are **upserted** into `public.observations` (or equivalent) using:
     - iNat observation ID as the stable key
     - Lowercased user login (`user_login`)
   - Assignment / trip linkage is recorded via link tables (`assignment_observations`, trip-scoped views).

2. **Scoring**
   - A core function `public.compute_scores_mvp()`:
     - Reads observations in the active window/run.
     - Applies the current scoring rubric.
     - Writes:
       - Per-observation scores (e.g. `score_entries_obs`).
       - Per-user aggregates (score runs / summary views).
   - Advanced features (novelty, decay, rarity) are modeled but may be **gated or off** for certain trips.

3. **Leaderboards & derived features**
   - Leaderboard views:
     - `public.leaderboard_overall_latest_v1`
     - `public.leaderboard_overall_mv` (materialized)
     - Trip/competition variants (e.g. `leaderboard_trip_cr_2025_v1`, `leaderboard_competition_official_v1`)
   - Additional derived views:
     - **Bingo** board + progress views.
     - **Streaks** views based on `date(observed_at)`.
     - **Trophies** daily/trip award views.
     - **Rarity** signal views (e.g., `rarity_signal_latest_v1` when enabled).
   - These are primarily read by the frontend and by offline exports.

4. **Frontend SPA**
   - Reads **view/RPC data from Supabase** using the anon key.
   - Renders:
     - Leaderboard
     - Daily / digest view
     - Trophies
     - Bingo board & claims
     - Map
     - Debug / Admin panels (read-only)
   - Scoring rules, trip windows, and game mechanics **come from Supabase**, not reimplemented in client code.

5. **Ops & CI**
   - A CI job (Path to Bronze pattern) is expected to:
     - Ingest active run.
     - Run `compute_scores_mvp()`.
     - Refresh the leaderboard MV.
     - Run a security/perf audit function (e.g., `assert_security_and_perf_ok()`).
     - Print sanity SQL outputs.
     - Optionally export a CSV snapshot of the leaderboard as an artifact.

---

## 3. Trips, cohorts, and modes

### 3.1 Trip concepts

- Trips are defined by:
  - **Date window** (e.g., Costa Rica 2025: 2025-11-09 → 2025-11-15).
  - **Time zone** (e.g., `America/Costa_Rica` for CR, `America/Chicago` or local for Texas/Big Bend).
  - **Trip members** (student and adult logins).
  - **BBoxes / locations** (for rarity or map focus when used).

- Trip structure lives in Supabase:
  - `config_filters` / trip mode fields:
    - `mode` (e.g., `TRIP`)
    - `d1` / `d2` (trip window)
    - `tz` (`timezone_str`)
    - trip roster flags (student/adult login lists, sometimes via views)
  - Trip-scoped views for:
    - Members (`trip_members_v`, `trip_members_roster_cr2025_v1`)
    - Observations (`trip_cr_2025_observations_v1`)
    - Leaderboards (`leaderboard_trip_cr_2025_v1`)
    - Daily run summaries (`daily_latest_run_v`)

### 3.2 Cohorts and competition participants

- Roster tables/views distinguish:
  - `full_name`, `display_name`
  - `inat_login` / `user_login`
  - `is_adult`, `cohort` (e.g., `'adult'` vs student cohorts)
  - `exclude_from_scoring` flags

- Competition views:
  - `v_competition_participants_current` filters to **students only** (cohort <> `'adult'`).
  - Competition leaderboards join on this view to exclude adults from scoring while still allowing them to appear elsewhere.

### 3.3 Test vs trip profiles

- TEST profile:
  - Mock data and members.
  - Used for UI layout and smoke tests.
- TRIP profile (e.g., `CR_TRIP_2025`):
  - Uses real trip configuration and data.
  - UI binds to trip-scoped views.
- Switching profiles:
  - Controlled via env flags in frontend (`VITE_TRIP_PROFILE`) and/or config flags in Supabase.
  - Always follow a **checklist** before switching (debug page checks, `ping` RPC, leaderboard head count, etc.).

---

## 4. Scoring & game mechanics (current + planned)

This section captures **conceptual behavior**. Repo implementation details live in SQL and RUNBOOK docs.

### 4.1 Core scoring for CR2025 (live trip posture)

For the Costa Rica 2025 trip, scoring was intentionally simplified:

- **Base points**
  - Each non-casual observation earns **1 point**.
- **Research grade bonus**
  - Each research-grade observation earns **+1 additional point**.
- **Adult awards (manual points)**
  - Adults can award bonus points via `adult_points_awards_cr2025` (append-only table).
  - These roll up into leaderboard columns:
    - `adult_points` or `bonus_points` (naming depends on view version).
- **Total points**
  - For CR2025, total points conceptually:
    - `Total = Base + ResearchGradeBonus + AdultAwards`
  - More advanced mechanics (novelty, rarity, fatigue) remain **off** during this trip.

Relevant objects (examples, names may vary slightly by migration version):

- `public.adult_points_awards_cr2025`
- `public.trip_awards_agg_cr2025_v1` (aggregated bonus points)
- `public.trip_leaderboard_cr2025_v1` (leaderboard including adult points and chips)
- `public.trip_silver_obs_rows_cr2025_v1` (per-obs scoring breakdown for audits)
- `public.trip_data_freshness_cr2025_v1` (freshness window for trip data)

### 4.2 Diminishing returns scaffolding

A general diminishing returns framework exists but may be trip-specific and gated:

- Config table:
  - `public.config_scoring`:
    - `id` boolean pk default true
    - `repeat_decay` numeric default `0.70`
    - `repeat_max_rank` int default `8`
- Behavior when **enabled**:
  - Each repeated observation of the same taxon in a window:
    - multiplier ≈ `pow(repeat_decay, rank - 1)` up to `repeat_max_rank`.
  - Early observations of a species are worth more; later repeats are worth less.
- Feature flag:
  - Decay may be off by default (e.g., `enable_decay` boolean in config or similar pattern).

During CR2025:

- Diminishing returns were primarily viewed as **Bronze/Silver scaffolding**.
- It is safe to document the parameters but assume **off** unless explicitly enabled.

### 4.3 Trophies (daily & trip)

Trophies are implemented with:

- Config and registry tables:
  - `public.config_trophies` (or similar flag table)
  - `public.trophy_registry` (catalog rows: title, subtitle, scope, metric, view_name, enabled)
  - `public.trophy_definitions_v1` / `public.trophy_awards_v1` (where present)
- Award views:
  - Trip-wide trophies (e.g., Variety Hero top 3).
  - Daily trophies:
    - Variety Hero (most distinct taxa per day)
    - Observation leader
    - Early Bird (earliest local observation)
    - Night Owl (within a night window, e.g., 20:00–05:00 local)
    - Shutterbug (photo-heavy participants)
    - Rare Find (rarest taxon per day)

Unified feed:

- A unified `trophy_awards_latest_run_v` view may union these award views for consumption by:
  - Trophies page
  - Cabinet view (trophy history per user)
  - Offline exports

CR2025 stance:

- Trophies infrastructure exists but not all types need to be enabled.
- Trip uses **Costa Rica timezone** for award windows.
- Adults can appear in trophies, but competition emphasis is on students.

### 4.4 Bingo

Bingo exists in two layers:

1. **Board & progress (read-only)**
   - `bingo_board_latest_v1` – deterministic 5×5 board per run or week.
   - `bingo_progress_latest_v1` – indicates which tiles are “hit” by each user’s observations.

2. **Claims (per-student write path)**
   - `public.bingo_claims`:
     - `(user_id uuid, week_id text, tile_slug text, observation_id uuid null, created_at timestamptz)`
     - PK `(user_id, week_id, tile_slug)`
   - RLS:
     - Row-owner read/write policy for authenticated users.
     - Public read policy for read-only viewer modes (optional; can be tightened behind a view).
   - `public.profiles`:
     - Minimal table for display_name and id to power viewer dropdowns.

Frontend features:

- Fixed 5×5 grid with square tiles and mobile-safe layout.
- Per-student viewer (`[Me | Student…]`) with URL deep-link `?u=<uuid>`.
- Potential weekly trophies aligned with bingo tiles (e.g., Mammal Maven, Frog Finder).

CR2025 stance:

- Bingo UI and claims may be available; scoring integration into total points is optional and usually **not** part of the core leaderboard total unless explicitly configured.

### 4.5 Streaks

Streaks behave as:

- Computed from distinct `date(observed_at)` in the trip timezone.
- Observations with missing `observed_at` that rely on fallback timestamps **do not** count (by design).

A view such as:

- `public.streaks_latest_v1`

is expected to aggregate longest streak per user.

### 4.6 Rarity 2.0

Rarity is modeled as:

- A “rarity signal” view:
  - `public.rarity_signal_latest_v1`
  - Uses background iNaturalist observations within a bounding box and time window to classify taxa as:
    - common / uncommon / rare (or similar buckets).
- Feature flag:
  - `public.config_filters` with key `'rarity_v2'`:
    - `'off'` – rarity does **not** influence scoring.
    - `'on'` – scoring incorporates rarity deltas (details vary by implementation).

CR2025 stance:

- `rarity_v2` is typically **off**.
- Rarity views may exist but are considered a **beta** feature; do not assume they affect live trip scoring unless flag is on.

---

## 5. Data model & key objects (high-level)

This is not a full schema reference, just the important patterns.

### 5.1 Core tables

- `public.observations`
  - iNat observation rows, normalized fields (ids, user_login, taxon_id, observed_at, quality_grade, url, etc.).
  - Undeleted superset; trip windows are expressed via views.

- `public.score_runs`
  - Each scoring run; records timestamps, counts, notes, and sometimes inat_updated_through_utc.

- `public.score_entries_obs`
  - Observation-level scoring entries for a run (base, bonus components, breakdown JSON, etc.).

- `public.students` / `public.roster_people` / `public.trip_members_*`
  - Roster and membership data: student/adult flags, emails, display names, logins, cohort.

- `public.adult_points_awards_cr2025`
  - Append-only manual points table for CR2025, with:
    - `user_login`, `awarded_by`, `points`, `reason`, `awarded_at_utc`.

- Config tables:
  - `public.config_scoring` – decay parameters, toggles.
  - `public.config_filters` – trip mode fields, flags (rarity_v2, tz, etc.).
  - `public.config_trophies` – gating for trophy features.

### 5.2 Views and leaderboards

- Leaderboards:
  - `public.leaderboard_overall_latest_v1`
  - `public.leaderboard_overall_mv`
  - Trip-specific:
    - `public.trip_leaderboard_cr2025_v1`
    - `public.leaderboard_trip_cr_2025_v1`
    - Competition views that join student participants: `leaderboard_competition_official_v1`, `leaderboard_competition_with_flags_v1`.
- Trip helpers:
  - `public.trip_members_v`
  - `public.trip_cr_2025_observations_v1`
  - `public.daily_latest_run_v`
  - Debug views for latest observations.

- Bingo, streaks, trophies, rarity:
  - See section 4; views follow the `*_latest_*` pattern and use trip windows.

### 5.3 Security & audit helpers

- `public.assert_security_and_perf_ok()`
  - Returns `[]` when RLS and performance constraints are satisfied.
  - Called from CI and/or manual checks.

- `public.daily_scores_audit` + `public.get_score_changes_admin(...)`
  - Audit tables and admin RPCs for tracking scoring changes (used in earlier phases, may be present under historical names).

- `public.app_kv`
  - Simple key/value store for admin PINs and misc app config.
  - Helper functions `app_kv_get` / `app_kv_set`.

- Introspection (optional, depending on repo version):
  - `public.introspect_public()` – RLS-safe metadata RPC for agents to list tables/columns.

---

## 6. Environment, Supabase, and deployment

### 6.1 Canonical Supabase project

- **Project ID**: `fceyhhzufkcqkjrjbdwl`
- **Base URL**: `https://fceyhhzufkcqkjrjbdwl.supabase.co`

All live app deployments and agents should treat this as the project of record unless explicitly told otherwise.

### 6.2 Frontend env precedence

Frontend Supabase client configuration:

1. **Vite env vars** (build time):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - Set in the hosting project **Environment Variables**, not in “Secrets.”

2. **Runtime overrides** via `public/env.js`:
   - `globalThis.__SUPABASE_URL`
   - `globalThis.__SUPABASE_ANON_KEY`
   - Loaded with cache busting (`/env.js?v=...`) to ensure changes take effect.

3. **Local defaults** in `src/lib/supabaseClient.ts`:
   - Intended only for local development; should not override real deployments.

Rules:

- Frontend **never** uses the service-role key or Postgres DSNs.
- If Supabase URL/key mismatches are suspected:
  - Use console fingerprint and `window.supabase` debug outputs.
  - Call public `ping()` RPC to confirm connectivity.

### 6.3 Backend / CI env

- CI and backend scripts use:
  - `DB_URL` (Postgres connection string with `?sslmode=require`).
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` (service-role).
- GitHub Actions:
  - Use full libpq URI for `SUPABASE_DB_URL` / `SUPABASE_POOL_URL` as needed.
  - Prefer pooler endpoint, fallback to direct Postgres if pooler fails.
- Pre-trip posture:
  - No changes to Network Restrictions or DB passwords without planning.
  - Use smoke jobs to verify:
    - YAML parses.
    - DB handshake (IPv4 resolution and TCP reachability).
    - PSQL sanity queries.

---

## 7. Frontend app behavior (ecoquest-live repo)

Key points:

- Mobile-first SPA with:
  - Sticky header and ticker stack.
  - Bottom nav on mobile.
  - Leaderboard with trend arrows and chips (obs/species/RG/⭐).
  - Trophies page with gallery and cabinet.
  - Bingo page with weekly board and viewer.
  - Debug/Admin pages showing sanity information.
- All data access:
  - Centralized in a small number of API helpers (e.g., `src/lib/api.ts`).
  - Should rely on typed responses from Supabase views and RPCs.
- Feature flags:
  - Controlled via env and UI config; they gate:
    - Trophies
    - Bingo
    - Streaks
    - Compare tools
    - Admin/Debug panels
- Students:
  - Generally read-only; they browse leaderboards, their own stats, and field guides.
- Admin / teacher:
  - An Admin/Debug panel (when enabled) to see ingest freshness, member rosters, and scoring health.

For more detail, see the frontend `AGENTS.md` file (repo-local guidance).

---

## 8. Backend / scoring behavior (Supabase repo)

Key responsibilities:

- iNat ingestion via scripts:
  - Node scripts run with service-role keys and rate limiting.
  - Write normalized observations and assignment/trip linkage rows.
- Scoring:
  - `compute_scores_mvp()` current MVP scoring.
  - Future scoring modes (rarity, decay, biome bonuses) are additive and gated.
- Security:
  - RLS on all sensitive tables.
  - Anon SELECT only on whitelisted views (leaderboard, trip views, public trophy catalogs).
- Ops:
  - CI workflows implement Path to Bronze pattern:
    - Ingest active run
    - Compute scores
    - Refresh leaderboard MV
    - Audit RLS/perf
    - Print sanity outputs
    - Export CSV snapshot
- Trip scoping:
  - Exposed via trip-scoped views instead of mutating base tables.

A backend `AGENTS.md` file (or equivalent) documents repo specifics and must be treated as authoritative for SQL-level work.

---

## 9. Offline leaderboard fallback

If the live app or scoring pipeline is unstable near a trip, an **offline leaderboard pipeline** is acceptable and planned:

- Data sources, in order of preference:
  1. `score_entries_obs` for the latest run (`score_runs` ordered by date).
  2. `leaderboard_overall_mv` or trip-scoped leaderboard views.
  3. Raw `observations` filtered by trip window.

- Export pattern:
  - Run exact copy-paste SQL to export CSVs.
  - Compute rankings offline (e.g., in Python, Sheets, or a small script).
  - Apply optional filters:
    - Only students
    - Only certain quality grades
  - Use roster/mapping CSV to create per-section or per-team leaderboards.

- Deliverables per cycle:
  - Overall leaderboard.
  - Per-group tables (e.g., class, house, team).
  - Top movers and participation stats.
  - Short “quests for the next 24–48 hours.”

The offline process must **not** modify Supabase schema or RLS.

---

## 10. AI collaboration rules (how to work with Rick)

This section is about **how AI agents should behave**, not code.

### 10.1 General behavior

- Propose a **short plan + risky assumptions first**, then execute.
- Prefer clear, direct language; avoid fluff and hype.
- When editing code or SQL:
  - Provide copy-paste-ready blocks.
  - Include sanity checks and verification steps.
- When something is ambiguous or potentially stale:
  - Check the repo schema or use live DB introspection.
  - Do not guess table/column names if you can verify them.

### 10.2 Tools of choice

- **GitHub Copilot / Code + Codex**:
  - **Primary tool** for making repo changes.
  - Use AGENTS.md and this Master Guide to frame tasks.
  - Work via branches and PRs; do not assume direct pushes to `main`.

- **ChatGPT (this guide’s environment)**:
  - Orchestrator and planning brain:
    - Design prompts for Codex.
    - Draft AGENTS.md, RUNBOOK sections, and Master Guide updates.
    - Produce SQL snippets and CI job layouts.
  - Acts as a “spec writer” and sanity check.

- **Claude Code (web IDE agent)**:
  - Best used for *in-IDE*, *live DB* tasks when:
    - Proper env vars are set (anon or introspect roles).
    - You run a **Session Bootloader** to:
      - Echo env presence.
      - Confirm DB identity.
      - Introspect schema via RPC or `information_schema`.
  - One chat per project; reuse the bootloader pattern to avoid context drift.

### 10.3 Session bootstrapping pattern

Before making non-trivial changes, AI agents should:

1. Confirm **which repo** they are in (frontend vs backend).
2. Read relevant files:
   - `AGENTS.md`
   - `docs/ARCHITECTURE_OVERVIEW.md`
   - Relevant RUNBOOK or scoring doc.
3. For DB work:
   - Run safe introspection (e.g., `introspect_public()`).
   - Verify presence of key tables/views they plan to touch.
4. State a short **“Context OK”** summary:
   - Which project
   - Which DB
   - Which key objects are present

Only then should they generate migrations, SQL, or code changes.

---

## 11. KB and Master Guide maintenance

This is critical for long-term stability.

### 11.1 Standing instruction: tell Rick when the KB is stale

AI agents using this Master Guide and any KB derived from it must:

- **Explicitly tell Rick** when they detect that:
  - The KB or Master Guide disagrees with actual repo state (schema, env, flags).
  - New features or view versions have been introduced that the guide does not mention.
  - Scoring rules, trip windows, or environment handling have changed in a material way.

Examples where agents should say “KB needs update”:

- A new `*_v2` leaderboard or trip view is added and becomes the preferred source.
- New config flags or tables (e.g., different trip registry, trophy engine revamp).
- Scoring rubric changes (e.g., rarity_v2 goes live, novelty/decay enabled).
- Env precedence changes in `src/env.ts` or Supabase client.

### 11.2 When to update the Master Guide vs repo AGENTS

- Update **this Master Guide** when changes affect:
  - Overall architecture or data flow.
  - Cross-repo concepts (trips, scoring, modes).
  - AI collaboration norms and processes.
  - Canonical Supabase project or env handling.

- Update **repo-local AGENTS.md** when changes affect:
  - How to safely edit that repo.
  - New features/routes/views specific to that repo.
  - Commands, scripts, or local tooling for that repo.

### 11.3 KB hygiene

- Avoid maintaining many overlapping KB docs.
- Preferred pattern:
  - A single **EcoQuest_Master_Guide_v1.md** in the KB.
  - Repo-local `AGENTS.md` and key docs referenced, not duplicated.
- When Master Guide v1 becomes too large or outdated:
  - Create v2 (e.g., `EcoQuest_Master_Guide_v2.md`).
  - Deprecate v1 explicitly in the KB and in the repos.

---

## 12. Appendix – key documents and pointers

These files are considered **authoritative references** and should be kept in sync with this guide:

- **Frontend repo**
  - `AGENTS.md` (root)
  - `docs/ARCHITECTURE_OVERVIEW.md`
  - `docs/SECURITY_RLS.md`
  - `docs/RUNBOOK_*.md` (leaderboard, Bingo, Streaks, Trophies, Rarity, etc.)

- **Backend / scoring repo**
  - `AGENTS.md` (root)
  - Migration files under `supabase/migrations/*`
  - CI workflows under `.github/workflows/*`
  - Scoring and trip mode docs (Path to Bronze, ADRs, etc.)

- **Path to Bronze doc**
  - Captures Bronze milestone acceptance criteria, CI outline, and sanity SQL.
  - Should be treated as a **deep dive** referenced by this guide, not the canonical behavioral spec.

- **Trip-specific addenda**
  - Costa Rica 2025 addendum (CR2025) with daily logistics and scoring simplifications.
  - Big Bend and future trips may get similar addenda; they should reference this Master Guide instead of re-defining behavior.

---

## 13. Export rubric

For re-use and ingestion:

- **Filename**: `EcoQuest_Master_Guide_v1.md`
- **Suggested repo path**: `docs/EcoQuest_Master_Guide_v1.md`
- **Format**: UTF-8 encoded Markdown
- **Schema / header order**:
  1. Title and overview
  2. Canonical truths & guardrails
  3. Architecture and data flow
  4. Trips, cohorts, and modes
  5. Scoring & game mechanics
  6. Data model & key objects
  7. Environment, Supabase, and deployment
  8. Frontend behavior
  9. Backend behavior
  10. Offline leaderboard fallback
  11. AI collaboration rules
  12. KB and Master Guide maintenance
  13. Appendix / pointers
  14. Export rubric
- **Quick validation steps**:
  - Open the file and confirm headings render correctly in GitHub/Markdown preview.
  - Check that all references to Supabase project ID and key view names match current repos.
  - Ensure there is no hardcoded secret material (only URLs and anon key patterns).
- **Diff notes**:
  - Future versions (v2, v3, …) should preserve this structure where possible.
  - When major concepts change (e.g., scoring 2.0, trip registry overhaul), add a new versioned file and update KB references, rather than silently mutating v1 in breaking ways.
