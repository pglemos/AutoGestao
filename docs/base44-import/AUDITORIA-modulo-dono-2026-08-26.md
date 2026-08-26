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

---

## Varredura funcional das 17 rotas do Dono (produção, release `0fe346aa`)

Percorridas com a Simulação de Dono ativa. Todas carregam, nenhuma acusa erro
de aplicação, console sem erro real:

`/home` · `/decisoes` · `/vendas` · `/meta-loja` · `/minha-equipe` ·
`/rotina-equipe` · `/mentor` · `/mercado` · `/feedbacks-pdis` · `/departamentos`
e os 6 departamentos (`comercial`, `marketing`, `produto-e-estoque`,
`pessoas-rh`, `financeiro`, `operacoes`).

Dois falsos positivos que investiguei e descartei, para não virarem tarefa:

- **Departamentos pareciam repetir a mesma tela.** Não repetem: há um cabeçalho
  comum com os scores de todas as áreas e, abaixo, o detalhe do departamento da
  rota. Comercial mostra "Volume de Vendas 12 · Parcial"; Financeiro mostra
  "Lucro Bruto — · Pendente".
- **Sentry acusando CORS no console.** O DSN em produção bate com o do projeto,
  `allowedDomains` é `["*"]` e a chave está ativa — e a própria sessão registrou
  **66 envelopes com HTTP 200**. O erro vinha da extensão "Network Monitor" do
  navegador de teste.

## Execução do Dono preservada (contraprova do bloqueio)

O bloqueio de criação não podia derrubar o que é do Dono. O drawer da ação abre
normalmente e a aba Execução mantém progresso, ações rápidas, checklist
(adicionar, marcar, editar, remover), bloquear/desbloquear e evidências — sem
checagem de papel na UI, e com `can_manage_mx_action_scope` autorizando no
banco, que é justamente a função que **não** foi restringida.

Registro honesto do método: o Radix Tabs ignora clique sintético e o harness não
conseguiu trocar de aba na tela real, então essa confirmação veio da leitura de
`ExecutionTab.jsx` somada à permissão do banco, não de um clique.

## Pendência de dado, não de código — Benchmarking

`/mercado` renderiza corretamente (filtros de região, porte, marca e segmento,
tabela comparativa e MX Score), mas **todo benchmark aparece "--" e "Pendente"**
porque `benchmark_snapshots` está **vazia** — 0 linhas.

Existe a leitura (`get_benchmark`) e a trava de escrita
(`prevent_benchmark_mutation`), mas **nenhum job, cron ou função que popule** a
tabela. Enquanto isso não existir, a tela promete "dados reais do recorte
mercado" e não tem o que mostrar.

Não populei: benchmark inventado é pior que benchmark ausente — o Dono tomaria
decisão comparando a loja com número fabricado. Precisa de fonte real e de um
processo que a alimente.
