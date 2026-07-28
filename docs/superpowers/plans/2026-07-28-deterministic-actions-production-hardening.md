# Deterministic Actions Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deterministic action engine operational with real production data, clickable and auditable resolution, Realtime refresh, enforced security headers, complete CI gates, and corrected database function privileges without adding pages or routes.

**Architecture:** Keep `deriveDeterministicActions` as a pure rules engine. Add a focused adapter and hook that read RLS-scoped Supabase data, convert rows into the engine contract, subscribe to relevant Realtime changes, and persist explicit user resolutions. Render the same reusable panel inside existing seller and manager surfaces only. Harden Vercel CSP by moving the inline cache-reset script to a static file and harden Postgres privileges through one idempotent migration.

**Tech Stack:** React 19, TypeScript 5.8, Supabase JS 2, PostgreSQL/RLS/Realtime, Bun test, ESLint, Vite, Vercel, GitHub Actions.

## Global Constraints

- Do not create new pages or routes.
- Do not add new AI/LLM integrations.
- Preserve the current visual language and existing user flows.
- All recommendations must be deterministic and based on canonical database facts.
- Database changes must be idempotent and safe for the production project `fbhcmzzgwjdgkctlfvbo`.
- Every behavior change follows RED, GREEN, REFACTOR.
- Automated merge gates require tests, typecheck, lint, build, database type drift, migration checks, RLS regression, secret scanning and an accepted Vercel Preview deployment.
- Manual pre-merge evidence remains mandatory for authenticated Preview smoke, enforced CSP headers, production ACL/RLS/Realtime queries and a persisted-resolution reread; any failure blocks merge even when GitHub reports the PR as mergeable.
- Manual post-merge evidence validates the production deployment against the merged SHA, including the production-domain smoke and response headers. A failure blocks promotion completion and triggers rollback; it cannot retroactively block the already completed merge.

---

## File Structure

- Create `.github/workflows/quality-gates.yml`: execute tests, typecheck, lint and build on pull requests and pushes to `main`.
- Create `public/pre-cadastro-cache-reset.js`: external cache-reset script permitted by enforced CSP.
- Modify `index.html`: load the external script instead of inline executable JavaScript.
- Modify `vercel.json`: enforce `Content-Security-Policy`, remove `unsafe-eval` and the placeholder report endpoint.
- Modify `src/lib/deterministic-actions.ts`: canonical URLs, contact safety, stable ordering and deduplication.
- Create `src/features/deterministic-actions/deterministic-action-data.ts`: pure row-to-engine adapters and resolved-action filtering.
- Create `src/features/deterministic-actions/useDeterministicActions.ts`: RLS-scoped fetch, Realtime refresh and resolution persistence.
- Create `src/features/deterministic-actions/DeterministicActionsPanel.tsx`: reusable accessible action list with navigation and resolve control.
- Modify `src/pages/ManagerMentor.tsx`: remove duplicated target warning and render the real action panel.
- Modify `src/pages/VendedorHome.tsx`: replace the static suggestion with the seller’s highest-priority deterministic action and real CTA.
- Create `supabase/migrations/20260728061728_deterministic_actions_runtime_and_security.sql`: resolution ledger, RLS, Realtime and trigger-function ACL hardening.
- Create `supabase/migrations/20260728070054_deterministic_actions_rls_private_access_helper.sql`: keep the store-scope helper outside the exposed API while allowing authenticated RLS evaluation.
- Create focused tests under `src/lib`, `src/features/deterministic-actions` and `src/test`.

### Task 1: Establish failing production contracts

**Files:**
- Create: `src/test/production-hardening-contract.test.ts`
- Create: `src/features/deterministic-actions/deterministic-action-data.test.ts`
- Modify: `src/lib/deterministic-actions.test.ts`

**Interfaces:**
- Consumes: current `deriveDeterministicActions` API.
- Produces: expected contracts for enforced CSP, external script, canonical routes, contact safety, mapping, resolution filtering and ordering.

- [ ] **Step 1: Write failing tests**
  - Assert `vercel.json` uses `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`.
  - Assert script policy excludes `unsafe-eval` and placeholder report URLs.
  - Assert `index.html` contains no inline executable cache-reset block and references `/pre-cadastro-cache-reset.js`.
  - Assert cancelled-sale, overdue-action and proposal actions use `/carteira-clientes?clienteId=`.
  - Assert contact-oriented actions are suppressed for `do_not_contact=true`.
  - Assert duplicate actions collapse by scenario/entity and priority order is deterministic.
  - Assert raw Supabase rows map to all engine inputs and persisted resolutions suppress matching actions.

- [ ] **Step 2: Open a pull request and verify RED**
  - Expected: CI fails because the new files/functions and security configuration do not yet satisfy the contracts.

### Task 2: Harden Vercel security and CI

**Files:**
- Create: `.github/workflows/quality-gates.yml`
- Create: `public/pre-cadastro-cache-reset.js`
- Modify: `index.html`
- Modify: `vercel.json`

**Interfaces:**
- Produces: an external browser script and enforced CSP compatible with the current static Vite application.

- [ ] **Step 1: Move cache-reset logic to the external file**
- [ ] **Step 2: Replace report-only CSP with enforced CSP**
- [ ] **Step 3: Remove `unsafe-eval` and the placeholder report URI**
- [ ] **Step 4: Add CI jobs for `bun test`, `npm run typecheck`, `npm run lint` and `npm run build`**
- [ ] **Step 5: Run CI and verify the security contract is GREEN**

### Task 3: Correct deterministic rule behavior

**Files:**
- Modify: `src/lib/deterministic-actions.ts`
- Modify: `src/lib/deterministic-actions.test.ts`

**Interfaces:**
- Consumes: `DeterministicActionInput`.
- Produces: ordered, deduplicated `DeterministicAction[]` with canonical application URLs.

- [ ] **Step 1: Add failing tests for contact safety, ordering, dedupe and canonical URLs**
- [ ] **Step 2: Extend `CustomerItem` with `do_not_contact`**
- [ ] **Step 3: Suppress contact actions for blocked customers**
- [ ] **Step 4: Replace legacy `/carteira` links with `/carteira-clientes`**
- [ ] **Step 5: Sort by priority, due date and stable ID, then deduplicate by scenario/entity**
- [ ] **Step 6: Run all engine tests GREEN**

### Task 4: Build the production data adapter

**Files:**
- Create: `src/features/deterministic-actions/deterministic-action-data.ts`
- Create: `src/features/deterministic-actions/deterministic-action-data.test.ts`

**Interfaces:**
- Produces:
  - `buildDeterministicActionInput(rows, context): DeterministicActionInput`
  - `filterResolvedActions(actions, resolutions): DeterministicAction[]`
  - `toManualCompletions(resolutions): ManualCompletionItem[]`

- [ ] **Step 1: Write failing mapping tests using realistic Supabase rows**
- [ ] **Step 2: Map opportunities, clients, appointments and `proposta_enviada` events**
- [ ] **Step 3: Map resolution ledger rows into manual completions**
- [ ] **Step 4: Filter only exact action IDs resolved for the current rule version**
- [ ] **Step 5: Run adapter tests GREEN**

### Task 5: Add auditable resolution ledger and privilege hardening

**Files:**
- Create: `supabase/migrations/20260728061728_deterministic_actions_runtime_and_security.sql`
- Extend: `src/test/production-hardening-contract.test.ts`

**Interfaces:**
- Produces table `public.deterministic_action_resolutions` with RLS and Realtime.
- Revokes direct execute access to `public.prevent_valor_negociado_tamper_after_close()` from `PUBLIC`, `anon` and `authenticated`.

- [ ] **Step 1: Write migration contract assertions**
- [ ] **Step 2: Create the resolution ledger with unique `(completed_by, action_id, rule_version)`**
- [ ] **Step 3: Add RLS policies using `central_can_access_store`, role checks and ownership checks**
- [ ] **Step 4: Add Realtime publication idempotently**
- [ ] **Step 5: Revoke trigger-function direct execution and grant only database execution roles**
- [ ] **Step 6: Apply migration to production and verify ACL, policies, grants and publication**

### Task 6: Add the RLS-scoped Realtime hook

**Files:**
- Create: `src/features/deterministic-actions/useDeterministicActions.ts`
- Extend: `src/features/deterministic-actions/deterministic-action-data.test.ts`

**Interfaces:**
- Produces `useDeterministicActions({ targetPace? })` returning `{ actions, loading, error, refresh, resolveAction }`.

- [ ] **Step 1: Query opportunities, clients, appointments, proposal events and resolutions in parallel**
- [ ] **Step 2: Scope sellers by `seller_user_id` and all other roles by active store, while retaining RLS as final authority**
- [ ] **Step 3: Subscribe to store-scoped changes in all five sources and debounce refreshes**
- [ ] **Step 4: Persist a resolution with evidence, entity IDs, rule version and authenticated actor**
- [ ] **Step 5: Refetch after resolution and on Realtime events**

### Task 7: Render actions in existing screens

**Files:**
- Create: `src/features/deterministic-actions/DeterministicActionsPanel.tsx`
- Modify: `src/pages/ManagerMentor.tsx`
- Modify: `src/pages/VendedorHome.tsx`

**Interfaces:**
- Consumes: hook output.
- Produces: accessible existing-screen UI with working CTA and resolve action.

- [ ] **Step 1: Render priority, explanation, evidence summary, due date and action CTA**
- [ ] **Step 2: Use React Router navigation for `actionUrl`**
- [ ] **Step 3: Require explicit confirmation before marking resolved**
- [ ] **Step 4: Remove the duplicate hand-built manager target warning**
- [ ] **Step 5: Replace seller static suggestion with highest-priority live action and CTA**
- [ ] **Step 6: Keep existing empty/loading/error states and keyboard accessibility**

### Task 8: Verification and production promotion

**Files:**
- Update: `docs/auditoria/final-cancelamento-projecoes.md`

- [ ] **Step 1: Verify PR CI reports zero failures for tests, typecheck, lint and build**
- [ ] **Step 2: Verify Vercel Preview is READY and returns HTTP 200**
- [ ] **Step 3: Verify Preview headers contain enforced CSP and no report-only CSP**
- [ ] **Step 4: Verify authenticated seller and manager actions are loaded from production data**
- [ ] **Step 5: Verify resolution insert, UI removal and Realtime refresh**
- [ ] **Step 6: Merge only after all gates are green**
- [ ] **Step 7: Verify production deployment commit, domain HTTP 200 and headers**
- [ ] **Step 8: Query production ACL/policies/publication and document exact results**

**Automated GitHub merge gates:** Quality Gates, db-types-diff, migration checksum/reversibility, RLS matrix, secret scanning, accessibility, bundle budget and Vercel Preview status.

**Manual pre-merge gates:** authenticated seller/manager Preview smoke, enforced CSP response headers, resolution insert followed by persisted reread and Realtime UI removal, and the production ACL/policy/publication query. Any failure blocks merge.

**Manual post-merge promotion gates:** production deployment must be READY for the merged SHA, and the production domain must pass HTTP, CSP and authenticated route smoke checks. Any failure blocks promotion completion and triggers rollback.
