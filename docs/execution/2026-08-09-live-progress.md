# Live progress — estado factual atual

## Auditoria pós-commit documental — 2026-08-09T18:23:27Z

- **Tip documental anterior:** `b77c459e` (`docs(mx): record final release and browser evidence`) foi sucedido pelo tip atual `0148cf1a` (`docs(mx): record post-push deployment audit`) em `main`/`origin/main`.
- **Vercel documental:** o check `FD5S5QdjvPeDvzdRhv8SEgUmRztf` terminou `success` com `Canceled by Ignored Build Step`; não houve novo runtime, e o deployment de produção continua `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi` no SHA `46c236db…`.
- **Health pós-push:** o alias canônico `https://www.mxperformance.com.br/api/health` respondeu HTTP 200, `healthy`, `critical_crons=ok`, release `46c236dbb4f16c942b9d0c912ca91298fa400001`.
- **Dependabot:** a API do GitHub confirmou 81 alertas abertos no default branch: 3 críticos, 42 altos, 28 médios e 8 baixos. Esse bloqueio remoto é mais amplo que o `npm audit` local, que identificou o high corrigível ausente em `xlsx@0.18.5`.

O commit documental não altera o artefato runtime. O estado geral permanece `PARCIALMENTE CONCLUÍDO, COM BLOQUEIOS EXTERNOS COMPROVADOS`.

## Validação final do SHA publicado — 2026-08-09T18:20:33Z

O release `46c236dbb4f16c942b9d0c912ca91298fa400001` está confirmado no remoto e em produção:

- **GitHub/CI:** os 7 workflows disparados para o SHA terminaram `success`: Gitleaks `31328220238`, Design System `31328220214`, Quality Gates `31328220232`, Management Design System Audit V3 `31328220246`, Atomic Design `31328220235`, ESLint a11y `31328220220` e Typecheck/unit tests `31328220224`.
- **Vercel:** `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi`, `production`, `READY`; aliases `mxperformance.vercel.app`, `www.mxperformance.com.br` e `mxperformance.com.br` apontam para o deployment.
- **Health:** `https://mxperformance.com.br/api/health` respondeu HTTP 200 com `status=healthy`, `critical_crons=ok` e `release=46c236dbb4f16c942b9d0c912ca91298fa400001`.
- **QA browser autenticado:** no viewport real de `854x803`, Vendedor passou `/home`, `/notificacoes` e `/perfil`; Gerente passou `/home`, `/meta-loja` e `/notificacoes`; Dono passou `/meta-loja` e `/notificacoes`; `synvollt@gmail.com` passou `/lojas`, busca de `MX CONSULTORIA`, painel da unidade e `/notificacoes`.
- **Perfil efetivo do quarto acesso:** o login fornecido como “Administrador MX” foi resolvido pela aplicação como `administrador_geral` (Módulo Administrativo), não como `administrador_mx`.
- **Runtime Realtime:** no painel autenticado, o WebSocket abriu em `/realtime/v1/websocket`; foram observados joins com `postgres_changes` para `notificacoes` e respostas `phx_reply`, com payloads sanitizados e sem erro de console.
- **Layout/console:** as rotas exercitadas não apresentaram overflow horizontal nem erros de console após reload; `/meta-loja` emitiu apenas o warning não bloqueante do Recharts sobre medição inicial `width(-1)/height(-1)`.
- **Artefatos:** screenshots ignorados pelo Git em `output/playwright/2026-08-09-vendedor-perfil.png`, `output/playwright/2026-08-09-gerente-meta-loja.png` e `output/playwright/2026-08-09-admin-store-panel.png`.

**Estado geral vigente:** `PARCIALMENTE CONCLUÍDO, COM BLOQUEIOS EXTERNOS COMPROVADOS`.

**Bloqueios residuais:** Sentry ainda exige reautenticação para evento sintético/source-map/alerta; restore/PITR/rollback real não foram executados em ambiente seguro; não há credencial comprovada para `administrador_mx` nem `consultor_mx`; `xlsx@0.18.5` permanece high sem correção upstream. A matriz integral continua distinguindo prova de quatro perfis de cobertura total dos seis perfis.

## Atualização pós-push — 2026-08-09T18:07:42Z

O conjunto Realtime foi publicado diretamente na `main` no SHA `46c236dbb4f16c942b9d0c912ca91298fa400001` (`fix(mx): publish notificacoes through Supabase Realtime`). O remoto confirmou `fa1b491a..46c236db` em `origin/main`; o deployment/CI desse SHA ainda está em acompanhamento.

- **Gates locais no SHA publicado:** `npm test` PASS (2.590 testes, 18.135 expectativas, 0 falhas), `npm run typecheck` PASS, `npm run lint` PASS (1 warning a11y preexistente em `HelpTooltip.tsx`), `npm run build` PASS, sourcemaps públicos ausentes, `npm run check:bundle-size` PASS (1.806,96/1.860 KB gzip), auditoria Design System PASS e `git diff --check` PASS.
- **Migration:** Supabase lista `20260809172708_add_notificacoes_realtime_publication`; SQL atual confirma `supabase_realtime` existente e `public.notificacoes` publicada.
- **CodeRabbit:** revisão do diff corrigido terminou sem novos findings; a única observação inicial sobre caminho relativo foi corrigida com `import.meta.url`.
- **Secrets:** `gitleaks` passou no commit `HEAD^..HEAD` e nos dois arquivos novos; o scan histórico completo permanece separado como falha histórica (116 achados em 1.910 commits), não como leak introduzido neste release.
- **Sentry:** CLI confirmou a release anterior `fa1b491…` com 0 eventos novos e a busca por essa release retornou lista vazia; ainda falta evento sintético/source-map/alerta específico do SHA novo.

**Estado geral:** `PARCIALMENTE CONCLUÍDO — CÓDIGO CORRIGIDO E PUBLICADO; CI, DEPLOY FINAL E QA AUTENTICADO DO SHA NOVO AINDA PENDENTES`.

## Atualização de gates — 2026-08-09T17:04:10Z

Gate local reexecutado no SHA `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`: lint, typecheck, 2.589 testes/18.131 expectativas, build, sourcemap, bundle e rotas/dados passaram. `git bundle verify` também passou. O único bloqueio de auditoria de dependências é `xlsx@0.18.5` high sem correção upstream; CodeRabbit foi tentado e bloqueado por limite/seat da organização.

- **Gerado em:** 2026-08-09T17:04:10Z
- **Branch:** `main`
- **SHA do checkout:** `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`
- **Status geral:** `PARCIALMENTE IMPLEMENTADO — PRODUÇÃO OPERACIONAL, GARANTIAS COMPLETAS AINDA PENDENTES`
- **Snapshot Supabase:** `2026-08-09T15:47:14.419Z` (fonte SHA `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`)

| Task | Estado atual | Evidência atual | Próximo fechamento |
|---|---|---|---|
| C0.1 Design System | `TESTED_LOCAL_ONLY` | Gates locais do checkout | Confirmar workflow no SHA final |
| C0.2 Dono / PR #175 | `TESTED_LOCAL_ONLY` | Conteúdo necessário já está na main; PR fechada | Browser autenticado e dados reais |
| C0.3 Scopes legados | `DONE_WITH_EVIDENCE` local | Guard encontrou 0 imports runtime | Revalidar no CI/produção |
| C0.4 RLS | `TESTED_LOCAL_ONLY` | 225 tabelas públicas com RLS e 0 sem policy no snapshot | Testes por perfil/tenant |
| C0.5 SECURITY DEFINER | `IN_PROGRESS` | 211 catalogadas; anon=0; auth=155; service_role=194 | Classificação e testes por assinatura |
| C0.6 Edge Functions | `IN_PROGRESS` | 22 funções catalogadas; matriz atual registra verify_jwt | OPTIONS/sem auth/JWT/tenant por endpoint |
| C0.7 Proteção main | `DONE_WITH_EVIDENCE` | Configuração GitHub já validada no checkpoint | Revalidar após push final |
| C0.8 Branches | `DONE_WITH_EVIDENCE` inventário | 3 branches remotas totais: `main` + 2 Dependabot com PRs abertas | Preservar as duas branches ativas; não há obsoletas adicionais |
| C0.9 Deployment | `NOT_REEVALUATED` | Health/deployment do checkpoint anterior | Revalidar após SHA final |
| C0.10 Evidências | `IN_PROGRESS` | Snapshot e matriz atuais criados | Browser, Sentry, restore e rollback |

## Bloqueios explícitos

- QA browser autenticado completo ainda não capturado.
- Sentry exige reautenticação para evento sintético/source map/alerta.
- CodeRabbit não pôde emitir nova revisão: limite atingido e conta sem seat atribuído à organização.
- Restore/PITR e rollback real ainda não comprovados.
- Admin Geral e Consultor MX não possuem credencial comprovada nesta execução.
