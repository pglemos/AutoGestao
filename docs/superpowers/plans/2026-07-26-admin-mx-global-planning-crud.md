# Admin MX Global Planning CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dar a `administrador_geral`, `administrador_mx` e `consultor_mx` o mesmo CRUD global, por loja ativa, para Plano Estratégico, Plano de Ação e Consultoria, reutilizando os fluxos completos já aprovados do módulo Dono.

**Architecture:** O shell interno permanece o responsável pela navegação e pelo design system. As telas completas do Dono serão montadas em uma ponte de contexto que usa a autenticação MX atual e o seletor de loja ativa. As permissões de escrita serão centralizadas em `eh_area_interna_mx(auth.uid())`, com uma migration final idempotente e invalidação Realtime para que as telas reflitam alterações cruzadas.

**Tech Stack:** React, TypeScript/JSX, React Router, Supabase Postgres/RLS/Realtime, Bun tests, Vite.

## Global Constraints

- Os três perfis internos têm escopo global, sem atribuição obrigatória.
- O seletor de loja mostra somente lojas ativas.
- Plano Estratégico e Plano de Ação podem ser excluídos definitivamente por esses perfis.
- Consultoria deve ser arquivada de forma recuperável, preservando histórico e dependências.
- Não alterar nem incluir `test-results/.last-run.json` ou `.claude_backup/`.
- Não inventar indicadores, dados ou fallbacks demonstrativos.

### Task 1: Contrato de acesso global e banco

**Files:**
- Create: `supabase/migrations/20260726150000_internal_mx_global_planning_crud.sql`
- Modify: `src/features/internal-mx-access/types.ts`
- Modify: `src/features/internal-mx-access/internalMxActionPolicy.ts`
- Test: `src/features/internal-mx-access/internalMxActionPolicy.test.ts`
- Test: `src/features/consulting-clients/lib/consultingClientPolicy.test.ts`

- [x] Definir recursos `strategic-plan` e `action-plan` e permitir `manage` para os três perfis, independentemente de atribuição.
- [x] Reaplicar RLS de planos, metas, benchmarks e tabelas de consultoria usando `eh_area_interna_mx(auth.uid())`.
- [x] Corrigir funções de update/delete de Plano de Ação para reconhecer a área interna MX como liderança global.
- [x] Transformar exclusão de cliente de consultoria em arquivamento, mantendo o registro e dependências.
- [x] Cobrir o contrato em testes unitários e de texto SQL.

### Task 2: Navegação e ponte das telas completas

**Files:**
- Create: `src/features/internal-mx-planning/InternalMxOwnerBridge.tsx`
- Create: `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- Create: `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- Modify: `src/design-system/internal-mx/internalMxNavigation.tsx`
- Modify: `src/design-system/internal-mx/internalMxPageRegistry.ts`
- Modify: `src/lib/auth/routeAccess.ts`
- Modify: `src/App.tsx`
- Test: `src/design-system/internal-mx/internalMxNavigation.test.ts`

- [x] Montar `OwnerProvider` sob o shell interno para reutilizar os componentes completos sem duplicar o módulo Dono.
- [x] Adicionar rota e item de navegação para `/plano-estrategico`.
- [x] Trocar `/plano-acao` interno pela tela completa, mantendo a tela reduzida para gerente/vendedor.
- [x] Adicionar seletor de loja ativa compartilhado e manter a seleção no contexto existente.

### Task 3: Consultoria global e sincronização

**Files:**
- Modify: `src/features/consulting-clients/lib/consultingClientPolicy.ts`
- Modify: `src/features/consulting-clients/ConsultingClientsPage.tsx`
- Modify: `src/hooks/useConsultingClients.ts`
- Modify: `src/features/consulting-clients/hooks/useScopedConsultingClientDetailBySlug.ts`
- Modify: `src/components/owner/strategic/strategicPlanLiveRepository.js`
- Modify: `src/components/owner/actionplan/actionPlanLiveRepository.js`
- Test: `src/features/consulting-clients/lib/consultingClientPolicy.test.ts`

- [x] Remover a bifurcação de carteira atribuída para `consultor_mx` na superfície global.
- [x] Expor edição e arquivamento sem apagar histórico.
- [x] Assinar canais Realtime/invalidação para ações, metas e clientes e recarregar após mutations.

### Task 4: Gates

- [x] Rodar testes focados, `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
- [x] Rodar `git diff --check`, validar reversibilidade e confirmar os resíduos preexistentes fora do escopo.
- [ ] Validar as quatro rotas internas com sessão autenticada por perfil interno MX; a conta disponível nesta execução é `dono`.

## File list

- `src/features/internal-mx-planning/` — ponte e páginas globais internas.
- `src/features/internal-mx-access/` — contrato de recursos e permissões.
- `src/design-system/internal-mx/`, `src/lib/auth/routeAccess.ts`, `src/App.tsx` — rotas e navegação.
- `src/features/consulting-clients/`, `src/hooks/`, `src/pages/owner/`, `src/components/owner/` — CRUD, escopo e sincronização.
- `supabase/migrations/20260726150000_internal_mx_global_planning_crud.sql` — RLS/RPC global aplicada no remoto.
- `supabase/rollbacks/20260726150000_internal_mx_global_planning_crud.sql` — rollback preservando dados.
