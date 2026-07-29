# Story MX-AUD-20260729: Auditoria autônoma, correção e entrega comprovada

## Status

**InProgress**

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
- [ ] Fases 1–3 — descoberta e baseline reproduzível (AC: 2, 3)
  - [ ] Inventariar rotas, perfis, dados, mutations, visual e dívida.
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
  - [ ] Atualizar checkboxes, Dev Agent Record e File List.
  - [ ] Revisar diff, executar quality gate e secret scan.
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

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex), com agentes locais AIOX Orion, Dex e Aria.

### Debug Log References

- 2026-07-29: `npm run lint && npm run typecheck && npm test && npm run build
  && npm run check:bundle-size` retornou 0; resultado canônico: 1.668 testes,
  13.851 asserts, 5.123 módulos e 1.857,54/1.860 KB gzip. Evidência resumida:
  seção 4 de `docs/auditoria/relatorios/RELATORIO_FINAL_MX_GESTAO_PREDITIVA.md`.
- 2026-07-29: `npx playwright --version`, `npx supabase --version`,
  `npx vercel --version` e `npx sentry-cli --version` retornaram 0 e
  confirmaram respectivamente 1.61.1, 2.110.0, 50.44.0 e 2.58.5.
- 2026-07-29: Supabase remoto auditado sem DDL; projeto
  `fbhcmzzgwjdgkctlfvbo`, estado `ACTIVE_HEALTHY`; backup restaurável não
  comprovado e drift banco/Git identificado. Evidência: seções 6–7 do
  relatório final e `.ai/decision-log-MX-AUD-20260729.md`.
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
  1.684 testes, 13.894 asserts, zero falhas e 1.857,80/1.860 KB gzip.
- 2026-07-29: CodeRabbit revisou o diff final e retornou código 0, zero
  achados, após uma espera de rate limit.

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
  draft; o estado operacional vigente permanece `InProgress` e parcial.
- O P0 do pré-cadastro está corrigido apenas nesta branch; produção permanece
  vulnerável até preview, revisão e deploy aprovados.

### File List

- `.ai/decision-log-MX-AUD-20260729.md`
- `docs/auditoria/relatorios/RELATORIO_FINAL_MX_GESTAO_PREDITIVA.md`
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
- `docs/superpowers/plans/2026-07-07-plano-remuneracao-brothers-car.md`
- `scripts/capture_mx_v2.js`
- `scripts/capture_mx_v3.js`
- `scripts/capture_vendedor.cjs`
- `scripts/legacy/audit-performance.cjs`
- `scripts/legacy/debug-auth.mjs`
- `scripts/legacy/debug-content.cjs`
- `scripts/legacy/generate_admin_tests.cjs`
- `scripts/legacy/generate_admin_tests.js`
- `scripts/legacy/generate_backend_tests.cjs`
- `scripts/legacy/mx-audit-e2e.mjs`
- `scripts/legacy/playwright-click-button.mjs`
- `scripts/legacy/playwright-test-app.mjs`
- `scripts/legacy/test-fast-entry.cjs`
- `scripts/legacy/test-login.mjs`
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
- `src/features/owner-base44/OwnerShell.tsx` (removido)
- `src/features/vendedor-treinamentos/VendedorTreinamentos.container.tsx`
- `src/features/vendedor-treinamentos/components/QuizTreinamento.tsx`
- `src/lib/auth/routeAccess.ts`
- `src/lib/auth/routeAccess.test.ts`
- `src/lib/owner-base44-exact-parity-contract.test.ts`
- `src/lib/owner-flow-contract.test.ts`
- `src/lib/real-data-runtime-contract.test.ts`
- `src/lib/store-pre-registration-auth-hardening.test.ts`
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
