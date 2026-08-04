# Owner Manager Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao dono acesso comercial e gerencial coerente com a existência real de gerente ativo na loja, preservando a visão executiva e o perfil original.

**Architecture:** Um resolvedor puro converte contagem de vínculos ativos e `manager_email` em um contexto gerencial. Um hook consulta somente a contagem de gerentes ativos da loja. Rotas e navegação consomem esse contexto, enquanto cadastro e edição usam o e-mail apenas como intenção pendente, nunca como autorização.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Supabase JS 2, Bun Test, Vite.

## Global Constraints

- `vinculos_loja` é a única fonte canônica para reconhecer gerente ativo.
- `manager_email` nunca concede permissão.
- O perfil do dono continua sendo `dono`.
- Falha ao consultar o contexto não pode ampliar privilégios.
- Não criar tabela, usuário ou vínculo duplicado.

---

### Task 1: Contrato puro do contexto gerencial

**Files:**
- Create: `src/lib/owner-management-context.ts`
- Test: `src/lib/owner-management-context.test.ts`

**Interfaces:**
- Consumes: `{ activeManagerCount: number | null; declaredManagerEmail?: string | null; queryFailed?: boolean }`.
- Produces: `resolveOwnerManagementContext(input): OwnerManagementContext`.

- [ ] **Step 1: Write the failing tests**

Testar `active_manager`, `manager_pending`, `owner_managed` e fallback conservador em falha.

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/lib/owner-management-context.test.ts`
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implement the minimal resolver**

Criar tipos `OwnerManagementStatus`, `OwnerManagementContext` e função pura com normalização de e-mail.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `bun test src/lib/owner-management-context.test.ts`
Expected: PASS.

### Task 2: Hook de consulta do gerente ativo

**Files:**
- Create: `src/hooks/useStoreManagementContext.ts`
- Test: `src/hooks/useStoreManagementContext.contract.test.ts`

**Interfaces:**
- Consumes: `storeId`, `declaredManagerEmail` e papel atual.
- Produces: contexto resolvido, `loading` e `error`.

- [ ] **Step 1: Write the failing contract test**

Validar que a consulta filtra `role=gerente`, `is_active=true`, `ended_at is null` e usa `head/count` sem buscar dados pessoais.

- [ ] **Step 2: Run the test and verify RED**

Run: `bun test src/hooks/useStoreManagementContext.contract.test.ts`
Expected: FAIL porque o hook não existe.

- [ ] **Step 3: Implement the hook**

Usar `supabase.from('vinculos_loja').select('id', { count: 'exact', head: true })` com os filtros canônicos. Em erro, chamar o resolvedor com `queryFailed=true`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `bun test src/hooks/useStoreManagementContext.contract.test.ts`
Expected: PASS.

### Task 3: Rotas gerenciais do dono

**Files:**
- Modify: `src/lib/auth/routeAccess.ts`
- Modify: `src/App.tsx`
- Create: `src/features/owner/OwnerRoutineRoute.tsx`
- Test: `src/lib/auth/routeAccess.test.ts`
- Test: `src/features/owner/OwnerRoutineRoute.contract.test.ts`

**Interfaces:**
- Consumes: `useStoreManagementContext`.
- Produces: dono autorizado em `/gerente/rotina-equipe`; rotina gerencial quando acumula gestão.

- [ ] **Step 1: Add failing route tests**

Garantir dono autorizado e vendedor bloqueado em `/gerente/rotina-equipe`.

- [ ] **Step 2: Run and verify RED**

Run: `bun test src/lib/auth/routeAccess.test.ts`
Expected: FAIL no acesso do dono.

- [ ] **Step 3: Implement route access and role switch**

Permitir dono na regra e renderizar `ManagerTeamRoutine` para dono.

- [ ] **Step 4: Add and implement OwnerRoutineRoute**

Renderizar `RotinaGerente` quando `ownerAssumesManagement`; caso contrário, `OwnerRotinaDoDia`. Durante carregamento, mostrar estado neutro sem ampliar acesso.

- [ ] **Step 5: Run route tests**

Run: `bun test src/lib/auth/routeAccess.test.ts src/features/owner/OwnerRoutineRoute.contract.test.ts`
Expected: PASS.

### Task 4: Navegação comercial do dono

**Files:**
- Create: `src/features/owner/ownerCommercialNavigation.ts`
- Modify: `src/components/Layout.tsx`
- Test: `src/features/owner/ownerCommercialNavigation.test.ts`

**Interfaces:**
- Consumes: `OwnerManagementContext`.
- Produces: seção `GESTÃO COMERCIAL` e badge contextual.

- [ ] **Step 1: Write failing navigation tests**

Verificar rótulos, caminhos e badges `RESPONSÁVEL`/`ACOMPANHAR`.

- [ ] **Step 2: Run and verify RED**

Run: `bun test src/features/owner/ownerCommercialNavigation.test.ts`
Expected: FAIL porque o builder não existe.

- [ ] **Step 3: Implement navigation builder and Layout integration**

Adicionar a seção ao menu do dono e filtrar itens por `canAccessPath` como já ocorre com os demais perfis.

- [ ] **Step 4: Run and verify GREEN**

Run: `bun test src/features/owner/ownerCommercialNavigation.test.ts`
Expected: PASS.

### Task 5: Cadastro e edição da estrutura gerencial

**Files:**
- Modify: `src/components/organisms/CreateStoreModal.tsx`
- Modify: `src/features/lojas/hooks/useLojasPage.ts`
- Modify: `src/features/admin/components/StoreEditModal.tsx`
- Create: `src/lib/store-management-form.ts`
- Test: `src/lib/store-management-form.test.ts`

**Interfaces:**
- Consumes: `managementMode: 'owner_managed' | 'manager_pending'`.
- Produces: `manager_email=null` para dono gestor ou e-mail obrigatório para gerente pendente.

- [ ] **Step 1: Write failing form tests**

Validar limpeza de e-mail no modo dono e rejeição de modo pendente sem e-mail válido.

- [ ] **Step 2: Run and verify RED**

Run: `bun test src/lib/store-management-form.test.ts`
Expected: FAIL porque o normalizador não existe.

- [ ] **Step 3: Implement normalizer and forms**

Adicionar escolhas acessíveis, mensagens explicativas e estado detectado automaticamente na edição.

- [ ] **Step 4: Run and verify GREEN**

Run: `bun test src/lib/store-management-form.test.ts`
Expected: PASS.

### Task 6: Aviso contextual e validação final

**Files:**
- Create: `src/features/owner/OwnerManagementNotice.tsx`
- Modify: `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx`
- Test: `src/features/owner/OwnerManagementNotice.contract.test.ts`

**Interfaces:**
- Consumes: contexto gerencial da loja.
- Produces: aviso claro de responsabilidade ou acompanhamento.

- [ ] **Step 1: Add failing copy contract tests**

Verificar textos dos três estados e ausência de nomes inventados.

- [ ] **Step 2: Implement the notice**

Mostrar aviso apenas ao dono e sem bloquear o carregamento do cockpit.

- [ ] **Step 3: Run focused tests**

Run: `bun test src/lib/owner-management-context.test.ts src/lib/store-management-form.test.ts src/features/owner/ownerCommercialNavigation.test.ts src/lib/auth/routeAccess.test.ts`
Expected: PASS.

- [ ] **Step 4: Run project verification**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: exit code 0.

- [ ] **Step 5: Validate pull request CI**

Open a pull request against `main`, inspect all workflow runs, and only merge after required checks pass.
