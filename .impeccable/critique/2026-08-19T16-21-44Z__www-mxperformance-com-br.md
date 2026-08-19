---
target: "Critique of https://www.mxperformance.com.br/ (MX Gestão Preditiva / MX Performance React SPA)"
total_score: 16
max_score: 32
na_heuristics: 7,10
p0_count: 57
p1_count: 23
timestamp: 2026-08-19T16-21-44Z
slug: www-mxperformance-com-br
---
# Critique of https://www.mxperformance.com.br/ (MX Gestão Preditiva / MX Performance React SPA)

**Method: dual-agent (A: general · B: general)**

---

## Design Specificity Verdict

**Verdict: authored-for-this-product**

**LLM Assessment:** The page shows strong product-specific language ("Lançamento diário com janela operacional", "PDI 360", "Terminal", "Conselho de loja", "D-1 e D-0") that reflects a real B2B retail operations methodology. However, the visual system—dark green/black palette, card grids, accordion FAQ, three-column persona cards—is structurally interchangeable with any B2B SaaS landing page. The "manifesto" section reads like genuine opinionated positioning but uses generic "hero + 3 pillars + feature grid + FAQ + footer" layout that could serve any vertical.

**Deterministic Scan Summary:** 12 sections, 6 FAQ accordion buttons (non-functional/state not visible), 5 persona CTAs as listitems, 14 footer nav links, 7 module links, 5 consultoria links. CLI detector: 110 findings across 16 antipatterns. Detector-only catches: `undersized-ui-text` (57 instances, the dominant issue), `layout-transition` (14), `skipped-heading` (6), `tight-leading` (7), `all-caps-body` (5), `dark-glow` (4), `marquee` (3), `gpt-thin-border-wide-shadow` (3), `radial-spotlight-glow` (3), `low-contrast` (2), `line-length` (1), `overused-font` (1), `kicker-above-heading` (1), `pulsing-dot` (1), `codex-grid-background` (1), `nested-cards` (1). False positives: "listitem" role on clickable CTAs (should be button/link), heading hierarchy skips (h1→h2→h4→h5→h6).

**Visual Overlays Status:** No reliable overlay. Mixed-content policy blocks HTTP detector script on HTTPS page. Fallback: CLI detector ran successfully (110 findings); a11y tree shows missing ARIA on FAQ accordions (no aria-expanded, aria-controls), persona CTAs lack role="button" despite click handlers.

---

## Heuristic Scores

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2/4 | Layout transitions (14) animate width/height instead of transform/opacity; pulsing-dot (1) fakes liveness |
| 2 | Match Between System and Real World | 2/4 | All-caps body text (5) removes word shapes; em-dash overuse (advisory) adds AI cadence |
| 3 | User Control and Freedom | 2/4 | Auto-scrolling marquee (3) removes scroll control; no escape from marquee |
| 4 | Consistency and Standards | 2/4 | Skipped heading levels (6) break document outline; design-system drift (fonts/colors/radii) |
| 5 | Error Prevention | 1/4 | **Undersized functional text (57 instances)** — buttons, links, nav, labels below 11px floor; tight leading (7); low contrast (2) |
| 6 | Recognition Rather Than Recall | 3/4 | Mostly recognizable; overused font (Inter) (1); icon-tile pattern not dominant |
| 7 | Flexibility and Efficiency of Use | n/a | Landing page (Persuade surface) — no accelerators expected |
| 8 | Aesthetic and Minimalist Design | 2/4 | Dark glow (4), radial spotlight glow (3), hairline border + wide shadow (3), grid background (1), nested cards (1) — AI slop visual tells |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 2/4 | Low contrast (2) on error states; undersized text affects error messages too |
| 10 | Help and Documentation | n/a | Landing page (Persuade surface) — no help system expected |

| **Total** | | **16/32** | **[Acceptable]** |

*Heuristics 7 & 10 scored n/a (Persuade/Experience surface). Applicable max = 32. 16/32 = 50% → Acceptable band.*

---

## Overall Impression

The copy is the strongest asset — it speaks the customer's language with insider terminology ("D-1 e D-0", "Conselho de loja", "PDI 360") that builds immediate credibility with retail operations managers. But the visual layer undermines this: a generic dark-mode SaaS template littered with AI slop tells (glowing shadows, hairline borders, grid backgrounds) and a critical legibility failure where 57 functional text elements fall below the 11px floor. The single biggest opportunity: fix the undersized text system-wide — it's not a style choice, it's a legibility barrier that affects every user action.

---

## What's Working

1. **Opinionated, product-specific copy** — "Loja não vende menos por falta de cliente. Vende menos por falta de método" and "Lança D-1 e D-0 no Terminal" use the exact vocabulary of the target buyer (retail ops managers/owners). This is authored-for-this-product, not category boilerplate.

2. **Three-persona flow maps to real org structure** — "Três visões da mesma operação" correctly distinguishes Dono/Conselho → Gerente → Vendedor with distinct value props per role. Rare for a landing page to get this right.

---

## Priority Issues

### [P0] Undersized functional text — 57 instances below 11px floor
**Why it matters:** Buttons, navigation links, labels, table cells, and meta rows render at 9–10px. Users cannot reliably read tap targets or interactive elements. This is not a style choice — the detector rule explicitly states: "functional text under 11px is a defensible quality bar: it fails on high-DPI and small viewports and it degrades tap and read targets."
**Fix:** Raise all functional UI text (buttons, links, nav, labels, meta) to ≥11px (14px ideal for body). Update design system tokens; don't just add 8px to the ramp.
**Suggested command:** `/impeccable typeset --min-functional=11px --scope=all --raise-ramp`

### [P1] Skipped heading levels break document outline — 6 instances
**Why it matters:** Heading hierarchy jumps h1→h2→h4→h5→h6. Screen reader users navigate by heading structure; skipping levels destroys the document outline and makes content inaccessible.
**Fix:** Restructure to semantic h1/h2/h3 only; use CSS for visual weight, not heading level.
**Suggested command:** `/impeccable heading-audit --fix-hierarchy --max-level=3`

### [P1] Tight line height reduces readability — 7 instances
**Why it matters:** Line height below 1.3× font size makes multi-line text hard to read. Body text needs 1.5–1.7 for comfortable reading.
**Fix:** Set base line-height to 1.6 for body; 1.3 for headings. Apply via design system token.
**Suggested command:** `/impeccable typeset --line-height=1.6 --body --token=leading-relaxed`

### [P1] Auto-scrolling marquee removes user control — 3 instances
**Why it matters:** Continuously moving content demands attention it hasn't earned and hides half its content at any moment. Users cannot pause or read at their own pace.
**Fix:** Replace marquee with static content grid or user-controlled carousel.
**Suggested command:** `/impeccable animate --remove-marquee --replace=grid`

### [P1] Low contrast text fails WCAG AA — 2 instances
**Why it matters:** Text does not meet 4.5:1 contrast ratio for body text. Users with low vision cannot read affected content.
**Fix:** Increase text/background contrast to ≥4.5:1 (body) or ≥3:1 (large text).
**Suggested command:** `/impeccable colorize --contrast=aa --fix-low-contrast`

---

## Persona Red Flags

**Retail Operations Manager (Primary — Alex Power User + Jordan First-Timer blend):**
- FAQ accordion failure blocks objection handling — clicks reveal nothing (no aria-expanded, no panel visibility)
- Module list (12 items) creates scan fatigue without filtering by pain point
- "Entrar →" top-right assumes credentials before showing value

**Store Owner/CEO (Decision Maker — Jordan First-Timer):**
- Three-persona section strong but "Conselho de loja" terminology appears only once in flow diagram — no dedicated executive outcomes section (ROI, payback, risk)
- Final CTA cluster doesn't distinguish "buy now" vs "see demo" intent

**Field Consultant (Influencer — Riley Stress Tester):**
- Consultoria section lists 5 deliverables (CRM, Agenda MX, Visitas PMR, DRE, ROI & Choque) but no methodology preview, sample artifacts, or consultant onboarding path — can't evaluate "will this make my job easier?"

---

## Minor Observations

- "Entrar →" label uses arrow but goes to /login (not app), confusing for prospects expecting demo access
- Color palette (--bg:#070A08, --ink near-white) has low contrast on secondary text; WCAG AA likely fails on muted grays
- "Manifesto MX em movimento" region exists in a11y tree but no visible content — appears to be animation-only section
- Footer duplicates Instagram link 3 times
- No trust signals: logos, client count, case study metrics, security badges

---

## Questions to Consider

1. Does the "Terminal" metaphor (D-1/D-0 launch) resonate with non-technical store managers, or does it unintentionally signal "developer tool"?
2. Why does the hero offer two CTAs with different verbs ("Implantar rotina" vs "Ver sistema") but both anchor to page sections rather than conversion actions?
3. Is the 12-module grid in "Tudo que a operação precisa" meant to be browsed or searched — there's no filter, search, or categorization beyond heading groups?
