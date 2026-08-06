# Live Progress - 2026-08-06

## SHA Inicial: 9b7b5374aa8c7e915017be385f088ccee1c8a0a4
## SHA Health Produção: 8c5cfbf7ff0a7af55f6c8eeff349e5a7fa400901
## Branch: main (PROIBIDO worktree/branches auxiliares)

---

## Phase 0 — Baseline e Controle

### T0.1 — Confirmar repositório, remoto, branch e working tree
- Estado: DONE_WITH_EVIDENCE
- SHA inicial: 9b7b5374
- Evidência: `git rev-parse HEAD`, `git remote -v`, `git status`, `git branch`
- Observação: SHA real diverge do SHA documentado (6fd6bfa6)

### T0.2 — Criar tag e bundle de backup
- Estado: DONE_WITH_EVIDENCE
- Tag: pre-main-autonomous-20260806-143034
- Bundle: ~199MB, verificado
- Evidência: `git bundle verify` OK

### T0.3 — Inventariar acessos existentes
- Estado: IN_PROGRESS
- Nota: Usar credenciais fornecidas, não rotacionar

### T0.4 — Capturar baseline de produção
- Estado: DONE_WITH_EVIDENCE
- Health: `{"status":"healthy","checks":{"vercel":"ok","supabase_api":"ok","database":"ok","critical_crons":"ok"},"release":"8c5cfbf7","environment":"production"}`
- Headers de segurança: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy presentes
- Gap: SHA do health (8c5cfbf7) != SHA do HEAD main (9b7b5374)

### T0.5 — Criar arquivos de controle
- Estado: IN_PROGRESS

---

## C0.1 — Corrigir workflow falho do Design System
- Estado: DONE_WITH_EVIDENCE
- Falha real: 6 violações `status-error` em `src/features/lojas/components/team-panel/TeamListSection.tsx` (linhas 42, 43, 140) — não no StoreEditModal (doc desatualizado)
- Correção: substituição por `hsl(var(--mx-color-danger))` / `hsl(var(--mx-color-danger-subtle))`
- Auditoria: `node scripts/audit-management-design-system.mjs` → 6/6 pass, `"violations": []`
- Commit: `0aa57b49` push OK; Vercel `dpl_Ebko8oDwShSicpBE` READY
- Teste produção: `/minha-equipe` logado como gerente, sem erros

---

## C0.2 — Reconciliar módulo do Dono e PR #175
- Estado: DONE_WITH_EVIDENCE (decisão: NADA a portar — todas as branches supersedidas pela main)
- PR #175: MERGED (correções já na main)
- 9 branches locais 100% mergeadas (0 commits delta): agent/central-execucao-gap-fixes, auto-claude/OWNER-20260721-base44-exact, carteira-clean, feat/filiais-matriz, fix/manage-store-team-email-conflict, fix/manager-module-full-parity-20260714, fix/map-legacy-identity, fix/strip-legacy-overrides, integracao-34
- `owner-b44`, `mx-manager-scope`, `mx-internal-scope`: já deletadas localmente (não existem mais)
- `owner-base44-parity` (`2cd224f4`): NÃO portar. Fixes de race JÁ na main — `requestIdRef` ×6 em `useManagerHomeOfficialSources.ts`; dedup in-flight `consolidationRequests` + retry 23505 em `ManagerTeamRoutineCanonical.container.tsx` (linhas 31-35); `subscribeToTeamFunnelRealtime` só existe na main (branch é mais antiga)
- `codex/resume-pr153` (59 commits): NÃO portar. Todos os arquivos src existem na main (`InternalMxUsersTab.tsx`, `EquipeUsuariosTabRouter.tsx`, `capabilities.ts`, `roles.ts`, headers de network-dashboard/ranking); deltas são regressões (branch REMOVE `dono` de `canManageTeam`); branch remove 9 workflows de CI; migrations de Option B/backfill/snapshot já na main
- `feat/functional-package-v2` (6 commits): NÃO portar. Features já na main sob nomes atuais (`network-dashboard`, `action-plan`, `consulting-journey`, `strategic-plan`, `planning-workspace`); branch é snapshot antigo (−27.361 linhas vs main, remove workflows de CI)
- PRs abertas: #176, #177 (code health)

---

## C0.3 — Eliminar scopes legados (owner-b44, mx-manager-scope, mx-internal-scope)
- Estado: NOT_STARTED (pendente após C0.2)

---

## C0.4 — Tabelas RLS sem policy
- Estado: DONE_WITH_EVIDENCE
- Inventário 2026-08-06: 158 tabelas `public`, TODAS com RLS ativo
- Única sem policy: `backup_is_venda_loja_20260805` → decisão: inacessível por design (0 grants, recuperação via service_role/psql), registrada em COMMENT
- Migration: `20260806150000_revoke_anon_public_execute_functions.sql`, commit `65ca35b2` push OK

---

## C0.5 — Revisão SECURITY DEFINER / grants
- Estado: DONE_WITH_EVIDENCE
- Inventário grants: 90 {authenticated,service_role} + 78 {PUBLIC,anon,authenticated,service_role} + 34 {service_role} + 17 {postgres} + 11 {anon,...}
- Superfície anônima removida: REVOKE PUBLIC (78) + REVOKE anon nominal (78+11) + default privileges (funções futuras não nascem com PUBLIC/anon)
- Estado final: 179 {authenticated,service_role} + 34 {service_role} + 17 {postgres}; **0 funções executáveis por anon**
- Amostragem de corpos auditados (auth interna OK): get_lancamentos_rede_periodo, get_lancamentos_referencia_dia, criar_plano_acao, liberar_fechamento_por_token, consultar_liberacao_por_token, mx_score_recalcular_loja, get_owner_network_cockpit
- Views: 6 com `security_invoker=true` confirmado em produção; políticas de `oportunidades`/`lancamentos_diarios` escopadas por papel/loja
- Testes negativos: anon → 401/42501 em mx_database_health e listar_benchmark_anonimo_lojas
- Testes positivos: gerente autenticado → mx_database_health HTTP 200 `true`; benchmark → 400 P0001 (validação interna de papel, comportamento correto)

---

## C0.6 — Edge Functions
- Estado: IN_PROGRESS (auditoria fonte concluída; 6 sem JWT com proteção interna comprovada)
- 22 funções; 16 com verify_jwt=True; 6 sem JWT auditados:
  - `request-password-recovery`: rate limit RPC + CORS allowlist
  - `store-pre-registration`: rate limit + senha temporária + CORS allowlist
  - `google-oauth-handler`: state OAuth validado (consumed_at, expiry, redirect_uri mismatch)
  - `google-calendar-sync`: exige Bearer token
  - `google-meet-ata`: `x-mx-cron-secret` (MX_CRON_SECRET)
  - Plano original dizia 13 sem JWT → 7 já haviam sido corrigidas em sessões anteriores

---

## Fases 1-18
- Estado: NOT_STARTED (aguardando baseline)