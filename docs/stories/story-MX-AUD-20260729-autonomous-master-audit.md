# Story MX-AUD-20260729: Auditoria autônoma, correção e entrega comprovada

## Status

**Ready for Review**

## Executor Assignment

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools:
  - command: npm run lint
    success: exit 0
  - command: npm run typecheck
    success: exit 0
  - command: npm test
    success: exit 0, zero failed tests
  - command: npm run build
    success: exit 0
  - tool: Playwright
    command: npx playwright --version
    expected_version: 1.61.1
    success: versão confirmada; fluxos autenticados sem erro finito e screenshots em output/playwright
  - tool: Supabase CLI
    command: npx supabase --version
    expected_version: 2.110.0
    success: versão confirmada; migrations 327/327 e operação remota permanece bloqueada por backup
  - tool: Vercel CLI
    command: npx vercel --version
    expected_version: 50.44.0
    success: versão confirmada; preview READY desta story ainda pendente
  - tool: Sentry CLI
    command: npx sentry-cli --version
    expected_version: 2.58.5
    success: versão confirmada; evento, release e source maps ainda pendentes
```

## Story

**Como** proprietário do MX Gestão Preditiva,
**quero** que o estado real do produto, do banco e das integrações seja auditado, corrigido e publicado com validação por perfil,
**para que** o sistema opere em produção com arquitetura coerente, dados íntegros, permissões corretas, observabilidade e rollback verificáveis.

## Contexto e fonte

Esta story formaliza o trabalho autorizado pelo documento
`PROMPT_MESTRE_AGENTE_AUTONOMO_MX_GESTAO_PREDITIVA.md`, fornecido pelo usuário
como documento externo à worktree.
O prompt mestre é a fonte normativa dos critérios abaixo. A branch
`feat/unified-mx-design-system` é o ponto de continuidade porque contém `main`
no SHA-base `393ebc5b` e 17 commits incrementais de Design System. Declarações
anteriores de conclusão não contam como evidência nova.

## Acceptance Criteria

1. O estado inicial é preservado: alterações do proprietário não são
   sobrescritas, a execução ocorre em worktree isolada e ambiente, branch,
   remotes, processos, versões e rollback são registrados sem segredos.
2. Existe inventário verificável de arquitetura, rotas, perfis, permissões,
   fontes de dados, ações, componentes visuais, integrações e dívida priorizada
   de P0 a P4.
3. Instalação limpa e todos os scripts existentes são executados separadamente;
   cada falha registra comando, código de saída, causa raiz, correção e
   revalidação.
4. A arquitetura final usa uma única moldura de App Shell, sidebar, topbar e
   drawer configuráveis por perfil. `OwnerShell`, `Layout`, `AppShellFrame` e
   os escopos `.owner-b44`, `.mx-manager-scope` e `.mx-internal-scope` só podem
   permanecer quando houver justificativa formal, prazo e teste; o critério
   final do prompt exige sua remoção após paridade.
5. Tokens e componentes do Design System são a fonte visual canônica, sem
   novos valores arbitrários, com estados interativos, teclado, foco,
   landmarks, contraste e comportamento responsivo.
6. Dono, Gerente, Admin MX, Administrador Geral, Consultor MX, Vendedor e
   páginas compartilhadas/públicas são validados em rotas e fluxos autorizados,
   incluindo leitura, filtros, formulários, mutations, estados e logout.
7. Supabase possui migrations alinhadas e reversíveis, backup confirmado,
   RLS/RPC/Auth/Storage/Realtime/advisors revisados e matriz por papel
   executada sem desabilitar proteções.
8. GitHub, Vercel e Sentry são inventariados e configurados no projeto correto.
   Variáveis são comparadas apenas por nome/presença; nenhum segredo aparece em
   código, Git, logs, screenshots ou relatório.
9. Preview aprovado precede produção. O preview e a produção são validados com
   autenticação real, console/network, `/api/health`, logs, Sentry, release,
   source maps, smoke e rollback disponível.
10. A suíte cobre unitário, integração, contrato, E2E por perfil, autorização,
    RLS, acessibilidade, regressão visual, responsividade, segurança, build e
    smoke nos 13 viewports obrigatórios do prompt.
11. CI/CD possui gates para instalação, lint, typecheck, unitário, integração,
    E2E, acessibilidade, visual, build, secret scan e dependency audit, sem
    aceitar apenas o status da Vercel.
12. `docs/auditoria/relatorios/RELATORIO_FINAL_MX_GESTAO_PREDITIVA.md` contém
    resumo, mudanças, evidências com códigos de saída, matrizes, migrations,
    presença de variáveis, riscos, pendências, rollback, deploys e releases.
13. O estado final usa somente uma classificação permitida pelo prompt e
    nenhuma afirmação de conclusão é feita sem evidência nova, direta e
    verificável.

## Tasks / Subtasks

- [x] Fase 0 — preservar e registrar ambiente (AC: 1)
  - [x] Registrar versões, processos, Git, worktrees e alterações existentes.
  - [x] Criar estrutura de evidências sem dados sensíveis.
  - [x] Registrar SHA-base e plano de rollback.
- [x] Fases 1–3 — descoberta e baseline reproduzível (AC: 2, 3)
  - [x] Inventariar rotas, perfis, dados, mutations, visual e dívida.
  - [x] Inventariar GitHub, Supabase, Vercel e Sentry.
  - [x] Executar instalação limpa e gates atuais individualmente.
- [ ] Fases 4–5 — Design System, shell e perfis (AC: 4, 5, 6)
  - [x] Comparar os 17 commits com o código atual e provar cada alegação.
  - [x] Remover duplicação funcional e escopos apenas após paridade.
  - [ ] Validar perfis e páginas na ordem do prompt.
- [ ] Fases 6–8 — dados, deploy e observabilidade (AC: 7, 8, 9)
  - [ ] Validar backup, migrations, RLS, RPC, Auth, Storage e Realtime.
  - [ ] Validar matriz de variáveis, preview, health e Sentry.
  - [ ] Publicar produção apenas quando os gates bloqueantes passarem.
- [ ] Fases 9–12 — qualidade, segurança e operação (AC: 10, 11)
  - [ ] Executar matriz de testes e segurança.
  - [x] Corrigir causas raiz e repetir a matriz local completa.
  - [ ] Provar rollback e monitorar o pós-deploy.
- [ ] Fases 13–14 — entrega (AC: 12, 13)
  - [x] Atualizar checkboxes, Dev Agent Record e File List.
  - [x] Revisar diff, executar quality gate e secret scan.
  - [ ] Preparar commits/PR/deploy via autoridade AIOX DevOps.
  - [ ] Entregar relatório final baseado nas evidências atuais.

## Dev Notes

### Arquitetura e integração

- O produto é uma SPA React 19 + TypeScript 5.8 + Vite 6 + Tailwind 4,
  Supabase direto e rotas lazy-loaded. Imports usam alias `@/`.
  [Source: `docs/architecture/00-overview.md#existing-project-analysis`]
- A migração deve ser incremental, sem big bang, e cada etapa precisa ser
  implantável e reversível.
  [Source: `docs/architecture/00-overview.md#identified-constraints`]
- Componentes seguem Atomic Design: átomos sem regra de negócio ou Supabase,
  moléculas sem chamadas Supabase e organismos podem consumir hooks.
  [Source: `docs/architecture/01-component-arch.md#atomic-design-layer-definitions`]
- A branch já criou tokens, átomos, moléculas e `AppShellFrame`, mas sua própria
  documentação ainda lista páginas compartilhadas pendentes e a etapa de
  produção como não executada. Isso deve ser revalidado, não presumido.
  [Source: `docs/design-system/migration.md#status-das-fases`]
- A estratégia existente exige `typecheck`, testes, build, preview funcional e
  smoke antes de produção, com rollback por deployment anterior.
  [Source: `docs/architecture/04-testing-deploy.md`]
- A matriz de segurança existente deve ser confrontada com as roles reais e as
  políticas atuais do banco.
  [Source: `docs/architecture/security-matrix.md`]

### Restrições

- Não alterar produção antes de preview validado.
- Não remover RLS, autenticação, observabilidade ou proteções para fazer testes
  passarem.
- Não registrar valores de credenciais. Tokens fornecidos nesta conversa são
  somente entradas de runtime e precisam ser rotacionados após a execução.
- Alterações destrutivas exigem backup, dry run, impacto, rollback e confirmação
  quando forem irreversíveis.
- Git push, PR, release e tag são exclusivos de `@devops`.

### Testing

- Gates constitucionais: `npm run lint`, `npm run typecheck`, `npm test` e
  `npm run build`.
  [Source: `.aiox-core/constitution.md#v-quality-first-must`]
- Testes de componente usam Bun Test e Testing Library; E2E usa Playwright.
  [Source: `docs/architecture/00-overview.md#existing-technology-stack`]
- A prova funcional deve usar sessão autenticada real, console e network, não
  apenas inspeção do código ou HTTP superficial.
- Cada alegação no relatório deve apontar para comando, saída resumida, código
  de saída, URL, screenshot, commit ou arquivo correspondente.

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> `coderabbit_integration.enabled` não está habilitado em
> `.aiox-core/core-config.yaml`. A revisão seguirá o processo manual e os gates
> constitucionais; a disponibilidade da CLI será registrada separadamente.

## Story Draft Checklist

| Category | Status | Issues |
|---|---|---|
| Goal & Context Clarity | PASS | Escopo e benefício derivam do prompt mestre. |
| Technical Implementation Guidance | PASS | Sistemas, caminhos, gates e ordem estão definidos. |
| Reference Effectiveness | PASS | Fontes específicas resumidas nesta story. |
| Self-Containment Assessment | PASS | Critérios e restrições centrais estão incorporados. |
| Testing Guidance | PASS | Matriz e evidência mínima estão explícitas. |
| CodeRabbit Integration | N/A | Integração não habilitada na configuração. |

**Assessment:** READY para validação do PO.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-29 | 0.1 | Story criada a partir do prompt mestre autorizado | River (SM) |
| 2026-07-29 | 0.2.0 | Validated GO (9/10) — Status: Draft → Ready | Pax (PO) |
| 2026-07-29 | 0.2.1 | Development started (yolo mode) — Status: Ready → InProgress | Dex (Dev) |
| 2026-07-29 | 0.3.0 | Inventário reproduzível de rotas, autorização, dados e mutations | Dex (Dev) |
| 2026-08-10 | 0.3.1 | Regressão do PageCanvas do Dono corrigida e validada localmente em dois breakpoints | Dex (Dev) |
| 2026-08-10 | 0.3.2 | Rotas gerenciais restantes migradas para PageCanvas; gates locais, layout contract e secret scan revalidados | Dex (Dev) |
| 2026-08-10 | 0.3.3 | Branch rebaseada sobre `origin/main` atual; contrato E2E do Gerente alinhado ao runtime e gates locais repetidos | Dex (Dev) |

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex), com agentes locais AIOX Orion, Dex e Aria.

### Debug Log References

- 2026-07-29: execução intermediária de `npm run lint && npm run typecheck &&
  npm test && npm run build && npm run check:bundle-size` retornou 0: 1.668
  testes, 13.851 asserts, 5.123 módulos e 1.857,54/1.860 KB gzip. A contagem
  canônica atual está registrada nas entradas posteriores. Evidência resumida:
  seção 4 de `docs/auditoria/relatorios/RELATORIO_FINAL_MX_GESTAO_PREDITIVA.md`.
- 2026-07-29: `npx playwright --version`, `npx supabase --version`,
  `npx vercel --version` e `npx sentry-cli --version` retornaram 0 e
  confirmaram respectivamente 1.61.1, 2.110.0, 50.44.0 e 2.58.5.
- 2026-07-29: Supabase remoto auditado sem DDL; projeto
  `fbhcmzzgwjdgkctlfvbo`, estado `ACTIVE_HEALTHY`; backup restaurável não
  comprovado e drift banco/Git identificado. Evidência: seções 6–7 do
  relatório final e `.ai/decision-log-MX-AUD-20260729.md`.
- 2026-07-29: advisors Supabase atualizados somente por leitura: segurança
  permaneceu em 218 achados (8 `INFO`, 210 `WARN`) e performance retornou 578
  achados (289 `INFO`, 289 `WARN`). Nenhuma remediação remota foi executada
  sem snapshot restaurável e rollback por lote.
- 2026-07-29: login real do Dono revelou e permitiu corrigir o contexto de
  `Outlet`; `/home` e `/plano-acao` passaram sem erro de console/network.
  Evidência: `output/playwright/dono-shell-unificado-nav-1440x900.png`.
- 2026-07-29: Gerente (5 rotas), Vendedor (6 rotas) e Administrador Geral
  (5 rotas) passaram no browser real sem erro finito de console/network.
  Evidências: `output/playwright/gerente-shell-1440x900.png`,
  `output/playwright/vendedor-shell-1440x900.png` e
  `output/playwright/admin-mx-shell-1440x900.png`.
- 2026-07-29: 52 combinações responsivas passaram (4 perfis × 13 viewports),
  incluindo drawer, breakpoint e overflow horizontal. Evidências:
  `output/playwright/*-drawer-320x568.png` e seção 15 do relatório final.
- 2026-07-29: senha operacional removida de 21 arquivos; busca literal zerada
  e sintaxe de todos os JS/CJS/MJS alterados validada.
- 2026-07-29: Consultor MX bloqueado — conta nominal autentica, mas a leitura
  de `usuarios.active` retorna 401/nulo; segunda conta falha no Auth 400.
- 2026-07-29: build diagnóstico com `terser` reduziu o bundle para
  2.085,56 KB gzip, ainda 225,56 KB acima do orçamento.
- 2026-07-29: exportadores XLSX/PDF substituídos por escritores mínimos;
  `unzip -t <xlsx>` e `pdfinfo <pdf>` retornaram 0 para arquivos baixados no
  Chromium; contratos em `src/lib/export.test.ts` e
  `src/lib/pdf/downloadHtmlAsPdf.test.ts`.
- 2026-07-29: `$HOME/.local/bin/coderabbit review --uncommitted --agent`
  retornou 0; quatro achados documentais foram triados e os válidos corrigidos.
- 2026-07-29: matriz autenticada do Dono percorreu 16 rotas × 4 viewports:
  64/64 combinações, um único `aria-current`, zero overflow e zero erro de
  console/página. Aliases legados passaram a usar o mesmo cálculo ativo.
- 2026-07-29: comparação Supabase read-only confirmou 327 migrations locais e
  327 remotas, `remote_only_count=0`; nenhuma migration foi reaplicada.
- 2026-07-29: API Sentry GET confirmou um único issue frontend não resolvido em
  produção nas últimas 24h, correspondente ao smoke controlado e simbolizado
  para `sanitize.ts`; Edge e Health retornaram zero.
- 2026-07-29: auditoria das funções públicas encontrou e corrigiu localmente
  tomada de conta/reativação indevida no pré-cadastro. O endpoint não adota,
  redefine senha nem reativa identidade existente.
- 2026-07-29: regressão atual retornou 0 em lint, typecheck, build e bundle;
  1.686 testes, 13.896 asserts, zero falhas e 1.857,80/1.860 KB gzip.
- 2026-07-29: CodeRabbit revisou o diff final e retornou código 0, zero
  achados, após uma espera de rate limit.
- 2026-07-29: `npm run audit:routes-data` retornou 0 e catalogou 111 rotas,
  127 tabelas, 84 RPCs, 14 Edge Functions e 247 pares tabela/operação; zero
  rota protegida de folha ficou sem regra canônica.
- 2026-07-29: CodeRabbit apontou um conflito de rotulagem da contagem
  intermediária; corrigido. A repetição do review foi limitada por cota por 38
  minutos, sem novo parecer final.
- 2026-07-29: `npm audit --omit=dev` isolou 2 pacotes high de runtime por um
  advisory RSC sem superfície nesta SPA. O teste de downgrade para React Router
  7.11.0 foi revertido por introduzir open redirect/XSS e DoS aplicáveis; a
  árvore voltou integralmente a 7.18.2.
- 2026-07-29: Gitleaks oficial 8.30.1 auditou 2.074 commits e retornou 86
  findings históricos redigidos. Dez scripts diagnósticos com JWT/service-role
  reais foram removidos; o estado corrente rastreado ficou com 28 falsos
  positivos revisados e nenhum JWT/service-role real.
- 2026-07-29: regressão após as remoções retornou 0 em lint, typecheck, 1.686
  testes/13.896 asserts, build, bundle 1.857,80/1.860 KB e
  `git diff --check`. A nova revisão CodeRabbit retornou `rate_limit` antes da
  análise, com espera de 26 minutos; o gate pré-commit permanece pendente.
- 2026-07-29: as oito rotas públicas foram percorridas no Chrome real.
  Pré-cadastro com loja ativa carregou formulário sem registrar dados da loja;
  a landing passou a expor um único landmark `main` após teste RED/GREEN.
- 2026-07-29: Axe 4.11.4 reproduziu violações sérias de ARIA/contraste nas
  páginas públicas. Após correção por tokens, Playwright passou 7/7 rotas e o
  pré-cadastro real ficou sem violação séria/crítica.
- 2026-07-29: matriz pública percorreu 8 rotas × 13 viewports. Após reproduzir
  e corrigir overflow móvel da landing, 104/104 combinações passaram com um
  `main`, zero overflow, zero erro de console e zero falha de rede.
- 2026-07-29: CodeRabbit executou e apontou um major válido na resposta ao
  incidente de credenciais. A rotação deixou de ser condicionada a
  preview/backup: o inventário por nome confirmou legado e chave moderna na
  Vercel nos três ambientes, nenhuma `service_role` no GitHub Actions, 17
  fontes de Edge Functions e 34 scripts com dependência do nome legado. A
  exceção de cutover expira em 2026-07-30 18:00 BRT; depois disso os consumidores
  devem estar migrados e o legado desabilitado, ou os workloads afetados devem
  ser bloqueados com nova exceção nominal mais curta.
- 2026-07-29: a repetição do CodeRabbit apontou dois majors válidos. Foi criada
  uma matriz consumidor por consumidor com owner, evidência, substituição,
  teste e desativação, além de gate de expurgo para Git completo, logs,
  screenshots, caches e artefatos CI. Nova revisão ficou limitada por cota de
  7 minutos; não há parecer limpo ainda.
- 2026-07-29: reconciliação read-only do Consultor confirmou dois perfis com
  identidades Auth confirmadas e histórico de login: um perfil inativo e outro
  ativo com troca de senha pendente; nenhum banido/excluído. Não foi criada
  duplicata nem alterada identidade sem autoridade do titular/Admin MX.
- 2026-07-29: regressão final local retornou 0 em lint, typecheck, 1.687
  testes/13.897 asserts, build, bundle 1.857,44/1.860 KB e diff-check; o
  Playwright/Axe público passou 12/12 em Chromium desktop/mobile.
- 2026-07-29: CodeRabbit retornou zero achados nos arquivos rastreados, mas
  omitiu os três arquivos novos. Todos foram preparados no índice; a revisão
  integral seguinte retornou `rate_limit` de 40 minutos. Nenhum commit foi
  criado porque o gate completo ainda está pendente.
- 2026-07-29: a Vercel recebeu a chave moderna correta nos três targets e uma
  comparação efêmera confirmou match; o runtime ainda usa o nome legado, logo
  o cutover não está concluído. Edge clients passaram a preferir os mapas
  gerenciados `SUPABASE_SECRET_KEYS.default` e
  `SUPABASE_PUBLISHABLE_KEYS.default`, mantendo fallback temporário.
- 2026-08-03: incidente ACERTT reproduzido em produção: `/pre-cadastro/acertt`
  carregou a loja e o GET retornou 200, enquanto o POST podia responder
  `Muitas tentativas de cadastro` antes de criar qualquer identidade. A causa
  local era o balde compartilhado `unknown` do rate limit e o consumo da cota
  antes de validar payload/duplicidade.
- 2026-08-03: correção local aplicada para identificar IPs encaminhados com
  fallback por e-mail, limitar somente novas criações e manter `existing_user`
  orientado para recovery. O contrato de hardening passou 4/4 testes; o
  hotfix específico foi então publicado pelo fluxo DevOps, sem push do
  worktree sujo nem aprovação do cadastro real.
- 2026-08-03: o hotfix de `store-pre-registration` foi publicado no Supabase
  remoto como versão 72, mantendo `verify_jwt=false`. Os gates locais passaram:
  lint, typecheck, 1.707 testes/13.988 asserts, build, `deno check` das três
  funções tocadas, validação estrutural e `git diff --check`. O GET público de
  ACERTT retornou 200 e o browser real carregou `/pre-cadastro/acertt` sem erro
  de console; nenhum POST real foi enviado, portanto inbox e aprovação ainda
  não são alegadas como comprovadas.
- 2026-08-03: hardening adicional aplicado no `main` local: o endpoint público
  deixou de reutilizar qualquer identidade Auth/perfil existente, inclusive
  inativa, e passou a gerar caminho UUID por avatar. O teste de contrato passou
  6/6, `deno check` passou nas três Edge Functions e a suíte completa passou
  1.711/1.711 após repetição de dois timeouts transitórios de foco/cleanup.
- 2026-08-03: commit `75147ef3` publicado no `origin/main`; os seis workflows
  do SHA passaram. Vercel publicou `dpl_5RuA6xgKUgHaEUNXxZyhHkd76Fuq` como
  `Ready`, Supabase publicou `store-pre-registration` versão 76, e o Chrome
  real validou `/pre-cadastro/acertt` sem console error/warn. O POST controlado
  com e-mail já existente retornou `409 existing_user` sem criar cadastro.
- 2026-07-29: o resolver moderno passou 4/4 testes, a seleção focada passou
  16/16, typecheck retornou 0 e 11 entrypoints passaram em
  `deno check --node-modules-dir=auto`. Após a migração OAuth/Calendar, dois
  fluxos Bearer continuam dependentes do JWT legado até receberem autenticação
  interna própria.
- 2026-07-29: o Deno check com `node-modules-dir=auto` substituiu links do
  `node_modules` pelo layout Deno e fez 219 testes DOM falharem. `npm ci`
  restaurou o lockfile; o teste novo deixou de depender de `screen` global e a
  regressão isolada final passou com 1.691 testes/13.903 asserts. Lint,
  typecheck, build, bundle 1.853,78/1.860 KB e diff-check retornaram 0.
- 2026-07-29: Gitleaks 8.30.1 confirmou novamente 34 findings na árvore
  (28 rastreados revisados e 6 no `dist/`) e 86 históricos redigidos. Esses
  findings mantêm a rotação/expurgo como incidente aberto.
- 2026-07-29: CodeRabbit integral revisou os 39 arquivos e retornou cinco
  achados. Foram aplicados a validação explícita de `SUPABASE_URL`, resolução
  tardia de chaves para preservar OPTIONS/CORS e remoção do Dono da matriz
  pública. Foi rejeitada a troca direta da JWT Bearer por `sb_secret_...`
  porque a chave moderna não é JWT.
- 2026-07-29: a segunda revisão integral retornou quatro achados. Foram
  aplicados WCAG 2.2 AA e o gate auditável da exceção. A segregação de scripts
  foi documentada por identidade/RPC/broker porque `sb_secret_...` não oferece
  escopo read-only por chave. A sugestão de usar essa chave moderna como Bearer
  foi rejeitada novamente porque ela não é JWT.
- 2026-07-29: `google-oauth-handler` e `google-calendar-sync` migraram
  localmente do Bearer legado para `GOOGLE_CALENDAR_SYNC_ADMIN_TOKEN`; a
  presença remota do nome foi confirmada sem ler o valor. O endpoint usa
  `verify_jwt=false`, valida token interno ou sessão manualmente e retorna 401
  sem autenticação. Testes negativos impedem reintrodução do Bearer legado.
- 2026-07-29: `google-meet-ata` migrou localmente para o segredo dedicado
  `MX_CRON_SECRET`; a migration usa o nome correspondente já confirmado no
  Vault e não transporta service-role. `mx-critical-jobs-health` permanece
  legado porque não há token dedicado correspondente no Vault do Postgres.
- 2026-08-10: retomada no worktree isolado `feat/mx-unificacao-total-20260809`
  reproduziu `/home` do Dono sem `[data-mx-page-canvas]`. A causa era a
  condição `enabled={!isFocusedRolePerformance}` no `DashboardLoja` combinada
  com padding próprio em `OwnerExecutiveCockpit`.
- 2026-08-10: o contrato foi executado em RED, a correção foi aplicada no
  commit local `a3ede247ed3db02a4aa0cbb1a97cd6f79670f75d` e o GREEN passou. A
  suíte completa retornou `2.594 pass / 0 fail / 18.151 asserts`; lint,
  typecheck, build, bundle, auditoria de rotas e diff-check também passaram.
- 2026-08-10: browser autenticado como Dono confirmou em `1440×900` e
  `390×844` um único canvas `DIV`, margens canônicas `32px`/`16px`, cockpit
  sem padding próprio, um landmark `main`, zero overflow e console sem erros.
- 2026-08-10: CodeRabbit não encontrou novos achados após o ajuste do contrato.
  A revisão Agy em sandbox foi tentada, mas atingiu cota externa antes de
  produzir parecer e não foi contada como gate.
- 2026-08-10: `npm run audit:layout-contract` encontrou duas raízes sem canvas
  em `ManagerDailyClosingBase44.tsx` e no loading de
  `ManagerTeamPerformance.tsx`. Ambas foram migradas/remediadas sem criar
  canvas aninhado no `DashboardLoja`; a repetição retornou zero violações.
- 2026-08-10: o contrato novo de layout e os testes de `ManagerTeamPerformance`
  passaram direcionados com 38/38 testes e 8.222 asserts; a suíte completa
  isolada passou 2.604/2.604 testes, 18.182 asserts e 0 falhas. A repetição
  concorrente apresentou uma falha transitória de foco após 13,3s, reproduzida
  isoladamente como 2/2 pass.
- 2026-08-10: `npm run lint`, `npm run typecheck`, `npm run build` e
  `npm run check:bundle-size` passaram; build sem `.map` público e bundle
  1.563,79/1.860 KB gzip, com os seis warnings CSS existentes do otimizador.
  `git diff --check`, busca de padrões de tokens e Gitleaks em fontes/diff
  também passaram sem segredo detectado.
- 2026-08-10: a nova execução do Gitleaks 8.30.1 percorreu 1.950 commits e
  encontrou 116 achados históricos redigidos; o scan do estado staged deste
  worktree retornou zero leaks. O scan corrente de `src/` apontou somente três
  falsos positivos genéricos em fixtures/diagnósticos não alterados nesta
  tarefa, sem credencial operacional identificada. A dívida histórica continua
  aberta e exige rotação/expurgo coordenados.
- 2026-08-10: a branch `fix/mx-full-execution-20260810` foi rebaseada sem
  conflitos sobre `origin/main` em `3ee29d72`; o novo contrato
  `src/test/manager-module.playwright.ts` passou `2/2` no fluxo funcional e
  `1/1` na prova de console/rede após uma queda transitória de fetch no primeiro
  run completo.
- 2026-08-10: a repetição local reconciliada passou `npm test` com `2606/2606`
  testes e `18195 expect()`, lint, typecheck, build (`5143` módulos), bundle
  (`1564,03/1860 KB gzip`), auditorias de rotas/layout/management design system,
  IDE sync, estrutura, agentes, paridade e Gitleaks no range da branch.
- 2026-08-10: leitura remota confirmou GitHub autenticado, projeto Supabase
  `fbhcmzzgwjdgkctlfvbo` listado e produção Vercel `READY`; `/api/health`
  retornou HTTP 200 com Vercel, Supabase API, database e crons `ok`, servindo
  o SHA `3ee29d72`. O branch desta retomada ainda não tinha push/PR no momento
  deste registro.
- 2026-08-10: `npm audit --omit=dev` retornou zero vulnerabilidades; o audit
  completo mantém um high em `xlsx`. `npx secretlint` não executa sem
  `.secretlintrc`; isso permanece bloqueio de governança, enquanto Gitleaks
  passou sem leak no diff da branch.
- 2026-08-10: a repetição final da suíte `src/test/manager-module.playwright.ts`
  passou `10/10` em `2,6m` nos projetos `chromium` e `mobile-chrome`; o caso
  mobile que havia falhado por `TypeError: Failed to fetch` também passou
  isoladamente em `12,6s`.
- 2026-08-10: CodeRabbit concluiu a revisão contra `main` com 19 arquivos
  revisados e um único achado `major` documental. A divergência entre
  `origin/main`, HEAD, contagens e bundle foi corrigida nos relatórios correntes;
  nenhum achado crítico foi reportado.

### Completion Notes List

- AppShell ativo convergiu para uma única implementação `Layout` /
  `MxSidebarShell`; providers e tokens do Dono permanecem configuráveis.
- `OwnerShell`, `OwnerLayout`, `OwnerSidebar`, `OwnerTopbar` e as classes de
  escopo visual legadas foram removidos após validação autenticada.
- Estado continua parcial: Consultor MX, estados/mutations, Supabase, preview,
  Sentry e release permanecem bloqueantes.
- Scripts de autenticação e captura agora exigem `MX_E2E_PASSWORD`; nenhum
  valor operacional permanece materializado no repositório.
- O bundle passou sem elevar orçamento: `xlsx` saiu do runtime e `jsPDF` foi
  removido, preservando downloads `.xlsx` e `.pdf` reais.
- O “READY para validação do PO” acima pertence ao checklist histórico de
  draft; o status operacional atual `Ready for Review` indica revisão da
  implementação, não conclusão da story ampla, que permanece parcial.
- O P0 do pré-cadastro foi corrigido no hotfix publicado da função
  `store-pre-registration` (versão remota 72) e validado no GET/browser da
  rota ACERTT. O hardening adicional desta retomada está nos commits
  `f5c813ce`, `52a761ed` e `ae3da0b8`; push, CI, preview e deploy permanecem
  pendentes. A story ampla está `Ready for Review`, mas continua parcial por
  seus gates independentes de revisão, observabilidade, backup e rollback.
- Segredos removidos do estado corrente permanecem no histórico. A rotação da
  `service_role` e das demais credenciais expostas é um incidente imediato, não
  um gate posterior ao preview; a substituição coordenada dos consumidores tem
  exceção operacional somente até 2026-07-30 18:00 BRT.
- A migração moderna das Edge Functions está implementada e validada somente
  localmente; fallback legado, revisão integral, deploy e smoke permanecem
  pendentes.
- A correção atual está commitada nesta branch; preview, CI remoto, produção,
  Sentry, backup restaurável e a
  matriz integral de perfis continuam pendentes. A story permanece
  `Ready for Review` e parcialmente concluída.
- As rotas gerenciais auditadas agora não deixam `max-w-7xl`, gutters ou safe
  area na raiz fora de `PageCanvas`; o canvas do `DashboardLoja` continua sendo
  a autoridade quando `ManagerTeamPerformance` é renderizado como seção filha.
- A validação desta retomada permanece local: não há evidência nova de
  preview, CI remoto, produção, backup restaurável, Sentry ou matriz integral
  de perfis/estados/ações. Esses gates continuam bloqueando qualquer alegação
  de conclusão ou publicação.
- O scan histórico de Gitleaks atualizado permanece uma evidência de dívida,
  não de falha introduzida por este diff: `gitleaks protect --staged` passou,
  enquanto os três achados do scan de `src/` pertencem a fixtures/diagnósticos
 fora dos arquivos desta tarefa.
- 2026-08-10: o pre-push AIOX/DevOps ainda não foi executado na branch
  rebaseada. A última evidência local registra `npm audit` com uma
  vulnerabilidade high em `xlsx` sem correção disponível, Secretlint falhando
  por ausência de `.secretlintrc`, e CodeRabbit/Agy sujeitos a quota externa.
  O status foi atualizado para `Ready for Review` sem transformar os gates
  externos pendentes em aprovação.

### File List

- `.ai/decision-log-MX-AUD-20260729.md`
- `docs/auditoria/relatorios/RELATORIO_FINAL_MX_GESTAO_PREDITIVA.md`
- `docs/reports/2026-07-30-mx-unificacao-total-final.md`
- `docs/reports/2026-07-30-mx-unificacao-total-progress.md`
- `docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`
- `docs/auditoria/matrizes/MATRIZ_ROTACAO_CREDENCIAIS_MX.md`
- `docs/auth/first-login-flow.md`
- `docs/audits/auditoria-completa-sistema-2026-05-01.md`
- `docs/stories/story-MX-AUD-20260729-autonomous-master-audit.md`
- `docs/stories/story-OPS-20260514-admin-master-password-recovery.md`
- `output/playwright/dono-shell-unificado-nav-1440x900.png`
- `output/playwright/dono-sem-owner-b44-1440x900.png`
- `output/playwright/dono-drawer-320x568.png`
- `output/playwright/gerente-shell-1440x900.png`
- `output/playwright/gerente-drawer-320x568.png`
- `output/playwright/vendedor-shell-1440x900.png`
- `output/playwright/vendedor-drawer-320x568.png`
- `output/playwright/admin-mx-shell-1440x900.png`
- `output/playwright/admin-geral-drawer-320x568.png`
- `package.json`
- `package-lock.json`
- `scripts/audit_route_data_inventory.mjs`
- `check_db.mjs` (removido)
- `check_db2.mjs` (removido)
- `check_rls.mjs` (removido)
- `check_schema.mjs` (removido)
- `docs/superpowers/plans/2026-07-07-plano-remuneracao-brothers-car.md`
- `docs/superpowers/plans/2026-07-30-mx-unificacao-total.md`
- `scripts/capture_mx_v2.js`
- `scripts/capture_mx_v3.js`
- `scripts/capture_vendedor.cjs`
- `scripts/legacy/audit-performance.cjs`
- `scripts/legacy/debug-auth.mjs` (removido)
- `scripts/legacy/debug-content.cjs`
- `scripts/legacy/generate_admin_tests.cjs`
- `scripts/legacy/generate_admin_tests.js`
- `scripts/legacy/generate_backend_tests.cjs`
- `scripts/legacy/mx-audit-e2e.mjs`
- `scripts/legacy/playwright-click-button.mjs`
- `scripts/legacy/playwright-test-app.mjs`
- `scripts/legacy/test-fast-entry.cjs`
- `scripts/legacy/test-login.mjs` (removido)
- `scripts/legacy/test-queries.mjs` (removido)
- `scripts/legacy/test-queries-error-handling.mjs` (removido)
- `src/components/ui/HelpTooltip.tsx`
- `src/features/checkin/sections/CheckinHeader.test.ts`
- `src/features/checkin/sections/CheckinHeader.tsx`
- `src/features/manager/daily-closing/ManagerDailyClosingBase44.tsx`
- `src/features/manager/daily-closing/manager-daily-closing-layout-contract.test.ts`
- `src/features/manager/day-routine/ManagerDayRoutineCanonical.container.tsx`
- `src/features/manager/day-routine/ManagerDayRoutineView.tsx`
- `src/features/manager/day-routine/manager-day-routine-canonical-source.test.ts`
- `src/features/manager/team/ManagerTeamPerformance.test.tsx`
- `src/features/manager/team/ManagerTeamPerformance.tsx`
- `src/test/module-design-system-parity.test.ts`
- `src/test/manager-module.playwright.ts`
- `scripts/legacy/test-queries-error-handling2.mjs` (removido)
- `scripts/legacy/test-queries-final.mjs` (removido)
- `scripts/provision_mx_consultoria_sandbox.ts`
- `scripts/repair_retry.ts`
- `scripts/repair_system.ts`
- `scripts/validate_mx_cons_dev_rls_smoke.ts`
- `scripts/validate_mx_development_full_smoke.ts`
- `src/components/AppShell.tsx`
- `src/components/Layout.tsx`
- `src/components/module/InternalMxVisualScope.tsx`
- `src/components/module/MxRoleVisualScope.tsx`
- `src/components/owner/OwnerLayout.jsx` (removido)
- `src/components/owner/OwnerSidebar.jsx` (removido)
- `src/components/owner/OwnerTopbar.jsx` (removido)
- `src/design-system/shell/appShellConfig.ts`
- `src/design-system/shell/shell-contract.test.ts`
- `src/features/checkin/sections/RegularizarFechamentoDrawer.tsx`
- `src/features/landing/MXPerformanceLanding.container.tsx`
- `src/features/landing/MXPerformanceLanding.test.tsx`
- `src/features/landing/data/landing-css.ts`
- `src/features/landing/sections/HeroSection.tsx`
- `src/features/owner-base44/OwnerShell.tsx` (removido)
- `src/features/vendedor-treinamentos/VendedorTreinamentos.container.tsx`
- `src/features/vendedor-treinamentos/components/QuizTreinamento.tsx`
- `src/lib/auth/routeAccess.ts`
- `src/lib/auth/routeAccess.test.ts`
- `src/lib/owner-base44-exact-parity-contract.test.ts`
- `src/lib/owner-flow-contract.test.ts`
- `src/lib/real-data-runtime-contract.test.ts`
- `src/lib/route-data-inventory-contract.test.ts`
- `src/lib/store-pre-registration-auth-hardening.test.ts`
- `src/pages/Privacy.tsx`
- `src/pages/Login.tsx`
- `src/pages/Terms.tsx`
- `src/test/public-routes-a11y.playwright.ts`
- `src/lib/supabase-edge-api-keys.test.ts`
- `src/lib/google-calendar-internal-auth.test.ts`
- `src/lib/google-meet-ata-internal-auth.test.ts`
- `supabase/config.toml`
- `supabase/functions/_shared/api-keys.ts`
- `supabase/functions/_shared/internal-token.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/drive-upload.ts`
- `supabase/functions/_shared/google.ts`
- `supabase/functions/_shared/supabase-client.ts`
- `supabase/functions/approve-store-registration/index.ts`
- `supabase/functions/executive-agenda-google-sync/index.ts`
- `supabase/functions/google-calendar-events/index.ts`
- `supabase/functions/google-calendar-sync/index.ts`
- `supabase/functions/google-meet-ata/index.ts`
- `supabase/functions/google-oauth-handler/index.ts`
- `supabase/migrations/20260729140000_google_meet_ata_dedicated_cron_auth.sql`
- `supabase/functions/google-drive-files/index.ts`
- `supabase/functions/google-oauth-handler/index.ts`
- `supabase/functions/manage-global-user/index.ts`
- `supabase/functions/manage-store-team/index.ts`
- `supabase/functions/register-user/index.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/store-pre-registration/index.ts`
- `src/features/dashboard-loja/DashboardLoja.container.tsx`
- `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx`
- `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.contract.test.ts`
- `output/playwright/dono-pagecanvas-fix-1440x900.png` (artefato ignorado pelo Git)
- `src/lib/export.ts`
- `src/lib/export.test.ts`
- `src/lib/pdf/downloadHtmlAsPdf.ts`
- `src/lib/pdf/downloadHtmlAsPdf.test.ts`
- `src/test/owner-base44-design-scope.test.ts`
- `src/test/owner-base44-authenticated-visual.playwright.ts`
- `src/styles/internal-mx-manager-scope.css`
- `src/styles/manager-visual-scope.css`
- `src/styles/owner-base44-exact.css`
- `supabase/functions/store-pre-registration/index.ts`
