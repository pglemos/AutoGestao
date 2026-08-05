# Epic — reconstrução do Módulo Gerencial com referência Base44

Status: Em auditoria

## Execução vertical aprovada em 2026-07-13

O usuário aprovou que o contrato Base44 vença em design, fórmulas, estados, ações e fluxos, mantendo React/Auth/Supabase/RLS como infraestrutura e o sidebar escuro como exceção visual. A implementação será entregue na ordem do menu, com uma story por tela e validação real no Chrome antes da próxima.

1. [Início gerencial Base44 1:1](../story-MX-MGR-20260713-01-inicio-base44-1x1.md)
2. [Rotina do Dia Base44 1:1](../story-MX-MGR-20260713-02-rotina-dia-base44-1x1.md)
3. [Fechamento Diário Base44 1:1](../story-MX-MGR-20260713-03-fechamento-diario-base44-1x1.md)
4. [Rotina da Equipe Base44 1:1](../story-MX-MGR-20260713-04-rotina-equipe-base44-1x1.md)
5. [Minha Equipe](../story-MX-MGR-20260713-05-minha-equipe-base44-1x1.md)
6. [Meta da Loja](../story-MX-MGR-20260713-06-meta-loja-base44-1x1.md)
7. [Mentor Gerencial](../story-MX-MGR-20260713-07-mentor-gerencial-base44-1x1.md)
8. [Desenvolvimento](../story-MX-MGR-20260713-08-desenvolvimento-base44-1x1.md)
9. [Ranking](../story-MX-MGR-20260713-09-ranking-base44-1x1.md)
10. [Universidade MX](../story-MX-MGR-20260713-10-universidade-mx-base44-1x1.md)

## Acceptance criteria

- [x] Arquitetura e mapeamento de dados documentados.
- [ ] Conteúdo principal das dez telas reproduz 1:1 o código-fonte e a aplicação autenticada atuais de `/Users/pedroguilherme/Downloads/mx-gerente.zip` e `https://mx-gerente.base44.app`.
- [ ] Sidebar do gerente preserva o design escuro existente e contém os dez menus na ordem contratada: Início, Rotina do Dia, Fechamento Diário, Rotina da Equipe, Minha Equipe, Meta da Loja, Mentor Gerencial, Desenvolvimento, Ranking e Universidade MX.
- [ ] Ícones de Rotina do Dia e Mentor Gerencial correspondem aos ícones `CalendarClock` e `BrainCircuit` usados pela referência Base44; os demais elementos do sidebar permanecem no padrão atual.
- [ ] Início reproduz o cockpit de previsibilidade comercial atual da referência, incluindo data, atalhos, previsão, necessidade, meta/gap de agendamentos, leitura do dia, ação sugerida, equipe em foco, radar financeiro e gráfico de agendamentos.
- [ ] Rotina do Dia usa a rota `/rotina` e reproduz as abas Hoje/Minha Rotina, filtros, ordenação, acompanhamento e criação manual de atividade da referência.
- [x] Rotas canônicas as rotas raiz do módulo gerencial protegidas por papel.
- [ ] Fechamento Diário, Rotina da Equipe, Minha Equipe, Meta da Loja, Mentor Gerencial, Desenvolvimento, Ranking e Universidade MX são alinhados à referência atual, incluindo abas, modais, filtros e estados vazios/carregados.
- [ ] Desenvolvimento reúne apenas Feedback e PDI na navegação principal da referência e usa dados reais persistidos no Supabase.
- [ ] Universidade MX reproduz o catálogo gerencial e a aba de acompanhamento da equipe sem remover integrações reais já existentes.
- [ ] Dados operacionais vêm das tabelas/RPCs reais do sistema atual; conteúdo de catálogo definido no código-fonte Base44 pode ser portado como conteúdo estático, mas métricas e status não são inventados.
- [x] Mentor não usa IA ampla nem números fictícios.
- [ ] Início aprovado funcional e visualmente sem fallbacks inventados.
- [ ] Fechamento Diário completo com ações servidor-side e auditoria.
- [ ] Rotina da Equipe consumindo Central de Execução, sem derivação do fechamento.
- [ ] Minha Equipe, Meta, Ranking e Universidade homologados nas rotas canônicas.
- [x] RLS e isolamento entre lojas cobertos pelos contratos existentes e matriz de acesso por papel.
- [ ] Unitários, componentes, integração e E2E aprovados.
- [ ] Auditoria visual nos viewports desktop, tablet e mobile aprovada após o conteúdo estabilizar; capturas de loading são inválidas.
- [ ] Regressões de acesso vendedor/dono/admin cobertas pela matriz de rotas e suíte completa.
- [x] Checklist e File List atualizados; publicação depende de solicitação explícita e autoridade `@devops`.

## Reabertura — referência Base44 atual de 2026-07-12

- A captura autenticada atual invalidou a aprovação anterior de Início: a referência agora é um cockpit de previsibilidade comercial, não o dashboard verde de situação crítica.
- A captura autenticada atual invalidou o critério de preservar `/rotina`: a referência possui uma Rotina do Dia distinta, com abas Hoje/Minha Rotina, filtros e atividade manual.
- Evidências novas e estabilizadas ficam em `output/playwright/manager-parity-20260712-fresh/`; arquivos capturados durante spinner/loading não contam como evidência.
- O sidebar escuro do sistema atual é a única exceção visual autorizada pelo usuário; somente os ícones de Rotina do Dia e Mentor Gerencial devem seguir a referência.

## File List

- `.github/workflows/typecheck-and-unit-tests.yml`
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/components/SellerSidebar.tsx`
- `src/components/organisms/Modal.tsx`
- `src/components/molecules/PageHeading.tsx`
- `src/components/seller/SellerPageHeader.tsx`
- `src/features/dashboard-loja/DashboardLoja.container.tsx`
- `src/features/dashboard-loja/hooks/useDashboardLojaData.ts`
- `src/features/dashboard-loja/sections/ManagerOperationalCockpit.tsx`
- `src/features/dashboard-loja/sections/ManagerSellerParityHome.tsx`
- `src/features/dashboard-loja/sections/PerformanceAlerts.tsx`
- `src/features/dashboard-loja/sections/PerformanceTab.tsx`
- `src/features/manager/meta/ManagerStoreGoalReference.tsx`
- `src/features/gerente-feedback/modals/StoreFeedbackModal.tsx`
- `src/features/gerente-feedback/sections/StoreFeedbackHeader.tsx`
- `src/features/lojas/components/StoreGoalsPanel.tsx`
- `src/features/lojas/components/StoreTeamPanel.tsx`
- `src/features/manager/day-routine/ManagerDayRoutine.container.tsx`
- `src/features/manager/development/ManagerFeedbackReference.tsx`
- `src/features/manager/development/ManagerPDIReference.tsx`
- `src/features/manager/development/ManagerUniversityReference.tsx`
- `src/features/manager/development/ManagerUniversityReference.test.tsx`
- `src/features/manager/meta/ManagerStoreGoalReference.tsx`
- `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx`
- `src/features/manager/team/ManagerTeamKanban.tsx`
- `src/features/manager/team/ManagerTeamPerformance.tsx`
- `src/features/manager/team/manager-team-kanban.test.ts`
- `src/features/manager/team/manager-team-kanban.ts`
- `src/hooks/useCheckinAuditor.ts`
- `src/hooks/useRanking.ts`
- `src/lib/auth/routeAccess.ts`
- `src/lib/auth/routeAccess.test.ts`
- `src/lib/pdf/downloadHtmlAsPdf.ts`
- `src/pages/GerentePDI.tsx`
- `src/pages/GerenteTreinamentos.tsx`
- `src/pages/ManagerDevelopment.tsx`
- `src/pages/ManagerMentor.tsx`
- `src/features/ranking/Ranking.container.tsx`
- `src/features/ranking/hooks/useStoreRankingPageData.ts`
- `src/features/ranking/hooks/useStoreRankingPageData.test.ts`
- `src/features/ranking/views/ManagerRankingReference.tsx`
- `src/test/manager-module.playwright.ts`
- `src/types/database.ts`
- `src/lib/manager-lead-conference-hardening-migration.test.ts`
- `supabase/migrations/20260712202753_manager_lead_conferences.sql`
- `supabase/migrations/20260712202923_manager_lead_conferences_manager_index.sql`
- `supabase/migrations/20260713031616_manager_lead_conference_hardening.sql`
- `package.json`
- `package-lock.json`
- `scripts/check_bundle_size.mjs`
- `vite.config.ts`
- `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md`
- `docs/architecture/MODULO_GERENCIAL_DATA_MAPPING.md`
- `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`
- `docs/qa/MODULO_GERENCIAL_TEST_MATRIX.md`
- `docs/qa/MODULO_GERENCIAL_VISUAL_AUDIT.md`
- `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`
- `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md`

## QA Results

- 2026-07-13 — QA focado da reconciliação Supabase: PASS. Os renames preservam 100% dos bytes aplicados, a migration corretiva passou em transação remota com rollback, `834/834` testes, lint, typecheck e build, e o CodeRabbit não mantém finding critical/major. O gate global da story permanece `CONCERNS` somente pelos bloqueios externos já registrados.
- 2026-07-13: dois findings `major` do CodeRabbit foram reproduzidos e corrigidos em migration forward-only: escrita autenticada restrita à RPC `SECURITY DEFINER` com autorização interna e validação explícita do vínculo ativo do vendedor, e `divergent_sellers` passa a contar divergência em qualquer canal sem cancelamento cruzado. RED confirmado em dois ciclos; GREEN final com `4 pass` e 22 assertions. O recheck eliminou os `major`; o único `minor` condicional não se aplica porque `manager_lead_conference_items_unique_seller UNIQUE (conference_id, seller_user_id)` foi confirmado no arquivo e no banco remoto.
- 2026-07-13: histórico de migrations reconciliado sem mutação remota. Auditoria somente leitura confirmou que `20260712202753_manager_lead_conferences.sql` (9440 bytes, MD5 `e16642a549159e3891160ffcd1d4c883`) e `20260712202923_manager_lead_conferences_manager_index.sql` (123 bytes, MD5 `372f04690e6c9481b2baa8331efcac92`) são byte a byte idênticos às migrations já aplicadas; apenas os timestamps locais estavam divergentes. Nenhum `migration repair`, `db push` ou DDL foi executado.
- 2026-07-12: Declaração anterior de paridade do Fechamento Diário invalidada. Auditoria autenticada em viewport idêntico comprovou divergências sistêmicas: conteúdo de 1444 px contra ~1248 px na referência, Agenda D+1 de 1280 px contra 1152 px, overlay com blur inexistente no Base44, gráfico manual incompatível e ausência total do modal de confirmação de cobrança. Remediação reaberta para página completa e cinco estados fornecidos pelo usuário; nenhuma aprovação parcial por card é válida.
- 2026-07-12: Paridade reaberta pelo usuário para reconstrução incremental, card a card. Primeiro recorte (`Agendamentos` / `Ver Agenda D+1`) medido em navegador autenticado Base44 × produção: referência com card `284×164`, raio `16px`, botão `258×30`, raio `8px`, peso `500` e ícone; produção anterior com `284×163`, raio `12px`, botão `258×32`, raio `16px`, peso `600` e sem ícone. Componente ajustado aos valores observados. PASS: lint, typecheck, build e 815 testes. Evidência local: `output/playwright/base44-fechamento-desktop-full.png`, `output/playwright/producao-fechamento-desktop-full.png`, `output/playwright/base44-agenda-d1.png` e `output/playwright/producao-agenda-d1.png`.
- 2026-07-12: Fechamento Diário reprovado pelo usuário após inspeção de produção: a tentativa `6b8d7784` não reproduzia a composição nem o fluxo de Conferência de Leads da referência atual. Story reaberta para nova captura autenticada, rota canônica por perfil e reconstrução funcional.
- 2026-07-12: Fechamento Diário reaberto após comparação autenticada Base44 × produção; composição visual, filtros, histórico, comparativo e resumo por canal divergiam da referência.
- 2026-07-12: Fechamento Diário reconstruído e validado localmente em 1440×900 e 390×844. Busca por vendedor, Agenda D+1, períodos 7/15/30 dias e ações de regularização preservadas; comparativos sem snapshot oficial não fabricam percentuais. PASS: lint, typecheck, build e 812 testes.
- 2026-07-12: Nova inspeção autenticada e captura real Base44 × localhost corrigiu medidas que não eram verificáveis por código: sidebar 224 px, cabeçalho desktop 148 px, cards 163 px com gaps de 16 px, header mobile 48 px e Resumo mobile em grade 2×3 com ícones. Conferência de Leads e Histórico persistem por RPC transacional com RLS; nenhuma conferência fictícia foi gravada. PASS: lint (0 erros; 22 warnings preexistentes), typecheck, build e 815 testes. Capturas finais: desktop 1440×900, mobile 390×844 e viewport inferior rolado do contêiner interno.

Execution evidence — 2026-07-12:

- PASS: 810 unit/component/integration tests, zero failures.
- PASS: manager E2E 4/4 with real manager login, nine routes, functional flows and required viewport classes.
- PASS: 18 final captures (nine pages at 1440×900 and 390×844), only after page-specific content loaded.
- PASS: lint with zero errors and unchanged 22 preexisting warnings.
- PASS: typecheck, build, `sync:ide:check`, structure, agents and parity validations.
- PASS: bundle total 1671.59 KB gzip against the 1800 KB gate after consolidating PDF rendering on `jsPDF` + `html2canvas`.
- PASS: seller denied on every canonical as rotas raiz do módulo gerencial route in route matrix tests.
- PASS: regularization decisions, reminders and lead correction remain server-side/auditable through canonical services.
- PASS: Agenda D+1 uses CRM/Carteira as canonical source and exposes filters and communication actions without mutating seller data.
- PASS: Rotina uses Central de Execução and avoids fabricated network comparisons when snapshots do not exist.
- PASS: commit funcional `07d3dd39` publicado em `origin/main` e deployment Vercel de produção `dpl_46UfPmzj6x84vnjADRtYsKKBRDzL` promovido ao alias `mxperformance.vercel.app`.
- PASS: homologação pós-deploy executada no alias público com login real de gerente: 4/4 E2E, nove rotas, desktop/mobile e fluxos críticos.
- PASS: respostas HTTP 200 para `/`, `/home` e `/fechamento-diario`; nenhuma exceção JavaScript nas nove rotas.
- INFO: produção emite o aviso preexistente de observabilidade `VITE_SENTRY_DSN ausente`; não bloqueia o módulo, mas deve ser tratado pela configuração de infraestrutura do Sentry.

### Review Date: 2026-07-12 — Re-review do Kanban de Minha Equipe

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

O bloqueio anterior foi corrigido: “Minha Equipe” agora possui visões interativas Todos, Resultado e Consistência, colunas Críticos/Atenção/Em dia, resumo percentual, orientações por coluna, ações por vendedor e perfil detalhado. As regras de Resultado × Consistência foram isoladas do JSX e usam apenas vendas, meta, `execution_actions` e disciplina oficial já carregados.

### Refactoring Performed

- **`src/features/manager/team/manager-team-kanban.ts`**: matriz e limiares extraídos para funções puras, incluindo ausência de dados sem pontuação fictícia.
- **`src/features/manager/team/ManagerTeamKanban.tsx`**: Kanban responsivo implementado para desktop, tablet e mobile, preservando rotas e o modal existente.
- **`src/features/manager/meta/ManagerStoreGoalReference.tsx`**: cores diretas do gráfico substituídas por `chartTokens`, eliminando as quatro violações do gate de tokens.
- **`src/pages/GerenteTreinamentos.tsx`**: Aulas ao Vivo reposicionadas após Trilhas Gerenciais, sem remoção da funcionalidade real.
- **`src/test/manager-module.playwright.ts`**: contrato E2E atualizado para alternar as três visões e inspecionar ações/perfil.

### Compliance Check

- Coding Standards: ✓ lint sem erros; 22 warnings preexistentes.
- Project Structure: ✓ validações de estrutura, agentes, paridade e sync passaram.
- Testing Strategy: ✓ 822 testes passaram; teste puro cobre limiares, matriz, agrupamento e dados ausentes.
- All ACs Met: ✗ recaptura final no Chrome real ainda pendente por falha de comunicação da extensão.

### Improvements Checklist

- [x] Substituir cards simplificados pelo Kanban funcional da referência.
- [x] Preservar dados reais e exibir `—` quando a Consistência não pode ser verificada.
- [x] Manter perfil e ações apontando para rotas gerenciais existentes.
- [x] Executar lint, typecheck, suíte completa, build e validações AIOX.
- [ ] Restabelecer a conexão da extensão e recapturar desktop, tablet e mobile no Chrome real.
- [ ] Executar CodeRabbit após autenticação; estado atual confirmado como `signed out`.

### Security Review

Sem novas mutações, permissões ou alterações de RLS. A rotina permanece derivada de `execution_actions` filtrada por loja e período; disciplina permanece derivada de `pontuacao_disciplina_final`.

### Performance Considerations

Classificação e agrupamento do Kanban são puros e memoizados. Build de produção aprovado.

### Gate Status

Gate: CONCERNS → `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Recommended Status

✗ Changes Required — apenas evidência Chrome e CodeRabbit pendentes; implementação e regressão automatizada aprovadas.

### Chrome Re-validation: 2026-07-12 — chrome-devtools MCP

- PASS: login real de gerente e rota `/minha-equipe` autenticada.
- PASS: visões Todos, Resultado e Consistência clicadas; vendedores sem dados de Consistência migraram para “Não aplicáveis” e exibiram `—`.
- PASS: menu com quatro ações visível; “Ver rotina de hoje” abriu `/rotina-equipe`.
- PASS: perfil detalhado abriu com cinco abas; aba Performance exibiu Leads, Agendamentos, Visitas e Vendas.
- PASS: sidebar recolheu e expandiu com medidas reais `260 → 72 → 260 px`.
- PASS: viewports `1440×900`, `768×1024` e `390×844`, sem overflow horizontal do documento.
- PASS: Universidade MX manteve Trilhas Gerenciais antes de Aulas ao Vivo nos três viewports; sem `NaN`.
- PASS: nenhuma resposta 4xx/5xx e nenhum erro de console nas páginas alteradas; dois avisos informativos do Chrome sobre campos sem `id/name` permanecem não bloqueantes.
- Evidências: `output/playwright/manager-parity-20260712/minha-equipe-*-kanban*.png` e `output/playwright/manager-parity-20260712/universidade-*.png`.
- Gate atualizado: `CONCERNS` somente pelo CodeRabbit `signed out`; o bloqueio de navegador foi encerrado.

### Review Date: 2026-07-13 — Retomada final do Módulo Gerencial

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

As dez rotas canônicas foram revalidadas com login real de gerente. A retomada corrigiu contratos E2E obsoletos, restringiu os seletores de PDI e Feedback ao papel `vendedor`, confirmou os estados sem conteúdo oficial da Universidade e eliminou duas regressões visuais dos modais: camada abaixo do sidebar e largura de 128 px causada pela colisão do token `max-w-mx-4xl`.

### Refactoring Performed

- **`src/features/manager/development/ManagerPDIReference.tsx`**: ícone `Map` renomeado para `MapIcon`, removendo o sombreamento do construtor nativo e restaurando o typecheck.
- **`src/features/pdi/WizardPDI.tsx`**: opções filtradas por papel `vendedor` e overlay elevado acima do sidebar.
- **`src/features/gerente-feedback/modals/StoreFeedbackModal.tsx`**: overlay elevado, largura vinculada ao token de container sem ambiguidade e footer empilhado no mobile.
- **`src/test/manager-module.playwright.ts`**: dez rotas, três viewports, PDI/Feedback, camada modal, largura, overflow e Universidade sem conteúdo oficial cobertos por E2E autenticado.

### Compliance Check

- Coding Standards: ✓ `npm run lint` com 0 erros e 22 warnings preexistentes.
- Project Structure: ✓ `sync:ide:check`, estrutura, agentes e paridade passaram; warnings AIOX preexistentes foram preservados.
- Testing Strategy: ✓ 822 testes e E2E gerencial 4/4 passaram.
- All ACs Met: ✗ recaptura das correções finais no Chrome real e CodeRabbit autenticado ainda pendentes.
- Build/Bundle: ✓ build aprovado; 1700,83/1800 KB gzip.

### Improvements Checklist

- [x] Confirmar que Wizard PDI e modal de Feedback listam somente vendedores.
- [x] Confirmar Universidade/equipe com zero atrasados, “Sem conteúdo” e sem “Atribuir” quando não há conteúdo oficial.
- [x] Corrigir camada, largura desktop e overflow mobile dos modais.
- [x] Executar as dez rotas em desktop, tablet e mobile com login real no E2E.
- [x] Repetir lint, typecheck, 822 testes, build, bundle e validações AIOX.
- [ ] Reconectar a extensão e recapturar PDI, Feedback e Universidade no Chrome real após as correções finais.
- [ ] Autenticar o CodeRabbit e executar o scan do worktree.

### Security Review

Nenhuma credencial foi persistida ou impressa. As opções de colaborador agora são restritas ao papel `vendedor`; consultas, mutações e RLS existentes não foram ampliadas.

### Performance Considerations

O bundle permanece dentro do orçamento. O E2E longo recebeu timeout próprio de 120 s porque agora percorre 30 combinações rota/viewport, sem aumentar timeouts dos demais casos.

### Files Modified During Review

- `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md`
- `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Gate Status

Gate: CONCERNS → `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Recommended Status

✗ Changes Required — implementação e regressão automatizada aprovadas; faltam os dois gates externos documentados acima.

### Review Date: 2026-07-13 — Ciclo CodeRabbit autenticado

### Reviewed By: Quinn (Test Architect)

### CodeRabbit Self-Healing Result

- Rodada 1: 27 issues — 4 critical, 13 major e 10 minor.
- Rodada 2: 4 issues major, zero critical.
- Rodada 3: 2 issues major, zero critical.
- Limite AIOX de três rodadas atingido; novo ciclo depende de intervenção/autorização humana.

### Blocking Issues Remaining

- **`CR-ACCESSIBILITY-DIALOG-001`**: os diálogos de atribuição e catálogo da Universidade ainda precisam de foco inicial, trap de `Tab`/`Shift+Tab` e restauração do foco ao gatilho.
- **`CR-TRAINING-MATERIAL-001`**: a conclusão de conteúdo oficial precisa depender do acesso ao `video_url` publicado e permanecer indisponível quando o material não existe.

### Validation After Fixes

- PASS: `npm run lint` — 0 erros e 22 warnings preexistentes.
- PASS: `npm run typecheck`.
- PASS: `npm test` — 824 testes, 0 falhas.
- PASS: `npm run build` e bundle `1699,54/1800 KB` gzip.
- PASS: `sync:ide:check`, estrutura, agentes e paridade com warnings preexistentes.
- PENDING: E2E autenticado pós-correções; a tentativa foi skipped porque `E2E_ROLE_PASSWORD` não está disponível nesta sessão.
- PENDING: Chrome real; a extensão continua sem comunicação mesmo após a abertura autorizada da janela.

### Gate Status

Gate: FAIL → `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Recommended Status

✗ Changes Required — aguardar autorização humana para iniciar novo ciclo sobre os dois major remanescentes. A story permanece `In Progress`.

### Review Date: 2026-07-13 — Fechamento dos findings CodeRabbit

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

Os dois major remanescentes foram resolvidos. Os diálogos de atribuição e catálogo agora reutilizam o `Modal` acessível e o `useFocusTrap`, cobrindo foco inicial, ciclo de `Tab`/`Shift+Tab`, Escape e retorno ao gatilho. Conteúdos oficiais expõem somente URLs `http/https`, mantêm a conclusão bloqueada sem material e exigem que o usuário abra o conteúdo antes de registrar a conclusão.

### Refactoring Performed

- **`src/components/organisms/Modal.tsx`**: restauração explícita do elemento previamente focado para modais controlados sem `Dialog.Trigger` interno.
- **`src/features/manager/development/ManagerUniversityReference.tsx`**: diálogos migrados para o primitive acessível, contrato seguro de material/conclusão e progresso da equipe limitado a 100%.
- **`src/features/manager/development/ManagerUniversityReference.test.tsx`**: seis regressões cobrem foco, trap bidirecional, restauração, URL segura, ausência de material, acesso antes da conclusão e IDs assistidos obsoletos.

### Compliance Check

- Coding Standards: ✓ lint e typecheck sem erros.
- Project Structure: ✓ sync IDE, estrutura, agentes e paridade passaram; warnings AIOX preexistentes permanecem documentados.
- Testing Strategy: ✓ 830 testes passaram, zero falhas; build e bundle aprovados.
- CodeRabbit: ✓ revisão final do worktree com 0 issues.
- All ACs Met: ✗ E2E autenticado pós-correções e Chrome real continuam indisponíveis por credencial/conexão externa.

### Improvements Checklist

- [x] Corrigir foco inicial, trap de teclado e restauração nos dois diálogos da Universidade.
- [x] Expor apenas link seguro do material oficial e bloquear conclusão até o acesso.
- [x] Impedir progresso acima de 100% quando existem IDs assistidos obsoletos.
- [x] Executar lint, typecheck, 830 testes, build, bundle, validações AIOX e CodeRabbit.
- [ ] Reexecutar o E2E autenticado com senha fornecida apenas em runtime; tentativa atual: 4 skipped.
- [ ] Restabelecer a comunicação do plugin e recapturar no Chrome real.

### Security Review

Nenhum token fornecido pelo usuário foi persistido ou encontrado no diff/untracked. O link oficial rejeita protocolos executáveis. `npm audit` não encontrou vulnerabilidade critical; quatro advisories high preexistentes permanecem como dívida de dependências.

### Performance Considerations

Bundle total aprovado em `1700,57/1800 KB` gzip; as novas estruturas de foco e controle de acesso ao material têm custo local e constante.

### Files Modified During Review

- `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md`
- `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Gate Status

Gate: CONCERNS → `docs/qa/gates/epic-modulo-gerencial-base44-rebuild.yml`

### Recommended Status

✓ Ready for Review — sem finding critical/major; publicar com ciência dos dois gates externos documentados.
