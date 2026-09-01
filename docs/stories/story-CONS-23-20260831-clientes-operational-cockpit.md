# Story CONS-23 — Carteira operacional de Clientes MX

**Status:** Done (validação local; commit e push nesta entrega; sem deploy)
**Agent:** @dev
**Quality Gate:** @qa
**Priority:** HIGH

## Contexto

A crítica visual/UX da rota publicada `https://www.mxperformance.com.br/clientes` encontrou uma divergência entre a promessa do MX Performance e a primeira experiência entregue: a `Carteira 360` concentra matriz/filiais, vendas, meta, consultoria, equipe, bloqueios e próxima ação, mas fica escondida atrás de `Mais visões`. A mesma sessão apresentou `Em Implantação 0`, registros `Ativo em Implantação` e uma visão `Em Implantação (38)` sem explicar se são eixos sobrepostos.

No mobile, a tabela exige rolagem horizontal para alcançar informações operacionais. Também foram observados rótulos truncados, semântica pouco clara entre zero/ausência/configuração e botões sem nome acessível.

A fonte de verdade de produto continua sendo o modelo real já implementado: `clientes_consultoria` representa cliente/matriz, `lojas.parent_loja_id` relaciona filiais, vendas e consultoria permanecem métricas distintas, e os tokens/primitivos MX devem ser preservados.

## User Story

Como consultor ou administrador MX, quero abrir a carteira já orientado pela operação comercial e entender o estado real de cada cliente/unidade, para encontrar a próxima ação sem reconciliar contagens manualmente nem atravessar uma tabela larga no celular.

## Escopo

1. Tornar `Carteira 360` a visão inicial de `/clientes`; manter a lista administrativa como visão secundária explicitamente chamada `Cadastro e status`.
2. Unificar a fonte de contagem e rotulagem dos estados, separando visualmente situação da conta de fase de implantação quando os eixos puderem se sobrepor.
3. Reduzir a densidade de decisões antes da fila: organizar o acesso por `Precisa de ação`, `Resultado comercial`, `Implantação` e `Governança`, mantendo ações de baixo uso em menu secundário e uma ação primária por cliente.
4. Entregar composição mobile operacional: cards por padrão em largura de telefone, ou layout equivalente que mantenha identidade, próxima ação e ação principal acessíveis sem swipes repetidos; preservar tabela desktop.
5. Diferenciar estados de dados `0 confirmado`, `Nenhum registro`, `Não configurado` e `Indisponível`, com legenda/ajuda contextual e frescor quando a métrica for temporal.
6. Corrigir labels e detalhes observados: duplicidade do filtro de responsável, truncamentos, concordância de `1 venda`, acentuação, formatação de CNPJ e nomes acessíveis de botões.
7. Preservar dados reais, RBAC, rotas, ações existentes, agrupamento matriz/filiais e separação vendas/consultoria. Não criar schema, migration, RPC ou design system paralelo.

## Acceptance Criteria

- [x] Ao abrir `/clientes`, a primeira visão operacional é `Carteira 360`; a visão administrativa continua acessível por um controle nomeado `Cadastro e status`, sem perder query string, dados ou ações existentes.
- [x] A primeira visão apresenta, sem navegação secundária, cliente/estrutura, vendas do período, meta/atingimento, consultoria, equipe/responsável e próxima ação/bloqueios.
- [x] Os KPIs e filtros usam uma fonte canônica de status; `Ativos`, `Em implantação`, `Em configuração` e `Prontos para ativar` não exibem contagens contraditórias sem declarar que são eixos sobrepostos.
- [x] O filtro de responsável não apresenta opções duplicadas para a mesma identidade lógica, e a busca/filtros continuam funcionando com estado vazio e limpeza.
- [x] Em viewport de telefone (mínimo validado em `390×844`), cards operacionais são o padrão ou a alternativa responsiva mantém nome/estrutura, próxima ação e ação principal alcançáveis sem rolagem horizontal; a página não apresenta overflow horizontal acidental.
- [x] Em desktop, a tabela preserva a densidade necessária, usa cabeçalhos/colunas legíveis e não reduz `Próxima ação` a uma coluna que esconda o texto essencial.
- [x] Vendas, meta, presença, jornada e bloqueios distinguem explicitamente `0 confirmado`, `Nenhum registro`, `Não configurado` e `Indisponível`; métricas temporais informam o período/data de referência.
- [x] Cada ação de linha e cada botão apenas icônico tem nome acessível, foco visível e alvo de toque adequado; labels não truncam de forma a perder significado.
- [x] Cópias da superfície passam por revisão: `1 venda`, cidade com acentuação quando o dado exibido permitir e CNPJ com máscara consistente sem alterar o valor persistido.
- [x] O menu de ações mantém abrir Visão 360, loja, equipe, onboarding, autocadastro, pessoas, jornada, ativação, suspensão, auditoria, edição e arquivamento, com ações de risco claramente separadas das rotineiras.
- [x] Testes unitários/contratuais cobrem a fonte canônica de status, deduplicação de responsáveis, estados de métrica, escolha de view por viewport e preservação das ações existentes.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam, ou qualquer falha preexistente é isolada e documentada.
- [x] A validação autenticada da rota em `1440×900` e `390×844` comprova a visão inicial, filtros, modo mobile, ação principal, estados de loading/erro/vazio e console sem erros de aplicação; o único 404 observado é o script de Insights da Vercel ausente no servidor local, já classificado como ruído de ambiente.

## Dev Notes

- Implementação existente relevante: `src/features/admin-mx/AdminClientesPage.tsx`, `src/features/admin-mx/clientes/PortfolioOverviewTab.tsx`, `src/features/admin-mx/clientes/clientPortfolio.ts`, `src/features/admin-mx/clientes/useClientPortfolio.ts`, `src/features/admin-mx/clientes/useClientSales.ts`, `src/features/admin-mx/clientes/clientSales.ts` e `src/features/admin-mx/clientes/ClientActionsMenu.tsx`.
- Preservar `clientes_consultoria` como cliente/matriz e `lojas.parent_loja_id` como relação de filial.
- A visão mobile em cards já existe na implementação; o trabalho deve torná-la a escolha inicial coerente e garantir equivalência de informação/ações.
- Escopo derivado da crítica persistida `www-mxperformance-com-br-clientes` e da evidência real de navegador, não de valores fictícios.

## Tasks

- [x] Mapear a hierarquia atual, fonte de status, agregação de responsáveis e estados de vendas.
- [x] Implementar entrada Carteira 360, nomenclatura da visão administrativa e agrupamento por trabalho.
- [x] Implementar status/métricas canônicos e semântica de zero/ausência/configuração.
- [x] Adaptar tabela/cards para mobile e revisar densidade/ações.
- [x] Corrigir acessibilidade, cópia, formatação e estados de recuperação.
- [x] Adicionar/regenerar testes e executar gates.
- [x] Validar browser desktop/mobile, revisar diff e registrar evidências.

## File List

- `docs/stories/story-CONS-23-20260831-clientes-operational-cockpit.md`
- `.impeccable/critique/2026-09-01T02-26-10Z__www-mxperformance-com-br-clientes.md`
- `docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`
- `src/components/molecules/TabNav.tsx`
- `src/features/admin-mx/AdminClientesPage.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/adminMxBase44Parity.test.ts`
- `src/features/admin-mx/clientes/ClientDetailHeaderActions.tsx`
- `src/features/admin-mx/clientes/ClientOperationalSummary.tsx`
- `src/features/admin-mx/clientes/clientDetailPresentation.test.ts`
- `src/features/admin-mx/clientes/clientDetailPresentation.ts`
- `src/features/admin-mx/clientes/ClientActionPlanContextPanel.tsx`
- `src/features/admin-mx/clientes/ClientHealthTabs.tsx`
- `src/features/admin-mx/clientes/ClientPlanningContextPanel.tsx`
- `src/features/admin-mx/clientes/GovernancaBloqueiosTab.tsx`
- `src/features/admin-mx/clientes/clientGovernance.ts`
- `src/features/admin-mx/clientes/clientGovernance.test.ts`
- `src/features/admin-mx/clientes/OnboardingPortfolioTab.tsx`
- `src/features/admin-mx/clientes/PortfolioBase44ListTab.tsx`
- `src/features/admin-mx/clientes/PortfolioOverviewTab.tsx`
- `src/features/admin-mx/clientes/ProgramCard.tsx`
- `src/features/admin-mx/clientes/clientActionPlanContext.ts`
- `src/features/admin-mx/clientes/clientPortfolio.test.ts`
- `src/features/admin-mx/clientes/clientPortfolio.ts`
- `src/features/admin-mx/clientes/clientProgress.ts`
- `src/features/admin-mx/clientes/clientSales.test.ts`
- `src/features/admin-mx/clientes/clientSales.ts`
- `src/features/admin-mx/clientes/useClientHealth.ts`
- `src/features/admin-mx/clientes/useClientPortfolio.ts`
- `src/features/admin-mx/clientes/useClientSales.ts`
- `src/lib/auth/routeAccess.test.ts`
- `src/lib/cons22-admin-rpcs.test.ts`
- `src/test/internal-mx-planning-pages.test.ts`

## Dev Agent Record

### Implementation Notes

Implementação concluída preservando os tokens/primitivos MX, o modelo `clientes_consultoria` + `lojas.parent_loja_id`, RBAC, ações existentes e separação entre vendas e consultoria.

- `/clientes` resolve `Carteira 360` como visão inicial; `Cadastro e status` permanece disponível e `Inscrições e links` foi movido para `Mais operações`.
- `clientPortfolio.ts` concentra status canônico, fila operacional, deduplicação de responsáveis e estrutura matriz/filiais; a legenda explica que os sinais operacionais podem se sobrepor.
- A carteira passou a diferenciar `0 confirmado`, `Nenhum registro`, `Não configurado/Não configurada` e `Indisponível`, com período/frescor das vendas e estados de loading, erro e vazio.
- Cards são escolhidos automaticamente em telefone; a tabela permanece no desktop. A busca ganhou linha própria até `2xl` e os filtros passaram a ter larguras úteis em telas intermediárias.
- Labels acessíveis, foco, concordância, acentuação, CNPJ, ações primárias e menus secundários foram revisados; testes e matriz de rotas/dados foram atualizados.

### Debug Log References

- Crítica base: `.impeccable/critique/2026-09-01T02-26-10Z__www-mxperformance-com-br-clientes.md`.
- Evidência final: `visual-evidence/agent-browser/cons23-final-20260901-2026-09-01T03-05-49/summary.json` (desktop `1440×900`, mobile `390×844`, status `passed`, axe `0` violações, console sem erros).
- Verificação interativa adicional: fila `Com bloqueios` (`34` → `29` ao combinar `Ativos`), chip `Filtros ativos`, `Limpar todos`, busca desktop com `1078px` e `scrollWidth === clientWidth` em `1440px`.
- Revalidação pós-correção: Playwright/MCP autenticado em `http://localhost:3458/clientes`, com `Carteira 360 (44)`, busca `ACERTT` (1 resultado), modo `Cards`, `Mais filtros`, fila `Com bloqueios` (34 resultados), aba Governança (11; 2 bloqueios) e `scrollWidth === viewport` em `390×844`; capturas locais em `output/playwright/clientes-desktop.png`, `output/playwright/clientes-mobile.png` e `output/playwright/clientes-governanca-mobile.png`.
- Ficha `/clientes/acertt`: recaptura manual autenticada no navegador como Administrador Geral em `1440×900` e `390×844`; `scrollWidth === clientWidth`, `0` erros/avisos de console, `Não configurada` para fase vazia, CTA de próxima ação visível no primeiro viewport mobile, tabs por intenção e menu com saída por `Escape`.
- Cobertura dos papéis internos: `26/26` contratos de paridade/RBAC passaram para Administrador Geral, Administrador MX e Consultor MX; a recaptura visual autenticada disponível nesta execução foi do Administrador Geral.

### Completion Notes

Entrega local concluída. A evidência autenticada oficial mostrou `Carteira 360 (44)`, `44 clientes · 53 unidades`, busca legível e tabela desktop; no telefone a escolha automática foi `Cards`, sem overflow horizontal. A ficha `/clientes/acertt` também foi recapturada em sessão autenticada do Administrador Geral nos dois viewports, sem overflow ou erros de console. A captura técnica de `03:42:42` encontrou a tela de login por não haver sessão persistida; ela não é usada como prova autenticada e nenhuma credencial foi inserida automaticamente. Nenhum commit, push ou deploy foi realizado nesta execução.

### QA Results

- `npm run lint`: passou sem erros; dois avisos do ESLint e alertas de dívida visual não bloqueante permanecem registrados pelos auditores.
- `npm run typecheck`: passou.
- `npm test`: passou (`4.794 pass`, `0 fail`, `27.580 expect() calls`, 775 arquivos).
- Testes focados pós-patch: `52 pass`, `0 fail` (identificação, carteira, cockpit da ficha e contrato do painel); contratos de perfis/paridade: `26 pass`, `0 fail`.
- Contrato do cockpit operacional: passou (`5 pass`, `0 fail`).
- `npm run build`: passou (`✓ built in 19.60s`); nenhum sourcemap público em `dist/`.
- Detector Impeccable: `[]`.
- `git diff --check`: passou.
- Browser/axe autenticado: `summary.status = passed`, `0` violações e `0` incompletudes em `1440×900` e `390×844`; console sem erros, conforme `visual-evidence/agent-browser/cons23-final-20260901-2026-09-01T03-05-49/summary.json`.
- Browser rerun técnico: `visual-evidence/agent-browser/cons23-rerun-20260901-2026-09-01T03-42-42/summary.json` passou em ambos os viewports, sem erros JS e com axe `0`, mas foi não autenticado (tela de login).
- Graphify: `npx graphify hook-rebuild` percorreu a árvore, registrou seis arquivos `.ps1` sem `tree-sitter-powershell` e foi encerrado após a extração para limpar execuções duplicadas de longa duração; nenhum artefato versionado foi apagado, resetado ou incluído no commit.

### Change Log

- 2026-08-31: story criada a partir da crítica publicada de `/clientes`.
- 2026-09-01: implementação da carteira operacional, status canônico, composição responsiva, acessibilidade, testes e gates concluídos.
- 2026-09-01: ajuste final da largura da busca desktop, validação interativa de filtros/limpeza e evidência final autenticada registrada.
- 2026-09-01: gates completos repetidos após reparos concorrentes; contrato do cockpit, suíte, lint e build ficaram verdes.
- 2026-09-01: rerun visual técnico encontrou login sem sessão persistida; credenciais não foram inseridas automaticamente.
- 2026-09-01: recaptura autenticada da ficha ACERTT e correção final de `Não definida` para `Não configurada`; gates focados, typecheck, lint e build repetidos.
- 2026-09-01: correção final de largura tokenizada e escala canônica de ícones; suíte completa, lint, build, detector e revalidação autenticada desktop/mobile concluídos.
