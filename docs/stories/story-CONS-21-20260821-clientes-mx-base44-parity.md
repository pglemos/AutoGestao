# Story CONS-21 — Carteira e Visão 360 de Clientes MX

**Status:** Ready for Review
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
- [ ] Gates locais, navegador autenticado desktop/mobile, Graphify, commit, push em `main`, CI e deploy Vercel são validados com SHA exato.

## Tasks

- [x] Implementar carteira/status/tabela conforme referência.
- [x] Reorganizar Visão 360 e entregas contextuais.
- [x] Corrigir aliases e escopo contextual de planejamento/plano de ação.
- [x] Validar cadastro, filiais, visitas e indicadores.
- [ ] Executar gates, QA visual e release.

## File List

- `docs/stories/story-CONS-21-20260821-clientes-mx-base44-parity.md`
- `src/features/admin-mx/AdminClientesPage.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/AdminNovoClientePage.tsx`
- `src/features/admin-mx/clientes/`
- `src/features/admin-mx/novo-cliente/`
- `src/features/admin-mx/planos-acao/`

## Dev Agent Record

Local: no baseline `0879f788`, `npm run typecheck`, `npm run lint`, `npm test` (`4254 pass / 0 fail`), `npm run build` e `npm run audit:routes-data` passaram; inventário: 121 rotas, 112 protegidas, 9 públicas, 0 sem governança e 0 duplicadas. Detector Impeccable limpo.

Browser autenticado em produção (`https://www.mxperformance.com.br`): `/clientes` com 52 clientes, 4 KPIs, 52 linhas de dados, 52 botões de ação, busca `ACERTT` em `1 de 52 clientes` e menu com 12 ações; `/clientes/acertt` com links contextuais que preservam `clientId` e `storeId`, jornada `0/9`, regra `de 2 a 9 presenciais`, Plano Estratégico, Plano de Ação e Consultoria; `/clientes/novo` com 7 etapas, `Rede (matriz e filiais)`, `Unidade 1 · Matriz`, `Unidade 2 · Filial` e PMR Híbrido com `12 encontro(s)`. Desktop `1440×900` sem overflow de documento; mobile `390×844` com rolagem horizontal somente na região da tabela; console sem erros.

CI GitHub do baseline: Quality Gates `32539343886`, Typecheck/unit `32539343954`, Gitleaks `32539343910`, Design System `32539343860`, Atomic Design `32539343909`, Module Parity `32539343941` e ESLint a11y `32539343928`, todos `success`. Vercel deployment `mxperformance-a45rw1jiq-synvolt.vercel.app` está `Ready`, com aliases `mxperformance.com.br`, `www.mxperformance.com.br`, `mxperformance.vercel.app` e `mxperformance-git-main-synvolt.vercel.app`; `/api/health` retornou `healthy` e `release: 0879f78864aed23bad1a794eb959f785652d3d95`.

Graphify: runtime TypeScript `0.17.1` comprovado; atualização estrutural concluída com 61.874 nós e 140.607 arestas. O enriquecimento assistido opcional gerou instruções pendentes de descrições/rótulos; esses artefatos contêm caminhos absolutos, falham no `portable-check` e foram mantidos fora do commit.
