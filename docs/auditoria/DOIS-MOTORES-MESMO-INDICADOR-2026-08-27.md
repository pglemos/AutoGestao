# Dois motores calculam os mesmos 19 indicadores de fontes diferentes — 2026-08-27

Fui atrás dos indicadores do cockpit sem fonte. Achei um problema maior:
**metade do catálogo é calculada duas vezes, por motores distintos, a partir
de tabelas distintas.**

## Os dois motores

| | `src/lib/central-mx-engine.ts` | `src/lib/consultoria/pmr-engine.ts` |
|---|---|---|
| Chave | `storeId` | `clientId` |
| Fontes | `eventos_comerciais`, `veiculos_estoque`, DRE da loja | `snapshots_estoque_consultoria`, `financeiro_consultoria`, `marketing_mensal_consultoria` |
| Consome | cockpit do Dono | módulo de consultoria (Admin MX) |
| Códigos | 24 dos 45 | 32 dos 45 |

Os dois usam **o mesmo vocabulário de códigos** do catálogo oficial.

## Os 19 códigos calculados nos dois

```
active_stock                appointment_to_visit_rate   appointments
appointments_per_sale       avg_leads_per_seller        avg_margin
avg_sales_per_seller        avg_stock_price             lead_to_appointment_rate
leads_received              net_profit                  sales_door_flow
sales_internet              sales_total                 seller_count
stock_over_90_rate          stock_total                 visit_to_sale_rate
visits
```

Nada garante que os dois cheguem ao mesmo número. `stock_total` sai de
`veiculos_estoque` num lado e de `snapshots_estoque_consultoria.total_stock`
no outro; `avg_margin` sai do DRE da loja num lado e do
`financeiro_consultoria` no outro. São coletas diferentes, em periodicidades
diferentes.

**O risco não é dado faltando — é o mesmo indicador oficial exibir dois
valores diferentes em duas telas, ambos com cara de oficial.** Não comparei
os valores em produção: exige as duas pontas populadas para a mesma loja e o
vínculo `consulting_clients.primary_store_id` preenchido.

## Uma contradição já visível no código

`useSalesByChannel.ts` documenta que `carteira` **não** pode ser dividida
entre empresa e vendedor, porque o evento não distingue as duas — e por isso
deixa `sales_company_wallet` e `sales_seller_wallet` sem realizado.

O `pmr-engine` divide as duas, por "channel/media classification".

Um dos dois está errado. Não sei qual, e chutar aqui produziria exatamente o
número plausível e errado que esta auditoria vem removendo.

## Os 9 que o cockpit não tem e o pmr-engine já calcula

| Código | Fonte no pmr-engine |
|---|---|
| `internet_investment` | `marketing_mensal_consultoria.investment` |
| `internet_cost_per_sale` | `internet_investment / sales_internet` |
| `preparation_cost` | `financeiro_consultoria.prep_cost_per_car` |
| `post_sale_cost` | `financeiro_consultoria.posvenda_per_car` |
| `stock_turnover` | `sales_total / stock_total` |
| `sales_company_wallet` | classificação de canal |
| `sales_seller_wallet` | classificação de canal |
| `sales_referral` | classificação de canal |
| `sales_other` | classificação de canal |

**Não liguei nenhum.** Puxar essas tabelas para o cockpit da loja exige a
ponte `client_id → primary_store_id`, e criaria um terceiro caminho de
cálculo para códigos que já têm dois. A decisão que falta é anterior:
qual motor é a fonte da verdade.

## Os 11 sem fonte em nenhum dos dois

```
additional_revenue      approved_credit_applications  content_quality
contribution_margin     google_rating                 instagram_followers
inventory_average_margin  paid_credit_applications    total_expense
trade_in_volume         vehicles_appraised
```

Confirmado por schema em dois casos:

- `veiculos_estoque` tem `preco`, mas **não tem custo** — `inventory_average_margin`
  é incalculável a partir dela.
- Não há tabela de avaliação de usado nem flag de financiamento na venda —
  `vehicles_appraised`, `trade_in_volume` e as fichas de crédito não têm origem.

Marketing (`instagram_followers`, `google_rating`, `content_quality`) é
`COMPANY_ONLY` por política: entrada manual, não derivável.

## Nota sobre `avg_stock_price`

A dúvida que eu tinha levantado — se `Ticket Médio do Estoque` deveria ler
valor de venda em vez de preço de estoque — tem resposta parcial: em
`veiculos_estoque` só existe `preco`. Ler outra coisa a partir dessa tabela
não é possível.

`itens_estoque_consultoria`, do outro motor, tem `purchase_value`,
`sale_price` e `preparation_expenses`. A pergunta continua aberta, mas agora
se sabe onde estaria a resposta — e que ela vive do outro lado da ponte.

## O que precisa ser decidido (não é manutenção)

1. Qual motor é a fonte da verdade para os 19 códigos duplicados.
2. Se `carteira` se divide entre empresa e vendedor — e por qual regra.
3. Se a ponte `client_id → primary_store_id` é confiável o bastante para o
   cockpit da loja ler as tabelas de consultoria.

Enquanto isso não for decidido, ligar mais indicadores aumenta a superfície
de divergência em vez de reduzir a de lacuna.

---

# Verificação em produção — 2026-08-27

Contei as linhas em produção, autenticado como Admin MX, em vez de deixar a
divergência no plano teórico.

## As fontes do `pmr-engine` estão vazias

| Tabela | Linhas |
|---|---|
| `snapshots_estoque_consultoria` | **0** |
| `itens_estoque_consultoria` | **0** |
| `marketing_mensal_consultoria` | **0** |
| `financeiro_consultoria` | **1** |
| `clientes_consultoria` | 54 |

A única linha de `financeiro_consultoria` é fixture: `revenue: 0`,
`fixed_expenses: 0`, `marketing_expenses: 0` e `net_profit: 50000` — números
que não fecham entre si.

**Isso responde a pergunta "qual motor é a fonte da verdade" na prática.** Hoje
o `pmr-engine` não produz número nenhum, porque não há o que ler. A divergência
entre os 19 códigos duplicados é um risco latente, não um defeito ativo.

E reenquadra os 9 indicadores que eu não liguei: ligá-los às tabelas de
consultoria não traria dado, traria os mesmos vazios por um caminho mais longo.
Foi certo não ligar, mas pelo motivo errado — não é só ordem de decisão, é que
a coleta de consultoria nunca aconteceu.

## Uma suspeita minha que não se confirmou

Vi 1.676 dos 2.778 eventos sem `data_competencia` e suspeitei que
`useSalesByChannel`, que filtra por esse campo, estivesse contando sobre uma
fração dos dados.

Fui medir por tipo de evento. Não procede:

```
venda_realizada  total 555 · sem data_competencia 1 · com 554
```

Os nulos estão concentrados em tipos que essa consulta não lê (agendamentos,
oportunidades). O caminho de vendas do cockpit está íntegro.

## O que os números mostram de fato

**`pos_venda_realizado`: 0 linhas.** O indicador que liguei hoje está correto e
sem dado — vai exibir vazio até a operação começar a registrar pós-venda. Não é
defeito, mas convém saber antes de procurar bug na tela.

**48 vendas sem canal**, de 554 com competência:

| Canal | Vendas |
|---|---|
| `internet` | 250 |
| `carteira` | 149 |
| `showroom` | 103 |
| `porta` | 4 |
| *(nulo)* | **48** |

Essas 48 não aparecem em nenhum indicador de origem de venda. O catálogo tem
`sales_other` (“Vendas - Outros”), hoje sem realizado, que seria o lugar delas.

Não liguei: canal nulo significa **não registrado**, e “Outros” significa **um
canal que não é os quatro**. Tratar um como o outro seria decidir, no código,
uma questão de operação. Se a MX definir que canal ausente conta como Outros, é
uma linha.

**`veiculos_estoque`: 19 veículos em 5 lojas**, de 53 lojas cadastradas. Os
indicadores de estoque do cockpit são reais, mas cobrem uma fração da rede.
