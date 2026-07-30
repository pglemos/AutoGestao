# Internal MX Functional Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, em cinco PRs funcionais sequenciais e verificáveis, a fundação compartilhada, o Plano Estratégico, o Plano de Ação, a Consultoria com autonomia assistida e o cockpit de evolução em tempo real dos perfis internos MX.

**Architecture:** Cada subsistema possui um plano próprio e produz software utilizável de forma independente. Os PRs são abertos e integrados na ordem deste documento; o próximo começa somente depois que o anterior estiver verde e incorporado à `main`. O tema global `#198653` permanece fora desta sequência e recebe plano separado somente depois do smoke test funcional em produção.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Tailwind CSS 4, Radix UI, Recharts 3, TanStack Query 5, Supabase PostgreSQL 17/RLS/RPC/Realtime, Bun Test, Testing Library, Playwright, Vite 6 e Vercel.

## Global Constraints

- Perfis com paridade global: `administrador_geral`, `administrador_mx`, `consultor_mx`.
- Dono, Gerente e Vendedor permanecem limitados ao próprio escopo.
- Supabase é a fonte de verdade em produção.
- Não criar páginas, repositórios ou tabelas paralelas para o mesmo domínio.
- Não copiar páginas do Dono para o módulo interno.
- Operações multi-tabela usam RPC transacional ou Edge Function com compensação.
- RLS, auditoria, tipos gerados e Realtime são obrigatórios quando o banco mudar.
- Não aplicar o tema global `#198653`, trocar a sidebar ou migrar tokens globais nesta sequência.
- Não gravar credenciais em código, documentação, fixtures, screenshots ou logs.
- Node suportado: `>=20.0.0 <25`.
- Comandos canônicos: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`.
- Viewports obrigatórios: 1440 × 900, 1024 × 768, 768 × 1024 e 390 × 844.
- Cada PR começa em worktree isolada criada com `superpowers:using-git-worktrees`.
- Nenhum PR avança enquanto o PR anterior estiver aberto, com CI vermelho ou sem smoke test do preview.

---

## Ordem obrigatória dos PRs

| Ordem | Branch | Plano | Base |
|---|---|---|---|
| 1 | `feat/internal-mx-shared-foundation` | `2026-07-27-internal-mx-shared-foundation.md` | `main` |
| 2 | `feat/internal-mx-strategic-plan` | `2026-07-27-internal-mx-strategic-plan.md` | `main` após merge do PR 1 |
| 3 | `feat/internal-mx-action-plan` | `2026-07-27-internal-mx-action-plan.md` | `main` após merge do PR 2 |
| 4 | `feat/internal-mx-consulting-journey` | `2026-07-27-internal-mx-consulting-journey.md` | `main` após merge do PR 3 |
| 5 | `feat/internal-mx-network-cockpit` | `2026-07-27-internal-mx-network-cockpit.md` | `main` após merge do PR 4 |

A separação é intencional. Cada PR pode ser revisado, rejeitado ou revertido sem arrastar os demais para o abismo coletivo.

---

### Task 1: Congelar o baseline inicial

**Files:**
- Read: `package.json`
- Read: `docs/superpowers/specs/2026-07-27-internal-mx-functional-surfaces-design.md`
- Create: `docs/qa/evidence/internal-mx-functional/baseline.md`

**Interfaces:**
- Produces: SHA-base, estado dos gates e falhas herdadas antes do primeiro PR.

- [ ] **Step 1: carregar as skills de execução**

```text
skills://plugins/superpowers/using-git-worktrees/skill.md
skills://plugins/superpowers/subagent-driven-development/skill.md
skills://plugins/superpowers/test-driven-development/skill.md
skills://plugins/superpowers/verification-before-completion/skill.md
```

- [ ] **Step 2: criar a worktree do PR 1**

```bash
git fetch origin main
git worktree add ../mx-internal-foundation -b feat/internal-mx-shared-foundation origin/main
cd ../mx-internal-foundation
git status --short
git rev-parse HEAD
```

Expected: árvore limpa e SHA igual ao `origin/main` consultado.

- [ ] **Step 3: executar o baseline**

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run check:bundle-size
```

- [ ] **Step 4: registrar resultados reais**

Create `docs/qa/evidence/internal-mx-functional/baseline.md`:

```markdown
# Baseline funcional MX

- Base SHA: `<git rev-parse HEAD>`
- Data: `2026-07-27`
- Typecheck: `<PASS|FAIL + causa>`
- Testes: `<PASS|FAIL + causa>`
- Lint: `<PASS|FAIL + causa>`
- Build: `<PASS|FAIL + causa>`
- Bundle: `<PASS|FAIL + valor>`
- Falhas herdadas: `<lista exata ou nenhuma>`
```

- [ ] **Step 5: commit**

```bash
git add docs/qa/evidence/internal-mx-functional/baseline.md
git commit -m "chore(mx): record functional rollout baseline"
```

---

### Task 2: Executar e integrar a fundação compartilhada

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-shared-foundation.md`

**Interfaces:**
- Produces: `PlanningWorkspaceProvider`, `usePlanningWorkspace`, `usePlanningRealtime`, `resolvePlanningCapabilities` e adapters de Dono/interno.

- [ ] **Step 1: executar o plano completo da fundação**

```bash
bun test src/features/planning-workspace src/components/owner/ownerPlanningAdapter.test.ts src/test/internal-mx-planning-pages.test.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 2: revisar proibições**

```bash
grep -R "@/pages/owner/" src/features/internal-mx-planning && exit 1 || true
grep -R "as any" src/features/planning-workspace src/features/internal-mx-planning/internalPlanningAdapter.ts src/components/owner/ownerPlanningAdapter.ts && exit 1 || true
```

Expected: nenhum resultado.

- [ ] **Step 3: abrir PR 1**

Title:

```text
refactor(mx): criar fundação compartilhada de planejamento
```

Base: `main`  
Head: `feat/internal-mx-shared-foundation`

- [ ] **Step 4: exigir gates e preview**

```text
typecheck
testes unitários
lint/a11y
gitleaks
build
preview Vercel READY
smoke das rotas internas e do Dono
```

- [ ] **Step 5: integrar somente após aprovação**

```bash
git fetch origin main
git worktree remove ../mx-internal-foundation
```

Do not start Task 3 until PR 1 is merged and production/preview smoke is recorded.

---

### Task 3: Executar e integrar o Plano Estratégico

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-strategic-plan.md`

**Interfaces:**
- Consumes: fundação já integrada na `main`.
- Produces: `StrategicPlanWorkspace` compartilhado.

- [ ] **Step 1: criar worktree atualizada**

```bash
git fetch origin main
git worktree add ../mx-internal-strategic -b feat/internal-mx-strategic-plan origin/main
cd ../mx-internal-strategic
```

- [ ] **Step 2: executar o plano e gates focados**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: validar as duas montagens**

```text
/lojas/<storeSlug>/plano-estrategico
/plano-estrategico?storeId=<uuid>
```

Expected: mesma fonte, cálculos e composição; apenas shell e autorização diferem.

- [ ] **Step 4: abrir e integrar PR 2**

Title:

```text
feat(strategy): compartilhar Plano Estratégico completo
```

Merge only with CI, preview, 45 indicators, action-link deduplication and visual matrix green.

---

### Task 4: Executar e integrar o Plano de Ação

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-action-plan.md`

**Interfaces:**
- Consumes: fundação e Plano Estratégico integrados.
- Produces: `ActionPlanWorkspace` e ciclo completo de ação.

- [ ] **Step 1: criar worktree atualizada**

```bash
git fetch origin main
git worktree add ../mx-internal-actions -b feat/internal-mx-action-plan origin/main
cd ../mx-internal-actions
```

- [ ] **Step 2: executar plano, migrations e testes**

```bash
supabase db reset
bun test src/features/action-plan src/components/owner/actionplan src/lib/action-plan-realtime-migration.test.ts src/test/internal-mx-planning-pages.test.ts
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: validar o ciclo controlado**

```text
criar → iniciar → atualizar progresso → bloquear → desbloquear → enviar para validação → validar → reabrir
```

Expected: um registro canônico, histórico único, cards e quatro modos sincronizados.

- [ ] **Step 4: abrir e integrar PR 3**

Title:

```text
feat(actions): compartilhar Plano de Ação completo
```

Merge only after RLS/Realtime, transições, exclusão controlada, E2E e preview green.

---

### Task 5: Executar e integrar a Consultoria

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-consulting-journey.md`

**Interfaces:**
- Consumes: fundação e formulário canônico do Plano de Ação.
- Produces: jornada, modal central, vídeo, Entrega, Evidências, participantes, antecipação e confidencialidade.

- [ ] **Step 1: criar worktree atualizada**

```bash
git fetch origin main
git worktree add ../mx-internal-consulting -b feat/internal-mx-consulting-journey origin/main
cd ../mx-internal-consulting
```

- [ ] **Step 2: executar banco e testes**

```bash
supabase db reset
supabase test db supabase/tests/consulting_journey_rls.test.sql
bun test src/features/consulting-journey src/lib/consulting-journey-migration.test.ts
npm run verify:db-types
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: executar fluxos principais**

```text
assistir parcialmente → sair → retomar
avançar ao final → não concluir
assistir 90% efetivo → concluir aula, não encontro
confirmar participantes
concluir Entrega → enviar/substituir Evidência
solicitar → cancelar/revisar antecipação
abrir Google Meet real
validar redaction do PPA
```

- [ ] **Step 4: abrir e integrar PR 4**

Title:

```text
feat(consulting): implementar jornada de autonomia assistida
```

Merge only after pgTAP, types, vídeo, antecipação, PPA, E2E and preview green.

---

### Task 6: Executar e integrar o cockpit da rede

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-network-cockpit.md`

**Interfaces:**
- Consumes: todos os domínios anteriores integrados.
- Produces: agregação rastreável, evolução por papel e drill-down.

- [ ] **Step 1: criar worktree atualizada**

```bash
git fetch origin main
git worktree add ../mx-internal-cockpit -b feat/internal-mx-network-cockpit origin/main
cd ../mx-internal-cockpit
```

- [ ] **Step 2: executar banco, testes e performance**

```bash
supabase db reset
supabase test db supabase/tests/internal_mx_network_cockpit_rls.test.sql
bun test src/features/network-dashboard src/lib/internal-mx-network-cockpit-migration.test.ts
npm run verify:db-types
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: validar drill-down com `storeId` preservado**

```text
loja
vendedor
gerente
dono/responsável
Plano Estratégico
Plano de Ação
Consultoria
fechamento diário
```

- [ ] **Step 4: abrir e integrar PR 5**

Title:

```text
feat(network): ampliar cockpit global e drill-down em tempo real
```

Merge only after RPC/RLS, query plan, Realtime burst test, E2E and preview green.

---

### Task 7: Validação integrada após os cinco merges

**Files:**
- Create or update: `docs/qa/evidence/internal-mx-functional/verification.md`
- Modify: `docs/superpowers/specs/2026-07-27-internal-mx-functional-surfaces-design.md`

**Interfaces:**
- Consumes: `main` contendo os cinco PRs.
- Produces: evidência final da entrega funcional e autorização para iniciar o plano de tema.

- [ ] **Step 1: atualizar a `main` e executar todos os gates**

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run check:bundle-size
npm run verify:db-types
npm run test:e2e
```

- [ ] **Step 2: executar matriz autenticada**

Routes:

```text
/plano-estrategico
/plano-acao
/consultoria
/painel
/lojas/<storeSlug>/plano-estrategico
/lojas/<storeSlug>/plano-acao
/lojas/<storeSlug>/consultoria
```

Viewports:

```text
1440x900
1024x768
768x1024
390x844
```

- [ ] **Step 3: validar produção**

```text
deployment Vercel READY;
SHA de produção igual ao SHA validado;
zero runtime errors relevantes;
smoke autenticado dos três perfis internos;
smoke do Dono;
nenhuma regressão bloqueante em Gerente/Vendedor.
```

- [ ] **Step 4: completar relatório final**

```markdown
- SHAs dos cinco PRs
- migrations e RPCs aplicadas
- matriz RLS
- tabelas Realtime
- tipos gerados
- testes e resultados
- rotas e screenshots
- query plans relevantes
- erros de console/runtime
- tema global aplicado: não
- credenciais registradas: não
- limitações reais restantes
```

- [ ] **Step 5: atualizar a especificação somente com evidência comprovada**

Do not mark criteria as complete based on expectation, screenshot isolada or “pareceu funcionar”.

- [ ] **Step 6: iniciar o planejamento do tema global**

Only after Task 7 is green, invoke `superpowers:brainstorming` for the separate global theme PR.
