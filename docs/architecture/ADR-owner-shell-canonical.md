# ADR: shell canônico do módulo Dono

- Status: Aceito
- Data: 2026-08-04
- Escopo: rotas autenticadas do Dono e o shell compartilhado dos perfis MX

## Contexto

O Dono precisa preservar a navegação Base44, os grupos de departamentos, os
aliases de rota e os providers de domínio. Ao mesmo tempo, o runtime atual já
possui um shell compartilhado para Vendedor, Gerente, Dono e perfis internos.
Manter um shell dedicado do Dono criaria concorrência de drawer, sidebar,
landmarks, tokens e contratos de responsividade.

Evidências atuais:

- `src/components/AppShell.tsx` monta `AppShellFrame` e `Layout`.
- `src/components/Layout.tsx` monta exatamente um `MxSidebarShell`.
- `src/features/dashboard-loja/sections/owner-cockpit/ownerBase44Config.ts`
  concentra a navegação e os aliases específicos do Dono.
- `src/test/MxSidebarShell.test.ts` e
  `src/test/owner-base44-design-scope.test.ts` cobrem a composição universal,
  a navegação e os tokens sem um shell paralelo.

## Alternativas consideradas

1. Shell universal para todos os perfis, com configuração de navegação e
   providers específicos por domínio.
2. Shell dedicado do Dono, governado pelas mesmas primitives do Design System.
3. Manter os dois caminhos e selecionar por rota/perfil.

## Decisão

Adotamos a alternativa 1. `MxSidebarShell` é o único shell de sidebar,
drawer, perfil, notificações e área autenticada. O Dono pode ter configuração
de navegação, `OwnerProvider`, dados e tokens semânticos específicos, mas não
possui uma implementação concorrente de shell.

O contrato visual canônico é mantido em:

- `src/components/MxSidebarShell.tsx`;
- `src/design-system/sidebar/tokens.ts`;
- `src/components/AppShell.tsx` e `src/components/Layout.tsx`;
- `ownerBase44Config.ts` para navegação e aliases do Dono.

## Consequências

### Positivas

- Um único dono de scroll, drawer, foco, breakpoint e landmark autenticado.
- Correções de acessibilidade e responsividade propagam-se a todos os perfis.
- A paridade Base44 permanece expressa por configuração e contratos testáveis,
  sem duplicar estrutura de layout.
- RBAC, providers e adapters de domínio continuam isolados do shell.

### Negativas e limites

- Mudanças globais no `MxSidebarShell` exigem regressão nos seis perfis.
- Uma diferença visual legítima do Dono deve ser expressa por tokens,
  configuração ou primitive compartilhada, não por um novo shell.
- O legacy path `/dono/*` continua como alias de roteamento; isso não autoriza
  criar uma segunda árvore de layout.

## Componentes removidos

Nenhum componente adicional foi removido nesta decisão. A regra arquitetural
é que implementações paralelas como `OwnerShell`, `OwnerLayout`,
`ManagerSidebarShell`, `SellerLayoutShell` ou `MxInternalShell` não devem ser
reativadas no grafo executável. A ausência desses caminhos é protegida pelos
contratos existentes de sidebar e paridade.

## Componentes mantidos

- `AppShellFrame` como moldura externa de rota autenticada;
- `MxSidebarShell` como shell único;
- `OwnerProvider`, `ConsultantRequestModal` e `OwnerToaster` como composição
  de domínio do Dono;
- `OWNER_BASE44_NAVIGATION` e seus resolvedores de rota;
- `MxRoleVisualScope`/tokens semânticos para variações por perfil.

## Rollback

O rollback é reversível por `git revert` do commit que alterar este ADR ou a
implementação do shell. Antes de qualquer mudança estrutural, executar os
contratos de `MxSidebarShell`, paridade do Dono e a matriz autenticada. Não
reintroduzir um shell dedicado sem um novo ADR, matriz de rotas autenticada,
prova visual e aprovação arquitetural.
