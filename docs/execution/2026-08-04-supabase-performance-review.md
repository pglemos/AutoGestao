# Revisão de performance e confiabilidade Supabase — 2026-08-04

Estado: `IN_PROGRESS`
SHA de código observado: `11a9465f253ce8f96052db70c9171b14425e9d4e`.

## Escopo

Medir queries críticas com EXPLAIN seguro/logs; classificar FKs sem índice; revisar `auth_rls_initplan`, policies permissivas, índices não usados/duplicados, PKs ausentes, crons, backups, retenção e restore; reexecutar advisors antes/depois.

## Baseline

Ainda não há resultado atual nesta rodada. Contagens históricas do prompt serão tratadas como hipótese até consulta remota atualizada.

## Findings e decisões

| ID | Objeto | Medição | Decisão | Risco residual | Estado |
|---|---|---|---|---|---|
| SP-001 | Queries críticas | pendente | medir antes de otimizar | desconhecido | `IN_PROGRESS` |
| SP-002 | FKs sem índice | pendente | plano por FK, sem criação automática | desconhecido | `IN_PROGRESS` |
| SP-003 | policies/`auth_rls_initplan` | pendente | benchmark e testes de acesso | desconhecido | `IN_PROGRESS` |
| SP-004 | índices duplicados/não usados | pendente | só remover com equivalência/prova | desconhecido | `IN_PROGRESS` |
| SP-005 | crons/backups/restore | pendente | documentar RPO/RTO reais e testar fora de produção | potencialmente alto | `IN_PROGRESS` |

Nenhuma alteração de banco será considerada concluída apenas por advisor; a causa, consumidor, migration, teste e reread serão registrados.
