# Matriz atual de Edge Functions — snapshot 2026-08-09

> **Estado:** `TESTED_PRODUCTION_PARTIAL`
> **SHA do checkout:** `3c503da6ac82ee351ccd7eee0226ccd777637491` (documentação/prova; o CORS de `send-visit-report` segue não commitado)
> **Projeto:** `fbhcmzzgwjdgkctlfvbo`
> **Sondagem remota:** `2026-08-09T19:17:57Z`
> **Método:** `OPTIONS` com `Origin` e os cabeçalhos `authorization,apikey,content-type,baggage,sentry-trace,traceparent`, seguido de `POST {}` com token inválido.

As 22 funções ativas responderam `OPTIONS=200` e passaram a devolver os seis cabeçalhos exigidos pelo navegador/Sentry. O POST negativo retornou `401` nas funções protegidas por JWT; os `400` abaixo são validações de payload antes de uma operação pública ou de OAuth, e não são tratados como prova de JWT válido. Nenhuma rodada positiva com tenant/perfil, idempotência, replay ou rate limit foi promovida a concluída por esta sondagem.

| ID | Função | Versão remota | verify_jwt | OPTIONS | POST inválido | CORS tracing | Proteção/decisão | Estado |
|---|---|---:|:---:|---:|---:|:---:|---|---|
| EF-01 | `autonomous-reports` | 55 | SIM | 200 | 401 | SIM | legado remoto; fonte não existe no checkout local; exige Authorization | `TESTED_PRODUCTION_PARTIAL` |
| EF-02 | `relatorio-matinal` | 69 | SIM | 200 | 401 | SIM | JWT + `authorizeReportRequest` | `TESTED_PRODUCTION_PARTIAL` |
| EF-03 | `feedback-semanal` | 75 | SIM | 200 | 401 | SIM | JWT + `authorizeReportRequest` | `TESTED_PRODUCTION_PARTIAL` |
| EF-04 | `relatorio-mensal` | 63 | SIM | 200 | 401 | SIM | JWT + `authorizeReportRequest` | `TESTED_PRODUCTION_PARTIAL` |
| EF-05 | `google-oauth-handler` | 99 | NÃO | 200 | 400 | SIM | Bearer obrigatório no início OAuth; callback exige `state` persistido, TTL e consumo único | `TESTED_PRODUCTION_PARTIAL` |
| EF-06 | `google-calendar-events` | 57 | SIM | 200 | 401 | SIM | JWT de sessão + acesso ao cliente | `TESTED_PRODUCTION_PARTIAL` |
| EF-07 | `send-individual-feedback` | 57 | SIM | 200 | 401 | SIM | JWT + papel/loja | `TESTED_PRODUCTION_PARTIAL` |
| EF-08 | `register-user` | 66 | SIM | 200 | 401 | SIM | JWT + autorização administrativa | `TESTED_PRODUCTION_PARTIAL` |
| EF-09 | `google-calendar-merged` | 65 | SIM | 200 | 401 | SIM | JWT + acesso do cliente | `TESTED_PRODUCTION_PARTIAL` |
| EF-10 | `google-calendar-sync` | 92 | NÃO | 200 | 401 | SIM | JWT de sessão ou `x-google-calendar-sync-admin-token` interno | `TESTED_PRODUCTION_PARTIAL` |
| EF-11 | `send-visit-report` | 57 | SIM | 200 | 401 | SIM | JWT + papel/loja; CORS corrigido e publicado | `TESTED_PRODUCTION_PARTIAL` |
| EF-12 | `google-drive-files` | 70 | SIM | 200 | 401 | SIM | JWT + papel/cliente/loja | `TESTED_PRODUCTION_PARTIAL` |
| EF-13 | `store-pre-registration` | 82 | NÃO | 200 | 400 | SIM | endpoint público por desenho; valida payload, limita por IP/e-mail e evita enumeração | `NOT_APPLICABLE_WITH_PROOF` |
| EF-14 | `approve-store-registration` | 70 | SIM | 200 | 401 | SIM | JWT + autorização administrativa | `TESTED_PRODUCTION_PARTIAL` |
| EF-15 | `manage-store-team` | 44 | SIM | 200 | 401 | SIM | JWT + papel/loja + mutação transacional | `TESTED_PRODUCTION_PARTIAL` |
| EF-16 | `openrouter-generate` | 44 | SIM | 200 | 401 | SIM | JWT + papel autorizado | `TESTED_PRODUCTION_PARTIAL` |
| EF-17 | `google-meet-ata` | 51 | NÃO | 200 | 401 | SIM | `x-mx-cron-secret` interno ou JWT/papel administrativo | `TESTED_PRODUCTION_PARTIAL` |
| EF-18 | `executive-agenda-google-sync` | 22 | SIM | 200 | 401 | SIM | JWT + papel autorizado | `TESTED_PRODUCTION_PARTIAL` |
| EF-19 | `send-push-notification` | 21 | SIM | 200 | 401 | SIM | JWT + papel/loja | `TESTED_PRODUCTION_PARTIAL` |
| EF-20 | `request-password-recovery` | 29 | NÃO | 200 | 400 | SIM | endpoint público por desenho; valida e-mail, anti-enumeração e rate limit persistente | `NOT_APPLICABLE_WITH_PROOF` |
| EF-21 | `manage-global-user` | 9 | SIM | 200 | 401 | SIM | JWT + papel interno e rate limit/auditoria | `TESTED_PRODUCTION_PARTIAL` |
| EF-22 | `mx-critical-jobs-health` | 10 | SIM | 200 | 401 | SIM | JWT configurado; chamada cron exige secret no handler | `TESTED_PRODUCTION_PARTIAL` |

## Fechamento da sondagem

- `22/22` retornaram `OPTIONS=200`.
- `22/22` retornaram `Access-Control-Allow-Headers` com `baggage`, `sentry-trace` e `traceparent`.
- `19/22` retornaram `401` para o POST com Authorization inválido; os três endpoints públicos/OAuth retornaram `400` por validação de entrada.
- `5` estão com `verify_jwt=false`: `google-oauth-handler`, `google-calendar-sync`, `store-pre-registration`, `google-meet-ata` e `request-password-recovery`.
- Versões publicadas nesta correção: `autonomous-reports=55`, `relatorio-matinal=69`, `relatorio-mensal=63`, `google-calendar-events=57`, `send-individual-feedback=57`, `google-drive-files=70`, `executive-agenda-google-sync=22`, `send-push-notification=21`, `manage-global-user=9`, `mx-critical-jobs-health=10` e `send-visit-report=57`.
- Permanecem pendentes: testes positivos com identidade/tenant, rate-limit de carga controlada, replay/idempotência por endpoint, logs/Sentry por função e reconciliação funcional de `autonomous-reports` legado.
