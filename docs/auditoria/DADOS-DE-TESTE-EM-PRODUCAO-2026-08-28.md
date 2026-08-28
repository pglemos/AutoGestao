# Dados de teste contando como operação real — 2026-08-28

Auditoria de telas encontrou registros de teste espalhados pela base de
produção. Alguns são inertes; dois entram nas métricas de venda.

## O que entra na conta

`clientes` tem **12 registros com nome de teste** (`Teste QA Visual`,
`Teste Badge D2`, `TESTE`, `teste`, `Teste Coerencia`, `TESTE DANIEL`, …).
Dois deles têm oportunidade em `etapa = 'ganho'`, ou seja, **contam como venda
realizada**:

| Cliente | Veículo | Valor |
|---|---|---|
| TESTE DANIEL | TESTE DANIEL | R$ 100.000,00 |
| teste | teste | R$ 12.333,33 |
| | **Total** | **R$ 112.333,33** |

Esses valores entram em faturamento, ticket médio e volume de vendas das lojas
correspondentes. "TESTE DANIEL" aparece na lista de Vendas Fechadas da
MX CONSULTORIA marcado como **Vendida**, ao lado de vendas reais.

## O que é visível mas inerte

- `clientes_consultoria`: 4 registros de teste (`MX CONSULTORIA TESTE 6`, `TESTE 6`, …)
- `lojas`: 2 registros de teste
- Backlog editorial da Academy MX: 2 sugestões de smoke test
  (`Smoke sugestao desenvolvimento 1778881709747` e `…643888`), exibidas para
  curadoria ao lado de sugestões reais da rede
- Uma venda `TESTE CANCELAMENTO QA` (R$ 50.000) — cancelada, portanto já fora
  das métricas pela correção de `690d5cda`

## Por que não removi

Apagar dado de produção é irreversível e é decisão do dono da operação, não de
manutenção. Além disso, parte desses registros pode estar servindo de fixture
para testes automatizados que rodam contra produção — remover às cegas quebraria
a suíte sem aviso.

## O que decidir

1. Os dois clientes com venda ganha (`TESTE DANIEL`, `teste`) devem ser
   cancelados ou removidos? São R$ 112.333,33 de faturamento fantasma.
2. As sugestões de smoke da Academy saem do backlog editorial?
3. Se algum desses registros é fixture de teste, marcá-los explicitamente
   (flag ou prefixo reservado) para que as telas possam excluí-los, em vez de
   dependerem de ninguém reparar no nome.

## Nota de método

Esses registros só apareceram na varredura de tela — nenhuma suíte automatizada
os apontaria, porque para o sistema são dados válidos. É o oposto do bug de
código: aqui o código está certo e a base é que mente.
