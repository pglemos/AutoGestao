# Relatório de Observabilidade MX

## Resumo executivo

A camada de observabilidade do frontend, do build e do banco foi implementada e
comprovada com evidência real: o Sentry recebeu releases com source maps, o
bundle de produção carrega o DSN sem vazar o token de build, e as tabelas de
telemetria existem no Supabase com RLS ativa e `anon` sem nenhum grant.

A execução foi **interrompida antes do merge para `main`** por dois motivos
externos ao trabalho, descritos em "Bloqueios". O estado é seguro: nada foi
mesclado, a produção continua servindo o último deployment saudável, e todas as
alterações estão isoladas na branch `feat/observability-full`.

## Data e executor

- Data: 2026-07-29
- Executor: agente técnico (Claude Opus 5), sessão autorizada pelo proprietário
- Repositório: `pglemos/MXGESTAOPREDITIVA`
- Branch de trabalho: `feat/observability-full` (a partir de `main` @ `21a7fd43`)

## GitHub

| Item | Estado |
|---|---|
| Branch criada | `feat/observability-full` |
| Commits do agente | `917dfddb`, `88cae017`, `30ca45d8` |
| Commit de terceiro na mesma branch | `0406cabf` (ver Bloqueios) |
| Secrets no diff | nenhum — scanner executado sobre o diff staged |
| Typecheck | `tsc --noEmit` exit 0 em todos os commits |
| ESLint | 0 erros (6 warnings, 5 deles preexistentes) |

## Vercel

| Item | Estado | Evidência |
|---|---|---|
| Plano | Hobby (gratuito) | `GET /v2/teams` → `plan: hobby` |
| Web Analytics | habilitado + pacote instalado e montado | `webAnalytics.enabledAt` presente; `@vercel/analytics@2.0.1` |
| Speed Insights | habilitado + pacote instalado e montado | `speedInsights.id` presente; `@vercel/speed-insights@2.0.0` |
| Variáveis Sentry | 9 criadas em Production/Preview | ver tabela abaixo |
| `/api/health` | Function responde JSON real | HTTP 503 com corpo válido no preview `88cae017` |
| Release = SHA | confirmado | `release: 88cae017399c36c9e62c489b00e79c873321a213` na resposta do health |
| Recurso pago ativado | nenhum | — |

Variáveis configuradas (valores ocultos): `VITE_SENTRY_DSN`,
`VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_TRACES_SAMPLE_RATE`,
`VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN` (encrypted),
`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_ENVIRONMENT`.

## Supabase

| Item | Estado | Evidência |
|---|---|---|
| Projeto | `fbhcmzzgwjdgkctlfvbo`, região `sa-east-1` | Management API |
| Security Advisor | **0 issues** | `GET /advisors?lint_type=security` |
| Performance Advisor | **0 issues** | `GET /advisors?lint_type=performance` |
| Extensões | `pg_cron` 1.6.4, `pg_net` 0.19.5 | `pg_extension` |
| Cron jobs ativos | 8 | `cron.job` |
| Agregador de cron | roda e grava 9 linhas por execução | `mx_critical_jobs_health()` → `{"status":"ok","total":8,"degraded":0}` |
| Idade do cron crítico | passou de sentinela para 14 s | `mx_critical_cron_age_seconds()` |
| Edge Functions instrumentadas | 5 (4 críticas + agregador) | `deno check` limpo, deploy ACTIVE |
| Secrets de Edge | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `SENTRY_CRON_DSN` | listados por nome; valores ocultos |
| Migrations aplicadas | `20260729050000_…persistent_logs.sql`, `20260729060000_…cron_health.sql` | HTTP 201 |
| RLS | ativa nas 5 tabelas novas | `pg_tables.rowsecurity = true` |
| Policies | 1 policy de SELECT por tabela, via `eh_administrador_mx()` | `pg_policies` |
| Grants para `anon` | nenhum | `role_table_grants` vazio |
| Escrita | sem policy; apenas SECURITY DEFINER para `service_role` | migration |
| RPC de saúde de cron | `mx_critical_cron_age_seconds()` responde | retorno `2147483647` (sentinela, sem execução ainda) |
| Recurso pago ativado | nenhum | — |

Decisão relevante: a policy de leitura reusa `eh_administrador_mx()`, a mesma
função já usada por `logs_auditoria` e `rpc_error_log`. A primeira versão da
migration criava uma função `is_mx_admin()` baseada numa tabela `profiles` — que
**não existe** neste schema. O erro foi encontrado ao inspecionar o schema antes
de aplicar, e corrigido antes de qualquer execução.

## Sentry

| Item | Estado | Evidência |
|---|---|---|
| Organização | `synvolt` | API |
| Projetos criados | `mx-performance-frontend`, `mx-performance-edge`, `mx-performance-health` | HTTP 201 nos três |
| DSNs | emitidos e o do frontend está em uso | DSN presente no bundle publicado |
| Releases | `917dfddb…`, `88cae017…` | `GET /organizations/synvolt/releases/` |
| Source maps | 2 artifact bundles, **360 arquivos cada**, associados ao SHA | `files/artifact-bundles/` |
| Token no bundle | **não vazou** | busca por `sntryu_` no JS publicado → sem ocorrência |
| Cron Monitor | `mx-critical-jobs-health` ativo, schedule `0 * * * *` | HTTP 201 |
| Check-ins | `in_progress`, `ok`, `error` — os três registrados | `GET /monitors/…/checkins/` |
| Check-in automático | publicado pela Edge Function | `{"status":"ok","duration":506000}` em 05:01:35Z |
| Uptime Monitor | `MX health endpoint`, GET a cada 300 s, ativo | id `7931281` |
| Alert rules | 8 regras por e-mail nos 3 projetos | `GET /projects/…/rules/` |
| Recurso pago ativado | nenhum | — |

Regras de alerta criadas: novo erro no frontend, regressão, pico de erros
(>50/h), muitos usuários afetados (>10/h), erro em Edge Function, pico de falhas
Edge (>20/h), falha de health/cron.

## Testes executados

| Teste | Comando/Ação | Resultado | Evidência |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASSOU | exit 0 |
| ESLint | `npx eslint 'src/**/*.{ts,tsx}'` | PASSOU | 0 erros |
| Token lint | `npm run lint` | **FALHOU** | 3 violações, todas em arquivos de terceiro |
| Build local | `npm run build` | PASSOU | exit 0, `built in 6.13s` |
| `.map` no build local | `find dist -name '*.map'` | 0 arquivos | sem token local, sourcemap desligado |
| Deploy preview | push → Vercel | READY (2×) | `88cae017`, `917dfddb` |
| `/api/health` | GET no preview | responde JSON, 503 correto | corpo com release, environment, correlation |
| Correlation ponta a ponta | header `x-correlation-id` no health | ecoado na resposta | `"correlation_id":"smoke-health-0002"` |
| Source map upload | Sentry API | 360 arquivos por release | `artifact-bundles` |
| `sourceMappingURL` no bundle | fetch do JS publicado | ausente (modo `hidden`) | — |
| `.map` servido por HTTP | GET `/assets/index-*.js.map` | não existe (cai no SPA fallback) | `content-type: text/html` |
| Vazamento de token no bundle | busca por `sntryu_` | nenhum | — |
| RLS das tabelas novas | `pg_tables`, `pg_policies`, grants | conforme | — |
| `deno check` das Edge Functions | 5 fontes | PASSOU | 0 erros |
| Deploy das Edge Functions | Supabase CLI, uma a uma | 5 ACTIVE | versões v12/v32/v49/v62 + nova |
| Correlation no Edge (OPTIONS) | 4 funções | header ecoado nas 4 | `x-correlation-id` + `x-trace-id` |
| Correlation no log do Supabase | busca pelo id do smoke | encontrado | log com `deno_deployment_id`, `sb_execution_id`, `duration_ms` |
| Agregador de cron ponta a ponta | POST na Edge Function | 200, 8 jobs, 0 degradados | check-in `ok` no Sentry |
| Advisors do Supabase | security + performance | 0 issues | — |
| Sonda nova do health | `GET /auth/v1/health` | 200 (GoTrue) | confirma a correção do falso negativo |

## Correlação ponta a ponta

Comprovado: `release` do Sentry == SHA do commit == `release` retornado por
`/api/health` == `githubCommitSha` do deployment Vercel. O `correlation_id`
enviado no header é ecoado pela Function.

**Não comprovado ainda**: o caminho completo Sentry issue → Supabase RPC →
commit, porque depende do smoke test de erro em produção, que não foi executado
(ver Bloqueios).

## Uso das franquias gratuitas

| Plataforma | Recurso | Limite atual | Uso atual | Estado |
|---|---|---:|---:|---|
| Vercel | Plano | Hobby | — | gratuito |
| Vercel | Web Analytics | incluso no Hobby | 0 eventos (ainda não em prod) | gratuito |
| Vercel | Speed Insights | incluso no Hobby | 0 pontos | gratuito |
| Sentry | Projetos | ilimitado na org | 3 | gratuito |
| Sentry | Releases/source maps | incluso | 2 releases, 720 artefatos | gratuito |
| Supabase | Plano | Free | — | gratuito |

## Recursos bloqueados por plano

Nenhum recurso pago foi ativado e nenhum trial foi iniciado.

## Falhas encontradas

1. **`/api/health` respondia HTTP 500 (`FUNCTION_INVOCATION_FAILED`)** — o
   handler usava `export default function`, mas as funções deste projeto
   exportam `{ fetch }`. Corrigido em `88cae017` e verificado.
2. **Sonda `supabase_api` acusava falha falsa** — usava a raiz `/rest/v1/`, que
   aceita apenas a `service_role` e responde 401 para a `anon`. Trocada por
   `/auth/v1/health`. Corrigido em `30ca45d8`.
3. **`sourcemap: true` incondicional** — qualquer build sem `SENTRY_AUTH_TOKEN`
   publicava o código-fonte original. Agora só gera source map quando o upload
   está configurado, em modo `hidden`, e falha o build se o upload não ocorrer.
4. **Patch global de `fetch` no `correlation.ts`** — trocava `globalThis.fetch`
   por chamada e restaurava no `finally`. Com duas chamadas concorrentes, o
   `finally` da primeira restaurava o global por cima do da segunda, vazando o
   header para requisições alheias e podendo deixar o wrapper instalado
   permanentemente. Substituído por um único interceptador com pilha de escopo.

## Rollbacks

Nenhum rollback foi necessário. Nada foi mesclado em `main` pelo agente.

## Bloqueios

### 1. Outra sessão commitando na mesma branch

Durante a execução, os arquivos `src/components/MxSidebarShell.tsx` e
`src/design-system/sidebar/tokens.ts` foram modificados por um processo que não
é este agente, e em seguida commitados como `0406cabf` **dentro da branch
`feat/observability-full`**. Esse commit não foi criado nem solicitado aqui, e
não foi alterado nem revertido.

### 2. Produção com build quebrado — causa externa

O commit `0406cabf` também foi para `main`. O deployment de produção resultante
está em estado **ERROR**: ele introduz `#0A0A0A` literal em três pontos, o que
faz `scripts/lint-tokens-ast.mjs` falhar, e esse script roda dentro do
`buildCommand` da Vercel (`npm run typecheck && node
scripts/verify_carteira_base44_parity.mjs && npm run build`).

O site público continua respondendo HTTP 200 porque o alias ainda aponta para o
último deployment saudável (`21a7fd43`). Ou seja: **produção está servindo
código antigo e qualquer deploy novo falhará até que essas três violações sejam
resolvidas** — inclusive o deploy da observabilidade.

Isso não é consequência do trabalho de observabilidade: os dois previews
anteriores (`917dfddb` e `88cae017`), que continham todo o código desta entrega,
construíram com sucesso.

## Pendências reais

Itens do prompt mestre que ainda não têm evidência e dependem do desbloqueio
acima:

- STATUS: PARCIAL — merge para `main` e deploy de produção
  - MOTIVO: build de produção quebrado pelo commit `0406cabf`, de terceiro
  - AÇÃO RESTANTE: resolver as 3 violações de token; então mesclar e deployar
- STATUS: PARCIAL — smoke test de erro no frontend com stack em TS/TSX
  - MOTIVO: exige a build em produção com os source maps já publicados
- STATUS: PENDENTE — dashboards do Sentry
  - MOTIVO: dashboards sem dado real de produção ficariam vazios; fazem sentido
    depois do primeiro deploy com tráfego
- STATUS: PENDENTE — teste dos 4 perfis (vendedor, gerente, dono, Admin MX)
  - MOTIVO: depende do frontend instrumentado estar em produção
- STATUS: PARCIAL — Metric Monitors
  - MOTIVO: os 8 alertas de issue estão ativos; alertas por métrica precisam de
    baseline real, que só existe após o primeiro deploy com tráfego
  - AÇÃO RESTANTE: definir thresholds a partir de 7 dias de dados

Concluídos desde a primeira versão deste relatório: instrumentação das Edge
Functions críticas, agregador de cron com check-in, Uptime Monitor, Cron
Monitor, alertas por e-mail, e os dois advisors do Supabase.

## Conclusão baseada em evidências

O que está comprovado por evento real: projetos e releases no Sentry, 720
artefatos de source map associados aos SHAs corretos, DSN ativo no bundle sem
vazamento do token de build, `/api/health` respondendo com release e correlation
corretos, e as cinco tabelas de telemetria criadas com RLS e sem acesso `anon`.

O que **não** está comprovado, e portanto não é declarado como pronto: o fluxo
completo de um incidente em produção. Esse passo depende de um deploy de
produção bem-sucedido, que hoje está bloqueado por uma alteração externa a este
trabalho.
