# Evidence ledger — MX autônomo — 2026-08-04

Estado: `TESTED_PRODUCTION`. Frontend publicado — SHA `45889a0baabda8511859be6c18205b5b4aefea1e` live; deployment `dpl_FGLfc8essmaub3BSLv4rGNGcV2pt` READY; pós-push direto de `main` para produção. Gaps remanescentes: browser autenticado, CI artifacts, monitoramento pós-release.

> Estado anterior `PASS_WITH_FINDINGS` / release `IN_PROGRESS` supersedido pela release direta. Evidência histórica pré-release preservada abaixo sem relabeling.

Todos os registros `EV-T3-*` abaixo usam o schema obrigatório. `n/a` sempre traz a justificativa.

## Proveniência pós-release

### EV-RELEASE-001 — estado git e local pós-release

- Requisito: confirmar que HEAD local corresponde ao SHA publicado e que working tree está limpa.
- Ambiente: shell local em `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`.
- Perfil: n/a — inspeção Git.
- Rota/objeto: repositório `main`, working tree e `mx-v3-csv-VzMBNx/`.
- Viewport: n/a.
- Estado exercitado: pós-push direto de `main`.
- Ação: ler HEAD, status e confirmar diretório não rastreado preservado.
- Resultado esperado: HEAD = SHA publicado; apenas `mx-v3-csv-VzMBNx/` não rastreado.
- Resultado observado: `HEAD=45889a0baabda8511859be6c18205b5b4aefea1e`; `?? mx-v3-csv-VzMBNx/`; nenhuma outra modificação ou arquivo staged.
- SHA: `45889a0baabda8511859be6c18205b5b4aefea1e`.
- Deployment: n/a — inspeção local.
- Timestamp: 2026-08-04 (reconciliação pós-release).
- Artefato: saída terminal.
- Conclusão permitida: checkout alinhado ao SHA publicado; diretório do usuário preservado.

### EV-RELEASE-002 — Vercel deployment e health de produção

- Requisito: confirmar deployment READY com SHA exato no alias de produção.
- Ambiente: Vercel deployment e endpoint HTTPS público.
- Perfil: público/não autenticado — `/api/health`.
- Rota/objeto: `https://mxperformance.vercel.app/api/health`.
- Viewport: n/a — chamada HTTP sem renderização.
- Estado exercitado: deployment após push direto de `main`.
- Ação: verificar deployment ID, estado e response do health endpoint.
- Resultado esperado: READY com `release` = SHA publicado e `environment=production`.
- Resultado observado: deployment `dpl_FGLfc8essmaub3BSLv4rGNGcV2pt` READY; alias `/api/health` retornou `healthy`, `release=45889a0baabda8511859be6c18205b5b4aefea1e`, `environment=production`.
- SHA: `45889a0baabda8511859be6c18205b5b4aefea1e`.
- Deployment: `dpl_FGLfc8essmaub3BSLv4rGNGcV2pt`.
- Timestamp: 2026-08-04 (reconciliação pós-release).
- Artefato: response HTTP.
- Conclusão permitida: produção live com SHA exato confirmado; env parity completa (variáveis, logs, ignore-command) não revalidada nesta reconciliação.

### EV-RELEASE-003 — Sentry source maps e evento sintético

- Requisito: provar que source maps foram recebidos pelo Sentry para o SHA publicado.
- Ambiente: Sentry cloud (organização `synvolt`, projeto `mx-performance-frontend`).
- Perfil: n/a — ferramenta técnica; nenhum perfil de usuário do produto.
- Rota/objeto: release `45889a0baabda8511859be6c18205b5b4aefea1e`; evento `e62e61e0b9524078b192e0b9ec63c646`.
- Viewport: n/a — evento sintético.
- Estado exercitado: build autenticado com sentry-vite-plugin; upload aceito; `.map` removidos do dist.
- Ação: verificar evento de prova e resolução de source maps.
- Resultado esperado: evento aponta para arquivos de fonte (`src/`) não para bundle minificado.
- Resultado observado: evento `e62e61e0b9524078b192e0b9ec63c646` resolveu para `src/lib/observability/sentry.ts` e `src/lib/observability/sanitize.ts`; envelope continha `environment=production`, `release` exact, `synthetic_test=true`, branch e deployment metadata.
- SHA: `45889a0baabda8511859be6c18205b5b4aefea1e`.
- Deployment: `dpl_FGLfc8essmaub3BSLv4rGNGcV2pt`.
- Timestamp: 2026-08-04 (reconciliação pós-release).
- Artefato: evento Sentry; n/a para arquivo separado porque a evidência é o próprio evento.
- Conclusão permitida: source maps confirmados para o SHA publicado; alertas, Replay e performance Sentry não verificados nesta reconciliação.

## Proveniência histórica (pré-release)

> Registros abaixo documentam a onda de execução antes da release. SHA de referência era `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`. Mantidos sem relabeling.

- `9abfc70a79da46c03ee156b49933310584f85a65` e os timestamps entre `06:22` e `06:38 -03:00` permanecem snapshots históricos da primeira consolidação.
- Evidência da onda pré-release usa `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`, salvo quando o próprio registro identifica outra origem.

### EV-BASE-002 — backup Git

- Status: `PASS_WITH_FINDINGS`.
- Tag `pre-main-autonomous-20260804-051820` aponta para `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Bundle `/Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle` verificado como íntegro em `2026-08-04T07:13:39-03:00`.
- Limite: não prova restore de Supabase nem restore Git, pois clone/checkout temporário foi proibido.

### EV-T3-001 — checkout atual

- Requisito: confirmar checkout, branch, divergência e preservação do diretório do usuário.
- Ambiente: shell local em `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`.
- Perfil: n/a — inspeção Git não autentica perfil de aplicação.
- Rota/objeto: repositório `main`, working tree e `mx-v3-csv-VzMBNx/`.
- Viewport: n/a — ação sem interface visual.
- Estado exercitado: `main` local após o commit de isolamento.
- Ação: ler HEAD, branch e status sem limpar ou tocar arquivos.
- Comando/query: `git rev-parse HEAD; git branch --show-current; git status --short --branch`.
- Resultado esperado: `main`, SHA exato e diretório não rastreado preservado.
- Resultado observado: `HEAD=f7c36b98...`, `main...origin/main [ahead 9]`, `progress.md` modificado e `?? mx-v3-csv-VzMBNx/`.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — inspeção somente local.
- Timestamp: `2026-08-04T07:12:57-03:00`.
- Artefato: saída terminal; n/a para arquivo separado porque nenhuma captura foi necessária.
- Conclusão permitida: checkout correto e preservação confirmados; release não provada.

### EV-T3-002 — divergência local x remoto

- Requisito: provar o SHA remoto e a divergência atual.
- Ambiente: Git local + remoto `origin` read-only.
- Perfil: n/a — Git não usa perfil do produto.
- Rota/objeto: `refs/heads/main`.
- Viewport: n/a — sem browser.
- Estado exercitado: branch local com nove commits não publicados.
- Ação: consultar remoto e comparar contagens.
- Comando/query: `git ls-remote origin refs/heads/main; git rev-list --left-right --count origin/main...main`.
- Resultado esperado: nenhuma falsa equivalência entre local e remoto.
- Resultado observado: remoto `11a9465f253ce8f96052db70c9171b14425e9d4e`; contagem `0 9`.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` no checkout; remoto explicitado acima.
- Deployment: n/a — comparação Git, não deploy.
- Timestamp: `2026-08-04T07:12:57-03:00`.
- Artefato: saída terminal; n/a para artifact CI porque não há run do SHA.
- Conclusão permitida: `main` local não está publicada.

### EV-T3-003 — governança GitHub

- Requisito: revalidar protection e alertas sem expor segredos.
- Ambiente: GitHub API read-only.
- Perfil: n/a — autenticação CLI técnica, não perfil do produto.
- Rota/objeto: branch `main` e secret-scanning alerts do repositório.
- Viewport: n/a — API/CLI.
- Estado exercitado: configuração remota corrente.
- Ação: consultar somente booleanos/contagem.
- Comando/query: `gh api .../branches/main --jq ...; gh api .../secret-scanning/alerts --paginate --jq 'map(select(.state == "open")) | length'`.
- Resultado esperado: nenhum valor de alerta impresso.
- Resultado observado: `protected=false`, `protection=false`, `6` alertas abertos.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` como contexto local; configuração não é versionada por SHA.
- Deployment: n/a — governança GitHub.
- Timestamp: `2026-08-04T07:12:57-03:00`.
- Artefato: saída JSON reduzida; n/a para relatório de alerta porque detalhes foram deliberadamente omitidos.
- Conclusão permitida: findings de governança permanecem; conteúdo dos alertas não foi auditado nesta onda.

### EV-T3-004 — Vercel alias, READY e candidato

- Requisito: comparar runtime publicado e SHA candidato.
- Ambiente: Vercel CLI e HTTPS público read-only.
- Perfil: público/não autenticado — somente `/api/health`.
- Rota/objeto: `mxperformance.vercel.app/api/health` e `mxperformance-kjbp4sqkc-synvolt.vercel.app/api/health`.
- Viewport: n/a — chamadas HTTP sem renderização.
- Estado exercitado: health público existente; nenhum deployment criado.
- Ação: listar deployments e consultar health reduzido.
- Comando/query: `vercel list mxperformance --yes; curl -fsS <health> | jq -c '{status,release,environment,database,cron}'`.
- Resultado esperado: identificar paridade ou mismatch sem alegar publicação.
- Resultado observado: alias `release=1b99c0ab...`; READY consultado `release=7387fb32...`; ambos healthy e diferentes de `f7c36b98...`.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` candidato local.
- Deployment: alias público e READY específico acima; nenhum deployment do candidato.
- Timestamp: `2026-08-04T07:12:57-03:00`.
- Artefato: saída CLI/HTTP; n/a para screenshot porque a evidência é API.
- Conclusão permitida: deployment do SHA candidato não existe/não foi provado.

### EV-T3-005 — Supabase lint linked

- Requisito: executar auditoria linked localmente disponível e registrar defects reais.
- Ambiente: Supabase CLI `2.75.0`, projeto linked, read-only.
- Perfil: login role técnico da CLI; n/a para perfil de usuário da aplicação.
- Rota/objeto: schemas `extensions`, `private`, `public`; funções lintadas.
- Viewport: n/a — banco via CLI.
- Estado exercitado: schema remoto atual.
- Ação: rodar lint sem migration ou mutação.
- Comando/query: `supabase db lint --linked`.
- Resultado esperado: lista atual de erros/warnings.
- Resultado observado: quatro erros: `gerar_alertas_loja` `22P02`, `mx_score_recalcular_loja` `22P02`, `mx_score_atualizar_atraso_plano` `22P02`, `consolidar_dashboard_departamento` `42803`; warnings adicionais preservados no log.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` como checkout consumidor; schema remoto pode divergir.
- Deployment: Supabase linked atual; n/a para deployment ID porque o CLI não o fornece neste comando.
- Timestamp: `2026-08-04T07:12:57-03:00`.
- Artefato: saída terminal estruturada; n/a para dump porque nenhum dado/schema foi exportado.
- Conclusão permitida: Supabase mantém defects; nenhuma correção ou release de banco foi feita.

### EV-T3-006 — riscos estáticos Edge/Auth/Storage

- Requisito: revalidar os marcadores de risco citados.
- Ambiente: arquivos versionados locais.
- Perfil: n/a — análise estática.
- Rota/objeto: `_shared/cors.ts`, `_shared/auth.ts`, `supabase/config.toml`, migration `20260729100000`.
- Viewport: n/a — sem UI.
- Estado exercitado: conteúdo do SHA candidato.
- Ação: procurar contratos específicos, sem varrer valores de credenciais.
- Comando/query: `rg -n "Access-Control-Allow-Origin|verify_jwt\\s*=\\s*false|auth\\.getUser\\(|pre-cadastro-avatares|evidencias-consultoria" <paths delimitados>`.
- Resultado esperado: confirmar presença/ausência dos riscos.
- Resultado observado: wildcard CORS; `auth.getUser()` manual; cinco `verify_jwt=false`; policies para os dois buckets.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — análise estática não prova configuração implantada.
- Timestamp: `2026-08-04T07:13:39-03:00`.
- Artefato: referências de arquivo/linha na saída; n/a para cópia separada.
- Conclusão permitida: riscos estáticos permanecem e exigem auditoria/remediação própria.

### EV-T3-007 — dependências e advisories

- Requisito: auditar runtime, dev e obsolescência sem atualização cega.
- Ambiente: npm `11.12.1`, registry read-only.
- Perfil: n/a — dependências do projeto.
- Rota/objeto: `package.json`/lock e árvore npm.
- Viewport: n/a — CLI.
- Estado exercitado: dependências instaladas do SHA candidato.
- Ação: executar audits runtime/full e `npm outdated`, resumindo apenas metadata.
- Comando/query: `npm audit --omit=dev --json`; `npm audit --json`; `npm outdated --json`.
- Resultado esperado: contagens e capacidade de fix reais.
- Resultado observado: runtime `2 high/0 critical` (`react-router*`); full `3 high/0 critical` (inclui `xlsx`, sem fix); `73` outdated, `15` major-behind no recorte.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — audit local.
- Timestamp: `2026-08-04T07:08:03-03:00`.
- Artefato: resumo JSON em terminal; n/a para JSON integral para evitar ruído e persistência desnecessária.
- Conclusão permitida: `PASS_WITH_FINDINGS`; vulnerabilidades high impedem declaração integral.

### EV-T3-008 — secret scan local e Sentry

- Requisito: tentar ferramentas locais antes de classificar bloqueio externo.
- Ambiente: Homebrew local, `gitleaks 8.30.1`; `sentry-cli 2.58.5` via npx.
- Perfil: n/a — ferramentas técnicas; Sentry não autenticado.
- Rota/objeto: commits `11a9465f..f7c36b98` e endpoint Sentry configurado pela CLI.
- Viewport: n/a — CLI.
- Estado exercitado: histórico versionado da onda; autenticação Sentry ausente.
- Ação: instalar ferramentas seguras, rodar scan redigido e tentar `sentry-cli info`.
- Comando/query: `brew install gitleaks actionlint`; `gitleaks git --redact --no-banner --log-opts="11a9465f..f7c36b98"`; `npx --yes @sentry/cli --version`; `sentry-cli info`.
- Resultado esperado: scan local ou blocker comprovado por ferramenta funcional.
- Resultado observado: gitleaks `9 commits`, `84.53 KB`, `0 leaks`; Sentry CLI disponível, `SENTRY_AUTH_TOKEN_ABSENT`, `Auth token is required`.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a para gitleaks; Sentry release do candidato inexistente/não consultável sem auth.
- Timestamp: gitleaks `2026-08-04T07:07:42-03:00`; Sentry `2026-08-04T07:12:57-03:00`.
- Artefato: logs redigidos em terminal; n/a para relatório persistido porque zero leaks e nenhuma autenticação.
- Conclusão permitida: secret scan local PASS; Sentry permanece `BLOCKED_EXTERNAL` por autenticação, não por falta de CLI.

### EV-T3-009 — browser/a11y local e matriz ausente

- Requisito: executar alternativa browser local sem fabricar evidência autenticada.
- Ambiente: Vite local + Playwright `1.61.1`, Chromium desktop e Pixel 5.
- Perfil: público/não autenticado; perfis autenticados não exercitados.
- Rota/objeto: `/`, `/login`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`.
- Viewport: Desktop Chrome e Pixel 5; dimensões herdadas dos devices Playwright.
- Estado exercitado: reduced motion, render público, axe e overflow horizontal.
- Ação: abrir seis rotas em dois projetos e rodar axe WCAG A/AA/2.1/2.2.
- Comando/query: `npx playwright test src/test/public-routes-a11y.playwright.ts --project=chromium --project=mobile-chrome --reporter=line`.
- Resultado esperado: zero serious/critical e sem overflow.
- Resultado observado: `12 passed` em `19.1s`; nenhum failure.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — servidor local; não é preview/produção.
- Timestamp: `2026-08-04T07:09:58-03:00`.
- Artefato: log Playwright; screenshot n/a porque o teste só captura em falha e não houve falha.
- Conclusão permitida: público local parcialmente coberto; seis perfis, viewports obrigatórios e produção continuam não provados/`BLOCKED_EXTERNAL`.

### EV-T3-010 — isolamento Recharts e contrato canônico

- Requisito: corrigir vazamento do mock sem enfraquecer dimensões, resize, clique, acessibilidade e console.
- Ambiente: Bun `1.3.5`, Happy DOM, Testing Library, Recharts real no teste canônico.
- Perfil: Gerente simulado no componente; não é sessão real.
- Rota/objeto: `ManagerStoreGoalReference.test.tsx` + `ManagerSellerParityHomeCanonical.test.tsx`.
- Viewport: container inicial `320x256`, resize para `240x256`.
- Estado exercitado: ordem problemática dos dois arquivos, gráfico inicial, resize e clique na barra.
- Ação: reproduzir RED, remover mock global, evitar gráfico fora de escopo e reexecutar.
- Comando/query: `bun test --isolate --max-concurrency=1 <ManagerStoreGoalReference.test.tsx> <ManagerSellerParityHomeCanonical.test.tsx>`.
- Resultado esperado: segundo teste usa Recharts real, sem fake `Container`.
- Resultado observado: RED `3 pass/2 fail`; GREEN pós-commit `5 pass/0 fail/41 expect()` e console canônico limpo.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — teste local.
- Timestamp: GREEN final `2026-08-04T07:12:57-03:00`.
- Artefato: commit `f7c36b98`; n/a para screenshot porque o ambiente é Happy DOM.
- Conclusão permitida: isolamento e comportamento do componente provados localmente; dados reais/produção não provados.

### EV-T3-011 — gates locais completos

- Requisito: executar pair, lint, typecheck, suíte, build e bundle budget.
- Ambiente: Node `25.9.0`, npm `11.12.1`, Bun `1.3.5`, macOS local.
- Perfil: n/a — gates de código; testes cobrem perfis conforme seus próprios contratos.
- Rota/objeto: código e suíte completa do projeto.
- Viewport: n/a para gates CLI; browser é EV-T3-009.
- Estado exercitado: SHA de implementação commitado.
- Ação: executar todos os comandos em série.
- Comando/query: `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run check:bundle-size`.
- Resultado esperado: zero falha e budget respeitado.
- Resultado observado: lint PASS; typecheck PASS; `1725 pass/0 fail/14052 expect()` em 384 arquivos; build 5125 módulos/5.97s/sem maps; bundle `1827.88/1860 KB` PASS.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — gates locais.
- Timestamp: `2026-08-04T07:08:23-03:00` a `2026-08-04T07:09:48-03:00`.
- Artefato: `dist/` local gerado e ignorado; n/a para artifact CI.
- Conclusão permitida: `TESTED_LOCAL_ONLY`; não autoriza release.

### EV-T3-012 — workflows e CI

- Requisito: validar sintaxe/workflows e verificar checks do SHA exato.
- Ambiente: `actionlint 1.7.12`, shellcheck `0.11.0`, GitHub CLI read-only.
- Perfil: n/a — CI do repositório.
- Rota/objeto: `.github/workflows/*.yml` e runs da branch `main`.
- Viewport: n/a — CLI/API.
- Estado exercitado: workflows atuais e consulta por commit `f7c36b98...`.
- Ação: lintar workflows, listar workflows/runs e filtrar SHA exato.
- Comando/query: `actionlint -color=false .github/workflows/*.yml`; `gh workflow list --all`; `gh run list --commit f7c36b98...`.
- Resultado esperado: sintaxe válida, findings explícitos e runs somente do SHA correto.
- Resultado observado: 7 SC2086 em 2 workflows; `NO_RUNS_FOR_EXACT_SHA`; runs verdes mais recentes pertencem a `11a9465f...`.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — nenhum CI/deploy do candidato.
- Timestamp: actionlint `2026-08-04T07:07:42-03:00`; consulta exata `2026-08-04T07:10:35-03:00`.
- Artefato: n/a — sem run do SHA, portanto sem artifacts.
- Conclusão permitida: CI do candidato `IN_PROGRESS`/não provado; findings locais preservados.

### EV-T3-013 — performance e bundle

- Requisito: medir bundle e alternativa Lighthouse local.
- Ambiente: build Vite local, `vite preview`, Lighthouse `13.4.1`, Chrome headless.
- Perfil: público/não autenticado na landing `/`.
- Rota/objeto: bundle `dist/` e `http://127.0.0.1:3108/`.
- Viewport: Lighthouse desktop padrão headless; n/a para matriz responsiva completa.
- Estado exercitado: build local otimizado; run dev também tentado e classificado como contaminado.
- Ação: checar budget e medir preview local.
- Comando/query: `npm run check:bundle-size`; `lighthouse http://127.0.0.1:3108/ --only-categories=performance,accessibility,best-practices`.
- Resultado esperado: budget abaixo do teto e métricas diagnósticas registradas sem chamar de produção.
- Resultado observado: total `1827.88/1860 KB` (98.3%), três chunks acima de 90%; preview perf `61`, a11y `98`, best-practices `96`, FCP `4.4s`, LCP `7.2s`, CLS `0`, TBT `250ms`. Dev run: perf `52`, LCP `49.1s`, descartado como baseline.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: n/a — `vite preview` local.
- Timestamp: bundle `2026-08-04T07:09:48-03:00`; preview `2026-08-04T07:12:04-03:00`.
- Artefato: resumo JSON em terminal; relatório integral n/a porque não foi solicitado/persistido.
- Conclusão permitida: budget PASS com baixa margem; Core Web Vitals de produção não provados.

### EV-T3-014 — inventários locais e migrations

- Requisito: executar auditorias de rotas/design system e conferir migrations sem mutação.
- Ambiente: scripts Node locais + Supabase linked read-only.
- Perfil: inventário cobre contratos dos perfis; nenhum perfil foi autenticado.
- Rota/objeto: `src/App.tsx`, consumidores de dados, manifesto de gestão e histórico de migrations.
- Viewport: n/a — auditoria estática/CLI.
- Estado exercitado: checkout candidato e lista linked atual.
- Ação: rodar inventários e comparar migrations da onda.
- Comando/query: `npm run audit:routes-data`; `npm run audit:management-design-system`; `supabase migration list --linked`; `git diff --name-only 11a9465f..f7c36b98 -- supabase/migrations/**`.
- Resultado esperado: inventário computável e zero migration silenciosa nesta onda.
- Resultado observado: 111 rotas (103 protegidas/8 públicas), 0 gap canônico, 6/6 testes de design system/0 violações; migrations alinhadas no recorte até `20260803134000`; diff de migrations vazio.
- SHA: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.
- Deployment: Supabase linked consultado; n/a para aplicação porque nenhuma migration foi executada.
- Timestamp: inventários `2026-08-04T07:08:03-03:00`; migrations `2026-08-04T07:13:39-03:00`.
- Artefato: saída terminal; n/a para dump/export porque a auditoria foi read-only.
- Conclusão permitida: inventários locais PASS; validação funcional/autenticada das rotas e restore de banco não provados.
