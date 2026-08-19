---
target: "Critique of https://www.mxperformance.com.br/ (MX Gestão Preditiva / MX Performance React SPA)"
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
timestamp: 2026-08-1910:44:58.402Z
slug: www-mxperformance-com-br
---
⚠️ DEGRADED: single-context (regex-fallback detector; no live-URL scan; evidence files byte-identical)

## A. DETECTOR RUN

```
impeccable detect: DEGRADED - HTML parser modules unavailable (htmlparser2, css-select, css-tree, domutils). Falling back to regex matching. Custom properties, selector matching and computed contrast are NOT evaluated; findings are an undercount, not a clean bill of health.
```

104 findings scanned from the production `dist/assets` JS bundles. All findings are the fallback detector's conservative surface only — real defects are likely higher.

### Heuristic table

| Heuristic | Score | Max |
|---|---|---|
| Visual polish & consistency | 4 | 5 |
| Typography & readability | 3 | 5 |
| Color & contrast | 2 | 5 |
| Spacing & alignment | 3 | 5 |
| Layout & hierarchy | 3 | 5 |
| Navigation & wayfinding | 3 | 5 |
| Motion & feedback | 2 | 5 |
| Component states (hover/focus/empty) | 2 | 5 |
| **Total** | **22** | **40** |

Score band: **Acceptable** (36-40 Excellent / 28-35 Good / 20-27 Acceptable / 12-19 Poor / 0-11 Critical). No heuristics marked n/a.

### Design specificity

**High.** The site does not rely on a stock component kit: it ships bespoke Tailwind tokens and hand-written class compositions inside the page bundles (custom sidebar, custom gradient text, purpose-built auth surface, per-module accent treatment). Tailwind v3 semantics (`border-accent-on-rounded`, `side-tab` pattern, `layout-transition` flags) are applied directly in product code, so every finding here points at first-party styling decisions, not library defaults.

### Priority issues

1. **Repeated sidebar treatment (26 × `side-tab`)** — the `border-l-4` active-tab pattern is duplicated across admin modules (e.g. `AgendaAdmin-D1vFKd9o.js:20`). No shared tab component; each module re-implements it, so a fix must be applied N times.
2. **`border-accent-on-rounded` (19)** — accent borders on rounded elements: `CentralExecucao-DZD-I7Pg.js:1`, `ConsultoriaClienteDetalhe-DRWGiZSZ.js:6`, `DashboardLoja-WvL9QfR8.js:1,16`, `GerenteTreinamentos-PJl3O9jm.js:1`, `InternalConsultingPage-DTPyXg6i.js:1`. Rounded corners + borders read as tappable/clickable affordances on non-interactive cards.
3. **Gray text on colored backgrounds (20 × `gray-on-color`)** — likely WCAG AA failures on prominent surfaces (auth screen, admin headers). Requires real contrast computation (the degraded detector cannot prove these; assume worst case).
4. **Layout shift animation (13 × `layout-transition`) + `bounce-easing` (6)** — `MXPerformanceLanding-D0G304CI.js:1,35,87,197,208,269,323,355,393,405,491`. Bouncy easing on layout-level transitions invites CLS and vestibular discomfort; landing page carries most instances.

### Persona red flags

- **Speed-critical manager:** 13 layout transitions + bounce easing on the landing page → perceived jank and CLS risk on slow devices.
- **Low-vision/contrast-sensitive user:** 20 gray-on-color findings directly hit readability of key actions.
- **Mouse/keyboard power user:** duplicated sidebar logic (26 side-tab instances) raises the chance some modules ship inconsistent focus states.
- **First-time visitor (pre-cadastro flow):** gradient-text and ai-color-palette accents on the marketing surface dilute brand legibility.

### Minor observations

- `overused-font` (5): Inter is applied in excess across components, flattening hierarchy.
- `gradient-text` (2): decorative gradient text relies on background-clip — degrades on forced-colors/print.
- `codex-grid-background` (1, advisory): background grid pattern adds noise without functional value.

### Questions

1. Is a shared tab component on the roadmap so the 26 side-tab instances can be fixed once?
2. Is the brand palette (12 ai-color-palette, 2 gradient-text) fixed, or is accent color open to adjustment?
3. Is there a motion budget (13 layout-transition + 6 bounce-easing) for the landing page?
4. What contrast target (WCAG AA 4.5:1) applies to gray-on-color text — can those pairs be changed?
