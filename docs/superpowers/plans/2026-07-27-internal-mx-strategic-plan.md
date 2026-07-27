# Shared Strategic Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o Plano Estratégico completo para um workspace compartilhado entre Dono e perfis internos, preservando os 45 indicadores, metas, histórico, tabela, gráfico, exportação e criação de Plano de Ação.

**Architecture:** A página atual do Dono será decomposta em controller tipado e workspace neutro. As páginas do Dono e do módulo interno viram wrappers que fornecem contexto e shell. O repositório JavaScript existente será acessado por um adapter TypeScript único, evitando `as any` nas páginas.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Recharts 3, Supabase, Bun Test, Testing Library, Playwright.

## Global Constraints

- Reutilizar `strategicPlanRepository`; não criar segundo repositório.
- Preservar os 45 indicadores, códigos, áreas, direções, fórmulas e agregações.
- Abas finais: `Resumo` e `Visão Geral`.
- Desktop inicia no modo `Ambos`; mobile não oferece `Ambos`.
- No modo Ambos: tabela aproximadamente 58%, gráfico aproximadamente 42%, mesma altura entre 340 e 380 px.
- Substituir quatro cards grandes por uma faixa horizontal única de resumo.
- Ausência de valor permanece `null`/`—`; nunca converter mês futuro em zero.
- A página interna não importa `src/pages/owner`.
- `Dono` usa a própria loja; perfis internos usam a loja global selecionada.
- Tema global `#198653` permanece fora deste plano.

---

## Mapa de arquivos

### Contratos e controller

- Create: `src/features/strategic-plan/strategicPlan.types.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.ts`
- Create: `src/features/strategic-plan/strategicPlanPreferences.ts`
- Create: `src/features/strategic-plan/useStrategicPlanController.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts`
- Create: `src/features/strategic-plan/strategicPlanPreferences.test.ts`
- Create: `src/features/strategic-plan/useStrategicPlanController.test.tsx`

### Workspace e wrappers

- Create: `src/features/strategic-plan/StrategicPlanWorkspace.tsx`
- Create: `src/features/strategic-plan/StrategicPlanWorkspace.test.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.tsx`
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.tsx`
- Modify: `src/pages/owner/PlanoEstrategico.jsx`
- Modify: `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

### Componentes existentes reutilizados

- Reuse: `src/components/owner/strategic/StrategicHeader.jsx`
- Reuse: `src/components/owner/strategic/StrategicPlanTabs.jsx`
- Reuse: `src/components/owner/strategic/StrategicIndicatorSelector.jsx`
- Reuse: `src/components/owner/strategic/StrategicIndicatorReading.jsx`
- Reuse: `src/components/owner/strategic/StrategicIndicatorGuidance.jsx`
- Reuse: `src/components/owner/strategic/StrategicIndicatorComparisonTable.jsx`
- Reuse: `src/components/owner/strategic/StrategicIndicatorChart.jsx`
- Reuse: `src/components/owner/strategic/StrategicPlanOverview.jsx`
- Reuse: `src/components/owner/strategic/EditTargetsDrawer.jsx`
- Reuse: `src/components/owner/strategic/CreateActionModal.jsx`
- Reuse: `src/components/owner/strategic/StrategicExportMenu.jsx`
- Reuse: `src/components/owner/strategic/TargetHistoryPanel.jsx`
- Reuse: `src/components/owner/strategic/FiltersDrawer.jsx`
- Reuse: `src/components/owner/strategic/DisplayModeSelector.jsx`

---

### Task 1: Tipar o contrato do repositório estratégico

**Files:**
- Create: `src/features/strategic-plan/strategicPlan.types.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts`

**Interfaces:**
- Produces: `StrategicIndicator`, `StrategicSeries`, `StrategicDisplayMode`, `StrategicPlanRepository`, `strategicPlanDataSource`.

- [ ] **Step 1: escrever teste RED do adapter**

```ts
import { describe, expect, test } from 'bun:test'
import { createStrategicPlanRepositoryAdapter } from './strategicPlanRepositoryAdapter'

const legacy = {
  load: async () => undefined,
  getOverviewData: () => [{ id: 'SP-001', code: 'SP-001', name: 'Vendas', area: 'Comercial', direction: 'increase', targetValues: Array(12).fill(10), currentValues: Array(12).fill(8), previousYearValues: Array(12).fill(7) }],
  getIndicatorById: (id: string) => ({ id, code: id, name: 'Vendas', area: 'Comercial', direction: 'increase' }),
  getIndicatorSeries: () => ({ id: 'SP-001', targetValues: Array(12).fill(10), currentValues: Array(12).fill(8), previousYearValues: Array(12).fill(7) }),
  getActionItems: () => [],
  getPreferences: () => ({}),
  setPreferences: () => undefined,
}

describe('strategicPlanRepositoryAdapter', () => {
  test('normaliza séries em 12 meses e preserva null', () => {
    const adapter = createStrategicPlanRepositoryAdapter(legacy)
    const rows = adapter.getOverviewData()
    expect(rows[0].currentValues).toHaveLength(12)
    expect(adapter.getActionItems('SP-001')).toEqual([])
  })
})
```

- [ ] **Step 2: executar e confirmar RED**

Run: `bun test src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts`

- [ ] **Step 3: criar os tipos**

```ts
export type StrategicDisplayMode = 'both' | 'table' | 'chart'
export type StrategicTab = 'resumo' | 'visao-geral'

export type StrategicSeries = {
  id: string
  code: string
  name: string
  area: string
  direction: 'increase' | 'decrease' | string
  displayFormat?: string
  targetValues: Array<number | null>
  currentValues: Array<number | null>
  previousYearValues: Array<number | null>
}

export type StrategicPlanRepository = {
  load(input: { storeId: string | null; year: number }): Promise<void>
  getOverviewData(): StrategicSeries[]
  getIndicatorById(id: string): Record<string, unknown> | null
  getIndicatorSeries(id: string, year: number): StrategicSeries | null
  getActionItems(id: string): Array<Record<string, unknown>>
  getPreferences(): { displayMode?: StrategicDisplayMode }
  setPreferences(input: { displayMode: StrategicDisplayMode }): void
}
```

- [ ] **Step 4: implementar um único cast legado**

```ts
import { strategicPlanRepository } from '@/components/owner/strategic/strategicPlanLiveRepository'
import type { StrategicPlanRepository } from './strategicPlan.types'

export function createStrategicPlanRepositoryAdapter(source: unknown): StrategicPlanRepository {
  return source as StrategicPlanRepository
}

export const strategicPlanDataSource = createStrategicPlanRepositoryAdapter(strategicPlanRepository)
```

The cast must exist only in this file.

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts
git add src/features/strategic-plan/strategicPlan.types.ts src/features/strategic-plan/strategicPlanRepositoryAdapter.ts src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts
git commit -m "refactor(strategy): type the canonical repository"
```

---

### Task 2: Isolar preferências e URL

**Files:**
- Create: `src/features/strategic-plan/strategicPlanPreferences.ts`
- Create: `src/features/strategic-plan/strategicPlanPreferences.test.ts`

**Interfaces:**
- Produces: `resolveInitialStrategicDisplayMode`, `readStrategicRouteState`, `writeStrategicRouteState`.

- [ ] **Step 1: escrever testes RED**

```ts
import { describe, expect, test } from 'bun:test'
import { resolveInitialStrategicDisplayMode, readStrategicRouteState } from './strategicPlanPreferences'

describe('preferências estratégicas', () => {
  test('desktop sem preferência inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 1440 })).toBe('both')
  })
  test('mobile nunca inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 390, saved: 'both' })).toBe('table')
  })
  test('lê aba e indicador da URL', () => {
    expect(readStrategicRouteState('?tab=visao-geral&indicator=SP-004')).toEqual({ tab: 'visao-geral', indicatorId: 'SP-004' })
  })
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/strategic-plan/strategicPlanPreferences.test.ts`

- [ ] **Step 3: implementar regras puras**

```ts
export function resolveInitialStrategicDisplayMode({ width, saved }: { width: number; saved?: StrategicDisplayMode }): StrategicDisplayMode {
  if (width < 768) return saved === 'chart' ? 'chart' : 'table'
  return saved || 'both'
}
```

`writeStrategicRouteState` must preserve unrelated query params, including `storeId`.

- [ ] **Step 4: executar GREEN e commit**

```bash
bun test src/features/strategic-plan/strategicPlanPreferences.test.ts
git add src/features/strategic-plan/strategicPlanPreferences.ts src/features/strategic-plan/strategicPlanPreferences.test.ts
git commit -m "feat(strategy): define display and route preferences"
```

---

### Task 3: Criar o controller compartilhado

**Files:**
- Create: `src/features/strategic-plan/useStrategicPlanController.ts`
- Create: `src/features/strategic-plan/useStrategicPlanController.test.tsx`

**Interfaces:**
- Consumes: `usePlanningWorkspace`, `strategicPlanDataSource`, `usePlanningRealtime`.
- Produces: `StrategicPlanController` with load state, selected indicator, tab, filters, drawers and actions.

- [ ] **Step 1: escrever teste RED de carregamento por loja**

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { expect, test } from 'bun:test'

// Inject a fake repository through the hook options.
test('carrega o repositório usando a loja do workspace', async () => {
  const loadCalls: unknown[] = []
  const repository = fakeStrategicRepository({ load: async input => { loadCalls.push(input) } })
  const { result } = renderStrategicController({ storeId: 'store-1', repository })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(loadCalls).toEqual([{ storeId: 'store-1', year: 2026 }])
})
```

- [ ] **Step 2: adicionar testes para estados**

Cover:

```text
sem loja → não consulta;
load rejeita → error preenchido;
indicator da URL inexistente → usa primeiro indicador;
trocar indicador preserva displayMode;
Realtime chama reload agrupado;
mobile converte both para table.
```

- [ ] **Step 3: executar RED**

Run: `bun test src/features/strategic-plan/useStrategicPlanController.test.tsx`

- [ ] **Step 4: implementar controller com injeção opcional**

Signature:

```ts
export function useStrategicPlanController(options?: {
  repository?: StrategicPlanRepository
  year?: number
}): StrategicPlanController
```

The controller must use `REFERENCE_YEAR` as default, keep `refreshKey`, and expose:

```ts
{
  tab, setTab,
  selectedIndicatorId, setSelectedIndicatorId,
  areaFilter, setAreaFilter,
  displayMode, setDisplayMode,
  effectiveDisplayMode,
  loading, error, reload,
  indicator, series, overview,
  existingAction,
  editOpen, setEditOpen,
  actionOpen, setActionOpen,
  filtersOpen, setFiltersOpen,
  isActionPrimary,
}
```

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/strategic-plan/useStrategicPlanController.test.tsx
npm run typecheck
git add src/features/strategic-plan/useStrategicPlanController.ts src/features/strategic-plan/useStrategicPlanController.test.tsx
git commit -m "feat(strategy): add shared strategic controller"
```

---

### Task 4: Criar faixa de resumo e grid 58/42

**Files:**
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.tsx`
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.test.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.test.tsx`

**Interfaces:**
- Produces: faixa única com quatro métricas e container responsivo da análise.

- [ ] **Step 1: escrever teste RED da faixa**

```tsx
render(<StrategicIndicatorStrip series={series} selectedMonthIndex={6} />)
expect(screen.getByText('Meta do mês')).toBeInTheDocument()
expect(screen.getByText('Resultado do mês')).toBeInTheDocument()
expect(screen.getByText('Atingimento da meta')).toBeInTheDocument()
expect(screen.getByText('Variação contra o ano anterior')).toBeInTheDocument()
```

- [ ] **Step 2: escrever teste RED do grid**

```tsx
render(<StrategicAnalysisGrid mode="both" table={<div>Tabela</div>} chart={<div>Gráfico</div>} />)
expect(screen.getByTestId('strategic-analysis-grid')).toHaveClass('xl:grid-cols-[58%_42%]')
expect(screen.getByTestId('strategic-table-slot')).toHaveClass('h-[360px]')
expect(screen.getByTestId('strategic-chart-slot')).toHaveClass('h-[360px]')
```

- [ ] **Step 3: implementar sem duplicar cálculos**

Use `calculatePercentageOfTarget` and `getStatusFromPercentage` from `strategicUtils`. Preserve `null` as `—`.

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/strategic-plan/components
git add src/features/strategic-plan/components
git commit -m "feat(strategy): add compact analysis composition"
```

---

### Task 5: Montar o workspace compartilhado

**Files:**
- Create: `src/features/strategic-plan/StrategicPlanWorkspace.tsx`
- Create: `src/features/strategic-plan/StrategicPlanWorkspace.test.tsx`

**Interfaces:**
- Consumes: controller, componentes existentes e novos componentes neutros.
- Produces: `StrategicPlanWorkspace`.

- [ ] **Step 1: escrever teste RED da composição final**

```tsx
renderStrategicWorkspace()
expect(screen.getByRole('heading', { name: 'Planejamento Estratégico' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true')
expect(screen.getByRole('button', { name: 'Ambos' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByText('Leitura do indicador')).toBeInTheDocument()
expect(screen.getByText('Direcionamento MX')).toBeInTheDocument()
```

- [ ] **Step 2: implementar loading, error e empty**

Required states:

```text
loading skeleton com dimensões finais;
error com mensagem e Tentar novamente;
sem loja selecionada;
indicador sem dados;
indicador derivado não editável;
meta ausente;
ação vinculada ausente/presente.
```

- [ ] **Step 3: implementar composição**

Structure:

```text
StrategicHeader compacto
StrategicPlanTabs
barra compacta de controles
StrategicIndicatorStrip
StrategicAnalysisGrid
Leitura + Direcionamento
TargetHistoryPanel
EditTargetsDrawer
CreateActionModal
FiltersDrawer
```

No greeting is rendered inside this workspace.

- [ ] **Step 4: executar GREEN**

```bash
bun test src/features/strategic-plan/StrategicPlanWorkspace.test.tsx
npm run typecheck
```

- [ ] **Step 5: commit**

```bash
git add src/features/strategic-plan/StrategicPlanWorkspace.tsx src/features/strategic-plan/StrategicPlanWorkspace.test.tsx
git commit -m "feat(strategy): add shared strategic workspace"
```

---

### Task 6: Converter Dono e módulo interno em wrappers

**Files:**
- Modify: `src/pages/owner/PlanoEstrategico.jsx`
- Modify: `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Consumes: `PlanningWorkspaceProvider`, adapters e `StrategicPlanWorkspace`.
- Produces: duas montagens sobre a mesma implementação.

- [ ] **Step 1: escrever contrato RED dos wrappers**

```ts
const owner = read('src/pages/owner/PlanoEstrategico.jsx')
const internal = read('src/features/internal-mx-planning/InternalStrategicPlanPage.tsx')
expect(owner).toContain('StrategicPlanWorkspace')
expect(internal).toContain('StrategicPlanWorkspace')
expect(internal).not.toContain('as any')
expect(internal).not.toContain('IndicatorTab')
expect(internal).not.toContain('TargetTab')
expect(internal).not.toContain('ActionTab')
```

- [ ] **Step 2: executar RED**

Run: `bun test src/test/internal-mx-planning-pages.test.ts`

- [ ] **Step 3: reduzir a página do Dono**

The owner wrapper must:

```tsx
const storeId = resolveOwnerPlanningStoreId(unitId, currentUnits)
const actor = toOwnerPlanningActor(user)
return (
  <PlanningWorkspaceProvider shell="owner" storeId={storeId} actor={actor}>
    <StrategicPlanWorkspace onUpdated={date => setLastUpdated?.(date)} />
  </PlanningWorkspaceProvider>
)
```

- [ ] **Step 4: reduzir a página interna**

```tsx
export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()
  return (
    <InternalMxPlanningShell title="Plano Estratégico" description="Administre indicadores, metas, comparativos e ações da loja selecionada." store={store}>
      {store.selectedStoreId ? <StrategicPlanWorkspace /> : null}
    </InternalMxPlanningShell>
  )
}
```

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
git add src/pages/owner/PlanoEstrategico.jsx src/features/internal-mx-planning/InternalStrategicPlanPage.tsx src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(strategy): share owner and internal workspace"
```

---

### Task 7: Validar ação vinculada, exportação e responsividade

**Files:**
- Create: `src/test/strategic-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/strategic-plan.md`

**Interfaces:**
- Produces: evidência funcional e visual das duas montagens.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
internal selects store and opens SP-001;
owner opens the same store;
both show same target/current values;
internal edits target and owner sees it after Realtime;
create action from indicator once;
second click opens existing action instead of duplicating;
export generates non-empty CSV;
mobile offers only Tabela and Gráfico.
```

- [ ] **Step 2: executar testes e gates**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npx playwright test src/test/strategic-plan-shared.playwright.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: registrar evidência**

`strategic-plan.md` must contain SHA, store used, indicator used, screenshots at 1440/1024/768/390, test commands and result.

- [ ] **Step 4: commit**

```bash
git add src/test/strategic-plan-shared.playwright.ts docs/qa/evidence/internal-mx-functional/strategic-plan.md
git commit -m "test(strategy): verify shared strategic workspace"
```
