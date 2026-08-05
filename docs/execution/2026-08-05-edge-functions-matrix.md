# MATRIZ DE AUDITORIA DAS 22 EDGE FUNCTIONS — 2026-08-05

> **Status:** `IN_PROGRESS — CONFIGURAÇÃO REAL CATALOGADA, TESTES POR ENDPOINT PENDENTES`
> **Gerado por:** `generate-edge-functions-matrix.mjs` — consolida API real
> **SHA:** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`
> **Timestamp:** `2026-08-05T09:26:24.727Z`
> **Fonte:** API Supabase `list_edge_functions` — 2026-08-05T08:43:00Z

---

| Slug | ID | Version | verify_jwt (API Real) | Status | Teste OPTIONS | Teste Sem Auth | Teste JWT Inválido | Teste JWT Válido |
|---|---|---|---|---|---|---|---|---|
| `autonomous-reports` | `25d2adbe...` | 54 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `relatorio-matinal` | `931cdc30...` | 68 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `feedback-semanal` | `79332120...` | 73 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `relatorio-mensal` | `2e7aa521...` | 62 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-oauth-handler` | `2dee47a3...` | 94 | **false** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-calendar-events` | `94a3ae55...` | 56 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `send-individual-feedback` | `eb2074d6...` | 56 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `register-user` | `af832c15...` | 64 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-calendar-merged` | `92ac0d61...` | 65 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-calendar-sync` | `78a3da62...` | 89 | **false** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `send-visit-report` | `ccc5068f...` | 55 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-drive-files` | `abad6459...` | 69 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `store-pre-registration` | `ad3b81f5...` | 77 | **false** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `approve-store-registration` | `e4b9978e...` | 59 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `manage-store-team` | `ce5c2446...` | 41 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `openrouter-generate` | `0c35edc9...` | 41 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `google-meet-ata` | `587160db...` | 48 | **false** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `executive-agenda-google-sync` | `18283a3c...` | 21 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `send-push-notification` | `feeef07a...` | 20 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `request-password-recovery` | `eca2db92...` | 23 | **false** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `manage-global-user` | `904bcc75...` | 8 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |
| `mx-critical-jobs-health` | `37e3350b...` | 9 | **true** | ACTIVE | PENDING | PENDING | PENDING | PENDING |

---

## Resumo

- **Total:** 22 Edge Functions
- **verify_jwt=true:** 17 funções
- **verify_jwt=false:** 5 funções (google-oauth-handler, google-calendar-sync, store-pre-registration, google-meet-ata, request-password-recovery)
- **Testes individuais:** TODOS PENDENTES — não executados e não fabricados

> **Campos NÃO preenchidos** (sem implementação verificada):
> - Replay Protection: não confirmada
> - Idempotência: não confirmada a nível de Edge Function
> - Rate Limit: não confirmado em Edge Function (existe em RPC)
> - Sentry: DSN não encontrado no .env de Edge Functions
