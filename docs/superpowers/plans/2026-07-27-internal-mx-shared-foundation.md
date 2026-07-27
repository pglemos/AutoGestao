# Internal MX Shared Planning Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação tipada e compartilhada de contexto, capacidades, seleção de loja e Realtime usada por Plano Estratégico, Plano de Ação e Consultoria nos shells de Dono e módulo interno.

**Architecture:** Um provider neutro recebe `storeId`, ator, papel e shell por adaptadores explícitos. A seleção global continua no módulo interno, enquanto o Dono fornece a própria unidade. As assinaturas Realtime são consolidadas por escopo, com debounce, single-flight e recarga final após reconexão.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Supabase JS 2, Bun Test, Testing Library, Vite 6.

## Global Constraints

- Perfis internos equivalentes: `administrador_geral`, `administrador_mx`, `consultor_mx`.
- `dono`, `gerente` e `vendedor` não recebem permissões adicionais.
- `InternalMxPlanningShell` permanece o shell interno.
- `OwnerLayout` permanece o shell do Dono.
- Não importar páginas de `src/pages/owner` no módulo interno.
- Não usar `as any` fora de um adapter legado isolado e documentado.
- `storeId` deve sobreviver à navegação entre os três módulos.
- Não selecionar loja inativa automaticamente.
- Realtime não pode disparar recargas paralelas ilimitadas.
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
- Create: `src/features/planning-workspace/usePlanningRealtime.test.tsx`
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`

### Adapters e shell

- Modify: `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- Create: `src/features/internal-mx-planning/internalPlanningAdapter.ts`
- Create: `src/components/owner/ownerPlanningAdapter.ts`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

---

### Task 1: Definir atores, shells e capacidades

**Files:**
- Create: `src/features/planning-workspace/planningWorkspace.types.ts`
- Create: `src/features/planning-workspace/planningCapabilities.ts`
- Create: `src/features/planning-workspace/planningCapabilities.test.ts`

**Interfaces:**
- Produces: `PlanningShell`, `PlanningRole`, `PlanningActor`, `PlanningCapabilities`, `resolvePlanningCapabilities(role)`.

- [ ] **Step 1: escrever o teste RED da matriz de capacidades**

```ts
import { describe, expect, test } from 'bun:test'
import { resolvePlanningCapabilities } from './planningCapabilities'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('resolvePlanningCapabilities', () => {
  test.each(internalRoles)('%s recebe administração global', role => {
    expect(resolvePlanningCapabilities(role)).toMatchObject({
      scope: 'global',
      canEditTargets: true,
      canCreateActions: true,
      canDeleteActions: true,
      canReviewActions: true,
      canManageConsulting: true,
      canReviewAnticipation: true,
    })
  })

  test('dono permanece restrito à própria loja', () => {
    expect(resolvePlanningCapabilities('dono')).toMatchObject({
      scope: 'store',
      canEditTargets: true,
      canManageConsulting: false,
      canReviewAnticipation: false,
    })
  })

  test('gerente e vendedor não recebem administração global', () => {
    expect(resolvePlanningCapabilities('gerente').scope).toBe('store')
    expect(resolvePlanningCapabilities('vendedor').scope).toBe('self')
    expect(resolvePlanningCapabilities('vendedor').canDeleteActions).toBe(false)
  })
})
```

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/features/planning-workspace/planningCapabilities.test.ts`

Expected: FAIL porque os arquivos ainda não existem.

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

export function resolvePlanningCapabilities(role: PlanningRole): PlanningCapabilities {
  if (role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx') return INTERNAL
  if (role === 'dono') return { ...INTERNAL, scope: 'store', canManageConsulting: false, canReviewAnticipation: false }
  if (role === 'gerente') return {
    scope: 'store', canEditTargets: false, canCreateActions: true, canDeleteActions: false,
    canReviewActions: false, canManageConsulting: false, canReviewAnticipation: false, canViewStrategicPpa: false,
  }
  return {
    scope: 'self', canEditTargets: false, canCreateActions: false, canDeleteActions: false,
    canReviewActions: false, canManageConsulting: false, canReviewAnticipation: false, canViewStrategicPpa: false,
  }
}
```

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/planning-workspace/planningCapabilities.test.ts
git add src/features/planning-workspace/planningWorkspace.types.ts src/features/planning-workspace/planningCapabilities.ts src/features/planning-workspace/planningCapabilities.test.ts
git commit -m "feat(planning): add shared capability contracts"
```

---

### Task 2: Criar o provider de workspace

**Files:**
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.tsx`
- Create: `src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`
- Create: `src/features/planning-workspace/index.ts`

**Interfaces:**
- Consumes: `PlanningActor`, `PlanningShell`, `resolvePlanningCapabilities`.
- Produces: `PlanningWorkspaceProvider`, `usePlanningWorkspace`, `PlanningWorkspaceValue`.

- [ ] **Step 1: escrever o teste RED do provider**

```tsx
import { renderHook } from '@testing-library/react'
import { expect, test } from 'bun:test'
import type { PropsWithChildren } from 'react'
import { PlanningWorkspaceProvider, usePlanningWorkspace } from './PlanningWorkspaceProvider'

const actor = { id: 'admin-1', name: 'Admin MX', email: null, role: 'administrador_mx' as const }

test('expõe loja, ator, shell e capacidades', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <PlanningWorkspaceProvider shell="internal" storeId="store-1" actor={actor}>
      {children}
    </PlanningWorkspaceProvider>
  )
  const { result } = renderHook(() => usePlanningWorkspace(), { wrapper })
  expect(result.current.storeId).toBe('store-1')
  expect(result.current.shell).toBe('internal')
  expect(result.current.capabilities.scope).toBe('global')
})
```

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`

Expected: FAIL por módulo inexistente.

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

const PlanningWorkspaceContext = createContext<PlanningWorkspaceValue | null>(null)

export function PlanningWorkspaceProvider({ shell, storeId, actor, children }: PropsWithChildren<{
  shell: PlanningShell
  storeId: string | null
  actor: PlanningActor
}>) {
  const value = useMemo(() => ({ shell, storeId, actor, capabilities: resolvePlanningCapabilities(actor.role) }), [actor, shell, storeId])
  return <PlanningWorkspaceContext.Provider value={value}>{children}</PlanningWorkspaceContext.Provider>
}

export function usePlanningWorkspace() {
  const value = useContext(PlanningWorkspaceContext)
  if (!value) throw new Error('usePlanningWorkspace must be used inside PlanningWorkspaceProvider')
  return value
}
```

- [ ] **Step 4: exportar o contrato público e executar GREEN**

```ts
export * from './planningWorkspace.types'
export * from './planningCapabilities'
export * from './PlanningWorkspaceProvider'
export * from './usePlanningRealtime'
```

Run: `bun test src/features/planning-workspace/PlanningWorkspaceProvider.test.tsx`

- [ ] **Step 5: commit**

```bash
git add src/features/planning-workspace
git commit -m "feat(planning): add shared workspace provider"
```

---

### Task 3: Consolidar Realtime com debounce e single-flight

**Files:**
- Create: `src/features/planning-workspace/usePlanningRealtime.ts`
- Create: `src/features/planning-workspace/usePlanningRealtime.test.tsx`

**Interfaces:**
- Produces: `PlanningRealtimeScope`, `PLANNING_REALTIME_TABLES`, `usePlanningRealtime(options)`.

- [ ] **Step 1: escrever os testes RED das tabelas e do agrupamento**

```tsx
import { expect, test } from 'bun:test'
import { PLANNING_REALTIME_TABLES } from './usePlanningRealtime'

test('separa fontes por domínio sem perder tabelas compartilhadas', () => {
  expect(PLANNING_REALTIME_TABLES.strategic).toContain('valores_indicadores_planejamento')
  expect(PLANNING_REALTIME_TABLES.strategic).toContain('regras_metas_loja')
  expect(PLANNING_REALTIME_TABLES.action).toContain('planos_acao')
  expect(PLANNING_REALTIME_TABLES.consulting).toContain('visitas_consultoria')
})
```

Add a hook test with fake timers that emits three events and expects one reload call after 450 ms.

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/features/planning-workspace/usePlanningRealtime.test.tsx`

- [ ] **Step 3: implementar registros e hook**

```ts
export const PLANNING_REALTIME_TABLES = {
  strategic: ['catalogo_indicadores_planejamento', 'valores_indicadores_planejamento', 'regras_metas_loja', 'planos_acao'],
  action: ['planos_acao', 'historico_planos_acao', 'evidencias_planos_acao', 'itens_plano_acao'],
  consulting: ['clientes_consultoria', 'visitas_consultoria', 'evidencias_visita', 'eventos_agenda_consultoria', 'solicitacoes_consultoria'],
} as const
```

The hook must:

```text
- create one channel per mounted scope;
- debounce bursts at 450 ms with a maximum wait of 2000 ms;
- set queued=true when reload is in flight;
- run one final reload after the in-flight promise finishes;
- expose connecting/connected/degraded;
- call reload after reconnect;
- remove channel and timers on unmount.
```

- [ ] **Step 4: executar GREEN**

```bash
bun test src/features/planning-workspace/usePlanningRealtime.test.tsx
```

- [ ] **Step 5: commit**

```bash
git add src/features/planning-workspace/usePlanningRealtime.ts src/features/planning-workspace/usePlanningRealtime.test.tsx
git commit -m "feat(planning): consolidate realtime reloads"
```

---

### Task 4: Adaptar o módulo interno sem duplicar contexto

**Files:**
- Create: `src/features/internal-mx-planning/internalPlanningAdapter.ts`
- Modify: `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Consumes: `PlanningWorkspaceProvider`.
- Produces: `useInternalPlanningStore`, `InternalPlanningProvider`, seleção de loja persistida em URL.

- [ ] **Step 1: substituir o contrato de teste que proíbe compartilhamento**

Replace the first test in `src/test/internal-mx-planning-pages.test.ts` with:

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

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/test/internal-mx-planning-pages.test.ts`

Expected: FAIL porque o shell ainda não monta o provider.

- [ ] **Step 3: criar o adapter do ator interno**

```ts
import type { PlanningActor, PlanningRole } from '@/features/planning-workspace'

export function toInternalPlanningActor(user: { id: string; email?: string | null; full_name?: string | null; role?: string | null }): PlanningActor {
  const role = user.role as PlanningRole
  if (!['administrador_geral', 'administrador_mx', 'consultor_mx'].includes(role)) {
    throw new Error('Perfil sem acesso ao workspace interno MX')
  }
  return { id: user.id, email: user.email ?? null, name: user.full_name || user.email || 'Usuário MX', role }
}
```

- [ ] **Step 4: montar o provider dentro do shell**

`InternalMxPlanningShell` must receive the authenticated user from `useAuth`, convert it with `toInternalPlanningActor`, and wrap `children`:

```tsx
<PlanningWorkspaceProvider shell="internal" storeId={store.selectedStoreId || null} actor={actor}>
  {children}
</PlanningWorkspaceProvider>
```

Remove `useInternalPlanningRealtime`; each workspace will request its own scope through `usePlanningRealtime`.

- [ ] **Step 5: preservar URL e store ativo**

Add tests for:

```text
?storeId=<uuid> wins over activeStoreId when active;
selectStore updates activeStoreId and history.replaceState;
inactive store is rejected;
empty active list renders the no-store state.
```

- [ ] **Step 6: executar testes e commit**

```bash
bun test src/test/internal-mx-planning-pages.test.ts src/features/planning-workspace
npm run typecheck
git add src/features/internal-mx-planning src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(mx): mount shared planning context"
```

---

### Task 5: Criar o adapter do Dono e validar isolamento

**Files:**
- Create: `src/components/owner/ownerPlanningAdapter.ts`
- Create: `src/components/owner/ownerPlanningAdapter.test.ts`

**Interfaces:**
- Produces: `toOwnerPlanningActor(user)`, `resolveOwnerPlanningStoreId(unitId, currentUnits)`.

- [ ] **Step 1: escrever testes RED**

```ts
import { expect, test } from 'bun:test'
import { resolveOwnerPlanningStoreId, toOwnerPlanningActor } from './ownerPlanningAdapter'

test('usa unitId antes da primeira unidade', () => {
  expect(resolveOwnerPlanningStoreId('store-2', [{ id: 'store-1' }])).toBe('store-2')
})

test('força papel dono no adapter do shell do Dono', () => {
  expect(toOwnerPlanningActor({ id: 'u1', full_name: 'Dono', email: 'dono@example.com' }).role).toBe('dono')
})
```

- [ ] **Step 2: executar RED e implementar funções puras**

Run: `bun test src/components/owner/ownerPlanningAdapter.test.ts`

Implementation:

```ts
export function resolveOwnerPlanningStoreId(unitId: string | null | undefined, units: Array<{ id: string }> | null | undefined) {
  return unitId || units?.[0]?.id || null
}
```

- [ ] **Step 3: executar matriz de isolamento**

```bash
bun test src/components/owner/ownerPlanningAdapter.test.ts src/features/planning-workspace/planningCapabilities.test.ts
npm run typecheck
```

- [ ] **Step 4: commit**

```bash
git add src/components/owner/ownerPlanningAdapter.ts src/components/owner/ownerPlanningAdapter.test.ts
git commit -m "feat(owner): add shared planning adapter"
```

---

### Task 6: Gate da fundação

**Files:**
- Verify only.

**Interfaces:**
- Produces: contrato estável para os quatro planos seguintes.

- [ ] **Step 1: executar testes focados**

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

- [ ] **Step 3: confirmar escopo do diff**

```bash
git diff --stat origin/main...HEAD
git status --short
```

Expected: somente fundação, adapters, shell e testes relacionados.
