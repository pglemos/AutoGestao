# Evidence ledger — MX autônomo — 2026-08-04

Estado deste ledger: `PASS_WITH_FINDINGS`

## Proveniência preservada

- Evidência histórica do mesmo dia, mas não relabelada como atual:
  - `parallel-git-vercel-audit.md` (`2026-08-04T08:52:53Z` a `2026-08-04T08:56:13Z`, SHAs `9fdd484f...` e `11a9465f...`)
  - `parallel-supabase-audit.md` (`2026-08-04T08:58:30Z`, SHA `9fdd484f...`)
  - `parallel-quality-audit.md` (`2026-08-04T05:54:42-03:00`, SHA `9fdd484f...`)

## EV-BASE-002 — backup Git anotado e bundle verificável

- Status: `PASS_WITH_FINDINGS`
- Ambiente: checkout local `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`
- Perfil / rota / viewport: não aplicável
- Timestamp histórico preservado: `2026-08-04T05:31:59-03:00`
- Timestamp de revalidação desta rodada: `2026-08-04T06:39:31-03:00`
- SHA do artefato de backup: `11a9465f253ce8f96052db70c9171b14425e9d4e`
- SHA do checkout que revalidou a prova: `d3ab89e175492c52832dc763cf1169bbc30f121c`
- Comando / ação:
  - `git show --no-patch --format=fuller pre-main-autonomous-20260804-051820 | sed -n '1,20p'`
  - `shasum -a 256 /Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle`
  - `git bundle verify /Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle`
- Resultado esperado: tag anotada ainda aponta para o SHA baseline e o bundle continua íntegro/verificável.
- Resultado observado:
  - tag `pre-main-autonomous-20260804-051820`
  - `TaggerDate: Tue Aug 4 05:18:20 2026 -0300`
  - mensagem `Backup autonomous main execution`
  - tag/commit alvo `11a9465f253ce8f96052db70c9171b14425e9d4e`
  - bundle path `/Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle`
  - bundle SHA-256 `f345471aef95bf0256b2407c22764cb7dbfd6daed2f1dc5447568451fc12a0a8`
  - `git bundle verify` retornou `is okay`
- Conclusão permitida: a prova explícita de backup Git/bundle foi restaurada com proveniência histórica e revalidação atual; isso não prova restore de Supabase.

## EV-T3-001 — checkout atual e worktree

- Status: `PASS_WITH_FINDINGS`
- Ambiente: checkout local `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:28:15-03:00`
- SHA do checkout observado: `9abfc70a79da46c03ee156b49933310584f85a65`
- Comando / ação:
  - `git rev-parse HEAD`
  - `git branch --show-current`
  - `git status --short --branch`
  - `git worktree list --porcelain`
- Resultado esperado: confirmar SHA atual, branch `main`, worktree corrente e sujeira fora de escopo.
- Resultado observado:
  - `HEAD=9abfc70a79da46c03ee156b49933310584f85a65`
  - branch `main`
  - `## main...origin/main [ahead 6]`
  - `?? mx-v3-csv-VzMBNx/`
  - worktree atual em `main`; worktrees prunable antigos permanecem fora de escopo.
- Conclusão permitida: checkout atual confirmado; divergência local/remota segue aberta; `mx-v3-csv-VzMBNx/` preservado.

## EV-T3-002 — divergência local x remoto

- Status: `PASS_WITH_FINDINGS`
- Ambiente: Git remoto read-only
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:28:15-03:00`
- SHA do checkout que coletou a evidência: `9abfc70a79da46c03ee156b49933310584f85a65`
- Comando / ação:
  - `git ls-remote origin refs/heads/main`
  - `git rev-list --left-right --count origin/main...main`
- Resultado esperado: confirmar o SHA remoto real e a contagem de divergência.
- Resultado observado:
  - `origin/main = 11a9465f253ce8f96052db70c9171b14425e9d4e`
  - divergência `0 6`
- Conclusão permitida: continua verdadeiro que `main` local difere da `main` remota; nenhuma parte desta task pode tratar isso como release provado.

## EV-T3-003 — governança GitHub

- Status: `PASS_WITH_FINDINGS`
- Ambiente: GitHub API read-only
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:38:47-03:00`
- SHA do checkout que coletou a evidência: `d3ab89e175492c52832dc763cf1169bbc30f121c`
- Comando / ação:
  - `gh api repos/pglemos/MXGESTAOPREDITIVA/branches/main --jq '{protected: .protected, protection: .protection.enabled}'`
  - `gh api repos/pglemos/MXGESTAOPREDITIVA/secret-scanning/alerts --paginate --jq 'map(select(.state == "open")) | length'`
- Resultado esperado: confirmar proteção de branch e alertas abertos sem imprimir segredos.
- Resultado observado:
  - `{"protected":false,"protection":false}`
  - `6`
- Conclusão permitida: permanece explícito que não há branch protection e que existem alertas abertos de secret scanning.

## EV-T3-004 — Vercel alias x READY

- Status: `PASS_WITH_FINDINGS`
- Ambiente: Vercel CLI + HTTP público
- Perfil / rota / viewport: rota pública `/api/health`
- Timestamp: `2026-08-04T06:22:17-03:00` a `2026-08-04T06:22:35-03:00`
- SHA do checkout observado durante a evidência: `9abfc70a79da46c03ee156b49933310584f85a65`
- Comando / ação:
  - `vercel list mxperformance --yes`
  - `curl -sS https://mxperformance.vercel.app/api/health`
  - `curl -sS https://mxperformance-kjbp4sqkc-synvolt.vercel.app/api/health`
- Resultado esperado: identificar alias público, deployment READY recente e release servida por cada um.
- Resultado observado:
  - alias público `mxperformance.vercel.app` saudável, `release=1b99c0ab82618038fa0826557e7b8762e6247b2b`
  - deployment READY consultado `mxperformance-kjbp4sqkc-synvolt.vercel.app` saudável, `release=7387fb325dd645aaa2f832895e341c541c1f1d60`
  - nenhum dos dois corresponde ao checkout atual `9abfc70a79da46c03ee156b49933310584f85a65`
- Conclusão permitida: continua verdadeiro que há mismatch entre código local, deployment READY observado e runtime público.

## EV-T3-005 — Supabase lint live

- Status: `PASS_WITH_FINDINGS`
- Ambiente: Supabase CLI linked
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:28:15-03:00`
- SHA do checkout que coletou a evidência: `9abfc70a79da46c03ee156b49933310584f85a65`
- Comando / ação: `supabase db lint --linked`
- Resultado esperado: revalidar se os defeitos live citados nos relatórios anteriores ainda existem.
- Resultado observado:
  - `public.gerar_alertas_loja` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.mx_score_recalcular_loja` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.mx_score_atualizar_atraso_plano` → `22P02 invalid input value for enum score_scope_type: "loja"`
  - `public.consolidar_dashboard_departamento` → `42803 column "departamento_kpi_snapshot.period" must appear in the GROUP BY clause`
  - warnings ainda presentes em `public.admin_create_store`, `public.admin_update_store`, `public.salvar_metas_indicador_planejamento`
- Conclusão permitida: continua verdadeiro que o linked project possui defeitos live relevantes em funções críticas.

## EV-T3-006 — riscos estáticos de Edge / auth / storage

- Status: `PASS_WITH_FINDINGS`
- Ambiente: código versionado do repositório
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:28:15-03:00`
- SHA do checkout que coletou a evidência: `9abfc70a79da46c03ee156b49933310584f85a65`
- Comando / ação: `rg -n "Access-Control-Allow-Origin|verify_jwt\\s*=\\s*false|Authorization: Bearer|auth\\.getUser\\(|pre-cadastro-avatares|evidencias-consultoria" supabase`
- Resultado esperado: verificar se os riscos citados pelos relatórios anteriores ainda existem no checkout atual.
- Resultado observado:
  - `supabase/functions/_shared/cors.ts:2` → `Access-Control-Allow-Origin: "*"`
  - `supabase/functions/_shared/auth.ts:51` → `sessionClient.auth.getUser()`
  - `supabase/config.toml:372,375,378,381,390` → `verify_jwt = false`
  - `supabase/migrations/20260729100000_fix_storage_bucket_policies.sql` ainda referencia `pre-cadastro-avatares` e `evidencias-consultoria`
- Conclusão permitida: riscos estáticos de CORS wildcard, auth manual em Edge e exposição de buckets continuam presentes no checkout atual.

## EV-T3-007 — advisories de runtime

- Status: `PASS_WITH_FINDINGS`
- Ambiente: NPM registry read-only
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:38:47-03:00`
- SHA do checkout que coletou a evidência: `d3ab89e175492c52832dc763cf1169bbc30f121c`
- Comando / ação: `npm audit --omit=dev --json | jq ...`
- Resultado esperado: confirmar advisories atuais de produção sem despejar árvore completa.
- Resultado observado:
  - `2` vulnerabilidades `high`
  - `react-router` (`GHSA-qwww-vcr4-c8h2`, faixa `>=7.12.0 <8.3.0`)
  - `react-router-dom` afetado por dependência do `react-router`
  - correção sugerida implica mudança semver-major / downgrade de pacote para `react-router-dom@7.11.0`
- Conclusão permitida: advisories high de runtime continuam explícitos e não podem ser omitidos.

## EV-T3-008 — blockers de Sentry / gitleaks

- Status: `BLOCKED_EXTERNAL`
- Ambiente: shell local
- Perfil / rota / viewport: não aplicável
- Timestamp: `2026-08-04T06:38:47-03:00`
- SHA do checkout que coletou a evidência: `d3ab89e175492c52832dc763cf1169bbc30f121c`
- Comando / ação:
  - `command -v sentry-cli || true`
  - `command -v gitleaks || true`
  - `printenv | rg '^SENTRY_' || true`
- Resultado esperado: confirmar se a rodada tinha ferramentas/credenciais para validação live.
- Resultado observado:
  - nenhum caminho retornado para `sentry-cli`
  - nenhum caminho retornado para `gitleaks`
  - nenhuma variável `SENTRY_*` no ambiente
- Conclusão permitida: Sentry e gitleaks permanecem bloqueadores externos nesta consolidação.

## EV-T3-009 — matriz de rotas / perfis / viewports

- Status: `NOT_PROVEN`
- Ambiente: consolidação documental
- Perfil / rota / viewport:
  - Consultor MX e Administrador Geral sem sessão autorizada nesta task
  - viewports obrigatórios não reexecutados nesta task
- Timestamp: `2026-08-04T06:38:47-03:00`
- SHA do checkout que registrou a lacuna: `d3ab89e175492c52832dc763cf1169bbc30f121c`
- Ação: reconciliação com `parallel-quality-audit.md` e `docs/execution/2026-08-04-route-matrix.md`
- Resultado esperado: não simular cobertura ausente.
- Resultado observado:
  - sem browser live autenticado nesta task
  - gaps permanecem explícitos para Consultor MX, Administrador Geral e revalidação viewport-perfil atual
- Conclusão permitida: cobertura funcional/visual atual segue parcial e não pode ser marcada como completa.
