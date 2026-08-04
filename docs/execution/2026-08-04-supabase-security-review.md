# Revisão de segurança Supabase — 2026-08-04

Estado: `PASS_WITH_FINDINGS`
Checkout atual: `9abfc70a79da46c03ee156b49933310584f85a65`

## Proveniência preservada

- Relatório-base read-only: `.superpowers/sdd/PROMPT_DEFINITIVO_MAIN_SEM_WORKTREE_EXECUCAO_100_AUTONOMA_MX/parallel-supabase-audit.md`
- Timestamp do relatório-base: `2026-08-04T08:58:30Z`
- SHA do relatório-base: `9fdd484f1eb0c79c11cba98bac91eca2502ee799`
- Qualquer contagem histórica de docs Supabase continua apenas contextual, nunca prova atual.

## Revalidação atual

### Lint live do projeto linked

- Comando: `supabase db lint --linked`
- Resultado atual:
  - `public.gerar_alertas_loja` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.mx_score_recalcular_loja` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.mx_score_atualizar_atraso_plano` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.consolidar_dashboard_departamento` → `42803 ... must appear in the GROUP BY clause`
  - warnings ainda presentes em `public.admin_create_store`, `public.admin_update_store`, `public.salvar_metas_indicador_planejamento`

### Sinais estáticos ainda presentes no checkout atual

- `supabase/functions/_shared/cors.ts:2` mantém `Access-Control-Allow-Origin: "*"`
- `supabase/functions/_shared/auth.ts:51` mantém `sessionClient.auth.getUser()`
- `supabase/config.toml:372,375,378,381,390` mantém `verify_jwt = false`
- `supabase/migrations/20260729100000_fix_storage_bucket_policies.sql` ainda referencia políticas ligadas a `pre-cadastro-avatares` e `evidencias-consultoria`

## Leitura consolidada

| Tema | Estado | Evidência |
|---|---|---|
| Defeitos live em funções | `PASS_WITH_FINDINGS` | lint remoto falhando em funções críticas |
| CORS wildcard em Edge shared layer | `PASS_WITH_FINDINGS` | `_shared/cors.ts` ainda usa `*` |
| Auth manual em Edge | `PASS_WITH_FINDINGS` | `_shared/auth.ts` ainda depende de `getUser()` com bearer |
| `verify_jwt = false` em config | `PASS_WITH_FINDINGS` | entradas ainda presentes em `supabase/config.toml` |
| Buckets / policies citados pelo relatório-base | `PASS_WITH_FINDINGS` | referências estáticas ainda existem |
| Matriz completa por perfil/tenant | `NOT_PROVEN` | sem rodada live de acesso cruzado nesta task |
| Restore/rollback seguro do banco | `NOT_PROVEN` | nenhuma prova de restore foi produzida nesta task |

## Conclusão permitida

Continua verdadeiro, no checkout atual e no linked project atual, que existem defeitos live de função e riscos estáticos relevantes em Edge/CORS/Auth. Também continua não provado qualquer claim de restore seguro, matriz cross-tenant completa ou fechamento integral de segurança.
