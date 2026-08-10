# MX Unificação Total — Relatório Final

> Relatório vivo de fechamento. Atualizado em 2026-08-10 durante a revalidação
> final do PR; evidências históricas permanecem identificadas abaixo.
>
> **Checkpoint de código vigente (2026-08-10):** o branch
> `fix/mx-final-gates-20260810` contém o runtime `d7356687105e6f048d974c5a25dd96d7f31eaf11`;
> os commits documentais posteriores levaram o HEAD remoto a
> `693ef1394ed646a09b232253b266618f8bdc175e` sem alterar o runtime. Os commits
> `379c4a14`, `2754e4ab`, `e609bb72` e `fb8ba8ee` são checkpoints anteriores,
> documentais ou de runtime já superseded. O CI remoto do HEAD atual passou;
> o deployment Vercel integrado falhou e não existe Preview atual aprovado.
> A produção continua
> deliberadamente no merge saudável anterior
> `82191012260208c6dc82e240cd78fdf4658fb6ba`.

## Checkpoint vigente — código `d7356687` — validação local

- O release Sentry agora aceita somente identificadores imutáveis (`VITE_RELEASE`,
  `SENTRY_RELEASE`, SHA do Vercel ou `GITHUB_SHA`); branch não é fallback.
- As migrations de auditoria/backup aplicam RLS no momento da criação, revogam
  ACLs de tabela e sequence para `PUBLIC`/`anon`/`authenticated`, concedem o
  mínimo a `service_role`, e a policy de backup é `AS RESTRICTIVE`.
- A migration de 22 helpers RLS usa `to_regprocedure(...)` antes de cada
  revoke/grant, permanecendo idempotente em históricos parciais.
- Validação local: lint, typecheck, `2603` testes/`18190` asserts, build sem
  sourcemaps públicos, `400` checksums, `44` rollbacks, npm audit sem
  vulnerabilidades e Gitleaks staged passaram. O warning de `HelpTooltip.tsx`
  e os seis warnings CSS do otimizador são históricos/não bloqueantes.
- CI remoto associado ao HEAD `693ef1394ed646a09b232253b266618f8bdc175e` passou
  Quality Gates (`31404300260`), pgTAP RLS (`31404300238`, 40/40),
  authenticated visual (`31404300048`), Manager/Central Parity, a11y, bundle,
  checksums, reversibilidade, Gitleaks, typecheck/unit, DB types, smoke 403 e
  auditorias visuais. O visual registrou `9 passed` na auditoria universal e
  `1 passed` na matriz Owner Base44; o bloco mutável Owner não foi habilitado.
- Supabase Preview terminou `SUCCESS` no check associado ao projeto de branch;
  o Vercel integrado falhou no deployment `dpl_7c6b79PpdAWctNMJViiXPKoyMbUw`
  (`status: Error`, URL `https://mxperformance-pr323wogf-synvolt.vercel.app`,
  build sem execução). `TestSprite Pre-Check` falhou com `No tests detected`.
- Produção continua deliberadamente no merge saudável anterior
  `82191012260208c6dc82e240cd78fdf4658fb6ba`, sem DDL ou promoção.
- CodeRabbit foi tentado novamente no commit documental local `8360e31b` em
  modo normal e `--agent`; nenhuma análise foi executada porque o serviço
  retornou `Review limit reached`/`Rate limit exceeded`, conta sem seat para a
  organização e espera informada de 24 minutos. Isso permanece um bloqueio
  externo, não uma aprovação automática; o check CodeRabbit do GitHub no HEAD
  `693ef139` terminou `SUCCESS`.

## Revalidação remota atual — 2026-08-10 — HEAD `693ef139`

> Este é o último estado remoto observado. O runtime continua sendo o
> checkpoint `d7356687`; os commits `8360e31b`, `f10b1265`, `a05106b1` e
> `693ef139` são
> apenas reconciliações documentais.

- `git ls-remote` confirmou o branch `fix/mx-final-gates-20260810` no SHA
  `693ef1394ed646a09b232253b266618f8bdc175e`; PR #187 segue `OPEN` contra
  `main`.
- GitHub terminou verdes os workflows de Quality Gates, pgTAP (`40/40`),
  visual autenticado, Manager/Central Parity, a11y, bundle, checksums,
  reversibilidade, Gitleaks, DB types, typecheck/unit, smoke 403 e CodeRabbit.
  Runs principais: `31404300260`, `31404300238`, `31404300048` e
  `31404300148`.
- O Vercel Preview integrado criou `dpl_6aFRqT5EPaUM4AK16XvDkUWQqP7h`, URL
  `https://mxperformance-59mu04ssq-synvolt.vercel.app`, mas a inspeção retornou
  `status: Error`; embora o alias responda HTTP `200` com `x-robots-tag: noindex`,
  o estado da plataforma não é `READY` e o Preview não pode ser aprovado como
  evidência de runtime.
- `https://www.mxperformance.com.br/api/health` respondeu HTTP `200`,
  `healthy`, `production`, release
  `82191012260208c6dc82e240cd78fdf4658fb6ba`, com Vercel, Supabase API/database
  e crons críticos `ok`, em `2026-08-10T15:47:56.972Z`. A inspeção do domínio
  aponta o deployment de produção `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc` em
  `READY`, com aliases oficiais; o patch do PR #187 não foi promovido.
- Estado formal: **PARCIALMENTE CONCLUÍDO / BLOCKED_EXTERNAL**. Permanecem
  bloqueantes o provisionamento Vercel, `TestSprite: No tests detected`,
  restore/PITR, stack TypeScript desminificado no Sentry, mutations Owner e
  promoção/rollback de produção.

## Revalidação histórica — 2026-08-10 — PR #187 no checkpoint `e609bb72`

> Não usar esta seção como prova do runtime `d7356687105e6f048d974c5a25dd96d7f31eaf11`.

- Worktree e branch: `fix/mx-final-gates-20260810`; HEAD remoto
  `e609bb7251a62b834d67b8bbd8a9ec74491d0f44`; PR #187 está `OPEN` contra
  `main`, com 67 arquivos alterados. O commit de código/runtime validado é
  `4c7b906d653a9af00969d75313ea6c9756f5bbc0`; o HEAD atual só reconcilia
  documentação.
- Correções entregues: `ManagerDailyClosing`/skeleton no `PageCanvas` canônico,
  `Checkin` sem landmark `main` aninhado, toaster Sonner contido e release
  Sentry normalizada no build.
- Migrations e guards locais: replay dos 39 stubs históricos, grants de
  `authenticated` em 22 helpers RLS e hardening idempotente de auditoria/backup;
  nenhuma dessas migrations foi aplicada ao projeto Supabase remoto.
- Gates locais vigentes: lint, typecheck, `npm test` (`2.600 pass / 0 fail /
  18.173 asserts`), build sem sourcemaps públicos, bundle `1.563,53/1.860 KB
  gzip`, checksums (`400` válidas), reversibilidade (`44`) e auditorias
  complementares passaram. O warning de `HelpTooltip.tsx` é histórico.
- O build emitiu seis warnings não bloqueantes do otimizador CSS para classes
  arbitrárias já existentes; o comando terminou com exit `0` e a checagem de
  sourcemaps públicos passou.
- CI do HEAD `379c4a14`: Quality Gates `31377957038`, pgTAP RLS Matrix
  `31377957069`, visual autenticado `31377957000`, Manager Parity
  `31377956939`, Central Execução Parity `31377956959`, checksums,
  reversibilidade, Gitleaks, bundle, typecheck/unit, a11y e auditorias visuais
  terminaram `SUCCESS`. A matriz do Dono foi pulada por ausência de
  `E2E_OWNER_EMAIL`; isso não é contado como aprovação dessa matriz.
  `TestSprite Pre-Check` falhou externamente com `No tests detected`; os
  findings efetivos do CodeRabbit foram corrigidos e a nova execução após o
  último ajuste foi bloqueada por limite de uso.
- Rerun do CI no HEAD documental `e609bb72`: Quality Gates `31378937267`,
  pgTAP `31378937224`, Manager Parity `31378937243`, Central Execução
  `31378937289` e os demais gates de qualidade terminaram `SUCCESS`. O visual
  autenticado `31378937240`, attempt 2, terminou `SUCCESS` em 13m13s: a
  auditoria universal passou `9` testes e a matriz Owner Base44 passou `1`
  teste. A etapa de Owner mutável ficou `SKIPPED` por proteção explícita
  (`E2E_ALLOW_MUTATIONS` desabilitado), portanto não é prova de mutations.
- Preview manual do runtime SHA `4c7b906d` (o HEAD `379c4a14` é documental): deployment
  `dpl_2u51UvwJcSGBB1igRsuC4V3hXVY4`, URL
  `https://mxperformance-dfk3mk6sf-synvolt.vercel.app`, estado `READY`. O
  `/api/health` retornou HTTP `200`, `healthy`, ambiente `preview`, release
  exata `4c7b906d653a9af00969d75313ea6c9756f5bbc0`, e checks Vercel, Supabase
  API, database e crons críticos `ok`; `/login` retornou HTTP `200`.
- Browser real no Preview: Dono, Gerente e Vendedor autenticaram com HTTP 200;
  em `1440×900` e `390×844` houve um único `main` e zero overflow. O menu
  mobile abriu para Gerente e Vendedor. O console ainda registra a CSP do
  `vercel.live/feedback.js` bloqueando a instrumentação externa do Preview;
  isso é separado do runtime funcional do app e impede declarar console
  totalmente limpo.
- Check Vercel oficial do PR no HEAD `e609bb72`: deployment
  `dpl_FUwhNm5vJmVSWdrmJAxeVjAYsCKc` terminou `ERROR`; a inspeção Vercel
  retornou `readyState: ERROR` e o check reportou `Resource provisioning failed`.
  Com o escopo correto da equipe, o redeploy gerou `dpl_7n4wGCbtAUKNuFpyiVGDZAdETob8`
  mas também terminou `ERROR`; a URL serviu a página `Deployment has failed`.
  Não houve promoção nem alteração de produção.
- Sentry: a release `4c7b906d653a9af00969d75313ea6c9756f5bbc0` existe em
  `synvolt/mx-performance-frontend`, com um deployment associado ao Preview;
  eventos reais de `/login`, `/home` e `/dono` e um evento controlado em
  `preview` foram recebidos com tags de rota, papel, deployment e release. O
  evento controlado carregou debug metadata com debug ID e source map
  associado; a confirmação de frame/stack TypeScript desminificado permanece
  pendente. O conector MCP exige reautenticação nesta sessão; a prova foi
  coletada por API autenticada em runtime e não inclui credenciais no relatório.
- Supabase: projeto `fbhcmzzgwjdgkctlfvbo`, `ACTIVE_HEALTHY`, região `sa-east-1`,
  PostgreSQL 17; 357 migrations remotas. Advisors read-only: 159 avisos de
  segurança e 598 de performance. A API de backups físicos lista 8 itens
  `COMPLETED`, incluindo `2026-08-10`; a consulta separada de restore/PITR
  retornou `backups: []` e `pitr_enabled=false`. São superfícies distintas:
  a primeira comprova retenção de snapshots, não um restore testado; portanto
  restauração temporal e rollback de banco continuam sem prova.
- Produção: `https://www.mxperformance.com.br/api/health` retornou HTTP `200`,
  `healthy`, `production`, release
  `82191012260208c6dc82e240cd78fdf4658fb6ba`, com Vercel, Supabase API/database
  e crons críticos `ok`. O diff do PR #187 não foi promovido.
- Estado: **PARCIALMENTE CONCLUÍDO / BLOCKED_EXTERNAL** para a publicação final.
  A produção saudável foi preservada; não houve DDL remoto nem promoção enquanto
  o check oficial do Vercel, PITR/restore, mutations Owner, TestSprite e demais
  gates do prompt permanecerem abertos.

## Revalidação histórica — antes da reconciliação do PR #187

- Base do worktree: merge `82191012260208c6dc82e240cd78fdf4658fb6ba`; PR #186
  está `MERGED` e `origin/main` aponta para esse SHA.
- Correções locais: `ManagerDailyClosing`/skeleton no `PageCanvas` canônico,
  `Checkin` sem landmark `main` aninhado e toaster Sonner contido no mobile.
- Correção de banco pendente no worktree: o marcador
  `00000000000001_mark_existing_migrations_applied.sql` deixou de pré-registrar
  os 39 stubs históricos ativos. O runner passa a executar cada no-op e
  registrar a versão normalmente, tratando a falha reproduzida no reset
  local/CI (`duplicate key ... 20260407000000`) sem modificar schema ou dados
  remotos.
- PR #187 está aberto para esta branch; o patch adicional ainda não foi
  commitado e, portanto, não existe SHA remoto para esta revalidação.
- A falha seguinte do CI no mesmo PR foi `permission denied for function
  eh_area_interna_mx` durante a consulta autenticada da matriz RLS. A correção
  local adiciona grants explícitos para `authenticated` em 22 helpers, mantendo
  `PUBLIC`/`anon` revogados, e amplia o `grants_guard` pgTAP para 7 assertions.
- A revisão CodeRabbit vigente deixou quatro findings acionáveis; todos foram
  tratados neste worktree: checkout sem credencial persistida, redação de
  segurança, File List sem duplicação e migration forward-only para as relações
  auxiliares. A migration `20260810110000_harden_auxiliary_audit_backup_rls.sql`
  garante criação idempotente, RLS, revogações, acesso de `service_role` e
  policies explícitas; o guard pgTAP agora tem 19 assertions, incluindo
  privilégios efetivos, expressões de policy e probes negativos com linha
  semeada.
- RED/GREEN: contratos de PageCanvas/landmark passaram e o contrato novo do
  Sonner falhou antes da implementação e passou isoladamente depois.
- Gates locais vigentes: lint exit `0` (warning histórico em `HelpTooltip.tsx`),
  typecheck exit `0`, `npm test` `2.597 pass / 0 fail / 18.162 asserts`, build
  exit `0` sem sourcemaps públicos, bundle `1.563,57/1.860 KB gzip` e
  `git diff --check` exit `0`; checksums recalculadas e reversibilidade das
  migrations pendentes também passaram (`400` checksums válidas, `44`
  migrations validadas).
- Auditorias complementares: `validate:structure`, `validate:parity`,
  `validate:agents`, `sync:ide:check`, `audit:routes-data`,
  `audit:management-design-system` e `lint:a11y` passaram; warnings AIOX e
  `HelpTooltip` permanecem históricos e não são tratados como falhas.
- Browser local: toaster real em `390×844` ficou `x=16,width=356,right=372`,
  com `scrollWidth=390`; em `1440×900`, `x=1060,width=356,right=1416`,
  `scrollWidth=1440`. A captura mobile foi exibida na sessão.
- Produção vigente: Vercel `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases
  oficiais; `/api/health` HTTP `200`, `healthy`, release exatamente igual ao
  merge acima. Esse deployment ainda não contém o diff local desta retomada.
- Estado: **correções locais aprovadas, mas replay/grants RLS ainda aguardam
  commit/CI; produção atual saudável e sem alteração de banco**. O hardening
  forward-only das relações auxiliares está no checkout e ainda precisa do novo
  CI efêmero.

## 39.1 Resumo executivo — registro histórico da retomada

O repositório está no branch `fix/mx-final-gates-20260810`, sobre a fundação
visual, tokens, PageCanvas, shell canônico, auditorias estáticas e validações
de múltiplos perfis já incorporadas ao merge `82191012`. Esta retomada fechou
duas regressões estruturais e o overflow mobile do toaster, com testes e prova
de navegador local.

Status atual: **gates locais aprovados; produção saudável no merge anterior;
patch final aguardando commit, CI/Preview e nova promoção**. O prompt mestre
permanece parcial por backup restaurável/PITR, prova independente de
source maps/Sentry, matriz integral de perfis/rotas e rotação dos segredos.

## 39.2 Inventário — registro histórico

- Rotas: 111 (103 protegidas, 8 públicas).
- Tabelas: 127.
- RPCs: 84.
- Edge Functions: 14.
- Auditoria atual (`npm run audit:routes-data`): 109 rotas (101 protegidas, 8
  públicas), 136 tabelas, 87 RPCs e 14 Edge Functions; os números acima são
  inventário histórico do fechamento anterior e não devem ser usados como
  contagem corrente.
- Componentes alterados no fechamento anterior: `AdminHeader.tsx` e os 4
  gráficos de Performance de Vendas (evidência histórica; não fazem parte do
  gate final atual).
- Inventário estruturado: `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`.
- Biblioteca Atomic Design: inventário em `docs/audits/component-library-inventory.md` (24 atoms, 27 molecules, 6 organisms, 53 componentes `ui`, 8 stories; templates ainda não povoados).
- Evidência visual: `visual-evidence/internal-mx/`, com route matrices, screenshots e métricas para os perfis/rotas cobertos; não representa captura integral de todas as combinações do prompt.
- Shells, scopes e tokens: inventariados pelos scripts AIOX e auditorias anteriores; nenhuma alteração concorrente foi incorporada neste fechamento.
- Total de páginas migradas e testes adicionados no histórico: não reestimado nesta etapa para evitar transformar inventário histórico em fato novo.
- Arquivos do gate final local: `src/App.tsx`, `src/index.css`,
  `src/features/checkin/Checkin.container.tsx`,
  `src/features/checkin/CheckinStickyHeader.test.ts`,
  `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`,
  `src/features/manager/daily-closing/ManagerDailyClosing.visual-contract.test.ts`
  e `src/test/sonner-layout.contract.test.ts`.

## 39.3 Evidências técnicas — registro histórico anterior ao SHA `4c7b906d`

- Branch/PR: `fix/mx-final-gates-20260810` / PR #187 aberto, base `main`.
- Base remota verificada: PR #186 `MERGED`, merge
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; sete workflows desse SHA
  concluíram com sucesso.
- Gates locais do diff final: lint/typecheck/build/diff-check exit `0`,
  `npm test` `2597 pass / 0 fail / 18162 asserts`, bundle `1563,57/1860 KB`
  gzip e auditorias estruturais/paridade/rotas sem erros.
- O CI do SHA anterior `df0955b05cf3295cd85e20c382a0ea17489d22c9`
  falhou antes da correção no job `pgTAP RLS Matrix` durante `supabase db reset`
  com `duplicate key ... Key (version)=(20260407000000)`. A nova execução
  remota é obrigatória antes de tratar RLS como aprovado.
- O SHA atual do PR #187 (`1eee68444d8e807128b4175e6f417f86b16cc2c5`) também
  falhou no job `93385034779` com `permission denied for function
  eh_area_interna_mx`; a migration nova e o guard pgTAP corrigem a ACL no
  próximo SHA.
- A migration auxiliar e seus 19 invariantes são somente locais nesta medição;
  não houve `db push` nem aplicação de migration no Supabase remoto.
- A correção altera apenas o marcador de histórico, com allowlist hash-pinned
  em `.migration-checksum-allowlist.json`; não remove nem reescreve os 39
  stubs. O CI também compara o histórico antes/depois do reset.
- Worktree está deliberadamente não commitado nesta medição; o SHA do próximo
  commit será acrescentado após a revisão do diff e antes do push.
- Produção vigente: Vercel deployment
  `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases oficiais; `/api/health`
  HTTP `200`, `healthy`, release igual ao merge `82191012`.
- Preview do diff final: ainda não criado; não confundir a produção/preview do
  PR #186 com a validação do próximo SHA do PR #187.

## 39.4 Evidências visuais — registro histórico

- Evidências existentes: `visual-evidence/internal-mx/`.
- Falha reproduzida: rota `performance-vendas`, em desktop/tablet/mobile, por ausência do cabeçalho canônico.
- Evidência de produção anterior: `/relatorios/performance-vendas` renderizou dados reais (`49 lojas`, `204` sell-outs históricos, `476` meta consolidada), sem overflow horizontal.
- Screenshot final pós-deploy revisado: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.
- Viewport da captura: desktop Chrome, 1721x1233; rota `/relatorios/performance-vendas`; estado autenticado Administrador Geral, dados reais.
- Smoke final: cabeçalho canônico presente, raio 16px, fundo branco, quatro gráficos com dimensões positivas, zero overflow e console vazio para warn/error.
- Regressão Sonner: browser real em `390×844` mediu toaster `x=16,width=356,right=372` e `scrollWidth=390`; em `1440×900`, `x=1060,width=356,right=1416` e `scrollWidth=1440`.

## 39.5 Supabase — registro histórico anterior à consulta de 2026-08-10

- Projeto confirmado: `fbhcmzzgwjdgkctlfvbo`.
- A nova migration de ACL é somente local nesta medição. O CI efêmero deve
  provar que `authenticated` executa os 22 helpers de predicates RLS e que
  `anon` não executa nenhum deles; não houve `db push` remoto.
- Schema e dados de aplicação em produção não foram alterados nesta etapa; a
  alteração pendente só impede o pré-registro de versões que o runner executa.
  No replay local, a tabela `supabase_migrations.schema_migrations` é recriada
  pelo reset; o CI compara as versões antes/depois e não executa `db push` remoto.
- A auditoria funcional e de RLS anterior permanece histórica até o novo job
  `pgTAP RLS Matrix` passar no SHA desta correção.
- A migration `20260810110000_harden_auxiliary_audit_backup_rls.sql` também é
  somente local; nenhuma migration foi aplicada ao projeto Supabase remoto
  nesta retomada.

## 39.6 Vercel — registro histórico anterior ao SHA `4c7b906d`

- Projeto: `mxperformance` / equipe `synvolt`.
- Node configurado: `24.x`.
- Produção `https://www.mxperformance.com.br`: deployment
  `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`, aliases oficiais ativos.
- `/api/health` em 2026-08-10 retornou HTTP `200`, `healthy`, ambiente
  `production`, release `82191012260208c6dc82e240cd78fdf4658fb6ba`, com Vercel,
  Supabase API/database e crons críticos `ok`.
- O diff final local ainda não foi promovido; rollback documentado para esta
  etapa é manter/promover o deployment anterior enquanto o novo PR/preview não
  passar.

## 39.7 Sentry — registro histórico anterior ao SHA `4c7b906d`

- Organização/projeto confirmados por API: `synvolt` / `mx-performance-frontend`.
- A evidência histórica confirma releases anteriores, mas não é usada como prova da release atual.
- `/api/health` do deployment atual converge para o release de aplicação
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; isso não comprova por si só que
  a release/source map correspondente foi aceita pelo Sentry.
- A inspeção Sentry da release atual permanece pendente; as releases `7387fb32`
  e `6d5eebe2` citadas abaixo são evidências históricas, não prova vigente.
- Evento controlado histórico: `08093d7cae174d23824a5273fa42bb91`, `MxControlledSourceMapValidation`; não é usado como prova de alinhamento da release atual.
- O build log do deployment registra `Upload type: artifact bundle` e o debug ID público `ff71a893-c507-4440-9653-17416b1f2be4` com seu `.js`/`.js.map` no `Source Map Upload Report`. A API legada de arquivos da release retornou `0`; o evento controlado foi gerado via DevTools e seu stack não é um frame do bundle, portanto a prova de stack trace desminificado permanece aberta.
- `sentry-cli` global não está instalado; `npx @sentry/cli` `2.58.5` foi usado sem persistir credenciais.
- Alertas e performance não foram comprovados nesta execução.
- Smoke real do `consultor_mx`: `1 passed` em `2,1 min`, com usuário/fixtures temporários, rotas reais, consultas Supabase e limpeza automática.
- Revalidação final no navegador autenticado como Administrador Geral: `/relatorios/performance-vendas` exibiu dados reais (`204` sell-outs e `476` meta), sem erros de console e sem overflow em viewport de 1721 px; em `390×844`, `scrollWidth === clientWidth === 390`, sem elementos fixos fora da viewport e sem erros.
- Smoke Playwright filtrado para `consultor_mx` contra produção: `1 passed (2.0m)`, com fixture temporário e limpeza automática.
- A inspeção de rede capturou um envelope Sentry de produção com HTTP 200 e `Access-Control-Allow-Origin: *`; uma execução anterior teve CORS intermitente do transporte do navegador e foi repetida com sucesso. Isso não substitui a prova de stack trace TypeScript desminificado.
- O `npx @sentry/cli` `2.58.6` local respondeu `401 Invalid token` para o token operacional da sessão; a variável criptografada da Vercel permanece fora de leitura local.
- Follow-up documental `6d5eebe2`: deployment `dpl_2nEL2EZ6yhxXz3E3TGeMzh6VBFmh` ficou `READY`, `/api/health` e o bundle convergiram para `6d5eebe206c89481336f3f1584c14ee67d6ee842`, e o smoke pós-deploy do `consultor_mx` passou `1 passed (2.4m)`.
- O caminho `.js.map` do bundle atual retornou o `index.html` da rewrite (`text/html`), não um source map público.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42` e reportou 6 issues. As duas issues documentais foram corrigidas; 1 crítica, 1 major e 2 menores permanecem em arquivos concorrentes de pré-cadastro/teste, não alterados para preservar o trabalho externo.

## 39.8 Pendências — consolidação após a revalidação de 2026-08-10

| Prioridade | Pendência | Impacto | Evidência | Ação |
|---|---|---|---|---|
| P1 | Auditoria histórica de segredos | 77 achados antigos, incluindo sessão do WhatsApp e scripts com chaves; não introduzidos pelo release | Gitleaks manual run `30847366721`; Gitleaks push run `30847358188` passou no último commit | Rotacionar credenciais afetadas e planejar limpeza de histórico com backup/recuperação antes de reescrever `main` |
| P1 | Comprovar stack trace desminificado da release atual | Bundle e health estão alinhados, mas a listagem legada histórica retornou 0 e o evento controlado não veio de um frame do bundle | Bundle `index-DCQ64CaR.js`; `/api/health` em 2026-08-03; evento histórico `08093d7cae174d23824a5273fa42bb91` | Provocar uma exceção a partir de um módulo do bundle em preview e confirmar frame TypeScript, source map, alertas e performance |
| P1 | Issues CodeRabbit em arquivos concorrentes | 1 crítica, 1 major e 2 menores permanecem fora deste escopo | Revisão CLI `0.7.1`, base `1480ea42`; arquivos `supabase/functions/store-pre-registration/index.ts` e teste associado | O proprietário do trabalho concorrente deve corrigir e revalidar sem sobrescrita |
| P1 | Rotação das credenciais e tokens fornecidos na conversa | Exposição de credenciais continua sendo incidente imediato | Segredos foram compartilhados em texto; não há evidência de rotação nesta revalidação | Rotacionar imediatamente, atualizar consumidores e invalidar os valores anteriores antes de qualquer promoção |
| P2 | 133 alertas Dependabot abertos | Risco de dependências no default branch | API paginada atual: 3 críticas, 70 altas, 47 moderadas, 13 baixas; alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares | Triar e atualizar por pacote e subprojeto; responsável: manutenção do repositório |
| Resolvido (histórico) | Vulnerabilidades high no runtime principal | O checkpoint de 2026-08-03 registrou `react-router`/`react-router-dom`; a revalidação atual não reproduz o finding | `npm audit --omit=dev` em 2026-08-10: 0 vulnerabilidades no grafo de produção auditado (`critical=0`, `high=0`, `moderate=0`, `low=0`); runtime `7.18.2` | Manter o audit no gate de cada release |
| Info | `/home` para Administrador Geral | Rota bloqueada pela matriz de autorização | Produção exibiu mensagem de acesso negado sem erro/overflow | Não alterar sem requisito explícito; validar com perfil autorizado se necessário |
| P1 | Backup restaurável não comprovado | Snapshots físicos concluídos não equivalem a ponto de restauração testado | API de backups físicos: 8 `COMPLETED`; API de restore/PITR: `backups: []`, `pitr_enabled: false`, `walg_enabled: true` | Habilitar PITR/backup no projeto correto e executar restauração em ambiente controlado |
| P1 | Check oficial Vercel do PR falhou | O deployment integrado do HEAD atual terminou `ERROR`; o objeto de build `@vercel/vc-build` está `READY`, mas sem output publicado e sem log acionável no CLI | `dpl_6aFRqT5EPaUM4AK16XvDkUWQqP7h` (`readyState: ERROR`); o check atual continua falho | Reconciliar provisionamento da integração/equipe Vercel e obter Preview atual aprovado antes do merge |
| Resolvido no checkpoint histórico `e609bb72` e revalidado no HEAD `693ef139` | Replay/grants RLS | O primeiro SHA falhou no histórico duplicado e o seguinte falhou na ACL; o CI atual confirmou os 40 cenários no HEAD que contém o runtime `d7356687` | `pgTAP RLS Matrix` `31404300238`: `SUCCESS` (`40/40`); checksums/reversibilidade também verdes; nenhum DDL foi aplicado à produção | Manter a matriz no gate de futuras migrations |
| P1 | Patch final ainda não promovido | O patch está publicado no PR e os gates GitHub do HEAD atual passaram, mas não há Preview Vercel atual e produção continua no merge `82191012` | PR #187 HEAD `693ef139`; Vercel `dpl_6aFRqT5EPaUM4AK16XvDkUWQqP7h` `ERROR`; produção `/api/health` `200/healthy` | Promover somente após Preview atual aprovado, mutations Owner seguras, Sentry/rollback e smoke final |
| P1 | Matriz integral de perfis/rotas/estados/viewports | Auditoria universal e Owner Base44 de leitura passaram no HEAD atual; mutations Owner continuam protegidas e isso não prova todos os estados/ações do prompt | CI `31404300048`: universal `9 passed`, Owner Base44 `1 passed`; artefato `9069378014` | Completar apenas mutations em sandbox autorizado e ampliar estados/ações restantes sem contar skips como aprovação |
| P2 | Console do Preview contém bloqueio externo | `vercel.live/feedback.js` é bloqueado pela CSP, sem falha funcional do app | console do Preview manual | Documentar/corrigir conscientemente a instrumentação antes de exigir console totalmente limpo |
