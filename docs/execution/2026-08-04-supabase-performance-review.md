# Revisão de performance e confiabilidade Supabase — 2026-08-04

Estado: `PASS_WITH_FINDINGS`
Checkout atual auditado: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` (`2026-08-04T07:13:39-03:00`).

## Proveniência preservada

- Relatório-base read-only: `.superpowers/sdd/PROMPT_DEFINITIVO_MAIN_SEM_WORKTREE_EXECUCAO_100_AUTONOMA_MX/parallel-supabase-audit.md`
- O relatório-base continua a fonte histórica para catálogo amplo de risco; esta task só consolidou e revalidou o mínimo read-only necessário.

## Revalidação atual relevante para confiabilidade

| Item | Estado | Evidência atual |
|---|---|---|
| Funções com falha de execução lógica | `PASS_WITH_FINDINGS` | `supabase db lint --linked` continua falhando em `gerar_alertas_loja`, `mx_score_recalcular_loja`, `mx_score_atualizar_atraso_plano`, `consolidar_dashboard_departamento` |
| Warnings adicionais de PL/pgSQL | `PASS_WITH_FINDINGS` | `admin_create_store`, `admin_update_store`, `salvar_metas_indicador_planejamento` |
| Catálogo completo de FKs/índices/PKs | `IN_PROGRESS` | não reextraído nesta task |
| EXPLAIN/benchmarks de queries críticas | `IN_PROGRESS` | não executado nesta onda |
| Backup/restore real | `IN_PROGRESS` | nenhuma prova de restore foi executada |
| RPO/RTO operacionais | `IN_PROGRESS` | não houve drill adicional além dos relatórios-base |

## Leitura consolidada

- Os erros `22P02` e `42803` continuam sendo defeitos atuais de confiabilidade, não apenas dívida histórica.
- A ausência de nova bateria de catálogo, índices e EXPLAIN impede declarar performance segura.
- A ausência de prova de restore continua um bloqueio explícito para qualquer claim forte de recuperação operacional.
