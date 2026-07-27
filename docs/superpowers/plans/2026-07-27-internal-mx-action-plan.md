# Shared Action Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o Plano de Ação completo para um workspace compartilhado entre Dono e perfis internos, com Ações/Calendário, cinco cards executivos, Foco, Kanban, Lista e ciclo integral de mutações.

**Architecture:** Regras puras de contagem, classificação de foco e política por papel serão isoladas em TypeScript. Um controller único administrará estado, filtros, mutações e reconciliação. Os componentes existentes do Dono serão reutilizados, e as páginas do Dono e do módulo interno serão reduzidas a wrappers.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, @hello-pangea/dnd 17, Radix UI, Supabase, Bun Test, Testing Library, Playwright.

## Global Constraints

- Abas principais: somente `Ações` e `Calendário`.
- `Ações` abre por padrão.
- Modos internos: `Foco`, `Kanban`, `Lista`; `Foco` abre por padrão.
- Cards na ordem: Ações, Não Iniciadas, Atrasadas, Em Andamento, Concluídas.
- Atraso é condição calculada, nunca status principal.
- O Calendário não repete os cinco cards.
- Drag and drop e `Mover para` usam a mesma função de domínio.
- Não criar cópia da página do Dono ou segundo repositório.
- Reutilizar `actionPlanLiveRepository` e tabelas canônicas.
- Perfis internos têm administração global; demais papéis preservam o próprio escopo.
- Todas as transições registram histórico.
- Nenhum `window.confirm` para exclusão irreversível; usar diálogo controlado com confirmação textual.
- Tema global permanece fora deste plano.

---

## Mapa de arquivos

### Regras e contratos

- Create: `src/features/action-plan/actionPlan.types.ts`
- Create: `src/features/action-plan/actionPlanMetrics.ts`
- Create: `src/features/action-plan/actionPlanFocus.ts`
- Create: `src/features/action-plan/actionPlanPolicy.ts`
- Create: `src/features/action-plan/actionPlanMetrics.test.ts`
- Create: `src/features/action-plan/actionPlanFocus.test.ts`
- Create: `src/features/action-plan/actionPlanPolicy.test.ts`

### Controller e workspace

- Create: `src/features/action-plan/useActionPlanController.ts`
- Create: `src/features/action-plan/useActionPlanController.test.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.test.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.test.tsx`

### Wrappers e testes

- Modify: `src/pages/owner/PlanoDeAcao.jsx`
- Modify: `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`
- Create: `src/test/action-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/action-plan.md`

### Componentes existentes reutilizados

- Reuse: `src/components/owner/actionplan/ActionPlanHeader.jsx`
- Reuse: `src/components/owner/actionplan/ActionPlanTabs.jsx`
- Reuse: `src/components/owner/actionplan/ExecutiveCardsStrip.jsx`
- Reuse: `src/components/owner/actionplan/ActionsToolbar.jsx`
- Reuse: `src/components/owner/actionplan/ExecutiveFilters.jsx`
- Reuse: `src/components/owner/actionplan/focus/FocusView.jsx`
- Reuse: `src/components/owner/actionplan/board/BoardView.jsx`
- Reuse: `src/components/owner/actionplan/board/BoardModals.jsx`
- Reuse: `src/components/owner/actionplan/calendar/CalendarView.jsx`
- Reuse: `src/components/owner/actionplan/ActionDrawer.jsx`
- Reuse: `src/components/owner/actionplan/ApproveModal.jsx`
- Reuse: `src/components/owner/actionplan/DelegateModal.jsx`
- Reuse: `src/components/owner/actionplan/EditActionModal.jsx`
- Reuse: `src/components/owner/actionplan/NewActionModal.jsx`
- Reuse: `src/components/owner/actionplan/actionPlanLiveRepository.js`
- Reuse: `src/components/owner/actionplan/actionPlanUtils.js`
- Reuse: `src/components/owner/actionplan/actionPlanConstants.js`

---

### Task 1: Definir contrato e contagens executivas

**Files:**
- Create: `src/features/action-plan/actionPlan.types.ts`
- Create: `src/features/action-plan/actionPlanMetrics.ts`
- Create: `src/features/action-plan/actionPlanMetrics.test.ts`

**Interfaces:**
- Produces: `ActionPlanItem`, `ActionPlanStatus`, `ExecutiveCardKey`, `calculateActionPlanMetrics`, `applyExecutiveCardFilter`.

- [ ] **Step 1: escrever testes RED das contagens**

```ts
import { describe, expect, test } from 'bun:test'
import { calculateActionPlanMetrics } from './actionPlanMetrics'

const action = (id: string, status: string, dueDate: string, cancelled = false) => ({
  id, code: id, title: id, status, dueDate, cancelled, progress: 0, priority: 'medium', updatedAt: '2026-07-27T12:00:00-03:00',
})

describe('calculateActionPlanMetrics', () => {
  test('calcula cinco cards sem transformar atraso em status', () => {
    const metrics = calculateActionPlanMetrics([
      action('a', 'not_started', '2026-07-28'),
      action('b', 'in_progress', '2026-07-26'),
      action('c', 'completed', '2026-07-20'),
      action('d', 'cancelled', '2026-07-20', true),
    ], new Date('2026-07-27T12:00:00-03:00'))
    expect(metrics).toEqual({ total: 3, notStarted: 1, late: 1, inProgress: 1, completed: 1 })
  })
})
```

- [ ] **Step 2: escrever teste RED do toggle de card**

```ts
expect(applyExecutiveCardFilter('late', null)).toEqual({ activeCard: 'late', patch: { display: 'late', status: undefined } })
expect(applyExecutiveCardFilter('late', 'late')).toEqual({ activeCard: null, patch: { display: undefined, status: undefined } })
```

- [ ] **Step 3: executar RED**

Run: `bun test src/features/action-plan/actionPlanMetrics.test.ts`

- [ ] **Step 4: implementar tipos mínimos**

```ts
export type ActionPlanStatus = 'awaiting_decision' | 'not_started' | 'in_progress' | 'blocked' | 'awaiting_validation' | 'completed' | 'cancelled'
export type ExecutiveCardKey = 'total' | 'not_started' | 'late' | 'in_progress' | 'completed'

export type ActionPlanItem = {
  id: string
  code: string
  title: string
  status: ActionPlanStatus
  dueDate: string | null
  progress: number
  priority: 'low' | 'medium' | 'high' | 'critical'
  updatedAt: string | null
  blockedReason?: string | null
  requiresOwnerDecision?: boolean
  impactStatus?: string | null
  [key: string]: unknown
}
```

- [ ] **Step 5: implementar cálculos puros**

`late` must be true when `dueDate < startOfToday(now)` and status is neither `completed` nor `cancelled`.

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanMetrics.test.ts
git add src/features/action-plan/actionPlan.types.ts src/features/action-plan/actionPlanMetrics.ts src/features/action-plan/actionPlanMetrics.test.ts
git commit -m "feat(actions): add executive metrics contract"
```

---

### Task 2: Classificar as cinco seções do Foco

**Files:**
- Create: `src/features/action-plan/actionPlanFocus.ts`
- Create: `src/features/action-plan/actionPlanFocus.test.ts`

**Interfaces:**
- Produces: `buildFocusSections(actions, now)`.

- [ ] **Step 1: escrever testes RED**

```ts
import { expect, test } from 'bun:test'
import { buildFocusSections } from './actionPlanFocus'

test('separa ações sem duplicar a mesma ação em seções incompatíveis', () => {
  const sections = buildFocusSections(fixtures, new Date('2026-07-27T12:00:00-03:00'))
  expect(sections.needsYou.map(item => item.id)).toContain('decision')
  expect(sections.atRisk.map(item => item.id)).toContain('late')
  expect(sections.inExecution.map(item => item.id)).toContain('running')
  expect(sections.awaitingValidation.map(item => item.id)).toContain('validation')
  expect(sections.recentlyCompleted).toHaveLength(4)
})
```

- [ ] **Step 2: cobrir critérios de risco**

Tests must cover:

```text
prazo vencido;
bloqueada;
prazo em até dois dias e progresso < 50%;
sem atualização há mais de sete dias;
prioridade crítica sem execução.
```

- [ ] **Step 3: executar RED**

Run: `bun test src/features/action-plan/actionPlanFocus.test.ts`

- [ ] **Step 4: implementar classificação e ordenação**

Return shape:

```ts
{
  needsYou: ActionPlanItem[]
  atRisk: ActionPlanItem[]
  inExecution: ActionPlanItem[]
  awaitingValidation: ActionPlanItem[]
  recentlyCompleted: ActionPlanItem[]
}
```

Ordering:

```text
needsYou: prioridade, prazo;
atRisk: vencida, bloqueada, prioridade, prazo;
inExecution: prioridade, prazo, menor progresso;
awaitingValidation: data de envio mais antiga;
recentlyCompleted: conclusão mais recente, máximo 4.
```

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanFocus.test.ts
git add src/features/action-plan/actionPlanFocus.ts src/features/action-plan/actionPlanFocus.test.ts
git commit -m "feat(actions): classify executive focus sections"
```

---

### Task 3: Definir política de ações por papel

**Files:**
- Create: `src/features/action-plan/actionPlanPolicy.ts`
- Create: `src/features/action-plan/actionPlanPolicy.test.ts`

**Interfaces:**
- Consumes: `PlanningCapabilities`, estado da ação.
- Produces: `resolveActionPlanPolicy(capabilities, action)`.

- [ ] **Step 1: escrever testes RED**

```ts
expect(resolveActionPlanPolicy(internalCapabilities, action)).toMatchObject({ canEdit: true, canDelete: true, canValidate: true })
expect(resolveActionPlanPolicy(ownerCapabilities, action)).toMatchObject({ canDelete: false, canValidate: true })
expect(resolveActionPlanPolicy(sellerCapabilities, action)).toMatchObject({ canDelete: false, canDelegate: false, canValidate: false })
```

- [ ] **Step 2: cobrir restrições de estado**

```text
completed → apenas reabrir quando permitido;
cancelled → não iniciar nem atualizar progresso;
awaiting_validation → não editar execução;
not_started → iniciar;
blocked → desbloquear;
owner decision → aprovar/delegar somente para papel autorizado.
```

- [ ] **Step 3: executar RED, implementar e executar GREEN**

```bash
bun test src/features/action-plan/actionPlanPolicy.test.ts
```

- [ ] **Step 4: commit**

```bash
git add src/features/action-plan/actionPlanPolicy.ts src/features/action-plan/actionPlanPolicy.test.ts
git commit -m "feat(actions): enforce role and state policy"
```

---

### Task 4: Criar o controller compartilhado

**Files:**
- Create: `src/features/action-plan/useActionPlanController.ts`
- Create: `src/features/action-plan/useActionPlanController.test.tsx`

**Interfaces:**
- Consumes: `usePlanningWorkspace`, `actionPlanLiveRepository`, metrics, focus, policy, `usePlanningRealtime`.
- Produces: `ActionPlanController`.

- [ ] **Step 1: escrever teste RED do carregamento**

```tsx
test('carrega ações e responsáveis da loja do workspace', async () => {
  const repository = fakeActionRepository()
  const { result } = renderActionController({ storeId: 'store-1', repository })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(repository.getActions).toHaveBeenCalledWith({ storeId: 'store-1' })
  expect(repository.getResponsiblePeople).toHaveBeenCalledWith({ storeId: 'store-1' })
})
```

- [ ] **Step 2: testar estado inicial e URL**

Cover:

```text
?tab=calendario abre Calendário;
sem tab abre Ações;
modo salvo inválido normaliza para Foco;
mobile Calendário inicia em Agenda;
storeId permanece na URL ao trocar tab.
```

- [ ] **Step 3: testar mutações e reconciliação**

For each method, fake repository resolves and expect exactly one `reload()`:

```text
create, update, delete, approve, delegate, start, progress, block, unblock,
submitValidation, validate, return, reopen, cancel, duplicate, updateDueDate.
```

- [ ] **Step 4: implementar signature**

```ts
export function useActionPlanController(options?: {
  repository?: ActionPlanRepository
  now?: () => Date
}): ActionPlanController
```

Expose:

```text
actions, filteredActions, metrics, focusSections, responsiblePeople;
loading, refreshing, error, reload;
tab, mode, filters, sortBy, activeCard;
drawer/modal state;
all mutation handlers;
handleMoveTo and handleDragEnd using one transition function.
```

- [ ] **Step 5: usar `usePlanningRealtime({ scope: 'action' })`**

Realtime must schedule one reconciliation, not call every mutation handler.

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/action-plan/useActionPlanController.test.tsx
npm run typecheck
git add src/features/action-plan/useActionPlanController.ts src/features/action-plan/useActionPlanController.test.tsx
git commit -m "feat(actions): add shared action plan controller"
```

---

### Task 5: Criar diálogo de exclusão controlado

**Files:**
- Create: `src/features/action-plan/components/DeleteActionDialog.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.test.tsx`

**Interfaces:**
- Produces: `DeleteActionDialog` requiring the exact action code.

- [ ] **Step 1: escrever teste RED**

```tsx
render(<DeleteActionDialog open action={{ id: '1', code: 'PA-001', title: 'Ação' }} onOpenChange={() => {}} onConfirm={confirm} />)
expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeDisabled()
await user.type(screen.getByLabelText('Digite o código da ação'), 'PA-001')
expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeEnabled()
```

- [ ] **Step 2: implementar com `AlertDialog`**

The dialog must show impact, title, code, irreversible warning, loading state and generic error.

- [ ] **Step 3: GREEN e commit**

```bash
bun test src/features/action-plan/components/DeleteActionDialog.test.tsx
git add src/features/action-plan/components/DeleteActionDialog.tsx src/features/action-plan/components/DeleteActionDialog.test.tsx
git commit -m "feat(actions): add controlled permanent deletion"
```

---

### Task 6: Montar o workspace final

**Files:**
- Create: `src/features/action-plan/ActionPlanWorkspace.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.test.tsx`

**Interfaces:**
- Consumes: controller e componentes existentes.
- Produces: `ActionPlanWorkspace`.

- [ ] **Step 1: escrever teste RED da hierarquia**

```tsx
renderActionPlanWorkspace()
expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Ações', 'Calendário'])
expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'true')
expect(screen.getAllByTestId('executive-card')).toHaveLength(5)
expect(screen.getByRole('button', { name: 'Foco' })).toHaveAttribute('aria-pressed', 'true')
```

- [ ] **Step 2: testar os cards como filtros**

Click `Atrasadas`, expect only late actions in Foco/Kanban/List. Click again, expect filter removed.

- [ ] **Step 3: testar Calendário sem cards**

Switch to Calendar and expect zero `executive-card` elements.

- [ ] **Step 4: implementar composição**

Ações:

```text
ActionPlanHeader
ActionPlanTabs
ExecutiveCardsStrip
ActionsToolbar + ExecutiveFilters
FocusView | BoardView | List mode
ActionDrawer and mutation modals
DeleteActionDialog
```

Calendário:

```text
ActionPlanHeader
ActionPlanTabs
CalendarView
calendar-specific filters and dialogs
```

- [ ] **Step 5: adaptar componentes legados somente por props**

Do not fork existing components. Add props when necessary:

```text
capabilities/policy;
loading/disabled;
onDelete;
onMoveTo;
active executive filter;
focus sections.
```

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/action-plan/ActionPlanWorkspace.test.tsx src/features/action-plan/components
npm run typecheck
git add src/features/action-plan/ActionPlanWorkspace.tsx src/features/action-plan/ActionPlanWorkspace.test.tsx src/components/owner/actionplan
git commit -m "feat(actions): add shared action plan workspace"
```

---

### Task 7: Converter as páginas em wrappers

**Files:**
- Modify: `src/pages/owner/PlanoDeAcao.jsx`
- Modify: `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Consumes: `ActionPlanWorkspace` and planning adapters.
- Produces: owner/internal parity without page duplication.

- [ ] **Step 1: escrever contrato RED**

```ts
expect(read('src/pages/owner/PlanoDeAcao.jsx')).toContain('ActionPlanWorkspace')
expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).toContain('ActionPlanWorkspace')
expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).not.toContain('window.confirm')
expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).not.toContain('linear calendar')
```

- [ ] **Step 2: reduzir a página do Dono**

Mount `PlanningWorkspaceProvider shell="owner"` and `ActionPlanWorkspace`, passing `openConsultantModal` through a callback prop.

- [ ] **Step 3: reduzir a página interna**

```tsx
export default function InternalActionPlanPage() {
  const store = useInternalPlanningStore()
  return (
    <InternalMxPlanningShell title="Plano de Ação" description="Transforme prioridades estratégicas em execução." store={store}>
      {store.selectedStoreId ? <ActionPlanWorkspace /> : null}
    </InternalMxPlanningShell>
  )
}
```

- [ ] **Step 4: executar testes e commit**

```bash
bun test src/features/action-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
git add src/pages/owner/PlanoDeAcao.jsx src/features/internal-mx-planning/InternalActionPlanPage.tsx src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(actions): share owner and internal workspace"
```

---

### Task 8: Validar persistência, Realtime e responsividade

**Files:**
- Create: `src/test/action-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/action-plan.md`

**Interfaces:**
- Produces: evidência completa do ciclo de ação.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
Ações e Foco abrem por padrão;
cinco cards usam contagens reais e alternam filtro;
criar ação atualiza cards, Foco, Kanban, Lista e Calendário;
iniciar, bloquear, desbloquear, validar, devolver e reabrir preservam histórico;
arrastar e Mover para produzem a mesma transição;
Calendário não exibe cards;
alterar prazo no Calendário atualiza demais modos;
exclusão exige código exato;
Dono e perfil interno enxergam o mesmo registro;
nenhuma ação duplicada após Realtime.
```

- [ ] **Step 2: executar gates**

```bash
bun test src/features/action-plan src/components/owner/actionplan src/test/internal-mx-planning-pages.test.ts
npx playwright test src/test/action-plan-shared.playwright.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: registrar evidência**

Include screenshots in 1440/1024/768/390, action IDs used, transitions executed, SQL/history verification and zero blocking console errors.

- [ ] **Step 4: commit**

```bash
git add src/test/action-plan-shared.playwright.ts docs/qa/evidence/internal-mx-functional/action-plan.md
git commit -m "test(actions): verify shared action plan lifecycle"
```
