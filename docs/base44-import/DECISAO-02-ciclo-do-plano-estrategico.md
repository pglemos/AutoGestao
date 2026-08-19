# Decisão 02 — `planejamentos_estrategicos` não é o ciclo do plano

**Data:** 2026-08-19
**Pergunta:** onde mora o ciclo de vida do plano estratégico (criar → validar → publicar → revisar), que o GAP-01 apontou como ausente?

## `planejamentos_estrategicos` é outra coisa
Colunas: `title`, `diagnosis_summary`, `market_comparison`, `generated_payload`, `generated_at`, `generated_by`, `period_start`, `period_end`, `status`.
Uso: `src/hooks/useConsultingStrategicPlan.ts`, junto de `artefatos_gerados_consultoria`.
Dado em produção: 1 linha, `status = 'draft'`, título "Planejamento PMR - 18/04/2026", com diagnóstico e payload preenchidos e período nulo.

É o **documento de diagnóstico gerado** — um artefato com texto, comparação de mercado e payload. Não é o ciclo de metas por indicador.

Reaproveitá-la como ciclo misturaria duas coisas de tempos de vida diferentes: um cliente tem vários diagnósticos gerados ao longo do ano, e um único ciclo de metas por ano. `status` significaria coisas distintas conforme a linha, e `generated_payload` ficaria órfão nas linhas de ciclo.

## Onde as metas realmente vivem
`valores_indicadores_planejamento` (`loja_id`, `indicator_code`, `year`, `month`, `meta`, `realizado`, `ano_anterior`) — sem status, sem noção de publicação, chaveada por **loja**, não por cliente.

Ou seja: existe o valor, não existe o ciclo. Não há como responder "este plano está publicado?" nem "quem publicou e quando?".

## Desenho mínimo do ciclo
Uma tabela nova, por cliente e ano:

| coluna | razão |
|---|---|
| `client_id`, `year` | o ciclo é do cliente, não da loja — é o que permite consolidar as unidades |
| `status` | `rascunho` → `em_validacao` → `publicado` → `revisado` |
| `published_at`, `published_by` | publicar é o ato que torna a meta oficial para o Dono |
| `package_version_id` | congela qual versão do pacote gerou o roster, para detectar desalinhamento depois |
| único por (`client_id`, `year`) | dois ciclos do mesmo ano é o defeito que `reconcileDuplicated*` existe para limpar no Base44 |

`valores_indicadores_planejamento` continua por loja e ganha referência ao ciclo. A consolidação já sabe juntar as unidades.

## Por que não criei a tabela agora
Criar tabela em produção sem nenhum consumidor é dívida com aparência de progresso. O ciclo só tem valor junto das operações que o movem e da tela que o mostra — e isso é um bloco grande, não um acréscimo.

O que fica decidido e registrado: **não é para pendurar o ciclo em `planejamentos_estrategicos`**. Quem for implementar começa por uma tabela própria.
