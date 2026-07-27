# Shared Action Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrair o Plano de Ação completo para um workspace compartilhado entre Dono e perfis internos, com Ações/Calendário, cinco cards executivos, Foco, Kanban, Lista e ciclo integral de mutações.

**Architecture:** Regras puras de contagem, classificação de foco e política por papel serão isoladas em TypeScript. Um controller único administrará estado, filtros, mutações e reconciliação. Os componentes existentes do Dono, incluindo `ListView`, serão reutilizados. Uma migration aditiva publicará no Realtime as tabelas filhas necessárias para checklist, evidências e histórico.

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
- Reutilizar `actionPlanLiveRepository`, `BoardView` e `ListView`.
- Perfis internos têm administração global; Dono não recebe exclusão definitiva; Gerente/Vendedor preservam o próprio escopo.
- Todas as transições registram histórico.
- Nenhum `window.confirm` para exclusão irreversível; usar diálogo controlado com confirmação textual.
- Tabelas filhas devem entrar no `supabase_realtime` de forma idempotente antes de serem usadas pelo hook compartilhado.
- Nenhuma alteração de tema global neste plano.

---

## Mapa de arquivos

### Banco e contrato Realtime

- Create: `supabase/migrations/20260727163000_action_plan_realtime_sources.sql`
- Create: `src/lib/action-plan-realtime-migration.test.ts`

### Regras e contratos

- Create: `src/features/action-plan/actionPlan.types.ts`
- Create: `src/features/action-plan/actionPlanMetrics.ts`
- Create: `src/features/action-plan/actionPlanFocus.ts`
- Create: `src/features/action-plan/actionPlanPolicy.ts`
- Create: `src/features/action-plan/actionPlanMetrics.test.ts`
- Create: `src/features/action-plan/actionPlanFocus.test.ts`
- Create: `src/features/action-plan/actionPlanPolicy.test.ts`

### Controller e workspace

- Create: `src/features/action-plan/actionPlanRepositoryAdapter.ts`
- Create: `src/features/action-plan/actionPlanRepositoryAdapter.test.ts`
- Create: `src/features/action-plan/useActionPlanController.ts`
- Create: `src/features/action-plan/useActionPlanController.test.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.test.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.test.tsx`

### Wrappers e evidência

- Modify: `src/pages/owner/PlanoDeAcao.jsx`
- Modify: `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- Modify: `src/features/planning-workspace/usePlanningRealtime.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.test.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`
- Create: `src/test/action-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/action-plan.md`

### Componentes canônicos reutilizados

- Reuse: `src/components/owner/actionplan/ActionPlanHeader.jsx`
- Reuse: `src/components/owner/actionplan/ActionPlanTabs.jsx`
- Reuse: `src/components/owner/actionplan/ExecutiveCardsStrip.jsx`
- Reuse: `src/components/owner/actionplan/ActionsToolbar.jsx`
- Reuse: `src/components/owner/actionplan/ExecutiveFilters.jsx`
- Reuse: `src/components/owner/actionplan/focus/FocusView.jsx`
- Reuse: `src/components/owner/actionplan/board/BoardView.jsx`
- Reuse: `src/components/owner/actionplan/board/ListView.jsx`
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

### Task 1: Publicar fontes filhas no Realtime

**Files:**
- Create: `supabase/migrations/20260727163000_action_plan_realtime_sources.sql`
- Create: `src/lib/action-plan-realtime-migration.test.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.ts`
- Modify: `src/features/planning-workspace/usePlanningRealtime.test.tsx`

**Interfaces:**
- Produces: publicação idempotente de `historico_planos_acao`, `evidencias_planos_acao` e `itens_plano_acao`.

- [ ] **Step 1: escrever teste RED da migration**

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260727163000_action_plan_realtime_sources.sql', 'utf8')

test('publica somente tabelas canônicas do Plano de Ação', () => {
  for (const table of ['historico_planos_acao', 'evidencias_planos_acao', 'itens_plano_acao']) {
    expect(sql).toContain(table)
  }
  expect(sql).not.toContain('CREATE TABLE')
  expect(sql).not.toContain('action_plan_history')
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/lib/action-plan-realtime-migration.test.ts`

- [ ] **Step 3: criar migration idempotente**

```sql
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'historico_planos_acao',
    'evidencias_planos_acao',
    'itens_plano_acao'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = v_table
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;
```

- [ ] **Step 4: atualizar o registro do hook**

```ts
action: ['planos_acao', 'historico_planos_acao', 'evidencias_planos_acao', 'itens_plano_acao']
```

- [ ] **Step 5: validar localmente e commit**

```bash
supabase db reset
bun test src/lib/action-plan-realtime-migration.test.ts src/features/planning-workspace/usePlanningRealtime.test.tsx
git add supabase/migrations/20260727163000_action_plan_realtime_sources.sql src/lib/action-plan-realtime-migration.test.ts src/features/planning-workspace/usePlanningRealtime.ts src/features/planning-workspace/usePlanningRealtime.test.tsx
git commit -m "feat(actions): publish canonical realtime sources"
```

---

### Task 2: Definir contrato e contagens executivas

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

const action = (id: string, status: string, dueDate: string) => ({
  id, code: id, title: id, status, dueDate, progress: 0, priority: 'medium', updatedAt: '2026-07-27T12:00:00-03:00',
})

describe('calculateActionPlanMetrics', () => {
  test('calcula cinco cards sem transformar atraso em status', () => {
    const metrics = calculateActionPlanMetrics([
      action('a', 'not_started', '2026-07-28'),
      action('b', 'in_progress', '2026-07-26'),
      action('c', 'completed', '2026-07-20'),
      action('d', 'cancelled', '2026-07-20'),
    ], new Date('2026-07-27T12:00:00-03:00'))
    expect(metrics).toEqual({ total: 3, notStarted: 1, late: 1, inProgress: 1, completed: 1 })
  })
})
```

- [ ] **Step 2: escrever RED do toggle**

```ts
expect(applyExecutiveCardFilter('late', null)).toEqual({ activeCard: 'late', patch: { display: 'late', status: undefined } })
expect(applyExecutiveCardFilter('late', 'late')).toEqual({ activeCard: null, patch: { display: undefined, status: undefined } })
```

- [ ] **Step 3: criar tipos**

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
  completedAt?: string | null
  submittedForValidationAt?: string | null
  [key: string]: unknown
}
```

- [ ] **Step 4: implementar cálculos**

`late` is true when due date is before the start of current day and status is not `completed` or `cancelled`.

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanMetrics.test.ts
git add src/features/action-plan/actionPlan.types.ts src/features/action-plan/actionPlanMetrics.ts src/features/action-plan/actionPlanMetrics.test.ts
git commit -m "feat(actions): add executive metrics contract"
```

---

### Task 3: Classificar as cinco seções do Foco

**Files:**
- Create: `src/features/action-plan/actionPlanFocus.ts`
- Create: `src/features/action-plan/actionPlanFocus.test.ts`

**Interfaces:**
- Produces: `buildFocusSections(actions, now)`.

- [ ] **Step 1: escrever RED da classificação**

```ts
const sections = buildFocusSections(fixtures, new Date('2026-07-27T12:00:00-03:00'))
expect(sections.needsYou.map(item => item.id)).toContain('decision')
expect(sections.atRisk.map(item => item.id)).toContain('late')
expect(sections.inExecution.map(item => item.id)).toContain('running')
expect(sections.awaitingValidation.map(item => item.id)).toContain('validation')
expect(sections.recentlyCompleted).toHaveLength(4)
```

- [ ] **Step 2: cobrir critérios de risco**

```text
prazo vencido;
bloqueada;
prazo em até dois dias com progresso < 50%;
sem atualização há mais de sete dias;
prioridade crítica sem execução.
```

- [ ] **Step 3: implementar e ordenar**

Return:

```ts
{
  needsYou: ActionPlanItem[]
  atRisk: ActionPlanItem[]
  inExecution: ActionPlanItem[]
  awaitingValidation: ActionPlanItem[]
  recentlyCompleted: ActionPlanItem[]
}
```

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanFocus.test.ts
git add src/features/action-plan/actionPlanFocus.ts src/features/action-plan/actionPlanFocus.test.ts
git commit -m "feat(actions): classify executive focus sections"
```

---

### Task 4: Definir política por papel e estado

**Files:**
- Create: `src/features/action-plan/actionPlanPolicy.ts`
- Create: `src/features/action-plan/actionPlanPolicy.test.ts`

**Interfaces:**
- Consumes: `PlanningCapabilities` and action state.
- Produces: `resolveActionPlanPolicy`.

- [ ] **Step 1: escrever RED por papel**

```ts
expect(resolveActionPlanPolicy(internalCapabilities, action)).toMatchObject({ canEdit: true, canDelete: true, canValidate: true })
expect(resolveActionPlanPolicy(ownerCapabilities, action)).toMatchObject({ canDelete: false, canValidate: true })
expect(resolveActionPlanPolicy(sellerCapabilities, action)).toMatchObject({ canDelete: false, canDelegate: false, canValidate: false })
```

- [ ] **Step 2: cobrir estados**

```text
completed → apenas reabrir quando autorizado;
cancelled → não iniciar nem atualizar;
awaiting_validation → não editar execução;
not_started → iniciar;
blocked → desbloquear;
owner decision → aprovar/delegar somente quando autorizado.
```

- [ ] **Step 3: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanPolicy.test.ts
git add src/features/action-plan/actionPlanPolicy.ts src/features/action-plan/actionPlanPolicy.test.ts
git commit -m "feat(actions): enforce role and state policy"
```

---

### Task 5: Tipar o repositório canônico

**Files:**
- Create: `src/features/action-plan/actionPlanRepositoryAdapter.ts`
- Create: `src/features/action-plan/actionPlanRepositoryAdapter.test.ts`

**Interfaces:**
- Produces: `ActionPlanRepository`, `actionPlanDataSource`.

- [ ] **Step 1: escrever RED das operações obrigatórias**

The fake source must expose and the adapter must type:

```text
getActions, getResponsiblePeople, createAction, updateActionById, deleteAction,
approveAction, delegateAction, startAction, updateProgress, blockAction, unblockAction,
submitForValidation, validateAction, returnToExecution, reopenAction, cancelAction,
duplicateAction, updateDueDate.
```

- [ ] **Step 2: implementar um único cast legado**

```ts
import { actionPlanLiveRepository } from '@/components/owner/actionplan/actionPlanLiveRepository'

export function createActionPlanRepositoryAdapter(source: unknown): ActionPlanRepository {
  return source as ActionPlanRepository
}

export const actionPlanDataSource = createActionPlanRepositoryAdapter(actionPlanLiveRepository)
```

- [ ] **Step 3: GREEN e commit**

```bash
bun test src/features/action-plan/actionPlanRepositoryAdapter.test.ts
git add src/features/action-plan/actionPlanRepositoryAdapter.ts src/features/action-plan/actionPlanRepositoryAdapter.test.ts
git commit -m "refactor(actions): type canonical repository"
```

---

### Task 6: Criar controller compartilhado

**Files:**
- Create: `src/features/action-plan/useActionPlanController.ts`
- Create: `src/features/action-plan/useActionPlanController.test.tsx`

**Interfaces:**
- Consumes: planning workspace, repository, metrics, focus, policy and Realtime.
- Produces: `ActionPlanController`.

- [ ] **Step 1: escrever RED do carregamento**

```tsx
test('carrega ações e responsáveis da loja do workspace', async () => {
  const repository = fakeActionRepository()
  const { result } = renderActionController({ storeId: 'store-1', repository })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(repository.getActions).toHaveBeenCalledWith({ storeId: 'store-1' })
  expect(repository.getResponsiblePeople).toHaveBeenCalledWith({ storeId: 'store-1' })
})
```

- [ ] **Step 2: testar estado inicial**

```text
?tab=calendario abre Calendário;
sem tab abre Ações;
modo salvo inválido normaliza para Foco;
mobile Calendário inicia em Agenda;
storeId permanece na URL ao trocar tab.
```

- [ ] **Step 3: testar mutações e reconciliação**

Each method resolves and triggers exactly one reconciliation:

```text
create, update, delete, approve, delegate, start, progress, block, unblock,
submitValidation, validate, return, reopen, cancel, duplicate, updateDueDate.
```

- [ ] **Step 4: implementar assinatura**

```ts
export function useActionPlanController(options?: {
  repository?: ActionPlanRepository
  now?: () => Date
}): ActionPlanController
```

Expose actions, filteredActions, metrics, focusSections, responsiblePeople, loading/error/reload, tab/mode/filters/sort/card, drawer/modal state and all mutation handlers.

- [ ] **Step 5: unificar transições**

`handleDragEnd` and `Mover para` call the same `transitionAction(action, destination)` function.

- [ ] **Step 6: usar `usePlanningRealtime({ scope: 'action' })`**

- [ ] **Step 7: GREEN e commit**

```bash
bun test src/features/action-plan/useActionPlanController.test.tsx
npm run typecheck
git add src/features/action-plan/useActionPlanController.ts src/features/action-plan/useActionPlanController.test.tsx
git commit -m "feat(actions): add shared action controller"
```

---

### Task 7: Criar exclusão controlada

**Files:**
- Create: `src/features/action-plan/components/DeleteActionDialog.tsx`
- Create: `src/features/action-plan/components/DeleteActionDialog.test.tsx`

**Interfaces:**
- Produces: diálogo que exige o código exato da ação.

- [ ] **Step 1: escrever RED**

```tsx
render(<DeleteActionDialog open action={{ id: '1', code: 'PA-001', title: 'Ação' }} onOpenChange={() => {}} onConfirm={confirm} />)
expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeDisabled()
await user.type(screen.getByLabelText('Digite o código da ação'), 'PA-001')
expect(screen.getByRole('button', { name: 'Excluir definitivamente' })).toBeEnabled()
```

- [ ] **Step 2: implementar com AlertDialog**

Show impact, title, code, irreversible warning, loading and generic error.

- [ ] **Step 3: GREEN e commit**

```bash
bun test src/features/action-plan/components/DeleteActionDialog.test.tsx
git add src/features/action-plan/components/DeleteActionDialog.tsx src/features/action-plan/components/DeleteActionDialog.test.tsx
git commit -m "feat(actions): add controlled permanent deletion"
```

---

### Task 8: Montar workspace final

**Files:**
- Create: `src/features/action-plan/ActionPlanWorkspace.tsx`
- Create: `src/features/action-plan/ActionPlanWorkspace.test.tsx`

**Interfaces:**
- Consumes: controller and canonical components.
- Produces: `ActionPlanWorkspace`.

- [ ] **Step 1: escrever RED da hierarquia**

```tsx
renderActionPlanWorkspace()
expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Ações', 'Calendário'])
expect(screen.getByRole('tab', { name: 'Ações' })).toHaveAttribute('aria-selected', 'true')
expect(screen.getAllByTestId('executive-card')).toHaveLength(5)
expect(screen.getByRole('button', { name: 'Foco' })).toHaveAttribute('aria-pressed', 'true')
```

- [ ] **Step 2: testar cards como filtros**

Click `Atrasadas`, verify Foco, Kanban and Lista show only late actions; click again and remove filter.

- [ ] **Step 3: testar Lista real**

When mode is `list`, render `ListView` through the canonical board composition. Verify sorting, selection, batch actions, export, filters and drawer.

- [ ] **Step 4: testar Calendário sem cards**

Switch to Calendar and expect zero `executive-card` elements.

- [ ] **Step 5: implementar composição**

Ações:

```text
ActionPlanHeader
ActionPlanTabs
ExecutiveCardsStrip
ActionsToolbar + ExecutiveFilters
FocusView | BoardView(Kanban) | ListView(Lista)
ActionDrawer and canonical mutation modals
DeleteActionDialog
```

Calendário:

```text
ActionPlanHeader
ActionPlanTabs
CalendarView
calendar-specific filters and dialogs
```

- [ ] **Step 6: adaptar componentes por props, sem forks**

Add only capabilities/policy, loading, onDelete, onMoveTo, active card and focus sections.

- [ ] **Step 7: GREEN e commit**

```bash
bun test src/features/action-plan/ActionPlanWorkspace.test.tsx src/features/action-plan/components
npm run typecheck
git add src/features/action-plan/ActionPlanWorkspace.tsx src/features/action-plan/ActionPlanWorkspace.test.tsx src/components/owner/actionplan
git commit -m "feat(actions): add shared action workspace"
```

---

### Task 9: Converter as páginas em wrappers

**Files:**
- Modify: `src/pages/owner/PlanoDeAcao.jsx`
- Modify: `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- Modify: `src/test/internal-mx-planning-pages.test.ts`

**Interfaces:**
- Produces: Dono e perfis internos sobre o mesmo workspace.

- [ ] **Step 1: escrever contrato RED**

```ts
expect(read('src/pages/owner/PlanoDeAcao.jsx')).toContain('ActionPlanWorkspace')
expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).toContain('ActionPlanWorkspace')
expect(read('src/pages/owner/PlanoDeAcao.jsx')).not.toContain('window.confirm')
expect(read('src/features/internal-mx-planning/InternalActionPlanPage.tsx')).not.toContain('window.confirm')
```

- [ ] **Step 2: reduzir página do Dono**

Mount `PlanningWorkspaceProvider shell="owner"` and `ActionPlanWorkspace`, passing consultant callback through props.

- [ ] **Step 3: reduzir página interna**

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

- [ ] **Step 4: executar GREEN e commit**

```bash
bun test src/features/action-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
git add src/pages/owner/PlanoDeAcao.jsx src/features/internal-mx-planning/InternalActionPlanPage.tsx src/test/internal-mx-planning-pages.test.ts
git commit -m "refactor(actions): share owner and internal workspace"
```

---

### Task 10: Validar lifecycle, Realtime and responsive behavior

**Files:**
- Create: `src/test/action-plan-shared.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/action-plan.md`

**Interfaces:**
- Produces: evidence of the complete lifecycle.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
Ações e Foco abrem por padrão;
cinco cards usam dados reais e alternam filtro;
criar ação atualiza cards, Foco, Kanban, Lista e Calendário;
iniciar, bloquear, desbloquear, validar, devolver e reabrir preservam histórico;
arrastar e Mover para produzem a mesma transição;
Lista é funcional, não placeholder;
Calendário não exibe cards;
alterar prazo sincroniza os modos;
exclusão interna exige código exato;
Dono não recebe exclusão definitiva;
Dono e perfil interno veem o mesmo registro;
nenhuma ação é duplicada após rajada Realtime.
```

- [ ] **Step 2: executar gates**

```bash
supabase db reset
bun test src/features/action-plan src/components/owner/actionplan src/lib/action-plan-realtime-migration.test.ts src/test/internal-mx-planning-pages.test.ts
npx playwright test src/test/action-plan-shared.playwright.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: registrar evidência**

Include screenshots 1440/1024/768/390, action IDs, transitions, SQL/history verification and zero blocking console errors.

- [ ] **Step 4: commit**

```bash
git add src/test/action-plan-shared.playwright.ts docs/qa/evidence/internal-mx-functional/action-plan.md
git commit -m "test(actions): verify shared action lifecycle"
```
