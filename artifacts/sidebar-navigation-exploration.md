# Sidebar / Main App Navigation Shell — Exploration

Generated: 2026-08-24. Read-only exploration snapshot; the remediation findings
are historical and were resolved in the same session. See
`.impeccable/audit/2026-08-24__sidebar-all-modules.md` for the post-fix evidence.

## 1. Primary sidebar components

| Path | Role |
|------|------|
| `src/components/MxSidebarShell.tsx` | Canonical main sidebar + mobile drawer + main landmark for all authenticated roles |
| `src/components/MxSidebarProfileCard.tsx` | Footer profile menu inside sidebar |
| `src/design-system/sidebar/tokens.ts` | Shared SIDEBAR / SIDEBAR_METRICS class tokens + metrics |
| `src/components/Layout.tsx` | Builds navSections per role and mounts single MxSidebarShell |
| `src/components/AppShell.tsx` | Auth frame: AppShellFrame → Layout (+ Internal MX canonical redirects) |
| `src/design-system/shell/AppShellFrame.tsx` | Density/token scope wrapper by role; skip-link chrome |
| `src/design-system/shell/appShellConfig.ts` | dono=OWNER, gerente/vendedor=UNIVERSAL, admin/consultor=INTERNAL |
| `src/base44-reference/components/layout/Sidebar.jsx` | Reference-only legacy Base44 |
| `src/base44-reference/components/ui/sidebar.jsx` | Reference shadcn sidebar |

Removed legacy shells (tests assert absent): ManagerSidebarShell, SellerSidebar.

## 2. Navigation items per role

Orchestrator: `Layout.tsx` → `sidebarSections` → `<MxSidebarShell navSections={...} />`.

### Dono / owner
- Source: `OWNER_BASE44_NAVIGATION` in `src/features/dashboard-loja/sections/owner-cockpit/ownerBase44Config.ts`
- Mapped in Layout via `mapOwnerNavigationItem` / `ownerNavConfig`
- Sections: GESTÃO, ESTRATÉGIA, NEGÓCIO (Departamentos+children), DESENVOLVIMENTO, AÇÃO GLOBAL
- Extra: `ownerNetworkCategory` (multi-store), `ownerCommercialCategory` (gestão|acompanhamento)
- Helpers: `ownerNavigationCanonicalPath`, `ownerNavigationActivePaths`
- Related: `src/features/owner/ownerCommercialNavigation.ts`

### Gerente / manager
- Inline `navConfig.gerente` in Layout (Operação / Gestão / Resultados / Desenvolvimento)
- CTA: Falar com Consultor → `/falar-consultor`
- Legacy: `src/lib/navigation/managerLegacyPaths.ts`

### Vendedor / seller
- Inline `navConfig.vendedor` (Operação / Comercial / Desenvolvimento)
- Feedback badges via `pendingFeedbackCount`

### Consultor MX / Admin MX / administrador_geral
- `isPerfilInternoMx` → `buildInternalMxNavigation` in `src/design-system/internal-mx/internalMxNavigation.tsx`
- Sections: Operação MX / Produto e Metodologia / Plataforma e Governança / Simulação
- Filter: `canAccessPath(item.path, role)`
- Routes: `src/lib/navigation/internalMxCanonicalRoutes.ts`
- Policy: `src/design-system/internal-mx/internalMxAccessPolicy.ts`

### Preview
- `?viewAs=dono|owner` → shellRole dono chrome without Internal MX nav

## 3. Design tokens

| Path | What |
|------|------|
| `src/design-system/sidebar/tokens.ts` | SIDEBAR_METRICS (256/64, header 52, touch 44, item 44, nested 40, xl=1280, widthTransitionMs=300), SIDEBAR classes, SIDEBAR_LOGO |
| `src/design-system/tokens/components.css` | --mx-sidebar-width-*, drawer widths, heights, radii |
| `src/design-system/tokens/primitives.css` | --mx-sidebar-ink*, hover, muted |
| `src/design-system/tokens/semantic.css` | sidebar foreground/accent aliases |
| `src/index.css` | Tailwind mxsb-* theme colors |
| Doc | `docs/design-system/sidebar-dono.md` |

## 4. Mobile vs desktop

- Desktop (≥xl / 1280): fixed aside, collapsible expanded↔collapsed; main `xl:pl-[var(--mx-sidebar-width-*)]`
- <xl: mobile header; drawer overlay (dialog + focus trap); panel 288 / sm 320 / max 85vw
- Opening a group while collapsed forces expand
- Safe-area on mobile header/main

## 5. Accessibility

- aside + nav aria-label; items aria-current/aria-label; collapsed title + tooltip
- Groups aria-expanded/aria-controls; drawer dialog+modal+useFocusTrap+Escape
- main role=main id=main-content (skip-link); profile menu roles
- Icons aria-hidden

## 6. Historical hard-coded / non-token findings

These were identified before the 2026-08-24 remediation. The current audit
report records the resolved state; this snapshot is retained as the exploration
trail rather than as a current defect list.

No raw #hex in primary sidebar. Examples:
1. MxSidebarShell.tsx:142 bg-white tooltip
2. MxSidebarShell.tsx:513 mobile header bg-white
3. MxSidebarShell.tsx:543 bg-status-success-surface avatar
4. MxSidebarShell.tsx:551 profile menu bg-white
5. MxSidebarShell.tsx:645 simulation btn bg-brand-primary text-white
6. tokens.ts:67 toggle bg-white
7. tokens.ts:108 CTA text-white shadow
8. MxSidebarProfileCard.tsx:92 menu bg-white
9. AgendaSidebar.tsx:62 bg-white + h-8 w-8 vs touch-min
10. AgendaSidebar.tsx:97 card bg-white
11. AgendaSidebar.tsx:114 bg-brand-primary text-white
12. ProgramSidebar.jsx:19 rounded-xl bg-card shadow-sm
13. MxSidebarShell.tsx:620-627 main padding outside SIDEBAR token
14. CollapsedTooltip left-[calc(100%+10px)] magic offset
15. Mobile menuitems min-h-11 vs touchTargetMin token

## 7. Touch target / fixed width (post-remediation)

- touchTargetMin 44; itemHeight 44 / nested 40 / toggle+CTA h-11
- Fixed widths: 256 / 64 / drawer 288|320
- AgendaSidebar collapse controls use the touch-target token
- Mobile header uses --mx-mobile-header-touch-target (OK)

## 8. Performance notes (post-remediation)

- widthTransitionMs=300 is applied to aside width and main padding with reduced-motion support
- Collapse swaps aside width + main padding and therefore performs a bounded layout reflow
- Dual sidebar content render when drawer open
- Cheap transitions: chevron transform 200ms, tooltip opacity 150ms
- No framer layout animation found

## 9. Contract tests

- `src/design-system/sidebar/sidebar-contract.test.ts`
- `src/components/MxSidebarShell.test.ts`
- `src/design-system/shell/shell-contract.test.ts`
- `src/design-system/internal-mx/internalMxNavigation.test.ts`
- `src/lib/navigation/internalMxCanonicalRoutes.test.ts`, `managerLegacyPaths.test.ts`
- `src/features/owner/ownerCommercialNavigation.test.ts`
- Broader: page-shell-ast, duplicate-main-content, focus-interaction, shell-zoom-keyboard.playwright, shell-contract.playwright, role route contracts

## 10. Secondary module sidebars / shells

| Path | Purpose |
|------|---------|
| `src/features/agenda-admin/components/AgendaSidebar.tsx` | Agenda filters (calendar, consultants, status) |
| `src/components/owner/actionplan/calendar/CalendarSidebar.jsx` | Action-plan deadlines/summary/day |
| `src/components/owner/consulting/ProgramSidebar.jsx` | Consulting program right rail |
| `src/features/internal-mx-planning/InternalMxPlanningShell.tsx` | Planning workspace shell |
| `src/features/configuracoes/components/ConfiguracoesShell.tsx` | Settings tabs shell |
| `src/features/internal-reports/ReportPageShell.tsx` | Reports page shell |
| `src/design-system/internal-mx/InternalMxDomainTabs.tsx` | Domain tabs secondary nav |

## Architecture

`AppShell` → `AppShellFrame(role)` → `Layout` (role nav) → single `MxSidebarShell` + `design-system/sidebar/tokens`.
