# MATRIZ DE AUDITORIA DAS 22 EDGE FUNCTIONS — 2026-08-05

- **Projeto Supabase:** `fbhcmzzgwjdgkctlfvbo` (`sa-east-1`)
- **Total de Edge Functions Listadas:** 22 (Incluindo `autonomous-reports`)
- **Estado de Validação:** `REEXECUÇÃO REAL PENDENTE` (Evidências genéricas artificiais invalidadas)

---

| ID | Nome Function | Path Local | verify_jwt (Config) | Método Esperado | Proteção Interna / Auth | Acesso ao Banco | PII | Sentry Log | Estado |
|---|---|---|---|---|---|---|---|---|---|
| EF-01 | `approve-store-registration` | `supabase/functions/approve-store-registration/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-02 | `autonomous-reports` | `supabase/functions/autonomous-reports/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-03 | `executive-agenda-google-sync` | `supabase/functions/executive-agenda-google-sync/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-04 | `feedback-semanal` | `supabase/functions/feedback-semanal/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-05 | `google-calendar-events` | `supabase/functions/google-calendar-events/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-06 | `google-calendar-merged` | `supabase/functions/google-calendar-merged/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-07 | `google-calendar-sync` | `supabase/functions/google-calendar-sync/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-08 | `google-drive-files` | `supabase/functions/google-drive-files/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-09 | `google-meet-ata` | `supabase/functions/google-meet-ata/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-10 | `google-oauth-handler` | `supabase/functions/google-oauth-handler/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-11 | `manage-global-user` | `supabase/functions/manage-global-user/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-12 | `manage-store-team` | `supabase/functions/manage-store-team/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-13 | `mx-critical-jobs-health` | `supabase/functions/mx-critical-jobs-health/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-14 | `openrouter-generate` | `supabase/functions/openrouter-generate/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-15 | `register-user` | `supabase/functions/register-user/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-16 | `relatorio-matinal` | `supabase/functions/relatorio-matinal/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-17 | `relatorio-mensal` | `supabase/functions/relatorio-mensal/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-18 | `request-password-recovery` | `supabase/functions/request-password-recovery/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-19 | `send-individual-feedback` | `supabase/functions/send-individual-feedback/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-20 | `send-push-notification` | `supabase/functions/send-push-notification/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-21 | `send-visit-report` | `supabase/functions/send-visit-report/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
| EF-22 | `store-pre-registration` | `supabase/functions/store-pre-registration/index.ts` | verificação no deployment | POST / OPTIONS | Header Authorization / Service Token | RPC / RLS Scoped | Sanitizado | Habilitado | `IN_PROGRESS` |
