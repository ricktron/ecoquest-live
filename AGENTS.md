# EcoQuest Live – AGENTS.md

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
  Typed access to Vite env vars and runtime overrides. Exposes feature flags for trophies, compare, bingo, tickers, admin tools, etc.

- `src/uiConfig.ts`  
  UI tuning and trip specific metadata (labels, colors, paths). Should be treated as configuration, not business logic.

- `public/env.js`  
  Optional runtime overrides for environments where rebuilds are expensive. Used to toggle flags or profiles without redeploying.

- `src/lib/supabaseClient.ts` and `src/integrations/supabase/client.ts`  
  Supabase client creation, URL and key sanity checks, and typed helpers.

- `src/lib/api.ts`  
  Data access layer for leaderboard, silver scoring, roster and related views. Prefer going through this file rather than scattering queries across the app.

- `src/features/*`  
  Focused feature modules, such as:
  - Bingo board and claims
  - Trophies and cabinet
  - Admin and debug tools

- `src/pages/*`  
  Route level screens:
  - `Leaderboard.tsx`
  - `Daily.tsx`
  - `Map.tsx`
  - `UserPage.tsx`
  - `Trophies.tsx`
  - `Bingo.tsx`
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

Use these conceptual roles for Codex tasks. The names are for humans and prompts. Codex is expected to obey the scope rules.

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

**Key rules**

- Prefer to add or edit functions in `src/lib/api.ts` instead of embedding Supabase queries directly inside components.
- Derive and reuse common types in a central place for CR trip views and leaderboard rows.
- Keep polling intervals and local storage key patterns consistent with existing code.

---

### 2.2 `ecoquest-sql-agent` – Supabase schema, scoring and views

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
  - Leaderboard and daily summary surfaces
- Adding helper tables and heartbeats for ingestion or sanity checks
- Adjusting scoring logic using versioned views (for example `*_v2`) while preserving older contracts

**Key rules**

- Use `CREATE OR REPLACE VIEW` where safe. If changing columns or types in a breaking way, create a new version suffixed with `_v2` or higher.
- Keep `v1` views stable for existing clients and provide a clear migration path in the code and docs.
- When you add a new schema element that is important to agents (for example a new view that the UI should consume), also propose updates to this AGENTS.md in section 5.

---

### 2.3 `ecoquest-ops-agent` – runbooks, debug tools and checks

**Scope**

- Allowed:
  - `docs/RUNBOOK_*.md` and other ops documentation
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

---

## 3. Commands and tooling

Use these commands unless the repo changes them:

- Install:
  ```sh
  npm install
  ```

- Local dev:
  ```sh
  npm run dev
  ```

- Build:
  ```sh
  npm run build
  ```

- Preview built app:
  ```sh
  npm run preview
  ```

- Lint:
  ```sh
  npm run lint
  ```

If there is a script like `scripts/check-supabase-env.mjs`, run it when env or Supabase setup is involved to catch misconfigurations before running the app.

For SQL work, prefer to use:

- Supabase CLI migrations where configured, or  
- The established migration folder structure in `supabase/migrations/*`.

---

## 4. Standard workflows

These recipes describe how agents should approach common tasks.

### 4.1 Wiring a new read only view into the UI

1. Confirm the view exists in the database and inspect its columns.
2. Add or update a typed row interface in `src/lib/api.ts` or a shared types file.
3. Add a function in `src/lib/api.ts` that:
   - Executes the Supabase query
   - Handles errors in a way consistent with existing functions
   - Returns strongly typed data
4. Update the relevant page or feature in `src/pages/*` or `src/features/*` to consume that helper.
5. If this view is trip or scoring specific, add a one line mention to section 5 of this file about where it is used and what it powers.

### 4.2 Changing scoring or leaderboard behavior in SQL

1. Locate the existing view or RPC that drives the behavior (for example a scoring view or trip specific leaderboard).
2. If the change is breaking, create a new version with `_v2` suffix and keep `_v1` intact.
3. Write the new logic in the `_v2` view, with comments explaining each calculated column and any filters.
4. Add simple verification queries that:
   - Check row counts
   - Check a few example users
   - Compare old vs new totals if useful
5. Coordinate with the frontend:
   - Update `src/lib/api.ts` to read from the new view.
   - Update any UI labels to match the new semantics.
6. Update section 5 of this file with a short note describing the new view and how agents should prefer it going forward.

### 4.3 Adding or updating a debug or ops tool

1. Check existing RUNBOOK docs for debug patterns.
2. If adding a new read only view such as an ingest heartbeat:
   - Implement the view and keep it simple and stable.
   - Add a short section to a relevant RUNBOOK (`docs/RUNBOOK_*.md`) describing how to read it.
3. If adding a debug page in the UI:
   - Create a route under an existing admin or debug path.
   - Use read only Supabase queries only.
   - Label outputs clearly and avoid accidental writes.
4. Update section 5 of this file with a short pointer to the new debug surface.

---

## 5. Continuous improvement and self updates

AGENTS.md is a living document. Both humans and AI agents are expected to improve it.

Agents and contributors should propose edits to this file when:

- A new major feature is added that changes how agents should work (for example a new scoring version, a new trip layer, or a new ingestion pattern).
- A new runbook or debug surface becomes the normal way to troubleshoot something.
- A rule in this file is discovered to be incomplete, confusing, or wrong.
- New commands or checks are required to safely run or verify the app.

When you update this file:

1. Keep it concise and focused on actionable guidance.
2. Add short, date stamped notes when helpful. Example:
   - `2025-11-12: Added instructions for trip specific Silver scoring view v2 and prefer it to v1 for CR2025 UI.`
3. Reference the relevant code or docs briefly, rather than duplicating large chunks of content.
4. Ensure the rules remain consistent and do not conflict with existing sections.

All changes to AGENTS.md should go through normal version control and review. Treat this file as the contract between the project and all coding agents.

---
