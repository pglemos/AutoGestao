# Ações de execução órfãs: responsável fora do roster da loja — 2026-08-28

## A hipótese que caiu

Em `909fdfe9` reportei `JOSÉ` e `José` como possível duplicata de cadastro na
MX CONSULTORIA. **Estava errado**, e a verificação mostrou algo diferente:

- `MARIANE` é vendedora da loja; `Mariane` (`marianedcs@gmail.com`) é
  **administradora geral** — pessoas distintas, nomes parecidos.
- O segundo `José` (`joseroberto20161@gmail.com`) é **administrador geral sem
  nenhum vínculo** com a MX CONSULTORIA.

Não há duplicata. Há responsável fora da equipe.

## O achado real

Varredura da rede sobre `execution_actions`, comparando `seller_id` com o
roster ativo (`vendedores_loja` da própria loja):

- **19 ações** têm responsável que não está no roster ativo daquela loja
- **8 dessas estão abertas**

| Responsável | Papel | Ações abertas |
|---|---|---|
| JOSIEL DE OLIVEIRA CARVALHO | vendedor | 3 |
| BRENO DE CARVALHO DORNAS CRUZ DE SOUZA | vendedor | 2 |
| LUCAS MOURA | vendedor | 1 |
| José | administrador_geral | 2 |

## Por que importa

Seis das oito são de **vendedores reais** que saíram do roster ativo — saída da
loja, desligamento ou desativação do vínculo — e ficaram com ação em aberto.

O efeito é uma zona cega: a tela de equipe do gerente monta a lista a partir do
roster, então essas ações **não aparecem para ninguém**. Mas consultas em nível
de loja (`execution_actions` por `store_id`) continuam contando. A ação existe,
pesa no total da loja, e não tem dono visível para resolvê-la.

As duas do `José` são outro caso: pendências vencidas desde 08/08 atribuídas a
um administrador geral, num contexto de loja onde ele não é vendedor.

## O que NÃO fiz

Não mexi. Reatribuir ou encerrar ação é operação de negócio, e nem toda saída
de roster significa que a pendência deixou de valer — pode precisar ir para
outro vendedor em vez de sumir.

## O que decidir

1. Quando um vendedor sai do roster, o que acontece com as ações abertas dele —
   reatribuir ao gerente, encerrar, ou manter?
2. Administrador geral pode ser responsável por ação de execução de loja? Se
   não, as duas do `José` estão mal atribuídas na origem.
3. Vale um alerta operacional para "ação aberta sem responsável no roster" —
   hoje ela só é encontrada por consulta direta ao banco.
