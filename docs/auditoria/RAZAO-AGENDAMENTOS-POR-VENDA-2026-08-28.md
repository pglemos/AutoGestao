# A meta diária de agendamentos do gerente vem de uma razão sem piso amostral — 2026-08-28

## O que aparece na tela

Home do gerente da MX CONSULTORIA, 28/08/2026:

```
Razão oficial: 1 venda a cada 16 agendamentos
META DE AGENDAMENTOS PARA HOJE: 160 agendamentos
GAP DE AGENDAMENTOS: -160
```

160 agendamentos em um dia, para uma loja com 4 vendedores — 40 por vendedor.
No horizonte "esta dezena" o mesmo plano pede **624**.

E o cockpit do Dono, para a mesma loja, mostra "Volume de Agendamentos por
Venda: **2,4**". Dois números para o mesmo conceito, na mesma loja.

## A causa

`store_target_plans.appointments_per_sale` é calculado no servidor
(`20260824173308_fix_ranking_canonical_sales_dedup.sql`, e nas migrations
anteriores da mesma família):

```sql
IF history_sales_value > 0 AND history_appointments_value > 0 THEN
  appointments_per_sale_value := history_appointments_value / history_sales_value;
  operational_basis_value := 'historico_30_dias_agendamentos';
```

A única guarda é contra zero. **Não há piso de amostra nem limite de
plausibilidade.** Com 1 venda em 30 dias e 16 agendamentos, a razão é 16 — e
`operational_need = required_sales × 16`.

## O alcance, medido em produção

Dos 53 planos de hoje:

| Faixa | Lojas |
|---|---|
| razão ≥ 1 | 38 |
| razão < 1 | **15** |

Extremos observados: **0,0417** (1 venda a cada 0,04 agendamento) e **16**.
São 384× de distância entre as pontas, para a mesma grandeza operacional.

O efeito é simétrico e igualmente inútil nos dois lados:

| Loja | Precisa vender | Razão | Meta de agendamentos do dia |
|---|---|---|---|
| `467a19d1` | 10 | 16 | **160** |
| `9c6ee5df` | 9 | 3,67 | 34 |
| `172def40` | 4 | 0,0909 | **1** |

A loja que precisa de 4 vendas recebe meta de **1 agendamento**. A que precisa
de 10 recebe **160**. Nenhuma das duas metas é acionável.

## Por que não corrigi agora

Duas razões, ambas deliberadas:

1. A correção é uma migration em produção, e não aplico migration sem
   acompanhamento.
2. O limite plausível da razão é decisão de metodologia, não de engenharia.
   O código tem `AGENDAMENTOS_POR_VENDA = 3` como fallback, e os benchmarks
   oficiais (60% agendamento→visita, 33% visita→venda) implicam ~5. Escolher
   entre 3, 5 ou uma faixa é chamada da MX.

O que **é** engenharia, e vale registrar como recomendação: uma razão apurada
sobre 1 venda não é estatística. O piso de amostra deveria existir
independentemente do valor escolhido, e o caminho de degradação já está pronto
na interface — `appointmentsPerSale === null` já renderiza "Regra oficial
indisponível". Sem amostra, essa é a saída honesta; hoje o sistema publica um
número no lugar dela.

## O que decidir

1. Qual o piso de vendas no histórico para a razão ser publicada.
2. Qual a faixa plausível fora da qual a razão é descartada.
3. Se, sem amostra suficiente, cai no fallback declarado (3) ou fica indisponível.
