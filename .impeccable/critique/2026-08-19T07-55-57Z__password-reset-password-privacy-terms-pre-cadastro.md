---
target: Landing, /login, /forgot-password, /reset-password, /privacy, /terms, /pre-cadastro
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-19T07-55-57Z
slug: password-reset-password-privacy-terms-pre-cadastro
---
## B. Heuristic Scoring

| # | Heuristic | Score | Justification |
|---|-----------|-------|---------------|
| 1 | State visibility | 3 | Active route context visible in URL; form states (loading, error, empty) rendered with PT copy; no global status bar, but pages show destination clearly |
| 2 | Real-world match | 4 | Public flows match mental model (login → credentials, forgot → email, reset → new password); page names and copy in PT |
| 3 | User control & freedom | 3 | All public pages offer "Voltar ao sistema" exit; pre-cadastro error state has "Tentar novamente"; no destructive actions on public pages |
| 4 | Consistency & standards | 2 | PT alias routes `/recuperar-senha` and `/redefinir-senha` render the login page instead of forgot/reset experiences; `/terms` shows hardcoded "© 2026" |
| 5 | Error prevention | 3 | Form validation present on login/reset (required fields); pre-cadastro guarded for missing slug; no preemptive hint that PT aliases are unserved |
| 6 | Recognition over recall | 3 | Actions labeled in PT with clear verbs (Entrar, Salvar senha, Tentar novamente); minor: reset flow could show typed-email context |
| 7 | Flexibility & efficiency | 2 | No keyboard shortcuts or skip links on public pages; single-path flows; alias routes add friction (user forced back to login) |
| 8 | Minimalist design | 3 | Public pages are focused (one primary action each); pre-cadastro shows full form and error state simultaneously — a bit noisy |
| 9 | Error recovery | 4 | Pre-cadastro "Loja não localizada" + "Tentar novamente" matches edge-function 404 contract; reset flow offers "Voltar ao login"; messages in PT, actionable |
| 10 | Help & documentation | 2 | No inline help, tooltips, or links to docs on public pages; "Esqueci minha senha" and "Voltar ao login" are the only guidance |

**Total: 29 / 40 → Good**

## C. Design-Specificity Verdict

Public flows (home, login, forgot-password, reset-password, privacy, terms, pre-cadastro) are functionally complete, consistent, and error-safe. The standout is the pre-cadastro error/empty state, which faithfully implements the documented edge-function contract. The main regression is the EN→PT alias pair rendering the wrong experience. No redesign warranted; targeted fixes recommended below.

## D. Priority Issues

- **P1 — PT alias routes render the wrong experience**: `/recuperar-senha` and `/redefinir-senha` render the login page (h2 "Acessar sistema", E-mail/Senha, "Entrar", "Esqueci minha senha"; console clean) instead of the forgot/reset flows. A PT-speaking user landing on these links gets the wrong experience and is likely to contact support. Only `/reset-password` renders the reset experience ("Definir nova senha", "Nova senha"/"Confirmar senha", "Salvar senha").
- **P2 — Pre-cadastro console noise**: `/pre-cadastro/teste` fires 3 console errors — a 400 resource load, `AuthApiError: Invalid Refresh Token: Refresh Token Not Found`, and 404 ×3 — while the page correctly shows the "Link indisponível / Loja não localizada" state. Public pages should not trigger auth refresh errors.
- **P3 — Route metadata mismatch**: `routeLayoutMetadata.ts` declares `/pre-cadastro/:storeSlug` (width 'form', not adopted) while `docs/reports/layout-route-inventory.json` reports width "dashboard", source "default". Config and docs disagree.
- **P3 — Hardcoded copyright**: `/terms` renders "MX CONSULTORIA LTDA © 2026" (hardcoded year), which will go stale.

## E. Persona Red Flags

No critical flags on public pages for Alex or Sam. Sam (data-heavy, form-heavy) could be confused by the alias routes. Protected routes remain unverified for Alex (would require credentials).

## F. Minor Observations

- Consistent public page structure: header context, primary action button ("Voltar ao sistema" / "Entrar"), Notifications region with live="polite".
- Pre-cadastro renders both the full form (h1 "Seu acesso entra no ambiente MX.") and the error/empty state simultaneously — visually noisy for a 404-style outcome.
- No favicon/heading mismatch noted; titles and h1s align.
- `/privacy` and `/terms` present clear PT content and RLS/Google Calendar disclosure sections.

## H. Questions

1. Should the PT aliases be implemented as real forgot/reset flows, or removed/redirected to `/forgot-password` and `/reset-password`?
2. Can you provide an example store slug to test the pre-cadastro success path?
3. Should protected routes be included in the assessment (requires credentials)?
