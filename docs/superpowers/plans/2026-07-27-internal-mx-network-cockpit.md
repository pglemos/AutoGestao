# Internal MX Network Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o Painel Geral para um cockpit rastreável em tempo real, com progresso de lojas, vendedores, gerentes e responsáveis, além de drill-down para planejamento, ações, consultoria e fechamento diário.

**Architecture:** Uma RPC segura consolida fontes existentes por loja e período sem criar score opaco ou tabela paralela. O controller atual preserva debounce/single-flight, passa a consumir snapshot tipado e expõe drill-down contextual. O plano depende das migrations de Plano de Ação e Consultoria já integradas, inclusive participantes, Entrega, evidências e antecipação.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Supabase PostgreSQL 17/RPC/Realtime, Bun Test, Testing Library, Playwright.

## Global Constraints

- Snapshot completo apenas para `administrador_geral`, `administrador_mx` e `consultor_mx`.
- Não criar score de Dono sem fonte e fórmula explicável.
- Vendedor: snapshots, fechamento, carteira, vendas e conversão.
- Gerente: snapshots, equipe, ações e indicadores.
- Dono/responsável: estratégia, ações, consultoria e resultados da unidade.
- Loja: agregação rastreável dos papéis e módulos.
- Todo número informa universo, período, fonte e destino de drill-down.
- Preservar debounce 450 ms, espera máxima 2000 ms, single-flight e recarga final.
- Reutilizar snapshots, ações, metas, indicadores e Consultoria.
- Realtime inclui `consultoria_participantes_encontro`, além de progresso, Entrega, evidências e antecipação.
- Não substituir dados reais por fixtures.
- Nenhuma alteração de tema global neste plano.

---

## Mapa de arquivos

### Banco e contrato

- Create: `supabase/migrations/20260727182000_internal_mx_network_cockpit.sql`
- Create: `src/lib/internal-mx-network-cockpit-migration.test.ts`
- Create: `supabase/tests/internal_mx_network_cockpit_rls.test.sql`
- Modify: `src/types/database.generated.ts`

### Domínio e controller

- Modify: `src/features/network-dashboard/types.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.test.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.test.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx`
- Modify: `src/features/network-dashboard/networkDashboardRealtime.test.ts`

### Interface e evidência

- Modify: `src/features/network-dashboard/NetworkDashboardPage.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.tsx`
- Create: `src/features/network-dashboard/components/StoreEvolutionPanel.tsx`
- Create: `src/features/network-dashboard/components/PersonEvolutionList.tsx`
- Create: `src/features/network-dashboard/components/SourceTrace.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx`
- Modify: `src/pages/PainelConsultor.tsx`
- Create: `src/test/internal-mx-network-cockpit.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/network-cockpit.md`

---

### Task 1: Definir snapshot e cálculos rastreáveis

**Files:**
- Modify: `src/features/network-dashboard/types.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.test.ts`

**Interfaces:**
- Produces: `NetworkCockpitStore`, `PersonEvolution`, `TraceableMetric`, `buildStoreRiskReasons`, `calculateTraceableProgress`.

- [ ] **Step 1: escrever RED de risco explicado**

```ts
import { expect, test } from 'bun:test'
import { buildStoreRiskReasons } from './networkCockpitCalculations'

test('explica cada risco sem score opaco', () => {
  expect(buildStoreRiskReasons({
    disciplinePct: 40,
    projectionPct: 72,
    overdueActions: 3,
    blockedActions: 1,
    pendingClosures: 2,
    consultingEvidencePending: 1,
    consultingParticipantsPending: 2,
  })).toEqual([
    'Disciplina diária abaixo de 50%',
    'Projeção abaixo de 80% da meta',
    '3 ações atrasadas',
    '1 ação bloqueada',
    '2 fechamentos pendentes',
    '1 evidência de consultoria pendente',
    '2 participantes obrigatórios sem confirmação',
  ])
})
```

- [ ] **Step 2: escrever RED de progresso rastreável**

```ts
expect(calculateTraceableProgress({ completed: 6, total: 10 })).toEqual({ completed: 6, total: 10, percentage: 60 })
expect(calculateTraceableProgress({ completed: 0, total: 0 })).toEqual({ completed: 0, total: 0, percentage: null })
```

- [ ] **Step 3: criar tipos**

```ts
export type TraceableMetric = {
  value: number | null
  universe: number | null
  periodStart: string
  periodEnd: string
  source: string
}

export type PersonEvolution = {
  userId: string
  name: string
  role: 'vendedor' | 'gerente' | 'dono'
  status: 'healthy' | 'attention' | 'critical' | 'without_data'
  metrics: Record<string, TraceableMetric>
  reasons: string[]
}

export type NetworkCockpitStore = StoreDiagnostic & {
  pendingClosures: number
  overdueActions: number
  blockedActions: number
  awaitingValidationActions: number
  strategicProgress: TraceableMetric
  consultingProgress: TraceableMetric
  consultingEvidencePending: number
  consultingParticipantsPending: number
  sellersEvolution: PersonEvolution[]
  managersEvolution: PersonEvolution[]
  ownerEvolution: PersonEvolution | null
  riskReasons: string[]
}
```

- [ ] **Step 4: implementar, executar GREEN e commit**

```bash
bun test src/features/network-dashboard/lib/networkCockpitCalculations.test.ts
git add src/features/network-dashboard/types.ts src/features/network-dashboard/lib/networkCockpitCalculations.ts src/features/network-dashboard/lib/networkCockpitCalculations.test.ts
git commit -m "feat(network): add traceable cockpit contracts"
```

---

### Task 2: Criar RPC segura de consolidação

**Files:**
- Create: `supabase/migrations/20260727182000_internal_mx_network_cockpit.sql`
- Create: `src/lib/internal-mx-network-cockpit-migration.test.ts`
- Create: `supabase/tests/internal_mx_network_cockpit_rls.test.sql`

**Interfaces:**
- Produces: `get_internal_mx_network_cockpit(p_start_date date, p_end_date date)`.

- [ ] **Step 1: escrever RED do SQL**

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260727182000_internal_mx_network_cockpit.sql', 'utf8')

test('consolida fontes canônicas sem tabela de score', () => {
  for (const source of [
    'seller_routine_snapshots',
    'manager_routine_snapshots',
    'planos_acao',
    'visitas_consultoria',
    'consultoria_itens_entrega',
    'consultoria_participantes_encontro',
  ]) expect(sql).toContain(source)
  expect(sql).toContain('get_internal_mx_network_cockpit')
  expect(sql).not.toContain('CREATE TABLE public.owner_score')
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/lib/internal-mx-network-cockpit-migration.test.ts`

- [ ] **Step 3: implementar função**

```sql
CREATE OR REPLACE FUNCTION public.get_internal_mx_network_cockpit(
  p_start_date date,
  p_end_date date
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
```

Authorization:

```sql
IF NOT public.eh_area_interna_mx(auth.uid()) THEN
  RAISE EXCEPTION 'Sem permissão para consultar o cockpit da rede.' USING ERRCODE = '42501';
END IF;
```

Validate non-null dates, `start <= end` and range <= 366 days.

- [ ] **Step 4: consolidar por CTEs**

Required CTEs:

```text
active_stores;
operational_summary;
active_sellers;
daily_closures;
seller_snapshot_latest;
manager_snapshot_latest;
action_summary;
strategic_summary;
consulting_visit_summary;
consulting_delivery_summary;
consulting_evidence_summary;
consulting_participant_summary;
store_owners.
```

JSON per store:

```text
operational totals and goal;
active sellers and closures;
action counts by condition/state;
strategic completed/total;
consulting visits, delivery, evidence and participants completed/total;
seller, manager and owner evolution;
source metadata for every group.
```

Owner metrics remain separate:

```text
strategic actions completed / total;
consulting visits completed / total;
store sales / goal.
```

No combined unexplained score.

- [ ] **Step 5: grants, indexes and pgTAP**

```text
REVOKE ALL ON FUNCTION ... FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ... TO authenticated;
internal roles allowed;
Dono/Gerente/Vendedor/anon denied;
empty store returns zero/null safely;
every store includes sources metadata;
indexes added only when required by EXPLAIN.
```

- [ ] **Step 6: validar localmente e commit**

```bash
supabase db reset
bun test src/lib/internal-mx-network-cockpit-migration.test.ts
supabase test db supabase/tests/internal_mx_network_cockpit_rls.test.sql
git add supabase/migrations/20260727182000_internal_mx_network_cockpit.sql src/lib/internal-mx-network-cockpit-migration.test.ts supabase/tests/internal_mx_network_cockpit_rls.test.sql
git commit -m "feat(network): add secure cockpit snapshot"
```

---

### Task 3: Criar repositório tipado e migrar controller

**Files:**
- Modify: `src/types/database.generated.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.test.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx`
- Modify: `src/features/network-dashboard/networkDashboardRealtime.test.ts`

**Interfaces:**
- Produces: `networkCockpitRepository.load(range)` and enriched controller rows.

- [ ] **Step 1: regenerar tipos**

```bash
npm run gen:db-types
npm run verify:db-types
```

- [ ] **Step 2: escrever RED do mapping**

```ts
test('mapeia fontes, pessoas e pendências consultivas', async () => {
  const repository = createNetworkCockpitRepository(fakeSupabase(payload))
  const result = await repository.load({ start: '2026-07-01', end: '2026-07-31' })
  expect(result[0].sellersEvolution[0].metrics.sales.source).toBe('get_resumo_rede_periodo')
  expect(result[0].ownerEvolution?.metrics.strategicProgress.universe).toBe(10)
  expect(result[0].consultingParticipantsPending).toBe(2)
})
```

- [ ] **Step 3: implementar repositório**

```ts
export function createNetworkCockpitRepository(client = supabase) {
  return {
    async load(range: NetworkDateRange): Promise<NetworkCockpitStore[]> {
      const { data, error } = await client.rpc('get_internal_mx_network_cockpit', {
        p_start_date: range.start,
        p_end_date: range.end,
      })
      if (error) throw error
      return mapNetworkCockpitPayload(data)
    },
  }
}
```

- [ ] **Step 4: migrar controller sem perder resiliência**

Replace four initial queries with one repository call. Preserve:

```text
requestSequence;
snapshotInFlight;
reloadQueued;
REALTIME_DEBOUNCE_MS=450;
REALTIME_MAX_WAIT_MS=2000;
report triggers;
search/status/timeframe/sort;
manual refresh and status connected/degraded.
```

- [ ] **Step 5: ampliar Realtime**

Subscribe to:

```text
valores_indicadores_planejamento;
regras_metas_loja;
planos_acao;
historico_planos_acao;
evidencias_planos_acao;
itens_plano_acao;
clientes_consultoria;
visitas_consultoria;
evidencias_visita;
consultoria_progresso_aula;
consultoria_itens_entrega;
consultoria_participantes_encontro;
consultoria_solicitacoes_antecipacao.
```

- [ ] **Step 6: GREEN e commit**

```bash
bun test src/features/network-dashboard/data src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx src/features/network-dashboard/networkDashboardRealtime.test.ts
npm run typecheck
git add src/types/database.generated.ts src/features/network-dashboard
git commit -m "refactor(network): consume typed cockpit snapshot"
```

---

### Task 4: Construir drill-down e rastreabilidade

**Files:**
- Create: `src/features/network-dashboard/components/SourceTrace.tsx`
- Create: `src/features/network-dashboard/components/PersonEvolutionList.tsx`
- Create: `src/features/network-dashboard/components/StoreEvolutionPanel.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`

**Interfaces:**
- Produces: drawer de loja com pessoas, módulos e fontes.

- [ ] **Step 1: escrever RED da interface**

```tsx
render(<NetworkDrilldownDrawer open store={store} onOpenChange={() => {}} />)
expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Vendedores' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Gerentes' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Dono' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Módulos' })).toBeInTheDocument()
expect(screen.getByText('Origem dos dados')).toBeInTheDocument()
```

- [ ] **Step 2: testar links contextuais**

```text
/plano-estrategico?storeId=<uuid>
/plano-acao?storeId=<uuid>
/consultoria?storeId=<uuid>
/lojas/<slug>
/lojas/<slug>?tab=desempenho
```

Use existing person route when available. Otherwise open local detail, never invent a dead route.

- [ ] **Step 3: implementar SourceTrace**

Each metric shows label, value, universe, period and source. `null` is `Sem dados`, not zero.

- [ ] **Step 4: implementar risco explicado**

Use `buildStoreRiskReasons`; no unexplained traffic-light score.

- [ ] **Step 5: GREEN e commit**

```bash
bun test src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx
npm run typecheck
git add src/features/network-dashboard/components
git commit -m "feat(network): add traceable store drilldown"
```

---

### Task 5: Integrar no Painel Geral

**Files:**
- Modify: `src/features/network-dashboard/NetworkDashboardPage.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`
- Modify: `src/pages/PainelConsultor.tsx`

**Interfaces:**
- Produces: cockpit entry route with filters and drill-down.

- [ ] **Step 1: escrever RED de navegação**

```text
click store row opens drawer;
click actions metric opens Plano de Ação with storeId;
click strategic metric opens Plano Estratégico;
click consulting metric opens Consultoria;
back preserves timeframe/search/status/sort;
Realtime status remains visible;
manual refresh remains available.
```

- [ ] **Step 2: preservar relatórios e estados**

Keep matinal/semanal/mensal report triggers, loading, partial error and retry behavior.

- [ ] **Step 3: adaptar tabela**

Desktop:

```text
Loja;
Fechamentos;
Vendas/Meta;
Ações em risco;
Estratégia;
Consultoria;
Risco explicado;
Abrir.
```

Tablet/mobile use priority columns/cards without global horizontal overflow.

- [ ] **Step 4: GREEN e commit**

```bash
bun test src/features/network-dashboard
npm run typecheck
git add src/features/network-dashboard/NetworkDashboardPage.tsx src/features/network-dashboard/components/StoreHealthTable.tsx src/pages/PainelConsultor.tsx
git commit -m "feat(network): integrate global evolution cockpit"
```

---

### Task 6: E2E, performance and evidence

**Files:**
- Create: `src/test/internal-mx-network-cockpit.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/network-cockpit.md`

**Interfaces:**
- Produces: evidence that numbers, navigation and Realtime are traceable.

- [ ] **Step 1: criar E2E autenticado**

Scenarios:

```text
all active stores appear;
period change refreshes snapshot;
search/status/sort work;
open store and inspect sellers/managers/owner/modules;
source metadata appears;
links preserve storeId;
create/update action and see counts update;
complete consulting item and see progress update;
confirm required participant and see pending count update;
change target/result and see strategic progress update;
Realtime burst produces one reconciled reload;
no console errors or global overflow.
```

- [ ] **Step 2: executar gates**

```bash
supabase db reset
supabase test db supabase/tests/internal_mx_network_cockpit_rls.test.sql
bun test src/features/network-dashboard src/lib/internal-mx-network-cockpit-migration.test.ts
npx playwright test src/test/internal-mx-network-cockpit.playwright.ts
npm run verify:db-types
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: inspecionar performance**

Run `EXPLAIN (ANALYZE, BUFFERS)` for one month and all active stores. Record execution time and scans. Add indexes only for proven bottlenecks.

- [ ] **Step 4: registrar evidência e commit**

```bash
git add src/test/internal-mx-network-cockpit.playwright.ts docs/qa/evidence/internal-mx-functional/network-cockpit.md
git commit -m "test(network): verify cockpit drilldown and realtime"
```
