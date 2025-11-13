# EcoQuest Live - AGENTS.md

Guidance for AI coding agents and human contributors working on EcoQuest Live.

EcoQuest Live is a Vite + React + TypeScript single page app backed by Supabase. It visualizes biodiversity competition data (leaderboards, trophies, bingo, maps, daily digests) for trips like EcoQuest Costa Rica and Big Bend.

This file defines:
- Global rules for all agents
- Role scopes for different types of work
- Safe commands and workflows
- How and when to update this file as the project evolves

---

## 0. Global rules for all agents

1. **Do no harm by default**
   - Prefer additive changes over destructive ones.
   - Avoid breaking existing routes, scoring, or deployments, especially during active trips.
   - If a task could affect production behavior in a risky way, propose a plan or patch behind a feature flag instead of changing core behavior directly.

2. **Respect environment and secrets**
   - Do not hardcode secrets or keys.
   - Do not change how env is loaded unless the task explicitly asks for it.
   - Env related files:
     - `src/env.ts`
     - `public/env.js`
     - `src/uiConfig.ts`
     - `src/lib/supabaseClient.ts`
   - Keep runtime override behavior and feature flags intact unless explicitly requested.

3. **Respect Supabase security and RLS**
   - Assume Row Level Security is enabled.
   - Do not weaken RLS policies or auth checks.
   - Writes should happen through existing RPCs or service role logic, not by bypassing security.

4. **Prefer versioned DB views**
   - When changing contracts of views, use suffixes like `_v2` instead of modifying existing `_v1` views in a breaking way.
   - Keep old views stable if other clients might still rely on them.

5. **Use the smallest necessary surface area**
   - When implementing a feature, only touch:
     - The files that own the behavior.
     - The minimum supporting types and helpers.
   - Avoid cross cutting edits across unrelated modules.

6. **Explain what you changed**
   - After code changes, provide:
     - A short summary of what changed and why.
     - Any new commands to run or checks to perform.
     - Any new conventions that should be reflected back into this AGENTS.md.

### 0.1 Supabase and env contract (frontend)

- This frontend repo only ever uses the **anon** key. Service role keys and `DB_URL` live in backend or CI contexts, not in this app.
- Canonical Supabase project for EcoQuest Live:
  - Base URL: `https://fceyhhzufkcqkjrjbdwl.supabase.co`
- Env precedence for Supabase client config:
  1. `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY` (build time, from the hosting provider or Lovable project Environment Variables)
  2. `globalThis.__SUPABASE_URL` and `globalThis.__SUPABASE_ANON_KEY` from `public/env.js` (runtime overrides for environments where rebuilds are expensive)
  3. Safe, development oriented defaults in `src/lib/supabaseClient.ts` (for local use only)
- Do not change this precedence or point the app at a different Supabase project without:
  - Coordinating with the Supabase / scoring repo
  - Updating the EcoQuest Master Guide and this AGENTS.md

### 0.2 Trip profiles and scoring origin

- Trip dates, time zones, participation (roster), and scoring rules live in Supabase tables, views, and RPCs. This repo should treat them as data, not business logic.
- The frontend:
  - Reads trip scoped views and RPCs for leaderboards, rosters, trophies, bingo, and rarity.
  - Does not reimplement scoring or trip window logic in React components.
- When a new trip mode or cohort is needed:
  1. Add or update trip config and views in the Supabase repo (for example, new `trip_members_*` and `trip_leaderboard_*` views).
  2. Add or update typed API helpers in `src/lib/api.ts`.
  3. Wire new or updated UI components to those helpers.
- Do not hardcode trip dates or scoring rules in UI code except for light copy or labels that are already driven by server outputs.

---

## 1. Project layout and key files

High level structure:

- `src/main.tsx`  
  React entry point. Bootstraps the SPA, sets up router, Leaflet, and logs active profile.

- `src/App.tsx`  
  SPA shell. Header ticker stack, navigation, route definitions for:
  - Leaderboard
  - Daily / digest
  - Trophies
  - Bingo
  - Map
  - Observation detail
  - Profile / user page
  - Guide
  - Compare tools
  - Admin / debug views  
  Many of these are conditionally enabled via feature flags.

- `src/env.ts`  
  Typed access to Vite env vars and runtime overrides. Exposes feature flags for trophies, compare, bingo, tickers, admin tools, and similar options.

- `src/uiConfig.ts`  
  UI tuning and trip specific metadata (labels, colors, paths). This should be treated as configuration, not business logic.

- `public/env.js`  
  Optional runtime overrides for environments where rebuilds are expensive. Used to toggle flags or profiles without redeploying. Must remain a thin layer over the same Supabase project and feature flags defined by the backend.

- `src/lib/supabaseClient.ts` and `src/integrations/supabase/client.ts`  
  Supabase client creation, URL and key sanity checks, and typed helpers. All direct Supabase client instances should be created here and reused.

- `src/lib/api.ts`  
  Data access layer for leaderboard, silver scoring, roster, and related views. Prefer going through this file rather than scattering queries across the app.

- `src/features/*`  
  Focused feature modules, such as:
  - Bingo board and claims
  - Trophies and cabinet
  - Admin and debug tools
  - Compare tools
  - Daily view helpers

- `src/pages/*`  
  Route level screens:
  - `Leaderboard.tsx`
  - `Daily.tsx`
  - `Map.tsx`
  - `UserPage.tsx`
  - `Trophies.tsx`
  - `Bingo.tsx`
  - `Guide.tsx`
  - `Admin*.tsx` or `Debug*.tsx` pages

- `docs/ARCHITECTURE_OVERVIEW.md`  
  High level architecture, data flow, schema and monitoring notes.

- `docs/SECURITY_RLS.md`  
  RLS and security reference for Supabase.

- `docs/RUNBOOK_*.md`  
  Operational playbooks. These are the source of truth for sanity checks and debugging patterns.

When in doubt about architecture or data flow, check `docs/ARCHITECTURE_OVERVIEW.md` and the relevant RUNBOOK first, then return to this file.

---

## 2. Agent roles and scopes

Use these conceptual roles for Codex and other AI coding tasks. The names are for humans and prompts. Agents are expected to obey the scope rules.

### 2.1 `ecoquest-ui-agent` – frontend and client side logic

**Scope**

- Allowed:
  - `src/` React components, hooks, pages, features
  - Client side types for data rows
  - Supabase client usage in `src/lib/api.ts` and related files
- Avoid:
  - Editing SQL migrations or functions
  - Editing RLS policies
  - Changing env loading semantics in `src/env.ts` or `public/env.js` unless explicitly instructed

**Typical tasks**

- Adjusting leaderboard layouts, labels, and popovers
- Wiring new read only views into the UI via `src/lib/api.ts`
- Adding a new tab or route under the existing app shell
- Improving map behavior and filtering
- Updating bingo or trophies UI when the backend views already exist
- Surfacing new read only debug or guide panels for existing views

**Key rules**

- Prefer to add or edit functions in `src/lib/api.ts` instead of embedding Supabase queries directly inside components.
- Derive and reuse common types in a central place for CR trip views and leaderboard rows.
- Keep polling intervals and local storage key patterns consistent with existing code.
- If a new Supabase view or RPC is required, coordinate with `ecoquest-sql-agent` style changes in the backend repo first.

---

### 2.2 `ecoquest-sql-agent` – Supabase schema, scoring and views

This role applies to the Supabase and scoring repo, not this frontend repo, but is included here for coordination.

**Scope**

- Allowed:
  - Supabase migrations under `supabase/migrations/*`
  - SQL view definitions, helper tables, RPCs and index creation
  - Edge functions under `supabase/functions/*` when requested
- Avoid:
  - Dropping tables or views unless a migration clearly indicates a deprecation
  - Changing RLS policies or auth behavior without explicit direction
  - Modifying core auth tables or globally used config tables without strong justification

**Typical tasks**

- Creating or updating views that power:
  - Trip rosters
  - Observation base tables
  - Scoring and Silver breakdowns
  - Leaderboard, bingo, streaks, and daily summary surfaces
- Adding helper tables and heartbeats for ingestion or sanity checks
- Adjusting scoring logic using versioned views (for example `*_v2`) while preserving older contracts

**Key rules**

- Use `CREATE OR REPLACE VIEW` where safe. If changing columns or types in a breaking way, create a new version suffixed with `_v2` or higher.
- Keep `v1` views stable for existing clients and provide a clear migration path in the code and docs.
- When you add a new schema element that is important to agents (for example a new view that the UI should consume), also propose updates to:
  - This AGENTS.md (to describe how the UI should use it)
  - The EcoQuest Master Guide and KB files

---

### 2.3 `ecoquest-ops-agent` – runbooks, debug tools and checks

**Scope**

- Allowed:
  - `docs/RUNBOOK_*.md` and other ops documentation in the frontend repo
  - Debug pages that surface read only view information (for example ingest freshness, heartbeat status)
- Avoid:
  - Any change that modifies scoring or write paths
  - Any direct schema changes without going through `ecoquest-sql-agent` style workflows

**Typical tasks**

- Adding or updating RUNBOOK steps for:
  - Checking ingest freshness
  - Verifying leaderboard correctness
  - Auditing bingo and trophy state
- Adding debug UI to display outputs of read only views such as an ingest heartbeat or freshness view

**Key rules**

- Never assume production credentials. All examples and commands should be copy paste ready but safe.
- Prefer minimal, focused debug UIs with clear labels and read only queries.
- Prefer new, read only debug views instead of overloading core map or leaderboard views during live trips.

---

## 3. Commands and tooling

Use these commands unless the repo changes them:

- Install dependencies:
  ```sh
  npm install
  ```

- Run dev server:
  ```sh
  npm run dev
  ```

- Lint and typecheck:
  ```sh
  npm run lint
  npm run typecheck
  ```

- Build for production:
  ```sh
  npm run build
  ```

- Preview production build:
  ```sh
  npm run preview
  ```

Check `package.json` for any additional project specific scripts (for example, storybook, test, or schema generation). Do not add new top level scripts without documenting them in this section.

---

## 4. When to coordinate with backend and KB

Some changes in this repo must be coordinated with the Supabase repo and the knowledge base:

- Adding a new API call to a view or RPC that does not exist yet.
- Switching from a `_v1` view to `_v2` for any leaderboard, bingo, streaks, or trophy features.
- Introducing new feature flags that control major UI surfaces (tabs, panels, or debug modes).
- Changing how `src/env.ts`, `public/env.js`, or `src/lib/supabaseClient.ts` derive Supabase config.

In these cases:

1. Confirm the backend objects and behavior in the Supabase repo.
2. Update or add entries in the EcoQuest Master Guide and KB files.
3. Reflect any new patterns or expectations in this AGENTS.md file.

---

## 5. Keeping AGENTS.md and the KB in sync

Update this AGENTS.md file when you:

- Add or rename a feature flag that controls a major route or core feature (leaderboard variants, bingo, trophies, admin, debug).
- Introduce a new Supabase view or RPC that the frontend should prefer (for example, new `*_competition_*`, `*_silver_*`, or trip scoped views).
- Change how environment configuration, Supabase URL/key selection, or runtime overrides work.
- Add or remove a top level route under `src/pages` that changes how students, teachers, or admins navigate the app.

When AGENTS.md changes in a way that affects scoring, trip behavior, or environment handling:

- Also update the EcoQuest Master Guide and related KB files so that:
  - AI agents working from the KB stay aligned.
  - Repo local instructions (this file) and higher level project rules do not drift.

If in doubt, prefer a short note here and in the Master Guide, then keep changes additive and reversible.
