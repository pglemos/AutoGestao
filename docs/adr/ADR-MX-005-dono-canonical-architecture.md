# ADR-MX-005 — Arquitetura Canônica do Módulo do Dono e Acúmulo de Gestão Comercial

**Data:** 2026-08-05  
**Status:** Accepted  
**Decisor:** Architect / Lead Engineer  
**Stakeholders:** @architect, @dev, @pm, @qa  

---

## 1. Contexto

O perfil do Dono (Master da Loja / Rede) possui dupla responsabilidade no MX Gestão Preditiva:
1. **Visão Executiva Macro:** Acompanhar resultados consolidados, planos estratégicos, benchmarking, score de departamentos e saúde geral da rede/lojas.
2. **Gestão Comercial Direta (Acúmulo de Função):** Quando uma unidade da rede não possui um Gerente Comercial ativo cadastrado (ou o cadastro está pendente), o Dono acumula a responsabilidade operacional de gerenciar a rotina da loja e os vendedores.

A PR #175 propôs mecânicas para detectar automaticamente se a loja possui um Gerente ativo e liberar ao Dono o acesso às rotinas comerciais operacionais sem alterar o RBAC nem fabricar perfis falsos.

## 2. Decisão

Adotar a **Arquitetura Canônica de Gestão do Dono baseada no contexto real de vínculo (`useStoreManagementContext`)**:

1. **Contexto de Gestão por Loja:** O hook `useStoreManagementContext` verifica a presença de vínculo ativo de `role = 'gerente'` na tabela `vinculos_loja` para a loja selecionada.
2. **Modos de Acesso Operacional:**
   - **`active_manager` (`oversight`):** Quando há gerente ativo na loja, o Dono opera em modo de acompanhamento e visão executiva.
   - **`owner_managed` (`full_management`):** Quando a loja não tem gerente ativo, o Dono tem liberação direta para acessar as rotinas de gestão comercial da equipe (`/rotina`, `/minha-equipe`, `/meta-loja`).
3. **Consistência de Shell e Design System:** Todas as páginas do Dono utilizam o `AppShell` universal e o `PageCanvas` canônico, sem a reintrodução de scopes legados (`.owner-b44`).
4. **Resolução de Placeholders:** Placeholders no módulo do Dono só são substituídos por componentes interativos quando há contrato de dados real, RPC/queries validadas e RLS configurado.

## 3. Consequências

- **Segurança:** RBAC/RLS permanecem estritamente intactos. Dono não ganha privilégios arbitrários do Admin MX e não vaza dados de outras lojas.
- **UX:** Navegação fluida para o Dono em lojas sem gerente ativo, com transparência via `OwnerManagementNotice`.
- **Manutenibilidade:** Código legível, sem classes CSS paralelas e testado via suíte automatizada.
