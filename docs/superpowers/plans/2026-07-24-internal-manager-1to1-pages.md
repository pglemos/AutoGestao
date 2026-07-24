# Internal MX Manager 1:1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the ten specified internal MX routes with the structural visual language used by the Manager module, while preserving all existing data, permissions, hooks, actions, and non-internal role layouts.

**Architecture:** Register the migrated routes explicitly, wrap them in one internal manager composition frame, render the shared page heading with the manager anatomy, convert configuration navigation to horizontal segmented tabs, and enforce the same manager density for cards, tables, forms, filters, and responsive states. No database changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react, Supabase client, Vite, Playwright, Bun tests.

## Global Constraints

- Apply only to `administrador_geral`, `administrador_mx`, and `consultor_mx`.
- Preserve Vendedor, Gerente, and Dono behavior and visual layout.
- Preserve every query, mutation, permission, filter, form action, export, and route.
- Do not expose infrastructure vendor names in UI.
- No Supabase migration, RPC, RLS, trigger, or Edge Function changes.
- One branch, one consolidated commit, one PR, one final Vercel deployment.

## Tasks

1. Register the ten routes as `managerLayout: true`.
2. Add `InternalManagerRouteFrame` and integrate it into `InternalMxVisualScope`.
3. Render `PageHeading` with the exact manager header anatomy inside manager context.
4. Add semantic data attributes to Card primitives for deterministic composition.
5. Convert Configurações navigation from a dark left rail to horizontal manager tabs.
6. Enforce manager layout, card, table, form, filter, KPI, and responsive rules only within the migrated route frame.
7. Add a source contract test and strict Playwright route matrix for desktop, tablet, and mobile.
8. Publish all files in one Git tree and one commit after validation.
