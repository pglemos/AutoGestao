# Evidence Ledger - 2026-08-06

---

### EV-BASELINE-001 - SHA Inicial Confirmado
- Requisito: T0.1
- Ambiente: Local (macOS)
- Comando: `git rev-parse HEAD`
- Resultado esperado: SHA da main
- Resultado observado: 9b7b5374aa8c7e915017be385f088ccee1c8a0a4
- Timestamp: 2026-08-06T14:30:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-BASELINE-002 - Backup Criado
- Requisito: T0.2
- Ambiente: Local (macOS)
- Comando: `git tag -a "pre-main-autonomous-20260806-143034"` + `git bundle create`
- Resultado esperado: Tag criada, bundle verificado
- Resultado observado: Tag `pre-main-autonomous-20260806-143034`, bundle 199MB, verify OK
- SHA: 9b7b5374
- Timestamp: 2026-08-06T14:30:34Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-BASELINE-003 - Health Produção
- Requisito: T0.4
- Ambiente: Produção (Vercel)
- Comando: `curl https://mxperformance.vercel.app/api/health`
- Resultado esperado: HTTP 200 com status healthy
- Resultado observado: HTTP 200, `{"status":"healthy","checks":{"vercel":"ok","supabase_api":"ok","database":"ok","critical_crons":"ok"},"release":"8c5cfbf7","environment":"production"}`
- Timestamp: 2026-08-06T18:54:09Z
- Gap: SHA 8c5cfbf7 != HEAD main 9b7b5374
- Conclusão: DONE_WITH_EVIDENCE

### EV-BASELINE-004 - Headers de Segurança
- Requisito: T0.4
- Ambiente: Produção (Vercel)
- Comando: `curl -sI https://mxperformance.vercel.app/api/health`
- Resultado esperado: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- Resultado observado: Todos presentes. CSP abrange Supabase, Sentry, YouTube, Google Fonts
- Timestamp: 2026-08-06T18:55:22Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-BASELINE-005 - PR #175 Status
- Requisito: C0.1 / C0.2
- Ambiente: GitHub
- Comando: `gh pr list --state all`
- Resultado esperado: PR #175 merged ou open
- Resultado observado: PR #175 **merged** (não draft). Correções de tokens já na main.
- Timestamp: 2026-08-06T14:35:00Z
- Conclusão: DONE_WITH_EVIDENCE