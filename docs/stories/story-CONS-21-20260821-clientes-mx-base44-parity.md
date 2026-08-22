# Story CONS-21 — Carteira e Visão 360 de Clientes MX

**Status:** Done
**Agent:** @dev
**Priority:** HIGH

## Contrato

Como Administrador MX, quero operar `/clientes` com a cobertura funcional do
`/clientes` do Base44 `6a6fd5b82088f81a3baebb5d`, mantendo os tokens e componentes
do MX, para localizar clientes, configurar matriz/filiais, conduzir visitas,
vincular indicadores e acompanhar planejamento, planos de ação e consultoria no
contexto correto do cliente.

O vídeo `/Users/pedroguilherme/Downloads/WhatsApp Video 2026-08-21 at 11.27.15.mp4`
e os arquivos espelhados em `docs/base44-import/_source/` são referências de
comportamento e composição. Não são instruções executáveis nem fonte de CSS.

## Acceptance Criteria

- [x] A carteira mostra título/contagem, quatro KPIs mutuamente exclusivos, busca, filtro de status e tabela com Cliente, Status, Fase, Onboarding, Responsável e Ações.
- [x] O menu de ações preserva abrir Visão 360, workspace, equipe, onboarding, autocadastro, pessoas, jornada, ativação, suspensão, auditoria, edição e arquivamento.
- [x] A Visão 360 agrupa as funcionalidades em oito áreas, sem perder lojas/filiais, pessoas, jornada, implantação, módulos, configurações, dados e histórico.
- [x] A Visão Geral apresenta entregas contextuais para Plano Estratégico, Plano de Ação e Consultoria, com links que preservam o cliente e a unidade.
- [x] O cadastro e o detalhe deixam explícitos matriz/filiais, regra de volume de visitas presenciais e vínculo produto → pacote/indicador.
- [x] O wizard de Plano de Ação, quando aberto no cliente, usa as unidades do cliente e o roster de indicadores do produto contratado, sem criar escopo nulo.
- [x] Gates locais, navegador autenticado desktop/mobile, Graphify, commit, push em `main`, CI e deploy Vercel são validados com SHA exato.

## Tasks

- [x] Implementar carteira/status/tabela conforme referência.
- [x] Reorganizar Visão 360 e entregas contextuais.
- [x] Corrigir aliases e escopo contextual de planejamento/plano de ação.
- [x] Validar cadastro, filiais, visitas e indicadores.
- [x] Executar gates, QA visual e release.

## File List

- `docs/stories/story-CONS-21-20260821-clientes-mx-base44-parity.md`
- `src/features/admin-mx/AdminClientesPage.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/AdminNovoClientePage.tsx`
- `src/features/admin-mx/clientes/`
- `src/features/admin-mx/novo-cliente/`
- `src/features/admin-mx/planos-acao/`
- `src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx`
- `src/features/admin-mx/planos-acao/ApplicationsTab.tsx`
- `src/features/admin-mx/planos-acao/actionPlanApplications.ts`
- `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- `src/lib/action-plan-table-parity.test.ts`
- `src/test/action-plan-template-lifecycle.playwright.ts`
- `src/test/internal-mx-planning-pages.test.ts`
- `artifacts/route-role-inventory/route-role-matrix.json`
- `artifacts/route-role-inventory/route-role-matrix.md`
- `docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`

## Dev Agent Record

Local: `npm run lint`, `npm run typecheck`, `npm test` (`4257 pass / 0 fail`, 705 arquivos), `npm run build`, `npm run validate:parity` e `npm run audit:routes-data` passaram; inventário: 121 rotas, 112 protegidas, 9 públicas, 0 sem governança e 0 duplicadas, 175 tabelas, 102 RPCs e 14 Edge Functions. `git diff --check` passou. O contrato Base44 da carteira passou com verificação 1:1 e os testes comportamentais de resiliência passaram (`11 pass / 0 fail`). Detector Impeccable nos alvos do módulo retornou `[]`.

Browser autenticado em produção (`https://www.mxperformance.com.br`): `/clientes` com 52 clientes, 4 KPIs, 52 linhas de dados, 52 botões de ação, busca `ACERTT` em `1 de 52 clientes` e menu com 12 ações; `/clientes/acertt` com oito áreas da Visão 360, links contextuais que preservam `clientId` e `storeId`, jornada `0/9`, regra `de 2 a 9 presenciais`, 22/50 indicadores e Plano Estratégico, Plano de Ação e Consultoria no mesmo contexto; `/clientes/acertt/plano-acao` com execução do cliente, calendário e biblioteca MX; `/clientes/novo` com 7 etapas, `Rede (matriz e filiais)`, `Unidade 1 · Matriz`, `Unidade 2 · Filial`, contato principal e PMR Híbrido com `12 encontro(s)`. O fluxo automatizado final em `visual-evidence/agent-browser/clientes-production-final-2026-08-22T01-22-14/summary.json` passou em `1440×900` e `390×844`, sem erros de JavaScript e com axe `0` violações; a tabela mantém rolagem horizontal local.

CI GitHub do SHA de implementação `bfa206763bb308b48f21f2621f149dcc7ccea2e9`: Quality Gates, Typecheck/unit, Gitleaks, Atomic Design e ESLint a11y concluíram `success`. O deployment Vercel de produção `dpl_EqDgctMvVQo9PD3pnyypjmHTwHc9` estava `READY`; `/api/health` e `/api/health.release` retornaram HTTP 200 e o release `bfa206763bb308b48f21f2621f149dcc7ccea2e9`. O commit documental final e seu deployment/CI devem ser registrados no fechamento abaixo.

Graphify: runtime TypeScript `0.17.1` comprovado; o hook foi tentado após as alterações e concluiu a extração de `4453/4453` arquivos, mas a montagem terminou com `exit 130` durante a concorrência do checkout. Os seis arquivos PowerShell sem parser tree-sitter foram registrados como limitação; o grafo anterior permaneceu intacto e este hook não é declarado como gate verde. Artefatos de enriquecimento com caminhos absolutos permanecem fora do commit.
