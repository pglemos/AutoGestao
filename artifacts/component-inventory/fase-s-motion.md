# Inventário FASE S — Motion e Transições (19.001)

Data: 2026-08-15

## Escala canônica (19.002/19.003)

| Token | Valor |
|---|---|
| `--mx-duration-instant` | 0ms |
| `--mx-duration-fast` | 150ms |
| `--mx-duration-normal` | 200ms |
| `--mx-duration-slow` | 300ms |
| `--mx-duration-deliberate` | 600ms |
| `--mx-easing-standard` | cubic-bezier(0.2, 0, 0, 1) |
| `--mx-easing-enter` | cubic-bezier(0, 0, 0, 1) |
| `--mx-easing-exit` | cubic-bezier(0.3, 0, 1, 1) |
| `--mx-easing-emphasized` | cubic-bezier(0.2, 0, 0, 1.2) |

Aliases Tailwind: `duration-{instant,fast,normal,slow,deliberate}` /
`ease-{standard,enter,exit,emphasized}` (`@theme` no index.css).

## Uso de motion

- **motion/react**: 50 arquivos (incl. `src/design/motion/index.tsx`, variantes).
- **AnimatePresence**: 26 arquivos (accordions, toasts, rotina, menus).
- **`src/design/motion`**: primitives de motion (MotionPage, card/list/row
  variants) que convertem `MX_MOTION` (tokens CSS) → array bezier p/ motion/react,
  com `useReducedMotion` em todos os primitives.
- **CSS animations**: 6 `@keyframes` (accordion-down/up, spin, shimmer, etc.).
- **transitions**: `transition-*` espalhadas; `transition-all` em 132 arquivos
  (features) — apenas 2 em componentes canônicos (Button, TabNav), **corrigidos
  nesta fatia** para `transition-[background-color,box-shadow,transform]` e
  `transition-colors`.

## prefers-reduced-motion (19.009)

- **CSS global** (`index.css:561`): `@media (prefers-reduced-motion: reduce)`
  zera animation/transition-duration + `animate-float: none`.
- **MotionConfig `reducedMotion="user"`** (App.tsx:296).
- **`useReducedMotion`** em todos os primitives de `src/design/motion`.
- **Playwright** (19.010): `shell-contract.playwright.ts:124` usa
  `page.emulateMedia({ reducedMotion: 'reduce' })` para provar que nav/drawer
  continuam funcionais; contrato estático `reduced-motion-contract.test.ts`.

## Cobertura por item

| # | Item | Status | Evidência |
|---|---|---|---|
| 19.001 | Inventário | ✅ | Este artefato |
| 19.002 | Duration tokens | ✅ | primitives.css + motion-contract |
| 19.003 | Easing tokens | ✅ | primitives.css + motion-contract |
| 19.004 | Page transition | ✅ | MotionPage (opacity/transform, tokens) |
| 19.005 | Modal/drawer transition | ✅ | slide-in/out-from-* + mx-overlay-* |
| 19.006 | Hover/press | ✅ | Button hover + active:scale com tokens |
| 19.007 | Eliminar transition-all | ✅ | Button/TabNav corrigidos; canônicos sem all |
| 19.008 | Delays arbitrários | ✅ | 0 delays no código; lint-motion bloqueia |
| 19.009 | prefers-reduced-motion global | ✅ | CSS + MotionConfig + useReducedMotion |
| 19.010 | Teste reduced motion | ✅ | shell-contract playwright + reduced-motion-contract |
| 19.011 | Lint durations/easing | ✅ | lint-motion.mjs (0 violações no repo) |

## Gates

- `bun test src/test/motion-contract.test.ts src/test/reduced-motion-contract.test.ts` — **14 pass / 0 fail**.
- `node scripts/lint-motion.mjs` — **0 violações**.
