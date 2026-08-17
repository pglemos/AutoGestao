# Evidence ledger — snapshot factual atual

## Adendo vigente — release SHA `287a4965` sobre baseline `8f9fe745` — 2026-08-17T16:57:37Z

| ID | Task/grupo | Ambiente | Evidência atual | Estado |
|---|---|---|---|---|
| EV-UI-09 | Gráfico Meta Loja (Recharts) | Produção | Causa raiz: `ResponsiveContainer` computou dimensões `(-1,-1)`; correção via `initialDimension={{ width: 320, height: 288 }}` | DONE_WITH_EVIDENCE |
| EV-UI-10 | Teste `ManagerStoreGoalReference.test.tsx` | Local | 5/5 testes passando | DONE_WITH_EVIDENCE |
| EV-REL-01 | Git/CI | GitHub Actions | SHA `46c236dbb4f16c942b9d0c912ca91298fa400001`; 7 workflows `success` | DONE_WITH_EVIDENCE |
| EV-REL-02 | Deploy Vercel | Produção | `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi` READY; health 200 | TESTED_PRODUCTION |
| EV-REL-03 | Supabase Realtime | Produção | Migration `20260809172708_add_notificacoes_realtime_publication` aplicada; `public.notificacoes` publicada | TESTED_PRODUCTION |
| EV-REL-04 | WebSocket Realtime | Produção | `wss://fbhcmzzgwjdgkctlfvbo.supabase.co/realtime/v1/websocket`; joins `postgres_changes`/`notificacoes`; `phx_reply` recebido | TESTED_PRODUCTION |
| EV-REL-05 | Matriz de papéis (browser) | Produção | Vendedor `/home`, `/notificacoes`, `/perfil`; Gerente + `/meta-loja`; Dono; `synvollt@gmail.com` = `administrador_geral`, `/lojas` | TESTED_PRODUCTION_PARTIAL |
| EV-REL-06 | Screenshots Playwright | Produção | `output/playwright/2026-08-09-vendedor-perfil.png`, `2026-08-09-gerente-meta-loja.png`, `2026-08-09-admin-store-panel.png` (dir ignorado no VCS) | DONE_WITH_EVIDENCE |
| EV-REL-07 | Sentry | Produção | Acesso limitado; "Administrador MX" não comprova o papel (perfil externo) | BLOCKED_EXTERNAL |
| EV-REL-12 | Release SHA `287a4965…` | GitHub Actions | SHA `287a496571499d04e8c8dd8ebb352756a87d5f45`; 7 workflows `success`; Quality Gates `31333622545`; Gitleaks `31333622543` | DONE_WITH_EVIDENCE |
| EV-REL-13 | Deploy Vercel | Produção | `dpl_8T8v8Hxg1aiAAbajeaiaU1tAi8wp` READY; aliases `mxperformance.vercel.app`, `www.mxperformance.com.br`, `mxperformance.com.br` | DONE_WITH_EVIDENCE |
| EV-REL-14 | Healthcheck | Produção | HTTP 200; `release=287a4965…`; `critical_crons=ok`; non-www 308→www→200 | DONE_WITH_EVIDENCE |
| EV-REL-15 | Gates locais | Local | LINT_EXIT=0 (`npm run lint`, out `/tmp/mx-lint-out.log`, 2309 scanned, 0 violations); TYPECHECK_EXIT=0 (`npm run typecheck`, out `/tmp/mx-typecheck-out.log`); TEST_EXIT=0 (`npm test`, out `/tmp/mx-test-out.log`, 3870 pass / 0 fail / 664 files) | DONE_WITH_EVIDENCE |
| EV-ST-01 | Root cause RLS storage | Local | Policy JOINava tabelas internas com RLS própria que ocultava o link → `Object not found` | DONE_WITH_EVIDENCE |
| EV-ST-02 | Migration `20260809205000_fix_consulting_evidence_storage_rls_definer.sql` | Produção | Aplicada via `supabase db push --linked --yes` | DONE_WITH_EVIDENCE |
| EV-ST-03 | Função `public.pode_ler_evidencia_consultoria(text, uuid)` | Produção | `SECURITY DEFINER`; `search_path=public`; sem `PUBLIC EXECUTE`; `EXECUTE` para `authenticated` | DONE_WITH_EVIDENCE |
| EV-ST-04 | Store UUID `467a19d1-af51-4b4f-9b05-d67187a2a759` | Produção | Consultoria vinculada ao store correto; leitura validada pós-migration | TESTED_PRODUCTION |
| EV-CHK-01 | WIP checkin | Local | `git status --short`: 14 modificados + 5 untracked (19 entradas); não commitado; gates locais passando (EV-REL-15) | IN_PROGRESS |
| EV-CHK-02 | `DI-12-dashboard-local-claude.md` | — | Não encontrado (`**/DI-12*` → sem resultados); não citar como evidência | NOT_REEVALUATED |
| EV-CHK-03 | Spec 1060 linhas | — | Nenhum artefato de 1060 linhas em `conductor/` (`spec.md`=46, `migration-legacy-to-aiox/spec.md`=22, `modulo-pdi/spec.md`=64) | NOT_REEVALUATED |

## Rastreabilidade

| ID | Task | Ambiente | Ação/evidência | Resultado observado | Estado |
|---|---|---|---|---|---|
| EV-T0-01 | Adendo vigente | Local | Verificação do snapshot factual | Estrutura do ledger de referência confirmada (102 linhas) | DONE_WITH_EVIDENCE |
| EV-T0-02 | Tag + bundle de backup | Local | Tag `pre-main-autonomous-20260809-101705`; bundle presente | Tag existente e bundle disponível | TESTED_LOCAL_ONLY |
| EV-C0-03 | Inventário WIP | Local | `git status --short` | 14 modificados + 5 untracked | TESTED_LOCAL_ONLY |
| EV-C0-04 | RLS 225 tabelas | Produção | Query de snapshot | 225 tabelas públicas com RLS; 0 sem policy | TESTED_LOCAL_ONLY |
| EV-C0-05 | Funções `SECURITY DEFINER` | Produção | Snapshot `2026-08-09-supabase-security-snapshot.json` | 211 funções; anon=0; authenticated=155; service_role=194 | IN_PROGRESS |
| EV-C0-06 | Edge functions | Produção | Snapshot | 22 edge functions | IN_PROGRESS |
| EV-C0-07 | Regra de leitura | Local | Documentação do ledger | Texto da seção final confirmado | TESTED_LOCAL_ONLY |
| EV-C0-08 | Inventário de branches | Remote | `git branch -r` | 3 branches: `main` + 2 Dependabot com PRs abertos; nenhuma obsoleta deletada | IN_PROGRESS |
| EV-C0-09 | Itens pregressos | Local | Reavaliação | Sem nova evidência nesta rodada | NOT_REEVALUATED |
| EV-C0-10 | Checklist do adendo | Local | Revisão final | A completar antes do commit de release | IN_PROGRESS |

**Gerado em:** 2026-08-17T16:57:37Z
**SHA do checkout:** `8f9fe745c4ff5a1dee641cd8cab74b1e4cac559a`
**Branch:** `main`
**Tag de backup:** `pre-main-autonomous-20260809-101705` (baseline anterior; nenhuma tag nova criada)
**Bundle presente:** sim

O checkout e as mudanças continuam no SHA base abaixo até o commit de release.

**Inventário de branches (remote):** 3 branches — `main` + 2 Dependabot com PRs abertos; nenhuma branch obsoleta deletada.
**Proteção de `main`:** checks exigidos `typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review`.

## Regra de leitura

Este ledger substitui os geradores que marcavam testes como concluídos sem artefato. Matrizes antigas permanecem preservadas como histórico, mas não são evidência da release atual.
