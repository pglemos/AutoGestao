# Auditoria do módulo Dono — 2026-08-26

Regra verificada: **Dono, Gerente e Vendedor não criam plano de ação nem plano
estratégico.** Quem cria é Admin MX / Administrador MX / Consultor MX. Esses
papéis **executam** o plano que a MX criou.

Resultado: a regra **não estava implementada em camada nenhuma**. Três furos.

## Furo 1 — o banco autorizava Dono e Gerente a criar

`criar_plano_acao_v2` chamava `can_manage_mx_action_scope`, que devolve `true`
para dono e gerente (via `can_access_mx_scope` no escopo loja e, no escopo
individual, com `role IN ('dono','gerente')` explícito).

Corrigido com `can_create_mx_action_scope`, que exige `eh_area_interna_mx`.
A checagem é **separada de propósito**: `can_manage_mx_action_scope` continua
valendo para atualizar status, progresso, checklist e evidência — restringir a
função inteira tiraria a execução, que é do Dono e do Gerente.

## Furo 2 — /plano-acao do Dono oferecia "Nova Ação"

A página chamava `criar_plano_acao_v2` direto, por fora de `capabilities`. O
fluxo de criação saiu da tela, e os botões dos componentes (`ActionPlanHeader`,
`ActionsToolbar`, `DayDetails`) passam a sumir quando não recebem handler.

## Furo 3 — o cockpit mostrava "Novo plano"

`CentralMxPlanoSegmentadoPanel` escondia o botão por uma prop `readOnly` que o
`OwnerExecutiveCockpit` **não passava** (default `false`). A decisão passou para
dentro do painel (`isPerfilInternoMx(role)`), valendo em qualquer tela que o
reaproveite, sem depender de o chamador lembrar.

## Também corrigido — metas do plano estratégico

`canEditTargets` era `true` para o Dono, e o botão "Editar Metas" alterava a
meta do ciclo. Duas incoerências: o próprio editor trata o ciclo publicado como
imutável ("abra uma revisão para alterar"), e no Base44
(`getOwnerStrategicPlanViewModel`) a visão do Dono é somente leitura sobre o
ciclo publicado.

## Capacidades depois da correção

| | Interno MX | Dono | Gerente | Vendedor |
|---|---|---|---|---|
| Criar plano de ação | ✅ | ❌ | ❌ | ❌ |
| Gerenciar ciclo estratégico | ✅ | ❌ | ❌ | ❌ |
| Editar metas | ✅ | ❌ | ❌ | ❌ |
| Revisar/acompanhar ações | ✅ | ✅ | ❌ | ❌ |
| Ver plano estratégico | ✅ | ✅ | ❌ | ❌ |

## Impacto real medido antes de bloquear

- Planos de ação criados por Dono: **2**, desde maio (contra 3 da área interna).
- Edições de meta por Dono: **0** — as 248 registradas são todas da área interna.

Ou seja, o bloqueio alinha o sistema à regra sem tirar nada que estivesse em uso.

## Verificado em produção (release `0fe346aa`)

Com a Simulação de Dono ativa:

- `/plano-acao`: sem "Nova Ação" e sem "Criar ação para esta data"; Exportar e
  o acompanhamento das 2 ações do ciclo continuam;
- `/plano-estrategico`: sem "Editar Metas" e sem "Nova ação"; Resumo, Visão do
  Plano e filtros intactos;
- `/decisoes`: sem "Novo plano"; os botões "Abrir plano de ação" (consumo)
  continuam.

Teste inverso, como Admin: `criar_plano_acao_v2` respondeu **200** e criou o
plano — a área interna não foi afetada (registro de teste removido em seguida).
