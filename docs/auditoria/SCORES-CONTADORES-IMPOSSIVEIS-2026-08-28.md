# `/scores` mostra dois contadores que nunca podem subir — 2026-08-28

## O que a tela promete

`Scores e Alertas` — *"Monitore a saúde da plataforma, faixas de consistência e
alertas operacionais por cliente."* Exibe quatro contadores:

| Contador | Legenda | Valor hoje |
|---|---|---|
| Críticos Ativos | Exigem ação imediata | **0** |
| Atenção Ativos | Desvios operacionais detectados | 0 |
| Alertas Positivos | Metas e marcos atingidos | 0 |
| Consultivos | Sugestões de melhoria | **0** |

E uma seção "Escala de Score MX (0 a 100)" com a fórmula
`Consistência = Rotina × 70% + Disciplina × 30%`.

## O que a tela faz

`AdminScoresAlertasPage.tsx` deriva os alertas no cliente, a partir de
`clientes_consultoria.status`, com **duas regras**:

- `rascunho` ou `em_configuracao` → `ATENCAO` ("Onboarding em aberto")
- `pronto_para_ativar` → `POSITIVO` ("Pronto para Ativação")

Nenhum caminho de código produz `CRITICO` ou `CONSULTIVO`. Os dois contadores
existem no tipo (`type AlertType`) e na contagem (linhas 115–118), mas nada os
alimenta.

E nenhum score é calculado na página: as cinco ocorrências de "score" no
arquivo estão todas no texto da legenda. A fórmula é decorativa.

## Por que isso é pior que um número errado

"Críticos Ativos: 0 — exigem ação imediata" lê-se como **"verifiquei e não há
nada crítico"**. O que acontece de verdade é que esse contador não tem como
contar. É um farol verde permanente, e a pessoa que confia nele não tem como
saber que ele nunca vai ficar vermelho.

O comentário no próprio arquivo já registra parte do problema:

> não há tabela de alertas de consultoria: a `alerts` do banco é operacional
> (loja/vendedor) e pertence a outro escopo.

## Por que não mexi

Trocar os dois contadores por "—" seria honesto, mas decidir se `CRITICO` e
`CONSULTIVO` **devem** existir — e com quais regras — é decisão de produto, não
de manutenção. Podem ser espaço reservado para regras planejadas.

## O que decidir

1. As regras de `CRITICO` e `CONSULTIVO` vão existir? Se sim, quais.
2. Se não vão, os dois contadores saem da tela.
3. A "Escala de Score MX" descreve uma fórmula que a página não calcula —
   ligar o cálculo ou tirar a seção.

Enquanto ficar como está, o mais seguro é ler `/scores` como uma lista de
pendências de cadastro, que é o que ela realmente é.
