# Spec Coverage Audit — FASE AJ 36.020

Data: 2026-08-15 · Read-only

## Resumo

| Métrica | Valor |
|---|---|
| Requisitos no prompt mestre (629) | 39 FASEs |
| Requisitos fechados (ledger `[x]`) | 543 |
| Requisitos abertos | 163 |
| FASEs 100% | 22 (B,C,D,E,F,H,M,O,Q,R,S,V,W,X,Y,Z,AA,AB,AC,AD,AE,AL) |
| FASEs parciais | 12 (A,I,J,K,L,N,P,T,U,AF,AG,AH) |
| FASEs 0% (não iniciadas) | 3 (AJ,AK,AM) |
| Itens extras do framework (não no prompt) | G(07.016-022), AI(36.001-008) |

> Nota: o ledger inclui itens de tracking EXTRA do framework (ex.: FASE G tem
> 07.016-022 que não são requisitos do prompt; FASE AI tem 36.001-008 marcados
> como "AGENDADO"). O mapa abaixo usa os **629 requisitos do prompt mestre**.

## Tabela requisito → evidência

### FASEs 100% (evidência por categoria)

| FASE | Categoria | Evidência principal |
|---|---|---|
| B — Reconciliação PR #188 | routes | `artifacts/route-role-inventory/` + ledger 04.001-010 |
| C — Inventário rotas×perfis | routes | `artifacts/route-role-inventory/route-role-matrix.{json,csv,md}` (113 rotas, 249 route×role) |
| D — Inventário componentes | design | `artifacts/component-inventory/*.md` (fases K/R/S/W) |
| E — Tokens primitivos/semânticos | design | `src/design-system/tokens/{primitives,semantic,components}.css` |
| F — Tipografia única | design | `lint-typography.mjs` + `typography-contract.test.ts` |
| H — AppShell/Sidebar/MobileHeader | shell | `shell-contract.playwright.ts` + `MxSidebarShell.tsx` |
| M — Cards/Metrics/Badges/Status | design | `lint-overlay-geometry` + SectionCard family + `motion-contract` |
| O — Modal/Dialog/AlertDialog | overlay | `lint-overlay-geometry.mjs` + `Modal.tsx`/`dialog.jsx` + `overlay-geometry-contract` |
| Q — Toasts/Alerts/Banners | feedback | `src/lib/toast.ts` + `toast-provider-contract` + `supabase-log-classification` |
| R — Empty/Loading/Error/Skeleton | states | `EmptyState/ErrorState/LoadingState/Skeleton` + `state-inventory-contract` (8) |
| S — Motion/Transitions | motion | `lint-motion.mjs` + `motion-contract` (9) + `reduced-motion-contract` (4) |
| V — Acessibilidade WCAG 2.2 AA | a11y | `foundation-zero-a11y-contract` + `keyboard/touch/selected/heading/describedby/autocomplete` |
| W — Responsividade/Geometria | responsive | `responsive-contract` (10) + breakpoints MD3 600/840/1200/1600 |
| X — Migração de todas as rotas | routes | `lint-route-layout-metadata` (109 rotas) + `lint-adopted-route-canvas` (67) |
| Y — Perfil Dono | routes | `owner-routes-canonical-contract` (12) + `owner-base44-visual` |
| Z — Perfil Gerente | routes | `owner-routes-canonical-contract` + RotinaGerente PageCanvas |
| AA — Perfil Vendedor | routes | `seller-carteira-contract` (10) + viewports 320/360/390/412 |
| AB — Perfis Admin | routes | `internal-mx-planning-pages` + `owner-base44-design-scope` |
| AC — Lints/Gates anti-regressão | gates | `lint-{single-scroll-owner,page-geometry,dangerous-overrides,tabs-family,raw-*,overlay-geometry,keyboard,motion}` (20+ gates) |
| AD — Storybook/Contracts | design | `Button.stories.tsx` + `module-route-visual-audit` |
| AE — Matriz visual/DOM | visual | `visual-matrix-roles.playwright.ts` + `canvas-matrix` + `visual-matrix-contract` (7) |
| AL — Rollback | release | `rollback-runbook.md` + `rollback-dry-run.mjs` + `rollback-contract` (7) |

### FASEs parciais

| FASE | % | Faltante | Evidência existente |
|---|---|---|---|
| A — Pre-flight/Segurança | 96% | 1 item | `harden_*` migrations + RLS matrix |
| I — PageViewport/Scroll owner | 32% | 09.00X abertos (trabalho feito em W/X) | `PageViewport.tsx` + `page-contract` + `canvas-matrix` |
| J — PageHeader/Tabs/Footer | 11% | 10.00X abertos | `PageFooterActions` + `TabNav` + `DashboardHeader` |
| K — Buttons | 20% | 11.00X abertos | `Button.tsx` (8 variantes) + `button-variants-contract` |
| L — Form controls | 0% | 12.00X abertos | `Field/Input/Select` + `audit_form_a11y.mjs` (não marcado) |
| N — Tables/Grids | 60% | 13.00X | `DataGrid.tsx` + `lint-table-horizontal-scroll` |
| P — Drawers/Popovers | 75% | 14.00X | `sheet.jsx` + `useFocusTrap` + `lint-overlay-geometry` |
| T — Focus/Hover/Pressed | 36% | 20.00X (003/004/005/009/010/011) | `keyboard-activation` + `selected-vs-focus` + `hover-without-focus` |
| U — Ícones | 0% | 21.00X | `lint-icon-{semantics,consistency,only-action}` + `icon-pattern-contract` (não marcado) |
| AF — Viewport Matrix | 32% | 32.00X | `Viewport Matrix 8 viewports` (464 PASS, 62c3529e) |
| AG — E2E funcional | 55% | 33.00X | `ag-module-smokes` + `manager-module` + smokes |
| AH — Supabase | 64% | 34.007-011 bloqueados | `classify-supabase-events` + `security-findings` + RLS matrix |

### FASEs 0% (não iniciadas)

| FASE | Requisito | Status |
|---|---|---|
| AJ — Full regression gate | 36.001-020 | **Esta fatia** (36.019/020) |
| AK — Release direto em main | 37.001-020 | Bloqueada por AG/AL/AJ |
| AM — Relatório final 100% | 39.001-007 | Pós-AK |

## Conclusão

- **543/629 requisitos fechados (86.3%)** contando só os itens do prompt.
- As FASEs L (form) e U (ícones) têm **evidência real mas itens não marcados** —
  dívida de tracking (36.019).
- FASEs I/J/K/T parciais mas com muito trabalho feito nas FASEs downstream
  (W/X/Y/Z) — itens 09/10/11/20 não foram atualizados ao longo da migração.
