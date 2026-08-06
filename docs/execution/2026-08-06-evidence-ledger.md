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
### EV-C01-001 - Auditoria Design System 0 violações
- Requisito: C0.1
- Ambiente: Local (macOS)
- Comando: `node scripts/audit-management-design-system.mjs`
- Resultado esperado: 0 violações
- Resultado observado: 6/6 pass, `"violations": []`
- Arquivo: src/features/lojas/components/team-panel/TeamListSection.tsx (corrigido)
- Commit: 0aa57b49 (push OK, Vercel dpl_Ebko8oDwShSicpBE READY)
- Timestamp: 2026-08-06T18:00:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C01-002 - Teste produção /minha-equipe
- Requisito: C0.1
- Ambiente: Produção (Vercel, navegador via macos-mcp)
- Resultado esperado: página carrega sem erros
- Resultado observado: `/minha-equipe` logado como gerente carregou sem erros no SHA novo
- Timestamp: 2026-08-06T18:30:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C04-001 - Inventário RLS 158 tabelas
- Requisito: C0.4
- Ambiente: Produção (Supabase fbhcmzzgwjdgkctlfvbo, management API query)
- Comando: SELECT relrowsecurity/policies por tabela
- Resultado observado: 158 tabelas `public` com RLS ativo; única sem policy: `backup_is_venda_loja_20260805` (0 grants, inacessível por design — decisão registrada em COMMENT)
- Timestamp: 2026-08-06T19:10:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C05-001 - Grants de função antes
- Requisito: C0.5
- Comando: SELECT proacl agrupado
- Resultado observado: 90 {auth,srv} / 78 {PUBLIC,anon,auth,srv} / 34 {srv} / 17 {postgres} / 11 {anon,...}
- Timestamp: 2026-08-06T19:12:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C05-002 - Revogações aplicadas
- Requisito: C0.5
- Comando: REVOKE ... FROM anon (11 nominais) + REVOKE ALL ON ALL FUNCTIONS FROM PUBLIC + REVOKE ALL ON ALL FUNCTIONS FROM anon + ALTER DEFAULT PRIVILEGES
- Resultado observado: 179 {auth,srv} / 34 {srv} / 17 {postgres}; 0 funções executáveis por anon
- Migration: supabase/migrations/20260806150000_revoke_anon_public_execute_functions.sql
- Commit: 65ca35b2 (push OK)
- Timestamp: 2026-08-06T19:20:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C05-003 - Teste negativo anon
- Requisito: C0.5
- Ambiente: Produção (REST Supabase)
- Comando: POST /rest/v1/rpc/mx_database_health e /rpc/listar_benchmark_anonimo_lojas com apikey anon
- Resultado observado: HTTP 401; 42501 "permission denied for function listar_benchmark_anonimo_lojas"
- Timestamp: 2026-08-06T19:25:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C05-004 - Teste positivo authenticated
- Requisito: C0.5
- Ambiente: Produção (REST Supabase, sessão gerente@mxgestaopreditiva.com.br)
- Resultado observado: mx_database_health HTTP 200 `true`; listar_benchmark_anonimo_lojas HTTP 400 P0001 "Apenas perfis MX podem consultar benchmark anonimo" (execução autorizada, papel validado internamente)
- Timestamp: 2026-08-06T19:27:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C05-005 - Amostragem corpos SECURITY DEFINER
- Requisito: C0.5
- Resultado observado: get_lancamentos_rede_periodo/get_lancamentos_referencia_dia (uid + eh_area_interna_mx), criar_plano_acao/mx_score_recalcular_loja (user_has_role), liberar_fechamento_por_token/consultar_liberacao_por_token (role whitelist + token hash sha256), get_owner_network_cockpit (vinculo dono ativo)
- Timestamp: 2026-08-06T19:15:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C06-001 - Auditoria Edge Functions
- Requisito: C0.6
- Ambiente: Management API / fonte local
- Resultado observado: 22 funções ativas; 16 verify_jwt=True; 6 sem JWT com proteção interna: rate limit RPC (request-password-recovery, store-pre-registration), state OAuth completo (google-oauth-handler), Bearer (google-calendar-sync), cron secret (google-meet-ata); plano previa 13 sem JWT → 7 já corrigidas antes
- Timestamp: 2026-08-06T19:35:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C02-001 - Branches candidatas supersedidas pela main (nada a portar)
- Requisito: C0.2
- Ambiente: git local (main @ 255ea20c)
- Resultado observado:
  - `owner-b44`, `mx-manager-scope`, `mx-internal-scope`: branches já deletadas localmente (git: unknown revision)
  - `owner-base44-parity` (2cd224f4): fixes de race JÁ na main — `requestIdRef` ×6 em `useManagerHomeOfficialSources.ts`; dedup in-flight `consolidationRequests` + retry 23505 em `ManagerTeamRoutineCanonical.container.tsx` (linhas 31-35); `subscribeToTeamFunnelRealtime` presente só na main
  - `codex/resume-pr153` (59 commits): todos os src existem na main; delta é regressão (remove `dono` de `canManageTeam` em capabilities.ts); remove 9 workflows de CI; migrations (option_b_global_admin, backfill, snapshot) já na main
  - `feat/functional-package-v2` (6 commits): features já na main (`network-dashboard`, `action-plan`, `consulting-journey`, `strategic-plan`, `planning-workspace`); diff mostra snapshot antigo (−27.361 linhas vs main)
- Decisão: NENHUMA porta necessária; eliminar branches locais restantes no C0.8
- Commit: 255ea20c (docs)
- Timestamp: 2026-08-06T20:05:00Z
- Conclusão: DONE_WITH_EVIDENCE
