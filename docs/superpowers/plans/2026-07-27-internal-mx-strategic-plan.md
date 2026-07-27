# Shared Strategic Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o Plano Estratégico completo para um workspace compartilhado entre Dono e perfis internos, preservando os 45 indicadores, metas, histórico, tabela, gráfico, exportação e criação de Plano de Ação.

**Architecture:** A página atual do Dono será decomposta em controller tipado e workspace neutro. Dono e módulo interno viram wrappers que fornecem contexto e shell. O repositório JavaScript existente será acessado por um adapter TypeScript único que tipa leitura, edição de metas, exportação e vínculo com ações.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Recharts 3, Supabase, Bun Test, Testing Library, Playwright.

## Global Constraints

- Reutilizar `strategicPlanRepository`; não criar segundo repositório.
- Preservar 45 indicadores, códigos, áreas, direções, fórmulas e agregações.
- Abas finais: `Resumo` e `Visão Geral`.
- Desktop inicia em `Ambos`; mobile não oferece `Ambos`.
- No modo Ambos: tabela aproximadamente 58%, gráfico aproximadamente 42%, mesma altura entre 340 e 380 px.
- Substituir quatro cards grandes por uma faixa horizontal única.
- Ausência permanece `null`/`—`; mês futuro nunca vira zero.
- A página interna não importa `src/pages/owner`.
- Dono usa a própria loja; perfis internos usam a loja global selecionada.
- O adapter deve tipar também `updateTargets`, `createActionItem` e `exportIndicatorData`.
- Nenhuma alteração de tema global neste plano.

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
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.test.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.test.tsx`
- Modify: `src/pages/owner/PlanoEstrategico.jsx`
- Modify: `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`
- Create: `src/test/strategic-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/strategic-plan.md`

### Componentes canônicos reutilizados

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

### Task 1: Tipar integralmente o repositório canônico

**Files:**
- Create: `src/features/strategic-plan/strategicPlan.types.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.ts`
- Create: `src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts`

**Interfaces:**
- Produces: `StrategicSeries`, `StrategicDisplayMode`, `StrategicActionPayload`, `StrategicPlanRepository`, `strategicPlanDataSource`.

- [ ] **Step 1: escrever o teste RED do adapter**

```ts
import { describe, expect, test } from 'bun:test'
import { createStrategicPlanRepositoryAdapter } from './strategicPlanRepositoryAdapter'

const series = {
  id: 'SP-001', code: 'SP-001', name: 'Vendas', area: 'Comercial', direction: 'increase',
  targetValues: Array(12).fill(10), currentValues: Array(12).fill(8), previousYearValues: Array(12).fill(7),
}

const legacy = {
  load: async () => undefined,
  getOverviewData: () => [series],
  getIndicatorById: () => series,
  getIndicatorSeries: () => series,
  getActionItems: () => [],
  getPreferences: () => ({}),
  setPreferences: () => undefined,
  updateTargets: async () => undefined,
  createActionItem: async () => ({ id: 'action-1' }),
  exportIndicatorData: () => 'month,target,current\nJan,10,8',
}

describe('strategicPlanRepositoryAdapter', () => {
  test('expõe leitura e mutações no mesmo contrato', async () => {
    const adapter = createStrategicPlanRepositoryAdapter(legacy)
    expect(adapter.getOverviewData()[0].currentValues).toHaveLength(12)
    await expect(adapter.updateTargets('SP-001', 2026, Array(12).fill(12))).resolves.toBeUndefined()
    await expect(adapter.createActionItem({ indicatorId: 'SP-001', action: 'Recuperar vendas' })).resolves.toEqual({ id: 'action-1' })
    expect(adapter.exportIndicatorData('SP-001', 2026)).toContain('month,target,current')
  })
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts`

Expected: FAIL porque os módulos ainda não existem.

- [ ] **Step 3: criar tipos completos**

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

export type StrategicActionPayload = {
  indicatorId: string
  action: string
  problem?: string
  note?: string
  area?: string
  deadline?: string | null
  priority?: string
  createdBy?: string
  [key: string]: unknown
}

export type StrategicPlanRepository = {
  load(input: { storeId: string | null; year: number }): Promise<void>
  getOverviewData(): StrategicSeries[]
  getIndicatorById(id: string): Record<string, unknown> | null
  getIndicatorSeries(id: string, year: number): StrategicSeries | null
  getActionItems(id: string): Array<Record<string, unknown>>
  getPreferences(): { displayMode?: StrategicDisplayMode }
  setPreferences(input: { displayMode: StrategicDisplayMode }): void
  updateTargets(id: string, year: number, values: Array<number | null>): Promise<void>
  createActionItem(payload: StrategicActionPayload): Promise<Record<string, unknown> | null>
  exportIndicatorData(id: string, year: number): string
}
```

- [ ] **Step 4: implementar o único cast legado**

```ts
import { strategicPlanRepository } from '@/components/owner/strategic/strategicPlanLiveRepository'
import type { StrategicPlanRepository } from './strategicPlan.types'

export function createStrategicPlanRepositoryAdapter(source: unknown): StrategicPlanRepository {
  return source as StrategicPlanRepository
}

export const strategicPlanDataSource = createStrategicPlanRepositoryAdapter(strategicPlanRepository)
```

The cast must remain only in this adapter.

- [ ] **Step 5: executar GREEN e commit**

```bash
bun test src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts
git add src/features/strategic-plan/strategicPlan.types.ts src/features/strategic-plan/strategicPlanRepositoryAdapter.ts src/features/strategic-plan/strategicPlanRepositoryAdapter.test.ts
git commit -m "refactor(strategy): type the canonical repository"
```

---

### Task 2: Isolar preferências e query string

**Files:**
- Create: `src/features/strategic-plan/strategicPlanPreferences.ts`
- Create: `src/features/strategic-plan/strategicPlanPreferences.test.ts`

**Interfaces:**
- Produces: `resolveInitialStrategicDisplayMode`, `readStrategicRouteState`, `writeStrategicRouteState`.

- [ ] **Step 1: escrever testes RED**

```ts
import { describe, expect, test } from 'bun:test'
import { readStrategicRouteState, resolveInitialStrategicDisplayMode, writeStrategicRouteState } from './strategicPlanPreferences'

describe('preferências estratégicas', () => {
  test('desktop sem preferência inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 1440 })).toBe('both')
  })

  test('mobile nunca inicia em both', () => {
    expect(resolveInitialStrategicDisplayMode({ width: 390, saved: 'both' })).toBe('table')
  })

  test('preserva storeId ao escrever aba e indicador', () => {
    const next = writeStrategicRouteState('?storeId=store-1', { tab: 'visao-geral', indicatorId: 'SP-004' })
    expect(readStrategicRouteState(next)).toEqual({ tab: 'visao-geral', indicatorId: 'SP-004' })
    expect(next).toContain('storeId=store-1')
  })
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/features/strategic-plan/strategicPlanPreferences.test.ts`

- [ ] **Step 3: implementar regras puras**

```ts
export function resolveInitialStrategicDisplayMode({ width, saved }: {
  width: number
  saved?: StrategicDisplayMode
}): StrategicDisplayMode {
  if (width < 768) return saved === 'chart' ? 'chart' : 'table'
  return saved || 'both'
}
```

`writeStrategicRouteState` must preserve every unrelated parameter.

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/strategic-plan/strategicPlanPreferences.test.ts
git add src/features/strategic-plan/strategicPlanPreferences.ts src/features/strategic-plan/strategicPlanPreferences.test.ts
git commit -m "feat(strategy): define display and route preferences"
```

---

### Task 3: Criar controller compartilhado

**Files:**
- Create: `src/features/strategic-plan/useStrategicPlanController.ts`
- Create: `src/features/strategic-plan/useStrategicPlanController.test.tsx`

**Interfaces:**
- Consumes: `usePlanningWorkspace`, `strategicPlanDataSource`, `usePlanningRealtime`.
- Produces: `StrategicPlanController`.

- [ ] **Step 1: escrever RED de carregamento por loja**

```tsx
test('carrega usando a loja do workspace', async () => {
  const repository = fakeStrategicRepository()
  const { result } = renderStrategicController({ storeId: 'store-1', repository })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(repository.load).toHaveBeenCalledWith({ storeId: 'store-1', year: 2026 })
})
```

- [ ] **Step 2: cobrir estados e ações**

Tests:

```text
sem loja não consulta;
erro de load preenche error;
indicator inválido usa primeiro indicador;
45 indicadores são preservados;
trocar indicador preserva display mode;
mobile converte both para table;
edit target calls updateTargets and reloads;
create action calls createActionItem once;
export returns non-empty CSV;
Realtime burst triggers one reload.
```

- [ ] **Step 3: implementar assinatura**

```ts
export function useStrategicPlanController(options?: {
  repository?: StrategicPlanRepository
  year?: number
}): StrategicPlanController
```

Expose:

```text
tab, setTab;
selectedIndicatorId, setSelectedIndicatorId;
areaFilter, setAreaFilter;
displayMode, setDisplayMode, effectiveDisplayMode;
loading, error, reload;
indicator, series, overview, existingAction;
editOpen, actionOpen, filtersOpen and setters;
updateTargets, createAction, exportIndicator;
isActionPrimary.
```

- [ ] **Step 4: usar `usePlanningRealtime({ scope: 'strategic' })`**

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/strategic-plan/useStrategicPlanController.test.tsx
npm run typecheck
git add src/features/strategic-plan/useStrategicPlanController.ts src/features/strategic-plan/useStrategicPlanController.test.tsx
git commit -m "feat(strategy): add shared strategic controller"
```

---

### Task 4: Criar faixa horizontal e grid 58/42

**Files:**
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.tsx`
- Create: `src/features/strategic-plan/components/StrategicIndicatorStrip.test.tsx`
- Create: `src/features/strategic-plan/components/StrategicAnalysisGrid.test.tsx`

**Interfaces:**
- Produces: faixa única de resumo e composição responsiva da análise.

- [ ] **Step 1: escrever RED da faixa**

```tsx
render(<StrategicIndicatorStrip series={series} selectedMonthIndex={6} />)
expect(screen.getByText('Meta do mês')).toBeInTheDocument()
expect(screen.getByText('Resultado do mês')).toBeInTheDocument()
expect(screen.getByText('Atingimento da meta')).toBeInTheDocument()
expect(screen.getByText('Variação contra o ano anterior')).toBeInTheDocument()
```

- [ ] **Step 2: escrever RED do grid**

```tsx
render(<StrategicAnalysisGrid mode="both" table={<div>Tabela</div>} chart={<div>Gráfico</div>} />)
expect(screen.getByTestId('strategic-analysis-grid')).toHaveClass('xl:grid-cols-[58%_42%]')
expect(screen.getByTestId('strategic-table-slot')).toHaveClass('h-[360px]')
expect(screen.getByTestId('strategic-chart-slot')).toHaveClass('h-[360px]')
```

- [ ] **Step 3: implementar usando utilitários canônicos**

Use `calculatePercentageOfTarget` and `getStatusFromPercentage`. Preserve `null` as `—`.

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/strategic-plan/components
git add src/features/strategic-plan/components
git commit -m "feat(strategy): add compact analysis composition"
```

---

### Task 5: Montar workspace compartilhado

**Files:**
- Create: `src/features/strategic-plan/StrategicPlanWorkspace.tsx`
- Create: `src/features/strategic-plan/StrategicPlanWorkspace.test.tsx`

**Interfaces:**
- Consumes: controller e componentes canônicos.
- Produces: `StrategicPlanWorkspace`.

- [ ] **Step 1: escrever RED da composição**

```tsx
renderStrategicWorkspace()
expect(screen.getByRole('heading', { name: 'Planejamento Estratégico' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Resumo' })).toHaveAttribute('aria-selected', 'true')
expect(screen.getByRole('button', { name: 'Ambos' })).toHaveAttribute('aria-pressed', 'true')
expect(screen.getByText('Leitura do indicador')).toBeInTheDocument()
expect(screen.getByText('Direcionamento MX')).toBeInTheDocument()
```

- [ ] **Step 2: implementar estados**

```text
loading skeleton com dimensões finais;
erro com Tentar novamente;
sem loja;
indicador sem dados;
indicador derivado não editável;
meta ausente;
ação vinculada ausente/presente.
```

- [ ] **Step 3: implementar estrutura**

```text
cabeçalho compacto, sem saudação;
Resumo e Visão Geral;
barra compacta: Indicador, Área, Exibição, Editar Metas, Criar/Abrir Plano de Ação, Exportar;
StrategicIndicatorStrip;
StrategicAnalysisGrid;
Leitura e Direcionamento;
TargetHistoryPanel;
drawers/modals canônicos.
```

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/strategic-plan/StrategicPlanWorkspace.test.tsx
npm run typecheck
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
- Produces: duas montagens da mesma implementação.

- [ ] **Step 1: escrever contrato RED**

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

- [ ] **Step 2: reduzir página do Dono**

```tsx
const storeId = resolveOwnerPlanningStoreId(unitId, currentUnits)
const actor = toOwnerPlanningActor(user)
return (
  <PlanningWorkspaceProvider shell="owner" storeId={storeId} actor={actor}>
    <StrategicPlanWorkspace onUpdated={date => setLastUpdated?.(date)} />
  </PlanningWorkspaceProvider>
)
```

- [ ] **Step 3: reduzir página interna**

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

- [ ] **Step 4: executar GREEN e commit**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
git add src/pages/owner/PlanoEstrategico.jsx src/features/internal-mx-planning/InternalStrategicPlanPage.tsx src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(strategy): share owner and internal workspace"
```

---

### Task 7: Validar persistência, deduplicação e responsividade

**Files:**
- Create: `src/test/strategic-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/strategic-plan.md`

**Interfaces:**
- Produces: evidência das duas montagens.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
perfil interno seleciona loja e abre SP-001;
Dono abre a mesma loja;
ambos mostram mesmas metas/resultados;
interno edita meta e Dono recebe atualização;
criar ação a partir do indicador apenas uma vez;
segundo CTA abre ação existente;
exportação gera CSV não vazio;
mobile mostra apenas Tabela e Gráfico;
Visão Geral contém exatamente 45 indicadores.
```

- [ ] **Step 2: executar gates**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npx playwright test src/test/strategic-plan-shared.playwright.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: registrar evidência**

Include SHA, loja/indicador usados, screenshots 1440/1024/768/390, comandos e resultados.

- [ ] **Step 4: commit**

```bash
git add src/test/strategic-plan-shared.playwright.ts docs/qa/evidence/internal-mx-functional/strategic-plan.md
git commit -m "test(strategy): verify shared strategic workspace"
```
