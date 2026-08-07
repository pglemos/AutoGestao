# Matriz de Rastreabilidade de Regras — Mentor Comercial V1

Documento de rastreabilidade entre as regras de negocio declaradas nos arquivos JSON fonte (`rules/mentor-comercial/v1/*.json`), o esquema PostgreSQL da migração (`supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql`), a implementação no motor determinístico em TypeScript (`src/features/mentor-comercial/engine/*.ts`), a suite de testes de unidade/aceitacao e os mecanismos de observabilidade.

---

## Visão Geral do Mapeamento

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `02 Status` | Catálogo de Status (86) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Hash `source_sha256`, `rule_version`, auditoria de status |
| `03 Cadências` | Catálogo de Cadências (13) | `mentor_cadences`, `cadencia_estado_cliente` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts`, `src/features/mentor-comercial/engine/source-conformance.test.ts` | Estado da cadência (`active`/`interrupted`/`completed`), `source_sha256` |
| `04 Passos_Cadência` | Passos de Cadência (57) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts`, `src/features/mentor-comercial/engine/source-conformance.test.ts` | Invariante de tentativa única pendente, ordenação por offset |
| `05 Scripts` | Biblioteca de Scripts (77) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts`, `src/features/mentor-comercial/engine/source-conformance.test.ts` | Renderer estrito (bloqueia envio se faltar variável), `source_sha256` |
| `06 Transições` | Matriz de Transições (52) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/source-conformance.test.ts` | Sinal `transition_not_found`, flag `requiresManualUpdate` |
| `11 Testes_Cenários` | Cenarios de Aceitacao (15) | `mentor_status_definitions`, `oportunidades`, `cadencia_estado_cliente` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Snapshots de score em `mentor_score_snapshots`, observabilidade de SLA |

---

## 1. Status (86)

Fonte: `rules/mentor-comercial/v1/statuses.json` (Aba `02 Status`).
Contagem real: 86 registros agrupados por família.

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `02 Status` | Família Contato (11 status: INT-C01 a CAR-C05) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Qualificação (9 status: INT-Q01 a CAR-C06) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Visita (10 status: INT-V01 a POR-A02) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Negociação (14 status: INT-N01 a POR-A04) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Relacionamento (11 status: CAR-C07 a REL-09) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Troca (9 status: TR-01 a TR-09) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Financiamento (9 status: FIN-01 a FIN-09) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Venda e Entrega (7 status: VEN-01 a VEN-07) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |
| `02 Status` | Família Perda e Futuro (6 status: PER-01 a PER-06) | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/source-conformance.test.ts` | `source_sha256`, indice único por `(rule_version, status_code)` |

### Detalhamento das Famílias e Faixas de IDs

- **Família Contato** (11 registros): Faixa `INT-C01` ate `CAR-C05`
  - IDs: `INT-C01`, `INT-C02`, `INT-C03`, `INT-C04`, `INT-C05`, `INT-C06`, `CAR-C01`, `CAR-C02`, `CAR-C03`, `CAR-C04`, `CAR-C05`
- **Família Qualificação** (9 registros): Faixa `INT-Q01` ate `CAR-C06`
  - IDs: `INT-Q01`, `INT-Q02`, `INT-Q03`, `INT-Q04`, `INT-Q05`, `INT-Q06`, `INT-Q07`, `INT-Q08`, `CAR-C06`
- **Família Visita** (10 registros): Faixa `INT-V01` ate `POR-A02`
  - IDs: `INT-V01`, `INT-V02`, `INT-V03`, `INT-V04`, `INT-V05`, `INT-V06`, `INT-V07`, `INT-V08`, `POR-A01`, `POR-A02`
- **Família Negociação** (14 registros): Faixa `INT-N01` ate `POR-A04`
  - IDs: `INT-N01`, `INT-N02`, `INT-N03`, `INT-N04`, `INT-N05`, `INT-N06`, `INT-N07`, `INT-N08`, `INT-N09`, `INT-N10`, `INT-N11`, `INT-N12`, `POR-A03`, `POR-A04`
- **Família Relacionamento** (11 registros): Faixa `CAR-C07` ate `REL-09`
  - IDs: `CAR-C07`, `CAR-C08`, `REL-01`, `REL-02`, `REL-03`, `REL-04`, `REL-05`, `REL-06`, `REL-07`, `REL-08`, `REL-09`
- **Família Troca** (9 registros): Faixa `TR-01` ate `TR-09`
  - IDs: `TR-01`, `TR-02`, `TR-03`, `TR-04`, `TR-05`, `TR-06`, `TR-07`, `TR-08`, `TR-09`
- **Família Financiamento** (9 registros): Faixa `FIN-01` ate `FIN-09`
  - IDs: `FIN-01`, `FIN-02`, `FIN-03`, `FIN-04`, `FIN-05`, `FIN-06`, `FIN-07`, `FIN-08`, `FIN-09`
- **Família Venda e Entrega** (7 registros): Faixa `VEN-01` ate `VEN-07`
  - IDs: `VEN-01`, `VEN-02`, `VEN-03`, `VEN-04`, `VEN-05`, `VEN-06`, `VEN-07`
- **Família Perda e Futuro** (6 registros): Faixa `PER-01` ate `PER-06`
  - IDs: `PER-01`, `PER-02`, `PER-03`, `PER-04`, `PER-05`, `PER-06`

---

## 2. Cadências (13)

Fonte: `rules/mentor-comercial/v1/cadences.json` (Aba `03 Cadências`).
Contagem real: 13 cadências.

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `03 Cadências` | CAD-01 — Iniciar conversa em 14 dias (6 passos; padrao: D0, D+1, D+2, D+3, D+7, D+13) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-02 — Gerar visita em 21 dias (6 passos; padrao: D0, D+2, D+8, D+11, D+16, D+20) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-03 — Recuperar negociação em 60 dias (6 passos; padrao: D0, D+3, D+9, D+19, D+29, D+59) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-04 — Completar qualificação em 7 dias (4 passos; padrao: D0, D+1, D+3, D+7) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-05 — Definir data da visita em 7 dias (4 passos; padrao: D0, D+1, D+3, D+7) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-06 — Confirmar visita (3 passos; padrao: D-2, D-1, D0) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-07 — Recuperar não comparecimento (5 passos; padrao: D0, D+1, D+3, D+7, D+14) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-08 — Pendência comercial em 7 dias (4 passos; padrao: D0, D+1, D+3, D+7) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-09 — Converter financiamento aprovado (4 passos; padrao: D0, D+1, D+3, D+7) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-10 — Aguardar decisão de terceiro (5 passos; padrao: D0, D+2, D+5, D+10, D+14) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-11 — Verificação interna (3 passos; padrao: Todo dia útil ou a cada 2 dias úteis) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-12 — Contato futuro (1 passos; padrao: Data programada) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |
| `03 Cadências` | CAD-13 — Pós-venda (6 passos; padrao: D+7, D+30, D+180, 12m, 18m, 24m) | `mentor_cadences` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Rastreio em `cadencia_estado_cliente` (`active`/`interrupted`/`completed`) |

---

## 3. Passos de cadência (57)

Fonte: `rules/mentor-comercial/v1/cadence-steps.json` (Aba `04 Passos_Cadência`).
Contagem real: 57 passos resumidos por cadência.

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `04 Passos_Cadência` | Passos de CAD-01 (6 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+2, D+3, D+7, D+13`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-02 (6 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+2, D+8, D+11, D+16, D+20`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-03 (6 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+3, D+9, D+19, D+29, D+59`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-04 (4 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+3, D+7`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-05 (4 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+3, D+7`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-06 (3 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D-2, D-1, D0`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-07 (5 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+3, D+7, D+14`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-08 (4 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+3, D+7`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-09 (4 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+1, D+3, D+7`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-10 (5 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D0, D+2, D+5, D+10, D+14`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-11 (3 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `Dia útil, Próximo dia útil, Configuração`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-12 (1 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `Data programada`. Garantia de tentativa única pendente. |
| `04 Passos_Cadência` | Passos de CAD-13 (6 passos) | `mentor_cadence_steps` | `src/features/mentor-comercial/engine/cadence.ts` | `src/features/mentor-comercial/engine/cadence.test.ts` | Offsets: `D+7, D+30, D+180, 12m, 18m, 24m`. Garantia de tentativa única pendente. |

---

## 4. Scripts (77)

Fonte: `rules/mentor-comercial/v1/scripts.json` (Aba `05 Scripts`).
Contagem real: 77 scripts agrupados por area.

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `05 Scripts` | Area Internet (6 scripts: SCR-INT-CAD01-T1 a SCR-INT-CAD01-T6) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Carteira (8 scripts: SCR-CAR-INDICACAO-01 a SCR-CAR-REATIVACAO-T6) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Qualificação (4 scripts: SCR-QUAL-01 a SCR-QUAL-04) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Visita (8 scripts: SCR-VISITA-CAD02-T1 a SCR-VISITA-HOJE) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Confirmação (3 scripts: SCR-CONFIRMAR-D2 a SCR-CONFIRMAR-D0) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Não compareceu (5 scripts: SCR-NAO-COMPARECEU-T1 a SCR-NAO-COMPARECEU-T5) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Porta/Pós-visita (1 scripts: SCR-POS-VISITA-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Proposta (7 scripts: SCR-PROPOSTA-ENVIAR a SCR-PROPOSTA-CAD03-T6) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Objeção (3 scripts: SCR-OBJECAO-PRECO a SCR-OBJECAO-PARCELA) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Comparação (1 scripts: SCR-COMPARACAO-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Decisão (1 scripts: SCR-DECISAO-CAD03-T1) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Decisão de terceiro (1 scripts: SCR-TERCEIRO-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Troca (7 scripts: SCR-TROCA-DADOS-T1 a SCR-TROCA-INVIAVEL-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Financiamento (9 scripts: SCR-FIN-SIMULAR-01 a SCR-FIN-RECUSADO-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Fechamento (1 scripts: SCR-FECHAMENTO-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Sinal (1 scripts: SCR-SINAL-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Entrega (1 scripts: SCR-ENTREGA-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Futuro (1 scripts: SCR-FUTURO-01) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Pós-venda (6 scripts: SCR-POSVENDA-D7 a SCR-TROCA-24M) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Garantia (2 scripts: SCR-GARANTIA-01 a SCR-GARANTIA-RESOLVIDA) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |
| `05 Scripts` | Area Interno (1 scripts: SCR-INTERNO) | `mentor_scripts` | `src/features/mentor-comercial/engine/script.ts` | `src/features/mentor-comercial/engine/script.test.ts` | Renderer estrito (bloqueia envio se faltar placeholder oficial) |

---

## 5. Transições (52)

Fonte: `rules/mentor-comercial/v1/transitions.json` (Aba `06 Transições`).
Contagem real: 52 transições (10 curingas).

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `06 Transições` | Família Contato (5 transições, 2 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Qualificação (5 transições, 2 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Visita (6 transições, 1 curinga) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Negociação (11 transições, 0 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Troca (7 transições, 2 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Financiamento (8 transições, 1 curinga) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Venda (4 transições, 0 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Perda (2 transições, 1 curinga) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Futuro (1 transições, 1 curinga) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Relacionamento (1 transições, 0 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts` | Sinal `transition_not_found` se sem match |
| `06 Transições` | Família Garantia (2 transições, 0 curingas) | `mentor_transitions` | `src/features/mentor-comercial/engine/transition.ts` | `src/features/mentor-comercial/engine/transition.test.ts`, `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` | Sinal `transition_not_found` se sem match |

---

## 6. Cenarios de aceitacao (15)

Fonte: `rules/mentor-comercial/v1/acceptance-scenarios.json` (Aba `11 Testes_Cenários`).
Contagem real: 15 cenarios.

| Fonte (aba) | Entidade | Tabela | Serviço/Módulo | Teste | Observabilidade |
| --- | --- | --- | --- | --- | --- |
| `11 Testes_Cenários` | Cenario 1 — Lead sem resposta | `mentor_status_definitions`, `cadencia_estado_cliente` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 1 — Lead sem resposta')) | Status INT-C02, cadência CAD-01 ativa sem reducao de score |
| `11 Testes_Cenários` | Cenario 2 — Lead responde | `mentor_status_definitions`, `cadencia_estado_cliente` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 2 — Lead responde')) | Status INT-C03, interrupcao de cadência, prioridade Alta/Maxima |
| `11 Testes_Cenários` | Cenario 3 — Visita D+5 | `mentor_status_definitions`, `oportunidades` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 3 — Visita D+5 nao entra na Central')) | Urgencia actionFuture, centralAction = false |
| `11 Testes_Cenários` | Cenario 4 — Visita D-1 | `mentor_status_definitions`, `oportunidades` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 4 — Visita D-1 entra na Central')) | Urgencia actionTomorrow, priorizacao no painel |
| `11 Testes_Cenários` | Cenario 5 — Visita hoje | `mentor_status_definitions`, `oportunidades` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 5 — Visita hoje')) | Urgencia actionToday, centralAction = true, override visitToday |
| `11 Testes_Cenários` | Cenario 6 — Não compareceu | `mentor_status_definitions`, `mentor_transitions`, `cadencia_estado_cliente` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 6 — Nao compareceu')) | Transição para INT-V07 e engajamento na cadência CAD-07 |
| `11 Testes_Cenários` | Cenario 7 — Dados da troca pendentes | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 7 — Dados da troca pendentes')) | Status TR-01 com próximo passo declarado na fonte |
| `11 Testes_Cenários` | Cenario 8 — Avaliação presencial | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 8 — Avaliacao presencial')) | Status TR-03 com diretiva de agendamento presencial |
| `11 Testes_Cenários` | Cenario 9 — Financiamento aprovado | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 9 — Financiamento aprovado')) | FIN-06 com potencial Muito Alto e prioridade minima Alta |
| `11 Testes_Cenários` | Cenario 10 — Cliente Porta não comprou | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 10 — Cliente Porta que nao comprou')) | Canal Porta, preserva status POR-A03 ativo |
| `11 Testes_Cenários` | Cenario 11 — Lead antigo >90 dias | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 11 — Lead antigo acima de 90 dias')) | Canal Carteira, preserva origem CAR-C04 |
| `11 Testes_Cenários` | Cenario 12 — Cadência completa sem resposta | `mentor_status_definitions`, `cadencia_estado_cliente`, `carteira_missao_itens` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 12 — Cadência completa sem resposta')) | Status PER-03, attackEligible = true, score de conducao 100 |
| `11 Testes_Cenários` | Cenario 13 — Cliente respondeu e vendedor não tratou | `mentor_status_definitions`, `store_commercial_settings`, `mentor_score_snapshots` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 13 — Cliente respondeu e vendedor nao tratou')) | Score Critica, prioridade Maxima, override clientRespondedSlaBreached |
| `11 Testes_Cenários` | Cenario 14 — Compra futura | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 14 — Compra futura')) | INT-Q05 com data futura, centralAction = false |
| `11 Testes_Cenários` | Cenario 15 — Garantia aberta | `mentor_status_definitions` | `src/features/mentor-comercial/engine/engine.ts` | `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts` (describe('Cenario 15 — Garantia aberta')) | REL-07 entra na Central quando acompanhamento vence |
