---
target: /clientes
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-08-25T13-52-34Z
slug: eatures-admin-mx-clientes-portfoliooverviewtab-tsx
---
# Critique `/clientes`

## Design-specificity verdict

3/5 — operationally authored, visually category-generic. The MX-specific semantics are strong: matrix and branches, consulting separated from commercial results, Portuguese operational vocabulary, and next action. The composition remains a familiar CRM/admin pattern of header card, metric tiles, filters, dense table, and card toggle.

## Nielsen heuristic scores

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Loading and retry exist, but aggregate progress is always green and loading uses bare ellipses. |
| 2 | Match System / Real World | 3/4 | Matrix/filial language fits; period versus monthly target remains ambiguous. |
| 3 | User Control and Freedom | 3/4 | Clear filters, reset, view switch and retry are good; no undo and state is not preserved. |
| 4 | Consistency and Standards | 2/4 | Shared controls are coherent, but cards omit operational fields and refresh actions repeat. |
| 5 | Error Prevention | 2/4 | Date validation and destructive modals help; flat actions and unclear metric semantics invite mistakes. |
| 6 | Recognition Rather Than Recall | 3/4 | Labels and badges help; clipped actions and hidden tabs still require inference. |
| 7 | Flexibility and Efficiency | 2/4 | Search and filters help, but there are no bulk actions, shortcuts, or persisted views. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Clean tokens, but stacked controls and repeated counts compete with the queue. |
| 9 | Error Recovery | 2/4 | Retry exists, but raw backend errors and literal template text damage trust. |
| 10 | Help and Documentation | 1/4 | No contextual explanation for overlapping buckets or period/monthly-goal semantics. |
| **Total** |  | **22/40** | **Acceptable — significant improvements needed** |

## Cognitive load

7/8 failures — high load.

- Fails single focus, chunking, visual hierarchy, one thing at a time, minimal choices, working memory, and progressive disclosure.
- Passes grouping: sales/meta/progress and consulting are explicitly separated.
- Six lifecycle cards, seven table columns, four sales KPIs, three filters, period selection, view switch, and row actions compete before the client queue.

## Emotional journey

The page begins with confidence: strong Admin MX shell, clear portfolio count, and restrained visual language. Confidence falls when overlapping metrics and multiple CTAs push the actual queue down. The first operational decision is weakened by the clipped “Próxima ação”; the Cards view removes that field entirely. The pendências modal can expose literal interpolation text, creating a sharp trust break during a high-stakes activation flow.

## Strengths

- Preserves the core product truth: one client can represent a single matrix or a matrix with branches, while consulting and commercial performance remain distinct.
- Desktop visual system is coherent: Inter, neutral surfaces, MX green, restrained borders, and familiar controls.
- Strong accessibility foundations: labelled controls, semantic tabs, focus styles, progress semantics, local table scroll region, retry, and modal focus handling.

## Priority issues

### P1 — “Próxima ação” is clipped and disappears in Cards

The table gives the column only 6% (`PortfolioOverviewTab.tsx:541`) and clamps the action to one line (`:696`). The authenticated desktop evidence shows `Definir Dono...`; the Cards branch does not render `nextAction` or blockers. This undermines the page’s operational triage promise. Give the action enough width to wrap, keep blockers visible, and preserve it in Cards.

### P1 — Commercial progress communicates contradictory status

The aggregate percentage uses a fixed success text tone (`PortfolioOverviewTab.tsx:416`), while row progress correctly uses warning below target. The evidence shows aggregate `20,9%` in green beside a row marked `Abaixo da meta · 4,8%`. “Hoje”, “Esta semana”, and custom ranges still compare against “Meta mensal”. Align aggregate and row semantics and label the relationship explicitly as “vendas no período / meta do mês”, or define period-specific targets.

### P1 — Mobile spends the first viewport on controls instead of clients

At 390px the first viewport contains header actions, tabs, title, metrics, and sales controls before the client queue. The table has `min-w-[900px]` (`PortfolioOverviewTab.tsx:534`) and therefore needs local horizontal scrolling. Make the compact path prioritize the client card/row, collapse nonessential summaries, expose Cards earlier, and provide a visible cue for hidden tabs.

### P2 — Actions are flat and overloaded

The header exposes Agenda, refresh, quick registration, and new client together. Each row can expose roughly a dozen actions, including suspend and archive. Keep one primary creation CTA and one refresh action; group row actions into operational, configuration, and risk groups, isolating destructive actions.

### P2 — Error and modal copy breaks trust

`PendenciasModal.tsx:163` renders literal `Impeditivos (${summary.blockers.length})` instead of the count. Sales errors expose the raw backend message (`PortfolioOverviewTab.tsx:426`), and `useClientSales.ts:107` clears the last successful rows on failure. Render actual counts, translate failures into recovery-oriented copy, preserve last-known data with an error banner, and use skeleton/loading states instead of bare `...`.

## Persona red flags

- **Alex, power user:** no bulk triage, shortcuts, or persisted view; clipped next actions increase row-by-row inspection time.
- **Sam, accessibility-dependent:** status is partly color-led; small filter-chip close controls and horizontally hidden tabs increase keyboard and cognitive burden.
- **Casey, mobile:** the queue is below a tall summary stack; the default table is 900px wide; Cards omit the next action and blockers.

## Minor observations

- `Carteira 360 (43)`, `Clientes na carteira (43)`, and `Clientes & Lojas MX` repeat the same portfolio concept.
- Bucket counts overlap by design, but the interface does not say they are non-exclusive.
- Table and Cards use different fallbacks for missing product/phase.
- The search placeholder is too long for its field and clips on desktop.
- Page-level refresh and sales-level refresh duplicate commands.
- “CNPJ: Sem CNPJ” is less clear than “CNPJ não informado”.

## Deterministic and browser evidence

- Impeccable detector: exit 0, JSON `[]`, zero findings.
- Existing authenticated evidence: passed at 1440×900 and 390×844, with zero recorded failures, runtime errors, or accessibility violations.
- A fresh authenticated browser tab could not be opened in this run because the installed browser service path is stale (`26.818.41509` requested, `26.818.61809` available); therefore no live DOM, console, Lighthouse, or new overflow measurement is claimed.
- The table’s declared scroll owner is `MxTableSurface`/`ScrollableRegion`, which is structurally correct but does not remove the mobile cost of scanning a 900px table.

## Provocative questions

- Is `/clientes` primarily an operational queue, a portfolio overview, or a sales dashboard? Which job should win the first scan?
- If “Próxima ação” is the core promise, why is it the narrowest table column and absent from Cards?
- Should “Hoje” and “Esta semana” compare against the full monthly goal, or is that a different metric?
- Are lifecycle cards mutually exclusive? If not, should they be called “sinalizações” instead of categories?
- What is the fastest credible path for Alex to triage 43 clients without opening them one by one?
