# Internal MX Functional Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, em PRs encadeados e verificáveis, a fundação compartilhada, o Plano Estratégico, o Plano de Ação, a Consultoria com autonomia assistida e o cockpit de evolução em tempo real para os três perfis internos MX.

**Architecture:** A implementação será dividida em cinco planos executáveis. Cada plano extrai ou cria uma unidade funcional compartilhada, preserva os shells de Dono e módulo interno, utiliza repositórios canônicos e encerra com testes e commit próprios. O tema global `#198653` permanece fora desta sequência e só recebe plano depois da entrega funcional validada.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Tailwind CSS 4, Radix UI, Recharts 3, TanStack Query 5, Supabase PostgreSQL 17/RLS/RPC/Realtime, Bun Test, Testing Library, Playwright, Vite 6 e Vercel.

## Global Constraints

- Perfis com paridade global: `administrador_geral`, `administrador_mx`, `consultor_mx`.
- Dono, Gerente e Vendedor permanecem limitados ao próprio escopo.
- Supabase é a fonte de verdade em produção.
- Não criar páginas, repositórios ou tabelas paralelas para o mesmo domínio.
- Não copiar as páginas do Dono para o módulo interno.
- Operações multi-tabela usam RPC transacional ou Edge Function com compensação.
- RLS, auditoria, tipos gerados e Realtime são obrigatórios quando o banco mudar.
- Não aplicar o tema global `#198653`, trocar a sidebar ou migrar tokens globais nesta entrega.
- Não gravar credenciais em código, documentação, fixtures, screenshots ou logs.
- Node suportado: `>=20.0.0 <25`.
- Comandos canônicos: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`.
- Viewports obrigatórios: 1440 px, 1024 px, 768 px e 390 px.
- Cada plano deve ser executado em worktree isolado criado com `superpowers:using-git-worktrees`.

---

## Planos encadeados

1. `docs/superpowers/plans/2026-07-27-internal-mx-shared-foundation.md`
2. `docs/superpowers/plans/2026-07-27-internal-mx-strategic-plan.md`
3. `docs/superpowers/plans/2026-07-27-internal-mx-action-plan.md`
4. `docs/superpowers/plans/2026-07-27-internal-mx-consulting-journey.md`
5. `docs/superpowers/plans/2026-07-27-internal-mx-network-cockpit.md`

Cada plano produz software utilizável e testável. O plano seguinte parte do contrato público criado pelo anterior, não de arquivos copiados ou estado implícito.

---

### Task 1: Preparar a execução isolada e congelar o baseline

**Files:**
- Read: `package.json`
- Read: `docs/superpowers/specs/2026-07-27-internal-mx-functional-surfaces-design.md`
- Create during execution: worktree local para a branch funcional

**Interfaces:**
- Consumes: branch `main` atual e especificação aprovada.
- Produces: worktree limpa, SHA-base registrado e baseline de qualidade reproduzível.

- [ ] **Step 1: carregar as skills obrigatórias**

Read:

```text
skills://plugins/superpowers/using-git-worktrees/skill.md
skills://plugins/superpowers/subagent-driven-development/skill.md
skills://plugins/superpowers/test-driven-development/skill.md
skills://plugins/superpowers/verification-before-completion/skill.md
```

- [ ] **Step 2: criar worktree isolada a partir da `main`**

```bash
git fetch origin main
git worktree add ../mx-internal-functional -b feat/internal-mx-functional origin/main
cd ../mx-internal-functional
git rev-parse HEAD
```

Expected: worktree criada na branch `feat/internal-mx-functional`, sem arquivos modificados.

- [ ] **Step 3: registrar o SHA-base no relatório de execução**

```bash
mkdir -p docs/qa/evidence/internal-mx-functional
printf "base_sha=%s\n" "$(git rev-parse HEAD)" > docs/qa/evidence/internal-mx-functional/baseline.txt
```

- [ ] **Step 4: executar baseline**

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

Expected: registrar separadamente qualquer falha herdada. Não mascarar falhas novas como “já existiam”.

- [ ] **Step 5: commit do baseline documental**

```bash
git add docs/qa/evidence/internal-mx-functional/baseline.txt
git commit -m "chore(mx): record functional rollout baseline"
```

---

### Task 2: Executar a fundação compartilhada

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-shared-foundation.md`

**Interfaces:**
- Produces: `PlanningWorkspaceProvider`, `usePlanningWorkspace`, `usePlanningRealtime`, `resolvePlanningCapabilities` e adapters de Dono/interno.

- [ ] **Step 1: executar o plano da fundação na ordem documentada**

```bash
bun test src/features/planning-workspace src/test/internal-mx-planning-pages.test.ts
npm run typecheck
```

Expected: páginas internas e do Dono recebem contexto compartilhado sem alteração funcional visível.

- [ ] **Step 2: revisar o diff da fundação**

```bash
git diff origin/main...HEAD -- src/features/planning-workspace src/features/internal-mx-planning src/pages/owner
```

Reject if: existir cópia de página do Dono, segundo repositório, `as any` espalhado ou aumento de permissão para Gerente/Vendedor.

---

### Task 3: Executar o Plano Estratégico compartilhado

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-strategic-plan.md`

**Interfaces:**
- Consumes: contexto compartilhado da Task 2.
- Produces: `StrategicPlanWorkspace` usado por Dono e perfis internos.

- [ ] **Step 1: executar o plano e os testes focados**

```bash
bun test src/features/strategic-plan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
```

- [ ] **Step 2: validar as duas montagens**

```bash
npm run dev
```

Check:

```text
/lojas/<storeSlug>/plano-estrategico
/plano-estrategico?storeId=<uuid>
```

Expected: mesma regra, mesma fonte e mesma composição funcional; apenas shell e escopo diferem.

---

### Task 4: Executar o Plano de Ação compartilhado

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-action-plan.md`

**Interfaces:**
- Consumes: contexto compartilhado e vínculo indicador → ação.
- Produces: `ActionPlanWorkspace` com Ações, Calendário, Foco, Kanban e Lista.

- [ ] **Step 1: executar testes de regras e controladores**

```bash
bun test src/features/action-plan src/components/owner/actionplan src/test/internal-mx-planning-pages.test.ts
npm run typecheck
```

- [ ] **Step 2: validar transições em ambas as montagens**

Use a mesma ação de teste em ambiente controlado e verifique:

```text
criar → iniciar → atualizar progresso → bloquear → desbloquear → enviar para validação → validar → reabrir
```

Expected: histórico único, contagens sincronizadas e nenhuma duplicação.

---

### Task 5: Executar a Consultoria com autonomia assistida

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-consulting-journey.md`

**Interfaces:**
- Consumes: contexto compartilhado e formulário canônico do Plano de Ação.
- Produces: jornada, modal central, vídeo, Entrega, Evidências, antecipação e regras PMR/PMR Plus/PPA.

- [ ] **Step 1: executar migration e testes de contrato localmente**

```bash
supabase db reset
bun test src/features/consulting-journey src/lib/consulting-journey-migration.test.ts
npm run verify:db-types
```

- [ ] **Step 2: executar fluxos principais**

```text
assistir parcialmente → sair → retomar
avançar ao final → confirmar que não conclui
assistir 90% efetivo → concluir aula
concluir Entrega → enviar Evidência
solicitar antecipação → aprovar/recusar como perfil interno
abrir Google Meet real
```

Expected: assistir aula não conclui encontro; PPA não vaza conteúdo para Gerente/Vendedor.

---

### Task 6: Executar o cockpit de rede e drill-down

**Files:**
- Follow: `docs/superpowers/plans/2026-07-27-internal-mx-network-cockpit.md`

**Interfaces:**
- Consumes: dados estratégicos, ações, consultoria e snapshots.
- Produces: agregação rastreável por loja/pessoa e navegação contextual.

- [ ] **Step 1: executar testes de cálculo, RPC e Realtime**

```bash
bun test src/features/network-dashboard src/lib/internal-mx-network-cockpit-migration.test.ts
npm run typecheck
```

- [ ] **Step 2: validar drill-down**

Para cada card ou linha, confirmar navegação com `storeId` preservado para:

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

---

### Task 7: Validação integrada e preparação do PR funcional

**Files:**
- Create: `docs/qa/evidence/internal-mx-functional/verification.md`
- Modify: `docs/superpowers/specs/2026-07-27-internal-mx-functional-surfaces-design.md`

**Interfaces:**
- Consumes: entregas dos cinco planos.
- Produces: evidência reproduzível e PR funcional pronto para revisão.

- [ ] **Step 1: executar todos os gates**

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run check:bundle-size
npm run verify:db-types
npm run test:e2e
```

- [ ] **Step 2: executar matriz visual autenticada**

Viewports:

```text
1440x900
1024x768
768x1024
390x844
```

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

- [ ] **Step 3: escrever o relatório final**

`docs/qa/evidence/internal-mx-functional/verification.md` deve listar:

```markdown
- SHA validado
- migrations aplicadas
- RPCs/RLS alteradas
- tipos gerados
- rotas verificadas
- testes e resultados
- screenshots por viewport
- erros de console: zero bloqueantes
- runtime errors Vercel: zero relevantes
- tema global aplicado: não
- credenciais registradas: não
```

- [ ] **Step 4: atualizar o status da especificação**

Adicionar à especificação somente evidências reais, sem marcar critérios não verificados.

- [ ] **Step 5: commit final de evidência**

```bash
git add docs/qa/evidence/internal-mx-functional docs/superpowers/specs/2026-07-27-internal-mx-functional-surfaces-design.md
git commit -m "docs(mx): record functional rollout verification"
```

- [ ] **Step 6: abrir PR funcional**

Title:

```text
feat(mx): compartilhar planejamento, consultoria e evolução global
```

Body must include:

```markdown
## Escopo
## Arquitetura compartilhada
## Banco e segurança
## Plano Estratégico
## Plano de Ação
## Consultoria
## Painel Geral
## Testes e evidências
## Limitações reais
## Confirmação: tema global não aplicado
```

- [ ] **Step 7: somente após merge e produção estável, iniciar o plano do tema global**

Do not create or merge the theme PR before the production smoke test of this functional PR passes.
