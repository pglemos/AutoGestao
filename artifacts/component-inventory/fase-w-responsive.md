# Inventário FASE W — Responsividade e Geometria (23.001–23.015)

Data: 2026-08-15

## 23.001/002 — Window Size Classes MD3

- Tokens em `primitives.css`: `--mx-breakpoint-{compact:0,medium:600,expanded:840,large:1200,extra-large:1600}`.
- `@theme` no index.css: `--breakpoint-{medium,expanded,large,extra-large}` → variantes `medium:`/`expanded:`/`large:`/`extra-large:`.
- Page composition usa as variantes nomeadas; base `compact` (>=0).

## 23.003 — Breakpoints de componente

- Nenhum componente canônico usa `@media` manual (PageCanvas, MxSidebarShell, PageViewport, PageHeader).
- Media queries de breakpoint só em tokens (`semantic.css`, `components.css`).

## 23.004–008 — Comportamento por classe de janela

- `visual-matrix-roles.playwright.ts`: mobile-320/390 + desktop (1440).
- `playwright.config.ts`: 320/360/390/412/768/1280/1440.
- `shell-contract.playwright.ts`: 320px sem overflow global, 390 drawer, 1440 desktop.

## 23.009/010 — Grids e min-width:0

- Utilities `grid-cols-{compact,medium,expanded,large}` (1/2/3/4 colunas) com `minmax(0, 1fr)`.
- PageViewport/PageHeader usam `min-w-0`.

## 23.011 — Long labels

- PageHeader `truncate`/`min-w-0`; TabNav `whitespace-nowrap`/`truncate`.

## 23.012 — Safe areas

- `index.css`: `env(safe-area-inset-{top,left,right})` + PWA hardening.

## 23.013 — 200% zoom

- `typography-zoom-200.playwright.ts` (rota pública sem corte de texto).

## 23.014 — Scrollbar sem layout jump

- `index.css:692`: `scrollbar-gutter: stable`.

## 23.015 — Overflow horizontal

- `lint-horizontal-page-overflow.mjs` (audita raízes de página).

## Gates

- `bun test src/test/responsive-contract.test.ts` — **10 pass / 0 fail**.
