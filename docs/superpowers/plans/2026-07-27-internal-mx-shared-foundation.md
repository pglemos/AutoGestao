# Internal MX Shared Planning Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação tipada e compartilhada de contexto, capacidades, seleção de loja e Realtime para Plano Estratégico, Plano de Ação e Consultoria nos shells de Dono e módulo interno.

**Architecture:** Um provider neutro recebe `storeId`, ator e shell por adapters explícitos. O módulo interno controla a seleção global de loja; o Dono fornece a própria unidade. Cada workspace solicita apenas seu escopo Realtime e usa debounce, single-flight e recarga final após reconexão.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Supabase JS 2, Bun Test, Testing Library, Vite 6.

## Global Constraints

- Perfis internos equivalentes: `administrador_geral`, `administrador_mx`, `consultor_mx`.
- Dono, Gerente e Vendedor não recebem permissões novas.
- Dono não pode excluir ações definitivamente nem revisar antecipação.
- `InternalMxPlanningShell` permanece o shell interno.
- `OwnerLayout` permanece o shell do Dono.
- O módulo interno não importa arquivos de `src/pages/owner`.
- Não usar `as any` fora de um único adapter legado isolado e documentado.
- `storeId` deve sobreviver à navegação entre os três módulos.
- Não selecionar loja inativa automaticamente.
- Realtime não dispara recargas paralelas ilimitadas.
- Tabelas filhas de Plano de Ação só entram no Realtime depois da migration prevista no plano do Plano de Ação.
- Nenhuma alteração de tema global neste plano.

---

## Mapa de arquivos

### Contratos compartilhados

- Create: `src/features/planning-workspace/planningWorkspace.types.ts`
- Create: `src/features/planning-workspace/planningCapabilities.ts`
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.tsx`
- Create: `src/features/planning-workspace/usePlanningRealtime.ts`
- Create: `src/features/planning-workspace/index.ts`
- Create: `src/features/planning-workspace/planningCapabilities.test.ts`
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`
- Create: `src/features/planning-workspace/usePlanningRealtime.test.tsx`

### Adapters e shell

- Create: `src/features/internal-mx-planning/internalPlanningAdapter.ts`
- Modify: `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- Create: `src/components/owner/ownerPlanningAdapter.ts`
- Create: `src/components/owner/ownerPlanningAdapter.test.ts`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

---

### Task 1: Definir atores, shells e capacidades

**Files:**
- Create: `src/features/planning-workspace/planningWorkspace.types.ts`
- Create: `src/features/planning-workspace/planningCapabilities.ts`
- Create: `src/features/planning-workspace/planningCapabilities.test.ts`

**Interfaces:**
- Produces: `PlanningShell`, `PlanningRole`, `PlanningActor`, `PlanningCapabilities`, `resolvePlanningCapabilities(role)`.

- [ ] **Step 1: escrever o teste RED da matriz**

```ts
import { describe, expect, test } from 'bun:test'
import { resolvePlanningCapabilities } from './planningCapabilities'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('resolvePlanningCapabilities', () => {
  test.each(internalRoles)('%s recebe administração global', role => {
    expect(resolvePlanningCapabilities(role)).toEqual({
      scope: 'global',
      canEditTargets: true,
      canCreateActions: true,
      canDeleteActions: true,
      canReviewActions: true,
      canManageConsulting: true,
      canReviewAnticipation: true,
      canViewStrategicPpa: true,
    })
  })

  test('dono permanece na própria loja sem exclusão definitiva', () => {
    expect(resolvePlanningCapabilities('dono')).toEqual({
      scope: 'store',
      canEditTargets: true,
      canCreateActions: true,
      canDeleteActions: false,
      canReviewActions: true,
      canManageConsulting: false,
      canReviewAnticipation: false,
      canViewStrategicPpa: true,
    })
  })

  test('gerente e vendedor não recebem administração global', () => {
    expect(resolvePlanningCapabilities('gerente')).toMatchObject({ scope: 'store', canDeleteActions: false, canViewStrategicPpa: false })
    expect(resolvePlanningCapabilities('vendedor')).toMatchObject({ scope: 'self', canCreateActions: false, canDeleteActions: false })
  })
})
```

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/features/planning-workspace/planningCapabilities.test.ts`

Expected: FAIL porque os módulos ainda não existem.

- [ ] **Step 3: implementar os tipos**

```ts
export type PlanningShell = 'owner' | 'internal'

export type PlanningRole =
  | 'administrador_geral'
  | 'administrador_mx'
  | 'consultor_mx'
  | 'dono'
  | 'gerente'
  | 'vendedor'

export type PlanningActor = {
  id: string
  name: string
  email: string | null
  role: PlanningRole
}

export type PlanningCapabilities = {
  scope: 'global' | 'store' | 'self'
  canEditTargets: boolean
  canCreateActions: boolean
  canDeleteActions: boolean
  canReviewActions: boolean
  canManageConsulting: boolean
  canReviewAnticipation: boolean
  canViewStrategicPpa: boolean
}
```

- [ ] **Step 4: implementar a matriz explícita**

```ts
import type { PlanningCapabilities, PlanningRole } from './planningWorkspace.types'

const INTERNAL: PlanningCapabilities = {
  scope: 'global',
  canEditTargets: true,
  canCreateActions: true,
  canDeleteActions: true,
  canReviewActions: true,
  canManageConsulting: true,
  canReviewAnticipation: true,
  canViewStrategicPpa: true,
}

const OWNER: PlanningCapabilities = {
  scope: 'store',
  canEditTargets: true,
  canCreateActions: true,
  canDeleteActions: false,
  canReviewActions: true,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: true,
}

const MANAGER: PlanningCapabilities = {
  scope: 'store',
  canEditTargets: false,
  canCreateActions: true,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
}

const SELLER: PlanningCapabilities = {
  scope: 'self',
  canEditTargets: false,
  canCreateActions: false,
  canDeleteActions: false,
  canReviewActions: false,
  canManageConsulting: false,
  canReviewAnticipation: false,
  canViewStrategicPpa: false,
}

export function resolvePlanningCapabilities(role: PlanningRole): PlanningCapabilities {
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') return INTERNAL
  if (role === 'dono') return OWNER
  if (role === 'gerente') return MANAGER
  return SELLER
}
```

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/planning-workspace/planningCapabilities.test.ts
git add src/features/planning-workspace/planningWorkspace.types.ts src/features/planning-workspace/planningCapabilities.ts src/features/planning-workspace/planningCapabilities.test.ts
git commit -m "feat(planning): add shared capability contracts"
```

---

### Task 2: Criar o provider do workspace

**Files:**
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.tsx`
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`
- Create: `src/features/planning-workspace/index.ts`

**Interfaces:**
- Consumes: tipos e matriz da Task 1.
- Produces: `PlanningWorkspaceProvider`, `usePlanningWorkspace`, `PlanningWorkspaceValue`.

- [ ] **Step 1: escrever o teste RED**

```tsx
import { renderHook } from '@testing-library/react'
import { expect, test } from 'bun:test'
import type { PropsWithChildren } from 'react'
import { PlanningWorkspaceProvider, usePlanningWorkspace } from './PlanningWorkspaceProvider'

const actor = { id: 'admin-1', name: 'Admin MX', email: null, role: 'administrador_mx' as const }

test('expõe loja, ator, shell e capacidades', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <PlanningWorkspaceProvider shell="internal" storeId="store-1" actor={actor}>{children}</PlanningWorkspaceProvider>
  )
  const { result } = renderHook(() => usePlanningWorkspace(), { wrapper })
  expect(result.current).toMatchObject({ shell: 'internal', storeId: 'store-1', actor })
  expect(result.current.capabilities.scope).toBe('global')
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`

- [ ] **Step 3: implementar o provider**

```tsx
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { resolvePlanningCapabilities } from './planningCapabilities'
import type { PlanningActor, PlanningCapabilities, PlanningShell } from './planningWorkspace.types'

export type PlanningWorkspaceValue = {
  shell: PlanningShell
  storeId: string | null
  actor: PlanningActor
  capabilities: PlanningCapabilities
}

const Context = createContext<PlanningWorkspaceValue | null>(null)

export function PlanningWorkspaceProvider({ shell, storeId, actor, children }: PropsWithChildren<{
  shell: PlanningShell
  storeId: string | null
  actor: PlanningActor
}>) {
  const capabilities = resolvePlanningCapabilities(actor.role)
  const value = useMemo(() => ({ shell, storeId, actor, capabilities }), [actor, capabilities, shell, storeId])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function usePlanningWorkspace(): PlanningWorkspaceValue {
  const value = useContext(Context)
  if (!value) throw new Error('usePlanningWorkspace must be used inside PlanningWorkspaceProvider')
  return value
}
```

- [ ] **Step 4: exportar o contrato público**

```ts
export * from './planningWorkspace.types'
export * from './planningCapabilities'
export * from './PlanningWorkspaceProvider'
export * from './usePlanningRealtime'
```

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx
git add src/features/planning-workspace
git commit -m "feat(planning): add shared workspace provider"
```

---

### Task 3: Consolidar Realtime por escopo

**Files:**
- Create: `src/features/planning-workspace/usePlanningRealtime.ts`
- Create: `src/features/planning-workspace/usePlanningRealtime.test.tsx`

**Interfaces:**
- Produces: `PlanningRealtimeScope`, `PLANNING_REALTIME_TABLES`, `usePlanningRealtime(options)`.

- [ ] **Step 1: escrever testes RED das fontes**

```ts
import { expect, test } from 'bun:test'
import { PLANNING_REALTIME_TABLES } from './usePlanningRealtime'

test('usa apenas fontes publicadas nesta etapa', () => {
  expect(PLANNING_REALTIME_TABLES.strategic).toEqual([
    'catalogo_indicadores_planejamento',
    'valores_indicadores_planejamento',
    'regras_metas_loja',
    'planos_acao',
  ])
  expect(PLANNING_REALTIME_TABLES.action).toEqual(['planos_acao'])
  expect(PLANNING_REALTIME_TABLES.consulting).toEqual([
    'clientes_consultoria',
    'visitas_consultoria',
    'evidencias_visita',
    'eventos_agenda_consultoria',
    'solicitacoes_consultoria',
  ])
})
```

- [ ] **Step 2: escrever teste RED do agrupamento**

With fake timers, emit three callbacks inside 450 ms and expect one reload. While reload promise is pending, emit another event and expect exactly one final reload after resolution.

- [ ] **Step 3: executar RED**

Run: `bun test src/features/planning-workspace/usePlanningRealtime.test.tsx`

- [ ] **Step 4: implementar o registro**

```ts
export type PlanningRealtimeScope = 'strategic' | 'action' | 'consulting'

export const PLANNING_REALTIME_TABLES = {
  strategic: ['catalogo_indicadores_planejamento', 'valores_indicadores_planejamento', 'regras_metas_loja', 'planos_acao'],
  action: ['planos_acao'],
  consulting: ['clientes_consultoria', 'visitas_consultoria', 'evidencias_visita', 'eventos_agenda_consultoria', 'solicitacoes_consultoria'],
} as const
```

- [ ] **Step 5: implementar o hook**

Signature:

```ts
export function usePlanningRealtime(options: {
  scope: PlanningRealtimeScope
  storeId: string | null
  reload: () => Promise<void> | void
}): { status: 'connecting' | 'connected' | 'degraded' }
```

Rules:

```text
one channel per mounted scope/store;
filter by store_id when the table contract supports it;
debounce 450 ms, max wait 2000 ms;
queue one final reload while another is in flight;
reload after reconnect;
remove timers and channel on unmount.
```

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/planning-workspace/usePlanningRealtime.test.tsx
git add src/features/planning-workspace/usePlanningRealtime.ts src/features/planning-workspace/usePlanningRealtime.test.tsx
git commit -m "feat(planning): consolidate realtime reloads"
```

---

### Task 4: Adaptar o módulo interno

**Files:**
- Create: `src/features/internal-mx-planning/internalPlanningAdapter.ts`
- Modify: `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Produces: `toInternalPlanningActor`, seleção de loja persistida e montagem do provider.

- [ ] **Step 1: substituir o contrato antigo que proíbe compartilhamento**

```ts
test('usa workspaces compartilhados sem importar páginas do Dono', () => {
  for (const page of pages) {
    const source = read(page)
    expect(source).toContain('InternalMxPlanningShell')
    expect(source).not.toContain('@/pages/owner/')
    expect(source).not.toContain('OwnerProvider')
  }
  expect(read('src/features/internal-mx-planning/InternalMxPlanningShell.tsx')).toContain('PlanningWorkspaceProvider')
})
```

- [ ] **Step 2: criar o adapter do ator**

```ts
import type { PlanningActor, PlanningRole } from '@/features/planning-workspace'

const allowed = new Set<PlanningRole>(['administrador_geral', 'administrador_mx', 'consultor_mx'])

export function toInternalPlanningActor(user: {
  id: string
  email?: string | null
  full_name?: string | null
  role?: string | null
}): PlanningActor {
  const role = user.role as PlanningRole
  if (!allowed.has(role)) throw new Error('Perfil sem acesso ao workspace interno MX')
  return { id: user.id, email: user.email ?? null, name: user.full_name || user.email || 'Usuário MX', role }
}
```

- [ ] **Step 3: montar provider no shell**

```tsx
<PlanningWorkspaceProvider shell="internal" storeId={store.selectedStoreId || null} actor={actor}>
  {children}
</PlanningWorkspaceProvider>
```

Remove `useInternalPlanningRealtime`. Cada workspace chamará `usePlanningRealtime` com seu escopo.

- [ ] **Step 4: testar seleção de loja**

Cover:

```text
query storeId válido vence activeStoreId;
loja inativa da query é rejeitada;
selectStore atualiza activeStoreId e history.replaceState;
troca de módulo preserva storeId;
sem loja ativa mantém estado vazio, sem selecionar registro arbitrário.
```

- [ ] **Step 5: executar testes e commit**

```bash
bun test src/test/internal-mx-planning-pages.test.ts src/features/planning-workspace
npm run typecheck
git add src/features/internal-mx-planning src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(mx): mount shared planning context"
```

---

### Task 5: Criar adapter do Dono

**Files:**
- Create: `src/components/owner/ownerPlanningAdapter.ts`
- Create: `src/components/owner/ownerPlanningAdapter.test.ts`

**Interfaces:**
- Produces: `toOwnerPlanningActor`, `resolveOwnerPlanningStoreId`.

- [ ] **Step 1: escrever testes RED**

```ts
import { expect, test } from 'bun:test'
import { resolveOwnerPlanningStoreId, toOwnerPlanningActor } from './ownerPlanningAdapter'

test('unitId vence a primeira unidade', () => {
  expect(resolveOwnerPlanningStoreId('store-2', [{ id: 'store-1' }])).toBe('store-2')
})

test('adapter força papel dono sem ampliar capacidades', () => {
  expect(toOwnerPlanningActor({ id: 'u1', full_name: 'Dono', email: 'dono@example.com' })).toEqual({
    id: 'u1', name: 'Dono', email: 'dono@example.com', role: 'dono',
  })
})
```

- [ ] **Step 2: implementar funções puras**

```ts
import type { PlanningActor } from '@/features/planning-workspace'

export function resolveOwnerPlanningStoreId(unitId: string | null | undefined, units: Array<{ id: string }> | null | undefined) {
  return unitId || units?.[0]?.id || null
}

export function toOwnerPlanningActor(user: { id: string; full_name?: string | null; email?: string | null }): PlanningActor {
  return { id: user.id, name: user.full_name || user.email || 'Dono', email: user.email ?? null, role: 'dono' }
}
```

- [ ] **Step 3: executar GREEN e commit**

```bash
bun test src/components/owner/ownerPlanningAdapter.test.ts src/features/planning-workspace/planningCapabilities.test.ts
npm run typecheck
git add src/components/owner/ownerPlanningAdapter.ts src/components/owner/ownerPlanningAdapter.test.ts
git commit -m "feat(owner): add shared planning adapter"
```

---

### Task 6: Gate da fundação

**Files:**
- Verify only.

**Interfaces:**
- Produces: contrato estável para os quatro planos seguintes.

- [ ] **Step 1: executar gates**

```bash
bun test src/features/planning-workspace src/components/owner/ownerPlanningAdapter.test.ts src/test/internal-mx-planning-pages.test.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 2: inspecionar proibições**

```bash
grep -R "@/pages/owner/" src/features/internal-mx-planning && exit 1 || true
grep -R "as any" src/features/planning-workspace src/features/internal-mx-planning/internalPlanningAdapter.ts src/components/owner/ownerPlanningAdapter.ts && exit 1 || true
```

Expected: nenhum resultado.

- [ ] **Step 3: confirmar escopo**

```bash
git diff --stat origin/main...HEAD
git status --short
```

Expected: somente fundação, adapters, shell e testes relacionados.
