# Baseline do Estado Atual — Mentor Comercial v1

Este documento registra o estado factual do banco de dados, dos catálogos de regras e da infraestrutura do **Mentor Comercial v1** no momento da implantação da linha de base.

---

## 1. Fonte da Verdade e Auditoria de Regras

- **Arquivo Fonte**: `Mentor_Comercial_Motor_Regras_v1.xlsx`
- **Hash SHA-256**: `3268de238076e64f0f0189e96033ea3c423c6afe93d276b700fe750915d7be8e`

### Inventário do Catálogo Extraído
- **Status Definitivos**: 86
- **Cadências Catalogadas**: 13
- **Passos de Cadência**: 57
- **Scripts de Abordagem**: 77
- **Transições Permitidas**: 52
- **Cenários de Teste**: 15
- **Canais de Comunicação**: 3
- **Integrações Ativas**: 18
- **Clientes de Teste Sintéticos**: 100

### Bloqueadores da Fonte (SOURCE_BLOCKERs)
Identificados 5 códigos de script referenciados pela planilha fonte mas sem definição textual correspondente:
1. `INT-Q07`
2. `INT-N04`
3. `POR-A04`
4. `CAR-C07`
5. `CAR-C08`

*Classificação*: Bloqueadores da fonte de dados (não representam defeito de implementação no código). O motor determinístico trata esses scripts defensivamente através do mapa de fallback `SOURCE_BLOCKED_STATUSES`.

---

## 2. Estado Factual do Banco de Dados (Supabase Produção)

- **Total de Clientes Cadastrados**: 554
- **Total de Oportunidades**: 562
  - **Oportunidades Ativas**: 355
  - **Oportunidades Encerradas**: 207
  - **Oportunidades Órfãs**: 0
- **Registros em `cadencia_estado_cliente`**: 239
- **Ações Executadas (`execution_actions`)**: 339
- **Eventos Registrados (`eventos_comerciais`)**: 1337

---

## 3. Integridade de Schema e Migration

- **Migration**: `20260807120000_mentor_comercial_schema.sql` aplicada em produção.
- **Caráter**: Aditivo, garantindo zero perda de dados nas tabelas existentes (`oportunidades`, `cadencia_estado_cliente`, `carteira_missao_itens`).
- **Tabelas de Catálogo Criadas**:
  - `mentor_status_definitions`
  - `mentor_cadences`
  - `mentor_cadence_steps`
  - `mentor_scripts`
  - `mentor_transitions`
  - `mentor_pending_flags`
  - `mentor_score_snapshots`
  - `store_commercial_settings`

---

## 4. Prova de Idempotência do Seed

O script de povoamento (`node scripts/mentor-rules-seed.mjs`) foi executado e testado 5 vezes consecutivas:
- **1ª Execução**: Inserção de 86 status, 13 cadências, 57 passos, 77 scripts e 52 transições.
- **2ª à 5ª Execuções**: +0 inserções e +0 alterações, confirmando operação 100% idempotente (`ON CONFLICT DO UPDATE / NOTHING`).

---

## 5. Mapeamento de Rotas e Navegação

- **Rota Canônica**: `/carteira-clientes`
- **Aliases Ativos**:
  - `/carteira`
  - `/vendedor/carteira`
  - `/mentor-comercial`
  - `/vendedor/mentor-comercial`
