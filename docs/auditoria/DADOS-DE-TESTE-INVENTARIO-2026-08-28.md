# Inventário completo: dados de teste em produção — 2026-08-28

Extensão do achado de `dfd682ae`, agora com a base varrida por completo.

## Inventário

| Tabela · coluna | Total | Com marca de teste |
|---|---|---|
| `clientes.nome` | 1.063 | **12** |
| `oportunidades.veiculo_interesse` | 1.119 | **11** |
| `execution_actions.title` | 701 | **13** |
| `clientes_consultoria.name` | 54 | **2** |
| `lojas.name` | 53 | **1** |
| `usuarios.name` | 501 | 0 |
| `veiculos_estoque.modelo` | 19 | 0 |

## O pior caso: ações de rotina

`execution_actions` alimenta `routine_execution`, que é **25% da nota** em
`calculateManagerScore` e aparece na tela de cobrança do gerente.

Das 13 ações de teste, **8 estão em `pendente`**, várias vencidas —
`Atendimento - Teste QA Visual`, `Atendimento - JOSE TESTE` (×2),
`[TESTE QA] Fixture Rotina do Dia`, `Entrega - TESTE DANIEL`.

Ação aberta pesa contra o vendedor. Na MX CONSULTORIA:

- **37 ações abertas, 12 delas de teste — 32%**

| Vendedor | Abertas | De teste |
|---|---|---|
| Vendedor MX | 11 | **8** (73%) |
| José | 2 | **2** (100%) |
| DANIEL SANTOS | 12 | 1 |
| JOSÉ | 9 | 1 |
| MARIANE | 3 | 0 |

Isso é pior que o faturamento fantasma de R$ 112.333,33 já reportado: aquilo
inflava um número, isto **penaliza a nota de pessoas reais**. DANIEL SANTOS e
JOSÉ carregam uma pendência fabricada cada um.

## Achado lateral: dois "José" na mesma loja

A contagem por vendedor devolveu `JOSÉ` (9 abertas) e `José` (2 abertas) como
usuários distintos na MX CONSULTORIA. Pode ser duplicata de cadastro — vale
conferir antes de qualquer limpeza, porque afeta rateio de meta e ranking.

## O que NÃO fiz

Não apaguei nada. Apagar dado de produção é irreversível, é decisão do dono da
operação, e parte desses registros pode ser fixture de teste automatizado —
remover às cegas quebraria a suíte sem aviso.

## O que decidir

1. As 8 ações de teste em aberto podem ser concluídas ou removidas? São a
   correção de maior efeito imediato: devolvem a nota de rotina de quem está
   sendo penalizado sem motivo.
2. Os 2 clientes com venda ganha (R$ 112.333,33) saem das métricas?
3. `JOSÉ` e `José` são a mesma pessoa?
4. Para o futuro: fixture de teste precisa de marca estrutural (coluna `is_fixture`
   ou prefixo reservado), não de convenção no nome. Hoje só se distingue lendo.
