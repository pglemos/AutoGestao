# Vendas que não entram em nenhum indicador oficial — 2026-08-26

## O ranking está certo

Levantei antes uma suspeita de divergência ("tela 228 × banco 274"). **Era
minha consulta que estava errada**: eu contava `data_evento` como competência, e
a metodologia proíbe isso explicitamente (`venda_competencia_canonica` só aceita
competência do evento, da oportunidade ou `sale_date`).

A decomposição fecha exata com o que a tela mostra:

| Passo | Vendas |
|---|---|
| Eventos `venda_realizada` no mês (contagem crua) | 274 |
| Com competência oficial | **235** |
| Menos canceladas | 232 |
| Após deduplicar por oportunidade | 232 |
| Na loja do vínculo ativo do vendedor | **228** ← Vendas Rede |

## Problema real 1 — 14% das vendas do mês estão sem competência

39 vendas de agosto não têm competência em lugar nenhum (nem no evento, nem na
oportunidade, nem `sale_date`). Como a competência é o que coloca a venda no
mês, elas **não entram no ranking, na meta, na comissão nem no realizado do
plano estratégico**. Não há erro visível: a venda existe no CRM e simplesmente
não conta.

| Mês do evento | Sem competência | Total | % |
|---|---:|---:|---:|
| 2026-08 | 38 | 273 | 13,9% |
| 2026-07 | 13 | 153 | 8,5% |
| 2026-06 | 6 | 12 | 50,0% |
| 2026-05 | 7 | 7 | 100% |

A tendência melhora (100% → 8,5% → 13,9%), o que sugere que o cadastro de
competência foi introduzido depois e ainda escapa em parte dos lançamentos.

**Não corrigi por conta própria.** Preencher competência muda ranking, meta
batida e comissão de vendedores reais — é decisão de negócio, não de código.
Dois caminhos, nesta ordem:

1. **Fechar a torneira:** tornar a competência obrigatória no fluxo que cria a
   venda, ou derivá-la de `sale_date`/`data_evento` no momento da gravação.
   Sem isso, o backfill vira rotina.
2. **Backfill do passivo:** decidir a regra (competência = `data_evento`?) e
   aplicar com recorte de período combinado, avisando as lojas afetadas — os
   números do mês vão mudar.

## Problema real 2 — 4 vendas descartadas por loja divergente

`useRanking` só conta a venda quando `sale.store_id` é igual à loja do vínculo
ativo do vendedor. 4 vendas do mês estão registradas numa loja diferente da do
vínculo atual e somem sem aviso. Nenhum vendedor tem vínculo múltiplo hoje, então
o caso é transferência de loja com venda antiga ficando para trás.

Vale decidir se a venda deve seguir a loja do evento (histórico correto) ou a do
vínculo (ranking da equipe atual). Hoje a regra é implícita e silenciosa.

---

## Decisões tomadas e aplicadas (2026-08-26)

O critério não foi opinião: a metodologia trata a competência como o mês em que
o fato aconteceu (no Base44, `competenceUtils` resolve o mês fechado M-1 do
plano). Venda sem competência não é uma categoria válida — é dado incompleto.

### 1. A torneira, no servidor

`atualizar_etapa_oportunidade_crm` só propagava competência quando alguém
informava (`IF v_competencia_efetiva IS NOT NULL`), e o CRM **nunca** informa:
`buildEventoComercialPayload` jamais teve `data_competencia`. Toda venda marcada
como ganha sem preenchimento manual nascia órfã.

A cadeia agora é: informada → `sale_date` → competência/`sale_date` da
oportunidade → **`data_evento`** → hoje. Nunca resulta em nulo. Ficou no
servidor de propósito: todo caminho de escrita passa por lá, não só o CRM.

### 2. O passivo: 117 vendas recuperadas

Backfill com a mesma regra. Não inventa dado — `data_evento` é a data real do
fato, já registrada. Concentração em VITRINE - TIROL (67 vendas em 8 meses),
AUTO UP, TREND AUTO e VITRINE - TIROL em agosto (10 cada).

Efeito medido em produção: **Vendas Rede de agosto passou de 228 para 268**.
Zero vendas órfãs no banco.

Comunicar às lojas afetadas: os números de meses anteriores mudaram para mais,
porque vendas reais que estavam invisíveis voltaram a contar. Ninguém perdeu
venda; houve recuperação de crédito que já era devido.

### 3. Venda não some mais em transferência

`useRanking` descartava a venda quando a loja do evento não era a do vínculo
atual — numa transferência de loja, a venda sumia de *todos* os rankings, sem
aviso. Agora a venda conta para quem a fez; o escopo de quem enxerga o quê já é
garantido pela RPC, que é `SECURITY DEFINER` com checagem de papel.

### 4. Um vocabulário só para `departamento`

`planos_acao_templates.departamento` convivia com `comercial` e `COMERCIAL` /
`PESSOAS_RH` / `PRODUTO_ESTOQUE` / `OPERACOES`. Venceu a categoria canônica
minúscula do app — é o que o wizard grava e o que a UI usa para agrupar. Antes
de aplicar, verifiquei que nenhuma função do banco filtra pelos literais
antigos. Cards e coluna Departamento conferidos em produção depois: inalterados.
