# Internal MX Wave 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish real canonical template slots, enforce read-only access for Consultor MX in Operational Settings and PMR Parameters, and define the complete three-role visual regression matrix.

**Architecture:** The canonical route frame provides page metadata and role to a versioned template context. Shared `MxModule*` primitives render explicit structural slots, while legacy pages remain behind a temporary compatibility bridge. A centralized access policy controls both UI state and mutation hooks.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Bun Test, Playwright, Tailwind CSS, Supabase, GitHub, Vercel.

## Global Constraints

- Work directly against `main` only after the complete tree is prepared.
- Publish exactly one commit and allow exactly one production deployment.
- Do not change Supabase schema, RLS, RPCs, triggers, functions, or data.
- Do not add dependencies.
- Preserve all existing route URLs.
- Keep the legacy CSS bridge only for pages scheduled for later waves.

---

### Task 1: Canonical template context and slots

**Files:**
- Create: `src/components/module/InternalMxTemplateSlots.tsx`
- Modify: `src/components/module/InternalMxCanonicalTemplate.tsx`
- Modify: `src/components/module/InternalManagerRouteFrame.tsx`
- Modify: `src/components/module/MxModuleVisualPrimitives.tsx`
- Create: `src/styles/internal-mx-template-slots.css`
- Modify: `src/components/module/InternalMxVisualScope.tsx`

**Interfaces:**
- Produces: explicit `data-mx-template-*` contracts and `useInternalMxTemplate()`.
- Consumes: `InternalMxTemplateKind`, page metadata, authenticated `UserRole`.

- [x] Add a versioned template context carrying kind, page key, title, and role.
- [x] Add explicit page, header, toolbar, section, table, tabs, and sidebar slots.
- [x] Route existing `MxModule*` primitives through the new slots.
- [x] Add slot CSS without route-specific selectors.
- [x] Import the slot CSS in the internal visual scope.

### Task 2: Central access policy

**Files:**
- Create: `src/design-system/internal-mx/internalMxAccessPolicy.ts`
- Test: `src/design-system/internal-mx/internalMxAccessPolicy.test.ts`

**Interfaces:**
- Produces: `getInternalMxAccessMode`, `canManageInternalMxArea`, `canViewInternalMxArea`, and read-only messages.

- [x] Define manage, read-only, and hidden modes.
- [x] Map administrators to manage and Consultor MX to read-only.
- [x] Add unit tests for both managed areas and all relevant roles.

### Task 3: Operational Settings migration

**Files:**
- Modify: `src/pages/OperationalSettings.tsx`
- Modify: `src/hooks/useStoreDeliveryRules.ts`

**Interfaces:**
- Consumes: Operational Settings access policy.
- Produces: canonical page with explicit read-only state and protected mutation hook.

- [x] Replace the legacy `PageHeading` composition with `MxModule*` primitives.
- [x] Keep store selection available in read-only mode.
- [x] Disable projection and email mutations for Consultor MX.
- [x] Block mutation again inside the delivery-rules hook.
- [x] Mark administrative actions with `data-mx-requires-manage`.

### Task 4: PMR Parameters migration

**Files:**
- Modify: `src/features/consultoria/components/ConsultingParametersView.tsx`
- Modify: `src/hooks/useConsultingParameters.ts`

**Interfaces:**
- Consumes: PMR access policy.
- Produces: canonical settings page with read-only Consultor MX behavior.

- [x] Replace legacy heading, cards, loading, and error states with `MxModule*` primitives.
- [x] Preserve metric selection and parameter display.
- [x] Disable all form controls for Consultor MX.
- [x] Block mutation inside the hook.

### Task 5: Architecture and visual regression contracts

**Files:**
- Modify: `src/test/internal-manager-page-contract.test.ts`
- Create: `src/test/internal-mx-wave1-contract.test.ts`
- Modify: `src/test/module-route-visual-audit.playwright.ts`

**Interfaces:**
- Produces: static architecture checks and the 171-case E2E matrix definition.

- [x] Assert the 19 registered areas and five template kinds.
- [x] Assert explicit shell, body, and structural slots.
- [x] Assert no route-specific CSS selectors.
- [x] Define three roles across desktop, tablet, and mobile.
- [x] Assert read-only access and zero enabled management actions for Consultor MX.

### Task 6: Verification and release

**Files:**
- Include all files above in one Git tree and one commit.

- [ ] Transpile every changed TypeScript/TSX file to detect syntax errors.
- [ ] Run local static contract checks over the prepared files.
- [ ] Create one Git tree based on the current `main` commit.
- [ ] Create one commit and fast-forward `main` once.
- [ ] Verify Vercel build, production status, runtime logs, and route smoke tests.
