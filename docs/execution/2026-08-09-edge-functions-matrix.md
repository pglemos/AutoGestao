# Matriz atual de Edge Functions — snapshot 2026-08-09

> **Estado:** `CATALOGADO_NO_DEPLOY — TESTES POR ENDPOINT PENDENTES`
> **SHA do checkout:** `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`
> **Projeto:** `fbhcmzzgwjdgkctlfvbo`
> **Fonte:** Supabase MCP execute_sql/list_edge_functions; current production project

Há 22 funções ativas; 5 estão com `verify_jwt=false`. Essas funções não são declaradas seguras por configuração: cada uma exige prova separada de autenticação interna, assinatura/state/secret, CORS, replay, rate limit, idempotência, PII, logs e acesso ao banco.

| ID | Function | Versão | Status | verify_jwt | Path local | Revisão necessária | Estado |
|---|---|---:|---|---:|---|---|---|
| EF-01 | `autonomous-reports` | 54 | ACTIVE | SIM | `supabase/functions/autonomous-reports/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-02 | `relatorio-matinal` | 68 | ACTIVE | SIM | `supabase/functions/relatorio-matinal/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-03 | `feedback-semanal` | 75 | ACTIVE | SIM | `supabase/functions/feedback-semanal/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-04 | `relatorio-mensal` | 62 | ACTIVE | SIM | `supabase/functions/relatorio-mensal/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-05 | `google-oauth-handler` | 99 | ACTIVE | não | `supabase/functions/google-oauth-handler/index.ts` | JWT ausente; provar proteção interna antes de aceitar | `IN_PROGRESS` |
| EF-06 | `google-calendar-events` | 56 | ACTIVE | SIM | `supabase/functions/google-calendar-events/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-07 | `send-individual-feedback` | 56 | ACTIVE | SIM | `supabase/functions/send-individual-feedback/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-08 | `register-user` | 66 | ACTIVE | SIM | `supabase/functions/register-user/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-09 | `google-calendar-merged` | 65 | ACTIVE | SIM | `supabase/functions/google-calendar-merged/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-10 | `google-calendar-sync` | 92 | ACTIVE | não | `supabase/functions/google-calendar-sync/index.ts` | JWT ausente; provar proteção interna antes de aceitar | `IN_PROGRESS` |
| EF-11 | `send-visit-report` | 56 | ACTIVE | SIM | `supabase/functions/send-visit-report/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-12 | `google-drive-files` | 69 | ACTIVE | SIM | `supabase/functions/google-drive-files/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-13 | `store-pre-registration` | 82 | ACTIVE | não | `supabase/functions/store-pre-registration/index.ts` | JWT ausente; provar proteção interna antes de aceitar | `IN_PROGRESS` |
| EF-14 | `approve-store-registration` | 70 | ACTIVE | SIM | `supabase/functions/approve-store-registration/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-15 | `manage-store-team` | 44 | ACTIVE | SIM | `supabase/functions/manage-store-team/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-16 | `openrouter-generate` | 44 | ACTIVE | SIM | `supabase/functions/openrouter-generate/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-17 | `google-meet-ata` | 51 | ACTIVE | não | `supabase/functions/google-meet-ata/index.ts` | JWT ausente; provar proteção interna antes de aceitar | `IN_PROGRESS` |
| EF-18 | `executive-agenda-google-sync` | 21 | ACTIVE | SIM | `supabase/functions/executive-agenda-google-sync/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-19 | `send-push-notification` | 20 | ACTIVE | SIM | `supabase/functions/send-push-notification/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-20 | `request-password-recovery` | 29 | ACTIVE | não | `supabase/functions/request-password-recovery/index.ts` | JWT ausente; provar proteção interna antes de aceitar | `IN_PROGRESS` |
| EF-21 | `manage-global-user` | 8 | ACTIVE | SIM | `supabase/functions/manage-global-user/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
| EF-22 | `mx-critical-jobs-health` | 9 | ACTIVE | SIM | `supabase/functions/mx-critical-jobs-health/index.ts` | JWT configurado; endpoint/tenant ainda não testados | `IN_PROGRESS` |
