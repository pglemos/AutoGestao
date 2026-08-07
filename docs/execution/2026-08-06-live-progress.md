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
- Estado: DONE_WITH_EVIDENCE (commit `e74aea63`, push OK)
- Promoção: 9 vars de superfície do template canônico (`--mx-page-bg`, `--mx-surface`, `--mx-surface-muted`, `--mx-border`, `--mx-border-strong`, `--mx-text`, `--mx-text-muted`, `--mx-accent`, `--mx-accent-soft`) movidas de `[data-mx-internal-scope='true']` para `:root`, via nova escala primitiva `--mx-gray-*` (gray-50..800 byte a byte) — camada semântica segue sem valores crus (contrato de tokens verificado)
- Remoção: regras legadas em `internal-mx-manager-scope.css`, atributo `data-mx-internal-scope="true"` em `InternalMxVisualScope.tsx` e `SharedNavigation.stories.tsx`, shim `owner-b44/use-mobile.jsx` (import migrado para `@/hooks/useIsMobile`)
- CI gate: `scripts/audit-legacy-scopes.mjs` + 4 testes (node:test); audit de 1848 arquivos = 0 violações; step adicionado a `management-design-system-audit-v3.yml`
- Correções pré-existentes no caminho: z-index arbitrários migrados para `--mx-z-*` (`b87da0ef`); teste de password policy alinhado à política de 8+ caracteres (`5906bff3`) — todos os 1962 testes verdes

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
- Estado: DONE_WITH_EVIDENCE (EV-C06-001)
- 22 funções; 16 com verify_jwt=True; 6 sem JWT auditados:
  - `request-password-recovery`: rate limit RPC + CORS allowlist
  - `store-pre-registration`: rate limit + senha temporária + CORS allowlist
  - `google-oauth-handler`: state OAuth validado (consumed_at, expiry, redirect_uri mismatch)
  - `google-calendar-sync`: exige Bearer token
  - `google-meet-ata`: `x-mx-cron-secret` (MX_CRON_SECRET)
  - Plano original dizia 13 sem JWT → 7 já haviam sido corrigidas em sessões anteriores

---

## C0.7 — Proteger main
- Estado: DONE_WITH_EVIDENCE (EV-C07-001 + EV-C07-002)
- Proteção completa aplicada via `gh api -X PUT repos/pglemos/MXGESTAOPREDITIVA/branches/main/protection`:
  - PR obrigatório com 1 aprovação + dismiss stale reviews
  - Status checks obrigatórios (strict), 5 check-runs reais: `typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review` (EV-C07-002: GitHub compara check-run names, não workflow names — corrigido no PR #180)
  - Force-push bloqueado, deletes bloqueados, conversation resolution obrigatória
  - `enforce_admins: false` (break-glass intencional, decisão deliberada — ver resposta CodeRabbit PR #180)
- Atenção: script legado `scripts/setup-branch-protection.sh` referencia 7 checks antigos inexistentes — não executar; usar o payload acima
- Workflow da execução autônoma: push direto bloqueado → commits via PR + merge

---

## Fases 1-18
- Estado: NOT_STARTED (aguardando baseline)
---

## C0.8 — Limpar branches
- Estado: DONE_WITH_EVIDENCE (EV-C08-001)
- 29 branches locais eliminadas: 18 merged (`git branch -d`) + 5 não-merged verificadas contra main (`-D`: conteúdo já presente na main ou regressão conhecida EV-C02-001) + 6 em worktrees órfãos liberadas (`git worktree prune` + `remove --force`)
- 2 branches remotas do bot Jules deletadas (`main-2221599864479952096`/`main-8869415744512905224`); PRs #176/#177 fechados como superseded
- Total: 31 branches (29 locais + 2 remotas); dependabot #178/#179 ficam fora da contagem (deps, não trabalho)
- Estado final: `git branch` → só `main`; remoto → só `origin/main` (+ dependabot #178/#179)
- Obs: GitHub reportou 83 vulnerabilidades dependabot (3 critical, 44 high) — item já mapeado para Fase 14 (Segurança e Dependências)

---

## C0.9 — Revalidar deployment
- Estado: DONE_WITH_EVIDENCE (EV-C09-001)
- Último deployment Production (id 5785625399) = `5a8c4b0f` = main pós-C0.3, status success, HTTP 200
- PR #180 (docs-only) não gerou novo build de produção — `git diff 5a8c4b0f..4a3784f5` = só docs/execution/
- Código em produção idêntico ao baseline validado nos prints C0.3

---

## T0.3 — Inventariar acessos
- Estado: DONE_WITH_EVIDENCE (EV-T03-001)
- GitHub: 1 collaborator (pglemos, admin), 0 teams, 0 deploy keys, 6 secrets repo-level, Actions `allowed_actions: all`, protection sem exemptions
- Vercel: team synvolt 1 membro; projeto mxperformance sem members diretos; git github/pglemos
- Supabase: org MX GESTAO PREDITIVA 1 membro (Owner, **MFA desabilitado**); API keys anon/service_role legacy + default publishable/secret
- Gaps → Fase 14: MFA Supabase, MFA GitHub não verificável, allowlist de Actions

---

## C0.10 — Fechar lacunas de comprovação
- Estado: DONE_WITH_EVIDENCE
- Lacunas fechadas:
  - **T0.3 (Inventariar acessos)** — estava IN_PROGRESS sem conteúdo; executado e documentado em EV-T03-001 (GitHub/Vercel/Supabase)
  - **EV-BASELINE-003 gap de SHA** — deployment de produção revalidado em EV-C09-001: produção = `5a8c4b0f` = main pós-C0.3 (SHA do gap `8c5cfbf7` era deploy intermediário já supersedido)
  - **Contexts de proteção** — EV-C07-002 corrigiu nomes de check-run; primeira PR pós-proteção (#180) validou o fluxo completo: PR → checks (5/5 requeridos) → CodeRabbit → merge
  - **Branches sem dono** — worktrees órfãos em /tmp e .claude/worktrees removidos; nenhum branch de trabalho remanescente
- Total de evidências no ledger: 21 (EV-BASELINE-001..005, EV-C01-001..009, EV-T03-001)
- Estados do plano: T0.1-T0.5 = DONE; C0.1-C0.10 = DONE_WITH_EVIDENCE
- Baseline C0 encerrado — Fases 1-18 prontas para iniciar (Fase 14 absorve gaps de MFA/allowlist de Actions)

---

## C0.7 — Configuração de review (decisão do owner)
- EV-C07-003: requisito de aprovação removido a pedido do usuário (autor não pode aprovar PR próprio; repo tem 1 humano)
- Proteção mantém: 5 checks strict, force-push bloqueado, deletes bloqueados
