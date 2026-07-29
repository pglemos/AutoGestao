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
