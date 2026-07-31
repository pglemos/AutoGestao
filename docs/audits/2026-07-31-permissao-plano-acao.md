# Divergência aberta: quem pode criar ação no Plano de Ação

> Medido em 2026-07-31, sessões reais, viewport 1440×900.

## O que o teste afirmava

`src/test/mx-consultoria-role-smoke.playwright.ts` afirmava que gerente e vendedor
**não podem** criar plano, procurando o botão `Novo plano` e exigindo `count === 0`.

## O que existe de fato

O botão `Novo plano` **não existe em nenhuma tela do produto**. O único rótulo de
criação no workspace é `Nova Ação`. Portanto:

- para gerente e vendedor, a asserção passava **por vacuidade** — procurava um
  rótulo inexistente e concluía "não pode criar";
- para administrador MX e consultor, a asserção inversa **falhava** pelo mesmo
  motivo: exigia um rótulo que nunca esteve lá.

Medição direta:

| Perfil | Rota | Botões de criação visíveis |
|---|---|---|
| `administrador_geral` | `/plano-acao` | `Nova Ação` (3 ocorrências) |
| `gerente` | `/plano-acao` | `Nova Ação` (2 ocorrências) |

## A divergência que precisa de decisão

`src/features/action-plan/ScopedActionPlanPage.tsx` declara:

```ts
const SCOPED_ROLES = new Set<PlanningRole>(['dono', 'gerente', 'vendedor'])
```

Ou seja, o código trata gerente e vendedor como **atores de planejamento** — e a
interface entrega o botão de criar de acordo. O contrato do teste presumia o
oposto. Um dos dois está errado, e a escolha é de produto, não de implementação:

- **Se gerente e vendedor devem criar ações**, o teste estava errado desde que foi
  escrito e a asserção deve virar `toBeGreaterThan(0)` para eles também.
- **Se não devem**, isto é um furo de permissão em produção hoje, e a correção é em
  `ScopedActionPlanPage` (ou no workspace), não no teste.

Enquanto a regra não é decidida, o teste deixou de afirmar permissão para esses dois
perfis, em vez de continuar afirmando algo que sua própria formulação tornava
impossível de reprovar. Admin e consultor passaram a ser verificados pelo rótulo
real.

## Efeito colateral removido

A asserção de `Concluir` (`count === 0` para gerente/vendedor) tinha o mesmo
problema de formulação e saiu junto: ela media a ausência de um botão que só
aparece com ação em andamento, então passava em qualquer estado vazio.
