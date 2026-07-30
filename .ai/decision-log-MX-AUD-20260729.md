# Decision Log: MX-AUD-20260729

**Date:** 2026-07-29
**Agent:** Dex
**Mode:** YOLO
**Story:** `docs/stories/story-MX-AUD-20260729-autonomous-master-audit.md`
**Rollback base:** `41ec4d39e165cab013988fab9aef54649b616095`

## Decisions

### Continue from `feat/unified-mx-design-system`

- Reason: the branch is clean, contains current `origin/main` at `393ebc5b`,
  and carries the 17 incremental Design System commits explicitly referenced by
  the prompt.
- Alternatives: edit dirty `main`; create another branch from `main`; discard
  the existing Design System work.
- Consequence: existing work is preserved and audited rather than duplicated.

### Treat previous completion reports as hypotheses

- Reason: live source inspection still finds parallel shells and legacy scopes,
  while the prompt requires fresh direct evidence.
- Alternatives: accept the previous report; restart the implementation.
- Consequence: every completion claim must be re-proved by current gates and
  authenticated runtime evidence.

### Keep secrets process-only

- Reason: credentials were explicitly authorized but must not be persisted,
  logged, screenshotted or committed.
- Alternatives: create `.env.agent.local`; reuse only already authenticated
  official sessions.
- Decision: prefer existing authenticated CLI/browser sessions and inject a
  token only into a single process if a service cannot be reached otherwise.

### Remove current diagnostic scripts that contain historical credentials

- Evidence: Gitleaks 8.30.1 scanned 2,074 commits and reported 86 redacted
  findings. Ten current diagnostic scripts contained Supabase JWTs or
  service-role material; they were unreferenced, printed sensitive/PII data and
  remain recoverable from Git history.
- Decision: remove the ten scripts instead of converting obsolete one-off
  diagnostics. The current tracked tree now has only 28 reviewed false
  positives: documentation examples, a GitHub Secret reference, migration
  checksums and PMR identifiers.
- Consequence: the historical findings remain and the exposed credentials are
  an active incident. Rotation is immediate and is not conditional on preview,
  backup or application deployment. Supabase's current guidance is to create a
  new `sb_secret_...` key, replace the compromised JWT-based `service_role` in
  every server-side consumer, verify each consumer and only then disable the
  legacy key; modern and legacy keys coexist during that cutover.
- Consumer map (names/presence only): Vercel `mxperformance` has
  `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_SECRET_KEY` in development, preview
  and production; GitHub Actions has no service-role secret; 17 Edge Function
  source files and 34 operational scripts reference
  `SUPABASE_SERVICE_ROLE_KEY`. The browser has a modern publishable key
  available, while the legacy anonymous key remains enabled. The individual
  owner, evidence, current key, replacement, validation and disablement action
  for every consumer are tracked in
  `docs/auditoria/matrizes/MATRIZ_ROTACAO_CREDENCIAIS_MX.md`; aggregate counts
  do not close the incident.
- Temporary exception: deleting or resetting the legacy JWT before those
  consumers are replaced would interrupt active server and Edge Function
  workloads and may invalidate legacy-key verification. Until cutover, the ten
  obsolete consumers are removed, new use of the compromised key in human-run
  scripts is blocked, its value must not be redistributed, and production
  consumers remain explicitly classified as exposed rather than safe. The
  exception expires **2026-07-30 18:00 BRT**; by then the operator must either
  complete consumer-by-consumer replacement and disable the legacy keys, or
  disable the remaining affected workloads and open a renewed, named exception
  with a shorter expiry. Rewriting Git history remains a separately coordinated
  action and does not replace rotation.
- Purge and evidence gate: after rotation, scan the full Git object database,
  branches/tags, CI artifacts, job logs, deployment logs, screenshots, local
  caches and generated archives. Revoke or delete recoverable artifacts where
  supported; history rewriting requires a coordinated force-push and clone
  invalidation plan. The incident may close only with a redacted record of the
  new key identifiers, per-consumer validation, legacy-key disablement, rotation
  timestamps for every exposed credential family and a clean post-remediation
  scan. None of those completion evidences exists yet.

### Prefer platform-managed modern Edge API-key maps

- Evidence: current Supabase Edge runtimes inject
  `SUPABASE_SECRET_KEYS` and `SUPABASE_PUBLISHABLE_KEYS` as JSON maps; the
  `default` member contains the current modern key. A custom
  `SUPABASE_SECRET_KEY` Edge secret could not be created because the
  `SUPABASE_*` namespace is reserved; the rejected request made no change.
- Decision: centralize resolution in `_shared/api-keys.ts`, prefer the
  platform-managed maps and retain the legacy `SUPABASE_SERVICE_ROLE_KEY` /
  `SUPABASE_ANON_KEY` only as temporary cutover fallbacks. Invalid or absent
  maps without a fallback fail closed.
- Scope: administrative and session clients in 15 Edge sources now use the
  resolver. `google-calendar-sync` and `google-oauth-handler` replaced the
  legacy Bearer with the existing dedicated internal token and manual
  user-session verification. `google-meet-ata` now uses its dedicated cron
  secret from Vault with manual user-session verification.
  `mx-critical-jobs-health` still needs the legacy JWT because no dedicated
  health token exists in the Postgres Vault; a modern `sb_secret_...` key is
  not a JWT and cannot replace that authentication contract directly.
- Validation: 4 resolver tests, 16 focused tests, TypeScript typecheck and
  `deno check --node-modules-dir=auto` for all 11 changed Edge entrypoints
  returned zero. The flag is part of the repository's official Deno workflow
  and is required to resolve the `openai` package. Because that command
  rewrites workspace `node_modules` links to the Deno layout, `npm ci` restored
  the lockfile installation before the final web regression.
- Vercel preparation: `SUPABASE_SECRET_KEY` in development, preview and
  production was updated through the DevOps authority and then compared
  ephemerally with the current modern key; all three targets matched. The
  application runtime still uses the legacy variable, so this is preparation,
  not proof of completed cutover or rotation.

### Never recover authority from possession of an email address

- Reason: `store-pre-registration` is public and uses `service_role`. The
  previous orphan-adoption branch reset an existing Auth password, and its
  reactivation branch could activate a deliberately disabled account.
- Alternatives: keep orphan adoption; require an authenticated Admin MX action;
  treat every existing Auth identity as an existing account.
- Decision: the public endpoint never resets, adopts or reactivates an existing
  identity. Recovery remains email-controlled; activation requires Admin MX.

### Keep remote database changes blocked without a restorable backup

- Reason: the Management API still reports no listed backup and PITR disabled,
  despite WAL-G being enabled.
- Consequence: remote inventory, advisors, migrations and function source may
  be read, but no DDL or data mutation is authorized in this story state.

### Preserve React Router 7.18.2 and accept the RSC-only advisory

- Evidence: `npm audit --omit=dev` reports one high advisory across
  `react-router` and `react-router-dom`: CSRF in RSC Action execution.
- Applicability: the product is a Vite SPA using `BrowserRouter`; it has no
  RSC, SSR, Server Actions or React Router action handlers.
- Alternative tested: 7.11.0 removed that advisory but introduced high
  advisories for open redirect/XSS and route-matching DoS that are closer to
  this SPA's actual surface.
- Decision: restore 7.18.2, document the bounded acceptance and keep the
  aggregate development-tree audit as unresolved supply-chain debt.

## Rollback

- Code changes: revert only commits produced for this story.
- Database changes: no production mutation before a verified backup and
  migration-specific down plan.
- Deployment: retain the previous READY deployment identifier before promoting
  a new release.
