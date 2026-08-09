# Evidence Ledger — MX Gestão Preditiva (2026-08-05)

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.


## Registro de Evidências

### EV-FASE0-001
- **Requisito:** T0.1 / T0.2 — Status do repositório e criação de backup
- **Ambiente:** Local (macOS zsh)
- **Perfil:** Desenvolvedor / Autônomo
- **Comando:** `git status` && `git tag` && `git bundle verify`
- **Resultado Esperado:** Repositório na branch `main`, tag criada e bundle válido.
- **Resultado Observado:** Branch `main` confirmada. Tag `pre-main-autonomous-20260807-045551` anotada. Bundle `../MXGESTAOPREDITIVA-pre-main-autonomous-20260807-045551.bundle` com 31 refs verificado com OK.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:55:53-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-002
- **Requisito:** C0.1 — Validação da auditoria do Design System
- **Ambiente:** Local (Node.js test runner)
- **Comando:** `npm run audit:management-design-system`
- **Resultado Esperado:** 0 violações de tokens legados e suítes passando.
- **Resultado Observado:** 6 suítes passadas, 345 arquivos auditados, 0 violações.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:54:52-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-003
- **Requisito:** T17.1 - T17.11 — Typecheck e Suíte Unitária
- **Ambiente:** Local (Bun & TSC)
- **Comando:** `npm run typecheck` && `bun test`
- **Resultado Esperado:** 0 erros de compilação TypeScript e 100% de aprovação nos testes unitários.
- **Resultado Observado:** `tsc --noEmit` completou com 0 erros. `bun test` executou 2.309 testes em 440 arquivos com 2.309 PASS, 0 FAIL.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:55:05-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-004
- **Requisito:** C0.2 / C0.3 — Paridade do Módulo Dono
- **Ambiente:** Local (Node.js script)
- **Comando:** `node scripts/verify_carteira_base44_parity.mjs`
- **Resultado Esperado:** 100% de paridade de fontes e resiliência visual/funcional.
- **Resultado Observado:** Script executou com sucesso (exit code 0), validando 11 testes de resiliência e contrato visual 1:1.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:54:52-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-005
- **Requisito:** T3.1 - T3.7 / Production Build — Ignore Command Vercel & Vite Build
- **Ambiente:** Local & Vercel Pipeline
- **Comando:** `node --test scripts/vercel-ignore-build.test.mjs` && `npm run build`
- **Resultado Esperado:** 15 testes de ignore command passando; bundle de produção gerado sem sourcemaps públicos.
- **Resultado Observado:** 15/15 testes passados no ignore command. Build finalizado em 5.64s. Nenhum `.map` em `dist/`. Vercel deployment `READY` para o SHA `188b7d85`.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:55:15-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-006
- **Requisito:** T13.1 - T13.10 — Observabilidade e Rastreamento Sentry
- **Ambiente:** Sentry API & Production Release
- **Comando:** `curl -s -H "Authorization: Bearer ***" https://sentry.io/api/0/projects/`
- **Resultado Esperado:** Projetos ativos e release criada para o SHA publicado.
- **Resultado Observado:** Organização `synvolt` conectada com 3 projetos (`mx-performance-frontend`, `mx-performance-edge`, `mx-performance-health`). Release `188b7d85f374a2398a598eb0e8c6cf2e2fcba587` confirmada.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:56:38-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`

### EV-FASE0-007
- **Requisito:** T18.5 - T18.6 — Baseline de Produção & Health Check
- **Ambiente:** Produção Vercel (`https://mxperformance.vercel.app/api/health`)
- **Comando:** `curl -s -i "https://mxperformance.vercel.app/api/health"`
- **Resultado Esperado:** HTTP 200, status `healthy`, release igual ao SHA publicado.
- **Resultado Observado:** HTTP 200 `{"status":"healthy","checks":{"vercel":"ok","supabase_api":"ok","database":"ok","critical_crons":"unknown"},"release":"188b7d85f374a2398a598eb0e8c6cf2e2fcba587","environment":"production"}`. Headers de segurança CSP, HSTS, X-Frame-Options validados.
- **SHA:** `188b7d85f374a2398a598eb0e8c6cf2e2fcba587`
- **Timestamp:** 2026-08-07T04:56:05-03:00
- **Conclusão Permitida:** `DONE_WITH_EVIDENCE`
