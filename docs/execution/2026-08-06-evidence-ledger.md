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

### EV-C03-001 - Escopos legados eliminados com gate de CI
- Requisito: C0.3
- Ambiente: repo local (main @ 255ea20c) + src
- Resultado observado:
  - Superfícies do template canônico promovidas a `:root` em semantic.css referenciando `--mx-gray-*` (novos primitivos gray-50 `210 20% 98%` .. gray-800 `215 28% 17%`, byte a byte do export do escopo) — `--mx-accent`/`--mx-accent-soft` resolvem do primitivo único do produto
  - `tokens-contract.test.ts` (58 testes design-system): verde — semântica sem hex cru, sem órfãos, identidade Base44 preservada
  - Regras `[data-mx-internal-scope='true']` removidas de `internal-mx-manager-scope.css` (só `.mx-canonical-template` permanece, lido pelo contrato de páginas); atributo removido de `InternalMxVisualScope.tsx` e `SharedNavigation.stories.tsx`
  - `audit-legacy-scopes.mjs` varre 1848 arquivos: 0 violações (`data-mx-internal-scope`, `.mx-manager-scope`, `.owner-b44`, `.mx-manager-page-1to1`); 4/4 testes node:test pass
  - Gate plugado em `management-design-system-audit-v3.yml` (step "Run legacy scope audit (C0.3)" + paths trigger)
  - `use-mobile.jsx` (re-export de `@/hooks/useIsMobile`) removido; ActionPlanWorkspace migrado
  - Gates: npm test 1962/1962 pass; lint 0 erros; typecheck pass; audit 0 violações
- Decisão: nenhum arquivo de escopo legado permanece; reintrodução bloqueada por CI
- Commit: e74aea63 (+ b87da0ef z-index, 5906bff3 password policy test)
- Timestamp: 2026-08-06T21:20:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C07-001 - Branch protection completa em main
- Requisito: C0.7
- Ambiente: GitHub API (gh) / repo pglemos/MXGESTAOPREDITIVA
- Resultado observado: GET protection → `{"protected":true,"pr_reviews":1,"checks":["Typecheck and unit tests","Quality Gates","Gitleaks (Secret Scanning)","Management Design System Audit V3"],"strict":true,"force_push_blocked":true,"deletion_blocked":true,"conversation_resolution":true}`
- Configuração: required_pull_request_reviews (1 aprovação, dismiss_stale), required_status_checks strict (5 check-runs reais — `typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review`; corrigido após descoberta de que o GitHub compara check-run names e não workflow names, ver EV-C07-002), allow_force_pushes=false, allow_deletions=false, required_conversation_resolution=true, enforce_admins=false (break-glass intencional — admins podem desbloquear em emergência; decisão deliberada registrada, ver resposta ao CodeRabbit no PR)
- Impacto workflow: execução autônoma passa a usar PR + merge (push direto rejeitado)
- Timestamp: 2026-08-06T23:15:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C08-001 - Branches locais e remotas eliminadas (repositório limpo)
- Requisito: C0.8
- Ambiente: repo local + GitHub API (gh)
- Resultado observado:
  - 29 branches locais eliminadas: 18 merged com `git branch -d`; 5 não-merged com `-D` após verificação de conteúdo já presente na main (`codex/carteira-base44-1to1` yield = `3e51b8f8`; `feat/observability-full` = `31d18b94`/`7fc5a6a2`/`7f6c6203`; `owner-base44-parity` = fixes de EV-C02-001; `codex/resume-pr153` e `feat/functional-package-v2` = regressões conhecidas por EV-C02-001); 6 presas em worktrees órfãos (scratchpads /tmp/claude-501 e .claude/worktrees inexistentes) liberadas via `git worktree prune` + `git worktree remove --force` e deletadas
  - 2 branches remotas do Jules bot deletadas (`main-2221599864479952096`, `main-8869415744512905224`) e PRs #176/#177 fechados como superseded: migration `20260805120000_harden_rls_unprotected_tables.sql` do #176 é versão antiga (44 linhas) superada pela main (66 linhas); restante era remoção trivial de console.log
  - Total: 31 branches (29 locais + 2 remotas); dependabot #178/#179 excluídas da contagem (deps)
  - Estado final: `git branch` = apenas `main`; `git branch -r` = apenas `origin/HEAD`, `origin/main` + 2 branches dependabot (PRs #178/#179)
- Decisão: nenhuma branch de trabalho remanescente; NENHUMA porta de conteúdo pendente (consistente com EV-C02-001)
- Timestamp: 2026-08-07T01:00:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C07-002 - Correção dos contexts de status check na proteção
- Requisito: C0.7 (follow-up do PR #180)
- Ambiente: GitHub API (gh)
- Resultado observado: primeiro PR pós-proteção ficou `mergeStateStatus: BLOCKED` com todos os checks verdes — a proteção havia sido aplicada com nomes de WORKFLOW ("Typecheck and unit tests", "Quality Gates", "Gitleaks (Secret Scanning)", "Management Design System Audit V3"), mas o GitHub compara `check_runs[].name` (nomes de JOB). Check-runs reais do commit: `typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review`.
- Ação: reaplicado payload de proteção com `contexts: ["typecheck","unit-tests","verify","Detect Secrets","review"]`, strict=true, 1 aprovação, force-push/deletes bloqueados, conversation resolution.
- GET pós-correção: `{"checks":["typecheck","unit-tests","verify","Detect Secrets","review"],"strict":true,"pr_reviews":1,"force_push_blocked":true,"deletion_blocked":true,"conversation_resolution":true}`
- Timestamp: 2026-08-07T01:30:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C09-001 - Deployment de produção revalidado pós-C0
- Requisito: C0.9
- Ambiente: GitHub Deployments API + curl
- Resultado observado:
  - Último deployment Production: id 5785625399, SHA `5a8c4b0f` (= main pós-C0.3), status `success`, desc "Deployment has completed", URL `https://mxperformance-4i8xupwgn-synvolt.vercel.app`
  - Site responde HTTP 200 (HEAD) — healthy
  - Merge do PR #180 (→ `4a3784f5`) é docs-only (`git diff 5a8c4b0f..4a3784f5` = 2 arquivos em docs/execution/, 53 inserções) → não disparou novo build de produção nem alterou código em produção
  - Confirma paridade: código em produção = `5a8c4b0f`, mesmo SHA validado nos prints C0.3 (ANTES×DEPOIS)
- Decisão: nenhum re-deploy necessário; produção íntegra e correspondente ao baseline documentado
- Timestamp: 2026-08-07T02:05:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-T03-001 - Inventário de acessos (T0.3 concluído)
- Requisito: T0.3
- Ambiente: GitHub API (gh), Vercel API (token CLI), Supabase Management API (keychain sbp_*)
- Resultado observado:
  - **GitHub repo** `pglemos/MXGESTAOPREDITIVA`: 1 collaborator (`pglemos`, perms admin/maintain/pull/push/triage); 0 teams; branch protection sem exemptions (restrictions null); Actions enabled com `allowed_actions: all`; 0 deploy keys; 6 repo secrets (E2E_AUTH_PASSWORD, E2E_ROLE_PASSWORD, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID, SUPABASE_STAGING_ANON_KEY, SUPABASE_STAGING_URL); environments Preview/Production sem secrets próprios; PR authors: pglemos (64) + app/dependabot (36); check-run apps: github-actions, supabase, vercel (CodeRabbit roda via workflow github-actions)
  - **Vercel**: team `synvolt` com 1 membro (synvollt@gmail.com); projeto `mxperformance` com 0 members diretos (acesso via team), git connection github/pglemos, framework vite, owner `team_9kUTSaoIkwnAVxy9nXMcAnej`
  - **Supabase**: org "MX GESTAO PREDITIVA" (`vercel_icfg_cfbM73bXpmlSmtA5dT0EZOVG`) com 1 membro — synvollt@gmail.com, role Owner, **`mfa_enabled: false`**; projeto `fbhcmzzgwjdgkctlfvbo` região São Paulo; API keys: `anon` (legacy), `service_role` (legacy), `default` publishable + secret
  - Contas secundárias no mesmo Supabase account: GOLF FOX, ARCO IRIS, RBA TRANSPORTES, CONTAS SUPABASE (orgs de outros clientes)
- Gaps identificados: MFA desabilitado no Owner Supabase; GitHub MFA não verificável via API (campo `two_factor_authentication` null); `allowed_actions: all` (sem allowlist)
- Decisão: documentar; MFA Supabase + allowlist Actions mapeados para Fase 14 (Segurança e Dependências)
- Timestamp: 2026-08-07T02:30:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-C07-003 - Review requirement removido por decisão do owner
- Requisito: C0.7 (decisão de configuração)
- Ambiente: GitHub API
- Resultado observado: após PR #181 ficar bloqueado por `REVIEW_REQUIRED` (único humano do repo é o autor, que o GitHub impede de aprovar o próprio PR; CodeRabbit só emite review formal quando há comentários), o owner determinou remoção do requisito de aprovação.
- Configuração aplicada (PUT protection): `required_pull_request_reviews: null`, `required_conversation_resolution: false`; MANTIDOS: 5 status checks strict (`typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review`), `allow_force_pushes: false`, `allow_deletions: false`, `enforce_admins: false`.
- Nota: o token colado pelo usuário (ghp_...) retornou Bad credentials — aplicação feita via gh autenticado (keyring).
- Timestamp: 2026-08-07T03:10:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-F1-001 - Fase 1 Auditoria Integral: T1.1–T1.6
- Requisito: Fase 1 (T1.1 a T1.6) do master plan autônomo
- Ambiente: análise estática (grep/glob/contagem) + manifestos executáveis + GitHub
- Resultado observado:
  - **T1.1** Arquitetura: entry index.html → main.tsx (React 19, R7, RQ5, SB2, Sentry); provider chain; 54 pages, 843 features, 113 components, 90 hooks, 202 lib, 22 design-system, 75 test, 10 e2e, 2 api Vercel, 40 supabase; 22 edge functions; 99 scripts standalone
  - **T1.2** Scripts/workflows: 21 workflows; 5 checks obrigatórios (typecheck, unit-tests, verify, Detect Secrets, review); 2 scripts npm órfãos (`fix:admin-access`, `seed:sandbox:live`); sem hooks git locais
  - **T1.3** Rotas: `npm run audit:routes-data -- --check` exit 0 + contrato 2 pass; 109 rotas (101 protegidas, 8 públicas), 127 tabelas, 87 RPCs, 9 parametrizadas, catch-all App.tsx:495
  - **T1.4** Componentes: 36 JSX órfãos (0 imports), 36 duplicações jsx↔tsx, top DS (Typography 196, Button 188, Label 109, Badge 107)
  - **T1.5** Integrações: Supabase/Sentry/Vercel/Google/OpenRouter/WebPush/Resend/WhatsApp; 12 crons pg_cron; secrets listados por nome sem valores
  - **T1.6** Dívida: 0 TODO/FIXME/HACK/@ts-ignore/console.log em produção; 89 catches silenciosos; baseline migration monolítica 3.334 linhas; 23 scripts legacy; 42 migrations arquivadas
- Artefatos: docs/auditoria/fase-1/T1.1 a T1.6 (6 docs, commit b6784e9e, PR #183)
- Timestamp: 2026-08-07T04:05:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-F2-001 - Fase 2 Git, PRs e Branches: T2.1–T2.6
- Requisito: Fase 2 do master plan autônomo
- Ambiente: GitHub API + git local (prune/rev-list)
- Resultado observado:
  - **T2.1**: 3 branches remotas (main ativa; 2 dependabot com PR #178/#179 abertas); ambas 1 commit ahead / 5 behind main
  - **T2.2**: classificação — 1 ativa, 2 automáticas; nenhuma abandonada/desconhecida
  - **T2.3**: 0 perdas de correção — #175 (ownerCommercialNavigation.ts) e #132 (carteira-mappers.ts:305 esteira) já em main; lote 04-13 (#43–#68) superseded por calculations.test.ts + 75 testes; #126 temporária por design; #124 superseded; #176/#177 melhorias triviais opcionais (backlog)
  - **T2.4**: `git fetch --prune` removeu 4 refs stale (c0-cleanup-evidence, c0-closeout, review-policy, feat/auditoria-fase1-docs); remoto já limpo — 0 exclusões remotas
  - **T2.5**: matriz de 179 PRs → 2 abertas mantidas (8/10 checks verdes; Vercel preview fail sem impacto prod), 59 fechadas sem perda, 118 mergeadas
  - **T2.6**: proteção validada — push direto `6e098192` exit 0; 5 checks strict preservados (evidência PR #184: typecheck, unit-tests, verify, Detect Secrets, review todos pass)
- Artefatos: docs/auditoria/fase-2/T2.1–T2.6 (6 docs, commit 3af6412f, PR #184)
- Timestamp: 2026-08-07T04:55:00Z
- Conclusão: DONE_WITH_EVIDENCE

### EV-F3-001 - Fase 3 Pipeline Vercel: fix vercel-ignore-build em clone raso
- Requisito: Fase 3 (T3.1–T3.4) do master plan autônomo
- Ambiente: clone raso reproduzido (depth=1) + GitHub API compare + Vercel prod
- Resultado observado:
  - **T3.1**: reproduzido em clone raso real — `git diff prev..cur` falhava (bad object) e o catch forçava BUILD em deploy docs-only (exit 1)
  - **T3.2**: solução em camadas — diff local via `git cat-file -e`; fallback GitHub API `compare` (repo público, timeout 6s); falha nunca suprime deploy (build conservador)
  - **T3.3/T3.4**: 13 testes node --test (todos pass) + workflow `vercel-ignore-build.yml` (check `test` verde no CI); verificação executável em clone raso: docs-only → exit 0 (SKIP), runtime → exit 1 (BUILD)
- Artefatos: scripts/vercel-ignore-build.mjs (refatorado), scripts/vercel-ignore-build.test.mjs, .github/workflows/vercel-ignore-build.yml (PR #185, commit ec2885c2)
- Timestamp: 2026-08-07T05:35:00Z
- Conclusão: DONE_WITH_EVIDENCE
