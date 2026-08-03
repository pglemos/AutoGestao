# Story OPS-20260501 - CRUD Admin da Equipe da Loja

## Status

Ready for Review

## Contexto

Administradores MX precisam gerenciar todos os integrantes da equipe de uma loja sem depender de SQL manual. O fluxo de equipe já criava usuários e editava vigência, mas não oferecia edição completa de cadastro, papel, vínculo operacional e exclusão/remocao da loja.

## Acceptance Criteria

- [x] `administrador_geral` e `administrador_mx` conseguem criar integrante para uma loja.
- [x] `administrador_geral` e `administrador_mx` conseguem editar nome, e-mail, telefone, papel, loja, status de usuário e vigência.
- [x] `administrador_geral` e `administrador_mx` conseguem excluir/remover integrante da equipe da loja.
- [x] Exclusão remove o vínculo da loja, encerra vigência operacional e desativa o usuário quando não restar outro vínculo.
- [x] Dono e gerente conseguem gerir integrantes da própria loja por edge function com validação de escopo.
- [x] Criação de vendedor grava também `vendedores_loja` com vigência, status operacional, carência e venda loja.
- [x] A aba `/lojas/:slug?tab=equipe` apresenta campos e ações em lista administrativa responsiva.
- [x] Gates de qualidade: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [x] A rede interna expõe editar a filial na lista `/lojas`, inclusive para `consultor_mx`, e o link acionável abre o pré-cadastro da unidade correta pelo slug.
- [x] `consultor_mx` consegue revisar pré-cadastros pela mesma Edge Function e recebe a notificação operacional.

## Dev Agent Record

### Debug Log

- Adicionado CRUD administrativo em `useTeam` para atualizar cadastro, vínculo e vigência.
- O CRUD foi movido para `StoreTeamPanel` dentro do dashboard `/lojas/:slug?tab=equipe`.
- Mantida criação existente via `UserCreationModal`, com botões de criação controlados por papel autorizado.
- Correção 2026-05-03: `UserCreationModal` agora expõe telefone, papel, loja, início/fim de vigência, status operacional, venda loja e carência.
- Correção 2026-05-03: `register-user` grava `is_venda_loja` e cria vigência em `vendedores_loja` para vendedores.
- Correção 2026-05-03: adicionada `manage-store-team` para edição/remoção por dono e gerente no escopo da loja.
- Correção 2026-05-03: validado em navegador local com `admin@mxgestaopreditiva.com.br` em `/lojas/acertt?tab=equipe`, desktop e mobile sem erros de console.
- Correção 2026-08-03: `/lojas` passou a expor edição completa da filial e link navegável de pré-cadastro; aprovação e notificações foram alinhadas ao contrato dos três perfis internos MX.
- Hardening 2026-08-03: `store-pre-registration` deixou de adotar qualquer identidade existente, inclusive inativa, e passou a usar caminho UUID por avatar; falhas limpam somente a identidade criada pela requisição atual.
- Operação 2026-08-03: as quatro identidades já existentes foram reconciliadas sem duplicação para a ACERTT: Simone Vieira, Cleyton Gomes e Gabriel como vendedores, e `acerttcar@gmail.com` como dono. Todas ficaram ativas, confirmadas, com vínculo operacional ativo e `must_change_password=true`; o login provisório passou no smoke 4/4.

### File List

- `docs/stories/story-OPS-20260501-store-team-admin-crud.md`
- `src/components/molecules/PageHeader.tsx`
- `src/features/equipe/components/UserCreationModal.tsx`
- `src/hooks/useTeam.ts`
- `src/features/lojas/components/StoreTeamPanel.tsx`
- `src/pages/DashboardLoja.tsx`
- `supabase/functions/register-user/index.ts`
- `supabase/functions/manage-store-team/index.ts`
- `src/features/lojas/Lojas.container.tsx`
- `src/features/lojas/data/storeColumns.tsx`
- `src/features/lojas/hooks/useLojasPage.ts`
- `src/features/admin/components/StoreEditModal.tsx`
- `supabase/functions/approve-store-registration/index.ts`
- `supabase/functions/store-pre-registration/index.ts`
- `src/features/lojas/owner-design-system.test.ts`
- `src/lib/internal-mx-option-b-global-admin.test.ts`
- `src/lib/store-pre-registration-auth-hardening.test.ts`

## QA Results

- PASS — `npm run typecheck`
- PASS — `npm run lint`
- PASS — `npm test` (1.711 testes, 14.000 asserções; primeira execução teve 2 timeouts de foco/cleanup em `ManagerDevelopmentDialogs.test.tsx`, repetição isolada 2/2 e suíte completa subsequente 0 falhas)
- PASS — `npm run build`
- PASS — `deno check` nas quatro Edge Functions tocadas
- PASS — rota pública `https://www.mxperformance.com.br/pre-cadastro/vitrine` identificou `VITRINE` em navegador real.
- PASS — `https://www.mxperformance.com.br/lojas/vitrine` carregou a unidade real, com 14 integrantes e zero erros de console; a produção ainda não contém o novo botão de edição porque o checkout não foi publicado.
- CONCERN — estas alterações locais ainda precisam de commit, CI, preview e publicação; smoke autenticado dos três perfis internos e validação visual remota permanecem pendentes.
