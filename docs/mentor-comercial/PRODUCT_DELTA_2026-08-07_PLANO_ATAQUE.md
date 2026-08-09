# PRODUCT DELTA — Plano de Ataque, Campanhas e Veículos (2026-08-07)

Registro dos requisitos de mudança para a carteira Base44 com foco em campanhas
direcionadas (troca e financiamento), cadastro de veículos com catálogo de modelos
e relatório de cobertura de dados. Requisitos numerados; nenhum requisito fora
deste documento é válido.

---

## 1. Registro e escopo

- Estado de partida: motor mentor-comercial v1 implantado (§93 auditoria, `7481930a`).
- Superfície afetada: `PlanoAtaqueTab`, `VeiculosChegaram`, `carteira_missoes` /
  `carteira_missao_itens`, `carteira_campanhas`, `veiculos_estoque`, `oportunidades`,
  mapper da carteira, observabilidade mentor.
- Princípios inalterados: motor determinístico puro em `src/features/mentor-comercial/engine/`,
  mudanças aditivas no schema, evidência antes de afirmação, rastreabilidade por seção.

## 2. Correção de elegibilidade por tipo de campanha (bug §4)

- §4.1 `startMissionEligibility` em `src/lib/base44/client-mutations.ts` seleciona
  clientes por `ativo` sem considerar o tipo da campanha. Corrigir para consultar o
  motor de elegibilidade.
- §4.2 Campo `tipo` em `carteira_campanhas` passa a ser somente metadado humano; a
  seleção real de clientes é definida por `targeting_kind` + `targeting_config`.

## 3. Schema — aditivo e versionado

- §5.1 `carteira_campanhas`: adicionar `targeting_kind` (enum: `carteira` |
  `trade_interest` | `financing` | `vehicle_match`) e `targeting_config jsonb`
  (parâmetros do público). Migração aditiva; valores nulos preservam comportamento
  legado (`carteira`).
- §5.2 `carteira_missao_itens`: adicionar `opportunity_id uuid` e
  `eligibility_reason jsonb` (snapshot do motivo da elegibilidade).
- §9 `vehicle_model_catalog` (nova tabela): modelo mestre de veículos com
  `brand`, `model`, `aliases`, `category` (reusa enum `crm_categoria_veiculo`),
  `vehicle_type`, `year_from`/`year_to`, `market`, `active`, `source`,
  `source_version`, `created_at`, `updated_at`. Seed inicial curado manualmente
  (categoria das montadoras, público) — não usar os cinco exemplos do delta como
  catálogo completo.
- §13 Origem da classificação: coluna `classification_source` em
  `veiculos_estoque` e `oportunidades` (`catalog` | `manual` | `migration`).
- §15 `veiculos_estoque`: adicionar `catalog_model_id` (FK) e
  `classification_source`. A coluna `categoria` já existe e passa a ser
  preenchida pelo catálogo quando resolvido.
- §17 `oportunidades`: preservar o texto original de `veiculo_interesse` /
  `veiculo_troca`; nunca sobrescrever com valor inventado. Adicionar
  `preco_interesse_min` / `preco_interesse_max` (numéricos) e
  `catalog_model_id`.

## 4. Motor de elegibilidade (campanhas)

- §7.1 Públicos por `targeting_kind`:
  - `carteira`: toda a carteira ativa (comportamento legado).
  - `trade_interest`: evidência de interesse em troca — família Troca
    (TR-01..TR-09), status REL-04/05/06 (Troca potencial), flag pendente
    `trade_interest`, ou `opportunity.trade_interest = true`. Sinais novos
    (`trade_interest`) têm prioridade sobre legado (migração) — nunca misturar
    no mesmo cliente; não inventar sinal.
  - `financing`: evidência de financiamento — família Financiamento
    (FIN-01..FIN-09), flag pendente `financing_interest`, ou
    `opportunity.financing_interest = true`.
  - `vehicle_match`: usa o motor de match de veículos (§11).
- §7.2 Segmentos de financiamento (subset de FIN-01..FIN-09), selecionáveis em
  `targeting_config.segment`:
  - `all`: FIN-01..FIN-09.
  - `approved`: FIN-06 (aprovado sem fechamento).
  - `approved_with_conditions`: FIN-07 (aprovado com condição diferente).
  - `rejected`: FIN-08 (recusado).
  - `pending`: FIN-03, FIN-04, FIN-05 (pendência de documentos, ficha em
    análise, pendência financeira).
  - `new_simulation`: FIN-09 (nova simulação).
- §7.3 Exclusões obrigatórias (precedência máxima): `do_not_contact` e venda
  fechada (família Venda e Entrega VEN-01..VEN-07 com `closed_at`, ou
  `sale_date` presente).
- §7.4 Retorno determinístico: `{ eligible, reasons, sourceOpportunityId }`.

## 5. Correção de matching de veículos (bug §19)

- §19.1 `VeiculosChegaram` usa substring normalizada (`marca`, `modelo`,
  `versao`, `ano` dentro de `veiculo_interesse`) sem catálogo. Substituir por
  match via `vehicle_model_catalog` + categoria + faixa de preço.
- §19.2 Regras de match (`resolveVehicleOpportunityMatch`), OR entre critérios
  explícitos, nunca inventar critério:
  - modelo exato (resolvido via catálogo, incluindo alias);
  - categoria igual;
  - faixa de preço `[preco_interesse_min, preco_interesse_max]` (limite superior
    aberto quando sem max).
- §19.3 Múltiplas oportunidades compatíveis: todas retornadas, ordenadas por
  prioridade (preço dentro da faixa com menor diferença primeiro).
- §19.4 Retorno determinístico `{ matches, reasons, unresolved }`.

## 6. Catálogo de modelos

- §9.1 Normalização determinística: NFC→NFD, lowercase, hífen→espaço; match por
  nome exato ou alias; ambíguo retorna `null` com motivo `ambiguous`.
- §9.2 Fonte e versão registradas (source/source_version); seed curado com a
  classificação oficial de categoria (público), não inventada.
- §9.3 Resolução de modelo: `resolveCatalogModel(text, catalog)` → modelo ou
  `null`; ambiguidade nunca escolhe um modelo por adivinhação.

## 7. UI Plano de Ataque

- §22.1 Formulário de campanha: seletor de `targeting_kind` + `targeting_config`
  (segmento para financiamento).
- §22.2 Contagem de elegíveis exibida na criação da campanha (prévia) e no card
  da campanha.
- §22.3 Itens de missão criados via motor de elegibilidade, com
  `opportunity_id` e snapshot `eligibility_reason`; sem oportunidade, `cliente_id`
  + motivo de elegibilidade não vinculado.
- §27 Dedupe de missão por `(missao_id, opportunity_id)` — índice único parcial;
  nunca duplicar o mesmo cliente com a mesma oportunidade na mesma missão.

## 8. UI Cadastro de Veículos (Veículos que Chegaram)

- §24.1 Cadastro com catálogo: autocomplete marca/modelo vindo do
  `vehicle_model_catalog`, categoria preenchida automaticamente, origem da
  classificação gravada (`catalog` | `manual`).
- §24.2 Match de estoque × oportunidades exibe as razões de compatibilidade
  (modelo/categoria/faixa) para o vendedor.

## 9. Migração de dados (script + relatório)

- §36 Relatório de cobertura (script idempotente, roda quantas vezes precisar):
  - total de itens, já classificados, classificáveis automaticamente, não
    classificáveis (motivo), ambiguidades;
  - estoque e oportunidades em separado;
  - escrita somente de classificações inequívocas (`classification_source =
    'migration'`); textos originais preservados;
  - relatório em markdown em `docs/mentor-comercial/`.

## 10. Observabilidade

- §34 Eventos novos no `mentorTelemetry`:
  - `campaign_eligibility` (campanha, público, elegíveis/avaliados);
  - `vehicle_match` (veículo, oportunidades compatíveis);
  - `catalog_unresolved` (texto sem correspondência no catálogo);
  - `catalog_ambiguous` (texto com múltiplas correspondências);
  - `mission_created` (missão, itens, origem).
- Dados sanitizados (sem PII), contexto `{ etapa, motivo }`.

## 11. Qualidade e definição de pronto

- §38 Gates obrigatórios: `bun test`, `npm run lint` (tsc + eslint + linters),
  `npm run build`; checklist e file list atualizados no artefato de fechamento.
- §40 Nenhuma alteração de schema fora de migration versionada; nenhuma regra de
  negócio fora dos motores puros.
