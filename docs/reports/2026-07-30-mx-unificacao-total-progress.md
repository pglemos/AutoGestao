# MX Unificação Total — Progresso

Atualizado em 2026-08-10 no worktree isolado
branch `fix/mx-final-gates-20260810`, runtime
`d7356687105e6f048d974c5a25dd96d7f31eaf11` e HEAD remoto
`693ef1394ed646a09b232253b266618f8bdc175e`; os commits documentais posteriores
não alteram runtime. A produção permanece no merge
`82191012260208c6dc82e240cd78fdf4658fb6ba`. As observações abaixo das seções
históricas continuam preservadas e não são evidência de outro runtime.

> **Estado vigente:** o checkpoint de código/runtime `d7356687` contém o
> hardening adicional de audit/backup, ACL de sequences, policies restritivas e
> release Sentry sem fallback de branch. O HEAD remoto documental
> `693ef139` passou CI/pgTAP/visual de leitura, mas o deployment Vercel falhou;
> produção continua no merge `82191012`, sem DDL ou promoção.

## Checkpoint vigente — hardening de segurança — `d7356687`

- O código/runtime deste checkpoint remove o fallback de branch no release do
  Sentry, protege as relações auxiliares na criação, revoga ACLs de tabela e
  sequence para roles da API, concede somente `service_role` e usa policy
  `AS RESTRICTIVE` para o backup.
- Contratos focados: `7 pass / 0 fail / 26 expect() calls`.
- Gates locais: lint, typecheck, `npm test` (`2603 pass / 0 fail / 18190
  asserts`) e build passaram; o lint mantém apenas o warning histórico de
  `HelpTooltip.tsx`, e o build não gerou sourcemaps públicos.
- Checks de migrations: `400` checksums íntegras, drift autorizado para as
  migrations novas e `44` migrations com rollback documentado; npm audit e
  Gitleaks staged passaram.
- Docker/Postgres não está disponível neste computador; pgTAP/reset local não é
  possível. O CI remoto do HEAD `693ef139` passou pgTAP `40/40`, quality gates,
  visual universal/Owner Base44, typecheck/unit, Gitleaks e auditorias. O
  deployment Vercel integrado `dpl_6aFRqT5EPaUM4AK16XvDkUWQqP7h` terminou
  `ERROR`; produção permanece sem DDL ou promoção, no merge `82191012`.
- CodeRabbit foi tentado no commit documental local `8360e31b` em modo normal e
  `--agent`, mas não analisou o diff: `Review limit reached`/`Rate limit
  exceeded`, sem seat atribuído e espera externa informada de 24 minutos.
  O check CodeRabbit do GitHub no HEAD `693ef139` terminou `SUCCESS`; o limite
  local não é tratado como aprovação.

## Revalidação atual — 2026-08-10

### Tarefa

Corrigir a regressão visual/estrutural encontrada em `/home` do Dono: o cockpit
executivo escapava do `PageCanvas` e aplicava margem própria.

### Diagnóstico e causa raiz

`DashboardLoja.container.tsx` desligava `ConditionalPageCanvas` sempre que o
papel era Dono ou gerente na aba `performance`. `OwnerExecutiveCockpit.tsx`
também usava `p-mx-sm md:p-mx-lg`, duplicando a responsabilidade de margem.

### Alterações e arquivos

- `ConditionalPageCanvas` agora é habilitado para o Dono e usa `as="div"`,
  evitando um landmark `main` aninhado no shell.
- O padding lateral próprio foi removido do cockpit executivo.
- O contrato `OwnerExecutiveCockpit.contract.test.ts` falha antes da mudança e
  prova a abertura JSX real após a mudança.
- Commit local: `a3ede247ed3db02a4aa0cbb1a97cd6f79670f75d`.

### Testes e evidências

- RED: contrato falhou porque o Dono não habilitava o canvas.
- GREEN: contrato isolado `2 pass / 0 fail`.
- `npm run lint`: exit 0; warning a11y preexistente em `HelpTooltip.tsx`.
- `npm run typecheck`: exit 0.
- `npm test`: `2.594 pass / 0 fail / 18.152 asserts`.
- `npm run build`: exit 0; sem sourcemaps públicos.
- `npm run check:bundle-size`: `1.567,08/1.860 KB gzip`, chunks dentro do
  orçamento; `vendor-ui` em warning não bloqueante.
- `npm run audit:routes-data`: exit 0; 109 rotas declaradas, 101 protegidas,
  8 públicas, 136 tabelas, 87 RPCs e 14 Edge Functions.
- CodeRabbit: a revisão solicitou duas correções documentais e uma asserção
  independente; todas foram aplicadas neste commit e aguardam nova revisão.
- Browser local autenticado como Dono, `1440×900`: um
  `[data-mx-page-canvas]`, tag `DIV`, padding `32px`, cockpit `0px`, um
  `main`, zero overflow e zero erros de console.
- Browser local autenticado como Dono, `390×844`: canvas `DIV`, padding
  `16px`, cockpit `0px`, um `main`, `scrollWidth === clientWidth === 390` e
  zero erros de console.
- Screenshot local: `output/playwright/dono-pagecanvas-fix-1440x900.png`.

### Resultado e próximo passo

Correção local comprovada. A revisão Agy foi tentada em modo plano, mas a quota
externa foi atingida antes de produzir parecer; não é contada como aprovação.
O PR/preview/CI protegido foram publicados e passaram; o PR #186 foi depois
mesclado no SHA `82191012260208c6dc82e240cd78fdf4658fb6ba`. Essa evidência é
do diff anterior ao gate final abaixo.

## Revalidação final — 2026-08-10 — gates do worktree isolado

### Tarefa

Fechar as regressões descobertas no smoke real de `/fechamento-diario`,
`/vendedor/terminal-mx` e no toaster global mobile antes de abrir um novo PR.

### Diagnóstico e causa raiz

- `ManagerDailyClosing` ainda aplicava `max-w-7xl px-4` fora do `PageCanvas`
  canônico.
- `Checkin` renderizava `PageCanvas as="main"` dentro do `<main>` do shell,
  criando dois landmarks.
- Sonner aplicava `width: 100%` ao viewport mobile e offsets laterais ao
  mesmo tempo; em `390px` o elemento terminava em `right=406px`.

### Alterações e arquivos

- `ManagerDailyClosing` e o skeleton agora usam `PageCanvas as="div"` com
  `width="dashboard"` e clearance de navegação.
- `Checkin` usa `PageCanvas as="div"`; o teste impede um segundo `main`.
- O toaster global recebeu classe/offset mobile canônicos e uma regra CSS que
  limita o viewport a `min(var(--width), 100% - 32px)`.
- Teste novo: `src/test/sonner-layout.contract.test.ts`.
- RED: o contrato do Sonner falhou antes da alteração; GREEN isolado: `1 pass`.

### Testes executados

- `npm run lint`: exit `0`; um warning a11y histórico em `HelpTooltip.tsx`.
- `npm run typecheck`: exit `0`.
- `npm test`: `2.600 pass / 0 fail / 18.173 asserts`.
- `npm run build`: exit `0`; `assert_no_public_sourcemaps` passou.
- `npm run check:bundle-size`: `1.563,57/1.860 KB gzip`; todos os chunks no
  orçamento; `vendor-ui` em warning não bloqueante.
- `git diff --check`: exit `0`.
- `npm run validate:structure`, `validate:parity`, `validate:agents`,
  `sync:ide:check`, `audit:routes-data`, `audit:management-design-system` e
  `lint:a11y`: exit `0`; os avisos históricos de AIOX e `HelpTooltip` foram
  preservados, sem erros.

### Evidências de navegador

- Vite do worktree foi executado com o `.env` do checkout principal apenas em
  memória; nenhum `.env` foi copiado ou versionado.
- Toast real em viewport `390×844`: `x=16`, `width=356`, `right=372`,
  `document.documentElement.scrollWidth=390`.
- Toast real em viewport `1440×900`: `x=1060`, `width=356`, `right=1416`,
  `scrollWidth=1440`.
- Captura visual mobile exibida na sessão mostra o toast dentro do viewport;
  o servidor do Chrome recusou persistir o PNG fora das raízes configuradas.

### Estado remoto reconciliado

- `origin/main`: `82191012260208c6dc82e240cd78fdf4658fb6ba`.
- PR #186: `MERGED`; workflows do SHA passaram.
- Vercel produção: deployment `dpl_6GCb95AQzx3PnnphrdoCsMb2bGHc`, `READY`,
  aliases oficiais ativos.
- `/api/health`: HTTP `200`, `healthy`, release exatamente igual ao SHA acima;
  Vercel, Supabase API/database e crons críticos `ok`.
- O diff deste worktree ainda não foi publicado nem validado em preview.

### Resultado e próximo passo

Gates locais e a geometria do toaster passaram; esta seção registra um
checkpoint histórico anterior ao hardening final. Para o checkpoint vigente
`d7356687`, o próximo passo é reconciliar os relatórios após a revisão CodeRabbit,
executar o Gitleaks staged, commitar e publicar pela autoridade AIOX DevOps;
depois devem ser observados CI, pgTAP e Preview próprios antes de qualquer
promoção. O Preview e o CI históricos não aprovam este checkpoint.

## Revalidação de histórico Supabase — 2026-08-10 — checkpoint anterior ao CI final

### Tarefa

Desbloquear o job `pgTAP RLS Matrix` sem alterar o schema ou os dados de
aplicação reais e sem modificar o histórico remoto.

### Diagnóstico e causa raiz

O CI reproduziu `duplicate key value violates unique constraint
"schema_migrations_pkey"` ao aplicar `20260407000000_role_matrix_dono_admin.sql`.
O marcador `00000000000001_mark_existing_migrations_applied.sql` registrava as
39 versões históricas, mas o runner local do Supabase aplica também os stubs e
tenta registrar a primeira versão novamente.

### Alterações

- O marcador deixou de inserir as 39 versões; os stubs permanecem no-op,
  imutáveis e aptos a reconciliar a história remota pelo fluxo normal do
  Supabase.
- `.migration-checksums.json` foi regenerado com `398` checksums; a alteração
  da migration já aplicada está documentada e hash-pinned em
  `.migration-checksum-allowlist.json`.
- Nenhuma migration foi aplicada remotamente; nenhum DDL, dado de aplicação ou
  proteção RLS foi alterado no projeto remoto. O checkout contém a migration de
  grants RLS pendente `20260810100000_restore_authenticated_rls_helper_execute.sql`.

### Testes e evidências

- `node scripts/gen_migration_checksums.mjs --check`: `398` checksums íntegras.
- `node scripts/check_migration_checksum_drift.mjs --base origin/main`: allowlist
  de um rewrite esperado e `50` migrations novas reconhecidas.
- `node scripts/check_migration_reversibility.mjs --changed-only`: `42`
  migrations com rollback documentado.
- `git diff --check`: exit `0`.
- Falha reproduzida no CI anterior: run `31363182145`, job `93376028520`, SHA
  `df0955b05cf3295cd85e20c382a0ea17489d22c9`; o novo SHA ainda precisa passar
  pelo mesmo job.

### Resultado e próximo passo

Correção local pronta para commit. O gate RLS permanece `PENDENTE` até o GitHub
Actions executar `supabase db reset`, comparar a lista de versões antes/depois e
rodar os 40 cenários pgTAP no novo SHA.

## Revalidação adicional — 2026-08-10 — grants dos helpers RLS — checkpoint anterior ao CI final

### Tarefa

Eliminar a segunda causa raiz do `pgTAP RLS Matrix` sem reabrir execução para
`anon`/`PUBLIC` e sem aplicar DDL ou alterar dados no projeto remoto.

### Diagnóstico e causa raiz

O CI do PR #187 no SHA `1eee68444d8e807128b4175e6f417f86b16cc2c5` falhou no
run `31366214127`, job `93385034779`, com `permission denied for function
eh_area_interna_mx` ao consultar `lancamentos_diarios`. A migration
`20260806150000_revoke_anon_public_execute_functions.sql` removeu corretamente
`PUBLIC`/`anon`, mas policies RLS autenticadas também precisam de `EXECUTE`
nominal para seus helpers.

### Alterações

- Adicionada `20260810100000_restore_authenticated_rls_helper_execute.sql`.
- Revogado `PUBLIC`/`anon` e concedido `authenticated` para os 22 helpers
  usados por predicates RLS.
- `grants_guard.test.sql` passou a verificar esse contrato em um sétimo
  assertion pgTAP, mantendo o teste explícito contra regressão.
- `.migration-checksums.json` foi regenerado para `399` migrations.

### Testes e evidências

- `npm run lint`, `npm run typecheck`, `npm test` (`2.600 pass / 0 fail /
  18.173 asserts`), `npm run build`, bundle, auditorias locais e
  `git diff --check`: exit `0` na revalidação desta retomada.
- `node scripts/gen_migration_checksums.mjs --check`: `400` checksums íntegras.
- `node scripts/check_migration_reversibility.mjs --changed-only`: `44`
  migrations com rollback documentado.
- Docker/Postgres local continua indisponível em `127.0.0.1:54322`; o worktree
  não está vinculado a um project ref. O pgTAP só pode ser confirmado pelo CI
  com banco efêmero.
- Nenhuma alteração remota foi aplicada; produção permanece no deployment
  saudável do merge `82191012`.

### Resultado e próximo passo

Naquele checkpoint o patch estava pronto para revisão CodeRabbit/Gitleaks,
staging seletivo, commit e push pela autoridade AIOX DevOps. O CI final do HEAD
documental confirmou depois o `pgTAP RLS Matrix` verde no run `31377957069`;
Preview manual, Vercel integrado, restore/PITR, matriz Owner e promoção ainda
exigem gates próprios. A story continua `InProgress`.

## Revalidação histórica — CodeRabbit e hardening auxiliar — antes do checkpoint `d7356687`

> Esta seção registra o estado anterior e não é evidência vigente do checkpoint
> `d7356687105e6f048d974c5a25dd96d7f31eaf11`.

### Tarefa

Tratar os quatro findings acionáveis da revisão vigente antes do commit: não
persistir credenciais do checkout, delimitar a redação de segurança, remover a
duplicação do File List e fechar a lacuna de ordem das migrations auxiliares.

### Alterações

- `.github/workflows/migration-checksums.yml` agora usa
  `persist-credentials: false` no checkout.
- O relatório distingue explicitamente alterações aplicadas ao projeto remoto
  da migration de grants presente apenas no checkout.
- A story não repete `.migration-checksums.json` no manifesto.
- `20260810110000_harden_auxiliary_audit_backup_rls.sql` cria as relações de
  auditoria/backup se ausentes e reaplica, de forma idempotente, RLS, revogações,
  acesso de `service_role` e policies explícitas.
- `grants_guard.test.sql` passou a 19 invariantes, cobrindo existência, RLS,
  privilégios efetivos (inclusive `PUBLIC`), acesso operacional, expressões de
  policy e probes negativos semeados para `anon`/`authenticated`.

### Testes e evidências

- Suíte completa reexecutada: `2600 pass / 0 fail / 18173 asserts`.
- `npm run lint`, `npm run typecheck`, `npm run build`, bundle, auditorias AIOX,
  checksums (`400`) e reversibilidade (`44`) passaram.
- `gitleaks dir` encontrou somente findings históricos/fora do diff atual; a
  verificação do conteúdo staged será executada antes do commit.
- Docker/Postgres local continua indisponível; a execução pgTAP da migration
  nova depende do CI efêmero após o push.

### Resultado e próximo passo

Findings locais tratados sem aplicar migration remota. Próximo passo: staging
seletivo, Gitleaks staged, commit, push pela autoridade AIOX DevOps e observar o
novo CI/Preview. A story continua `InProgress`.

## Revalidação histórica — Performance de Vendas — antes da retomada final

> Esta seção registra evidências anteriores e não é evidência vigente do
> checkpoint `d7356687105e6f048d974c5a25dd96d7f31eaf11`.

### Tarefa

Fechar a validação da reconstrução visual e funcional do MX, publicar o SHA atual e validar a rota crítica de Performance de Vendas em produção.

### Objetivo

Concluir os gates restantes do prompt mestre com evidência reproduzível, mantendo pendências externas explícitas.

### Diagnóstico

Os gates locais anteriores estavam verdes, mas a matriz E2E longa encontrou a rota `/relatorios/performance-vendas` sem o marcador visual canônico do cabeçalho. O deployment vigente também não apresentava esse marcador e emitia warnings de dimensões negativas do Recharts.

### Causa raiz

`src/features/sales-performance/sections/AdminHeader.tsx` renderizava um `header` legado, sem `data-mx-module-header` e sem a superfície canônica (`rounded-2xl`, borda, fundo branco, padding e sombra).

### Alterações

- Adicionado `data-mx-module-header=""` ao cabeçalho.
- Aplicadas as classes canônicas de superfície, mantendo as ações, a responsividade e a hierarquia existentes.
- Plano de execução atualizado para refletir os gates reais de 03/08.
- Corrigidos os quatro `ResponsiveContainer` da Performance de Vendas com `minWidth={0}`, `minHeight={0}` e dimensões iniciais positivas para eliminar o warning de montagem `width(-1)/height(-1)`.
- Gerado o inventário estruturado atual em `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`: 111 rotas, 103 protegidas, 8 públicas, 127 tabelas, 84 RPCs e 14 Edge Functions.
- CI do SHA `a81c3f86`: Quality Gates, Typecheck/unit, ESLint a11y, bundle-budget, Module Design System Parity e MX Atomic Design Enforcement passaram.
- Gitleaks no evento `push` passou (run `30847358188`); a execução manual histórica (run `30847366721`) encontrou 77 achados em commits antigos e permanece registrada como dívida de rotação/limpeza, sem allowlist.
- No checkpoint de 2026-08-03, `npm update brace-expansion --package-lock-only --ignore-scripts` atualizou os pacotes compatíveis para `brace-expansion` 5.0.9/2.1.4/1.1.18 e `npm audit --omit=dev` caiu de 3 para 2 findings high, ambos em `react-router`/`react-router-dom`; a revalidação de 2026-08-10 retornou 0 vulnerabilidades no grafo de dependências de produção auditado, com `react-router`/`react-router-dom` em `7.18.2`.
- Dependabot revalidado pela API paginada: 133 alertas abertos (3 critical, 70 high, 47 medium, 13 low). Os alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares permanecem fora do escopo seguro desta correção.

### Arquivos

- `src/features/sales-performance/sections/AdminHeader.tsx`
- `src/features/sales-performance/sections/AdminFunnelChart.tsx`
- `src/features/sales-performance/sections/AdminGoalCompareChart.tsx`
- `src/features/sales-performance/sections/AdminPeopleChart.tsx`
- `src/features/sales-performance/sections/AdminSellOutEvolution.tsx`
- `docs/audits/route-inventory.md`
- `docs/audits/route-inventory.json`
- `docs/superpowers/plans/2026-07-30-mx-unificacao-total.md`
- `docs/reports/2026-07-30-mx-unificacao-total-progress.md`
- `docs/reports/2026-07-30-mx-unificacao-total-final.md`

### Testes executados

- `npm test`: 1703 pass, 0 fail, 13.975 asserts (antes desta alteração).
- `npm run lint`: verde (847 arquivos; tokens, z-index, page roots e landmarks verdes).
- `npm run build`: verde, sem sourcemaps públicos.
- `npx playwright test --project=chromium --project=mobile-chrome`: `184 passed`, `8 failed`, `182 skipped` em 46,5 min; os 6 failures antigos do Chromium foram revalidados isoladamente após o patch.
- Auditoria visual isolada: `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test src/test/module-route-visual-audit.playwright.ts --project=chromium` → `9 passed` em 6,4 min.
- Smoke de consultoria isolado: `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test src/test/mx-consultoria-role-smoke.playwright.ts --project=mobile-chrome` → `1 passed` em 11,4 min.
- Agenda afetada: `agenda-filters` mobile reexecutado; caso que falhou por deadlock passou, segundo caso foi skip por condição de dados.
- `npm run typecheck`: exit 0.
- `npm run check:bundle-size`: 1831,43/1860 KB, todos os chunks dentro do budget.
- Revalidação após o lockfile: `npm test` 1710 pass / 0 fail / 13.997 asserts; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1831,30/1860 KB, todos os chunks dentro do budget.
- `npm run validate:structure`, `validate:parity`, `sync:ide:check`, `audit:routes-data`: exit 0.
- `npm run validate:agents`: exit 0, 121 warnings históricos.
- Produção: `/relatorios/performance-vendas` autenticada como Administrador Geral, dados reais renderizados e sem overflow horizontal; deployment vigente sem a correção local.
- Pós-patch final: `npm test` 1707 pass, 0 fail, 13.988 asserts; `npm run build` exit 0; `npm run lint` exit 0; `npm run check:bundle-size` 1831,32/1860 KB, todos os chunks dentro do budget.
- Produção atual observada: SHA `7387fb325dd645aaa2f832895e341c541c1f1d60`; deployment `dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS`, `READY`, aliases oficiais ativos.
- `/api/health`: HTTP 200, `healthy`, Vercel/Supabase API/database/crons críticos `ok`, release `7387fb325dd645aaa2f832895e341c541c1f1d60`.
- `/relatorios/performance-vendas`: HTTP 200 em `https://mxperformance.com.br`.
- `/home`: bloqueio de autorização esperado para `administrador_geral`, sem erro de console e sem overflow.
- Evidência visual final revisada: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.

### Resultado

Correção local aplicada, publicada e validada em produção. O warning Recharts não reapareceu no carregamento limpo do SHA final.

### Evidências

- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas.png`
- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-metrics.json`
- Commits desta etapa: `b841d50e`, `59b1c51e`, `f51ad48e`.
- Deployment atual observado da `main`: `dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS`, `READY`, aliases oficiais ativos.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42`: 6 issues; as duas issues documentais foram corrigidas, 1 crítica, 1 major e 2 menores permanecem em arquivos concorrentes de pré-cadastro/teste.
- Sentry confirmou organização `synvolt` e projeto `mx-performance-frontend`; bundle e `/api/health` atuais convergem para release `7387fb325dd645aaa2f832895e341c541c1f1d60`. O evento histórico `08093d7cae174d23824a5273fa42bb91` e o debug ID `ff71a893-c507-4440-9653-17416b1f2be4` permanecem evidências antigas; stack trace desminificado da release atual permanece aberto.
- `sentry-cli` global está ausente; `npx @sentry/cli` 2.58.5 foi usado somente para validação read-only.

### Próximo passo

Manter o relatório final como fonte de verdade: a correção está liberada e a atualização transitiva de `brace-expansion` está no lockfile; rotação imediata de credenciais, findings CodeRabbit concorrentes, stack trace desminificado de frame do bundle e backup restaurável permanecem explícitos. O finding histórico do React Router não foi reproduzido pelo audit do grafo de produção atual; a árvore de runtime permanece em `7.18.2`.

## Revalidação histórica — execução autônoma — 2026-08-03

- O smoke real do perfil `consultor_mx` foi executado contra `https://mxperformance.com.br` com fixture temporário de Auth/perfil, dados Supabase reais, isolamento de consultoria e limpeza automática: `1 passed` em `2,1 min`.
- Durante reexecuções, o runner revelou consultas secundárias do shell mantidas abertas após a rota concluir e `ERR_QUIC_PROTOCOL_ERROR` em um avatar público; a query equivalente de `devolutivas` respondeu em `131–223 ms`, e o avatar respondeu `HTTP/1.1 200` com curl. O teste agora rastreia pendências por navegação, não bloqueia por consulta secundária após uma leitura de negócio bem-sucedida e mantém falhas HTTP/console reais como bloqueadores.
- O smoke também observou uma tentativa intermitente de envio ao Sentry sem CORS; a repetição passou, e a inspeção CDP capturou o envelope com `HTTP 200` e `Access-Control-Allow-Origin: *`. A prova de stack trace desminificado continua aberta.
- Gates locais após a alteração do teste: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle-size` e `git diff --check` passaram; bundle `1844,83/1860 KB`, sem sourcemaps públicos.
- Nenhuma conta permanente foi reativada; fixtures temporários foram removidos pelo `afterAll` do teste.
- Reexecução local final: `npm test` 1712 pass / 0 fail / 14.004 asserts; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1844,83/1860 KB; `git diff --check` exit 0.

## Revalidação histórica — produção — 2026-08-03 (sessão final)

- Navegador autenticado como Administrador Geral abriu `https://www.mxperformance.com.br/relatorios/performance-vendas`: dados reais visíveis (`204` sell-outs e `476` meta), `main` presente, zero logs de erro e `scrollWidth === clientWidth` em viewport padrão de 1721 px.
- A mesma rota foi recarregada em `390×844`: `scrollWidth === clientWidth === 390`, títulos `BI Executivo da Rede`, `204` e `476` presentes, zero elementos fixos fora da viewport e zero logs de erro.
- Smoke Playwright contra produção, filtrado para `consultor_mx`, com fixture Auth/consultoria temporário e limpeza automática: `1 passed (2.0m)`.
- CI do SHA `7387fb325dd645aaa2f832895e341c541c1f1d60`: `Quality Gates`, `Typecheck`, `unit-tests`, `eslint-a11y`, `Atomic Design`, `parity`, `Detect Secrets` e `Supabase Preview` concluídos com sucesso.
- O `npx @sentry/cli` local está disponível (`2.58.6`), porém o token operacional fornecido para esta sessão retornou `401 Invalid token`; source maps e stack trace desminificado da release atual continuam sem prova independente da API.
- Após o follow-up documental `6d5eebe2`, a Vercel publicou `dpl_2nEL2EZ6yhxXz3E3TGeMzh6VBFmh` como `READY`; `/api/health` e o bundle servido convergiram para `6d5eebe206c89481336f3f1584c14ee67d6ee842`, e o smoke pós-deploy do `consultor_mx` passou `1 passed (2.4m)`.
- A checagem de `index-C5PCw3sv.js.map` respondeu `200` por rewrite, mas com `Content-Type: text/html` e `content-disposition: index.html`; não havia source map público servido.

## Revalidação histórica do PR #187 — checkpoint `e609bb72` — 2026-08-10

> Esta seção registra o último checkpoint remoto anterior ao código `d7356687`.

### Tarefa

Reconciliar a publicação do SHA final, o Preview, o CI, os serviços externos e o
estado real da produção sem promover o patch enquanto algum gate obrigatório
permanecer sem prova.

### Evidências

- GitHub: PR #187 continua `OPEN`, base `main`, HEAD remoto
  `379c4a148dc200472daf49719af520025fb01c55`; Quality Gates, pgTAP RLS,
  visual autenticado, Manager/Central Parity, a11y, bundle, checksums,
  reversibilidade, Gitleaks, typecheck/unit e auditorias visuais terminaram
  `SUCCESS`. Os findings efetivos do
  CodeRabbit foram corrigidos e a nova execução após o último ajuste foi
  bloqueada por limite de uso; `TestSprite Pre-Check` falhou com `No tests detected`.
- CI autenticado visual `31377957000`: passou; a matriz do Dono foi pulada por
  ausência de `E2E_OWNER_EMAIL`.
- `pgTAP RLS Matrix` `31377957069`: `SUCCESS` nos 40 cenários; não há mais
  bloqueio remoto de RLS neste SHA.
- A reexecução local passou `npm test` (`2600 pass / 0 fail / 18173 asserts`),
  bundle `1563,53/1860 KB gzip`, auditoria de runtime sem vulnerabilidades e
  `git diff --check`; o build emitiu seis warnings CSS não bloqueantes e não
  gerou sourcemaps públicos.
- Vercel Preview manual: `dpl_2u51UvwJcSGBB1igRsuC4V3hXVY4`, URL
  `https://mxperformance-dfk3mk6sf-synvolt.vercel.app`, `READY`, health HTTP 200
  `healthy`, release exata do SHA e checks de Vercel/Supabase/database/crons
  `ok`. `/login` respondeu HTTP 200.
- Vercel integrado ao HEAD: `dpl_GW9AX58PcAyJGZT6C7NEwRLT4bis` terminou
  `ERROR / Resource provisioning failed`; a inspeção retornou `readyState: ERROR`
  e o redeploy não pôde ser executado no contexto/equipe disponível.
- Browser real no Preview: Dono, Gerente e Vendedor autenticaram; `1440×900` e
  `390×844` tiveram um `main` e zero overflow; o menu mobile abriu para Gerente
  e Vendedor. O bloqueio de `vercel.live/feedback.js` pela CSP é externo à
  aplicação e permanece documentado.
- Sentry: release `4c7b906d653a9af00969d75313ea6c9756f5bbc0` presente em
  `synvolt/mx-performance-frontend`; eventos de `/login`, `/home`, `/dono` e
  evento controlado de Preview chegaram com tags de rota/papel/deployment/SHA e
  debug metadata de source map. O conector MCP pediu reautenticação; a consulta
  válida foi feita por API autenticada de runtime.
- Supabase: projeto `fbhcmzzgwjdgkctlfvbo` `ACTIVE_HEALTHY`, 357 migrations
  remotas, 159 avisos de segurança e 598 de performance. A API de backups
  físicos lista 8 itens `COMPLETED`, incluindo `2026-08-10`; a consulta separada
  de restore/PITR retornou `backups: []`, `pitr_enabled=false` e
  `walg_enabled=true`. Nenhum restore foi executado com sucesso.
- Produção: `/api/health` retornou `200`, `healthy`, release
  `82191012260208c6dc82e240cd78fdf4658fb6ba`; nenhum DDL remoto ou promoção do
  PR #187 foi executado.

### Resultado

Preview manual funcional e produção preservada. O estado global continua
`PARCIALMENTE CONCLUÍDO / BLOCKED_EXTERNAL`: o check Vercel oficial,
restore/PITR, matriz Owner integral, TestSprite e promoção continuam sem prova;
o pgTAP/RLS e os demais workflows GitHub do SHA estão verdes.

### Próximo passo

Publicar este checkpoint documental pelo AIOX DevOps, manter o PR aberto e
reconciliar a integração Vercel/credencial Owner. Não fazer merge ou promoção
com o check Vercel oficial falhando.
