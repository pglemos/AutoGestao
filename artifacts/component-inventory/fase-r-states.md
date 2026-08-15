# Inventário FASE R — Empty, Loading, Error e Skeleton (18.001/003/007)

Data: 2026-08-15

## 18.001 — Empty states

- **Canônico:** `src/components/atoms/EmptyState.tsx` — `icon/title/description/nextStep/action` + `size` (sm/md/lg) + `variant`:
  - `filter` → SearchX (existe dado, filtro não retornou nada)
  - `dataset` → Inbox (não há dados cadastrados)
  - Marca DOM: `data-mx-empty={variant}`.
- **Uso:** 47 arquivos em features/pages; 155 refs `data-mx-empty`/`EmptyState`.
- **Migração:** `empty-migration-round3-contract.test.tsx` cobre os inline restantes.

## 18.003 — Loading states

- **Canônico:** `src/components/molecules/LoadingState.tsx` — `variant: 'spinner'|'skeleton'`, `context: 'initial'|'refresh'|'pagination'`, `rows`, `label`, `aria-live` (polite p/ refresh/pagination, assertive p/ initial).
- **Skeleton:** `src/components/atoms/Skeleton.tsx` (variants rect/circle/text/avatar/chart/card com radius tokens) + compostos (SkeletonCard/Table/List/Chart/Stats).
- **Uso:** 50 arquivos com LoadingState/Skeleton.
- **Spinner:** `src/components/atoms/Spinner.tsx` (fallback de lazy no App).

## 18.007 — Error states

- **Canônico:** `src/components/molecules/ErrorState.tsx` — `kind: 'network'|'permission'|'server'|'unknown'`, `retry`/`onRetry`, `retrying`, `aria-busy`, `motion-safe:animate-spin`.
- **Uso:** 22 arquivos em features/pages.
- **NotFound/Forbidden:** `pages/NotFound.tsx` (404 próprio, sem PageCanvas) + `ErrorState kind="permission"` no App.

## 18.010 — Loading por tipo

- initial → aria-live assertive; refresh/pagination → aria-live polite; pagination usa Spinner sm.

## 18.013 — aria-busy/aria-live

- 48 `aria-busy` + 84 `aria-live`/`role="status"` no repo.

## 18.014 — Migração STATE-*

- Canônicos adotados: 47 EmptyState, 22 ErrorState, 50 LoadingState/Skeleton. Contratos: `state-inventory-contract.test.ts`, `data-feedback-states-contract.test.tsx`, `error-states-contract.test.ts`, `empty-migration-round3-contract.test.tsx`.

## 18.015 — Screenshots

- `visual-matrix-roles.playwright.ts` captura full-page por ROLE-ROUTE; golden `dono-home.spec.ts`; evidência em `visual-evidence/`.

## Gates

- `bun test src/test/state-inventory-contract.test.ts` — **8 pass / 0 fail**.
- FASE R: 18.001–015 cobertos (canônicos + contratos + inventário).
