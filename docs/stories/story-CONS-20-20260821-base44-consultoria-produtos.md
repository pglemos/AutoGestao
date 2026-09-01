# Story CONS-20 — Paridade Base44 de Consultoria e Produtos no Admin MX

**Status:** Ready for Review
**Agent:** @aiox-master + @dev
**Priority:** HIGH

## Contexto

O Admin MX já expõe `/consultoria` e `/produtos`, mas as superfícies ainda não cobrem toda a operação existente no Base44 `6a6fd5b82088f81a3baebb5d`. O objetivo desta story é trazer a paridade funcional e semântica das duas rotas — métricas, filtros, listas, tabelas, detalhe 360, ações, catálogo, ciclo de vida, matriz de capacidades e ponte produto → plano estratégico — usando o design system e os tokens visuais do MX.

O contrato funcional é derivado de `docs/base44-import/GAP-03-clientes-equipe-produtos-consultoria.md`, `docs/admin-mx/BLUEPRINT-IMPORTACAO-ADMIN.md` e dos artefatos espelhados em `docs/base44-import/_source/`. O CSS e a aparência do Base44 não são fonte de implementação visual.

## User Story

Como administrador MX, quero operar consultoria e produtos nas rotas `/consultoria` e `/produtos` com a mesma cobertura de regras e ações do Base44, para cadastrar, publicar, versionar, configurar e acompanhar programas sem quebrar o plano estratégico dos clientes.

## Escopo

- Overview de consultoria com métricas, filtros de status/modalidade, lista clicável de encontros/clientes e detalhe 360.
- Ações de detalhe para abrir consultoria, plano estratégico e plano de ação.
- Catálogo de produtos com criação, edição, duplicação, nova versão, publicação, arquivamento e exclusão segura.
- Regras de ciclo de vida e exclusividade do grupo `CONSULTORIA_EVOLUTIVA_PRINCIPAL`, incluindo a incompatibilidade entre PMR Online e PMR Híbrido ativos.
- Detalhe do produto com módulos, tempos/capacidade e plano estratégico.
- Matriz de capacidades com menu, inclusão, obrigatoriedade, etapa, visibilidade, status técnico, prévias por perfil e restauração do padrão do produto.
- Resolução, criação, roster e sincronização do plano estratégico a partir do produto e do pacote versionado.
- Migração compatível e tipos autoritativos para os campos persistidos necessários.
- Testes unitários/contratuais e evidência de navegador real em desktop e mobile.

## Fora de escopo

- Copiar CSS, componentes visuais ou layout do Base44.
- Alterar as regras de competência fechada, jornadas históricas ou outros gaps do GAP-03 não necessários para as duas rotas desta story.
- Aplicar migration em produção, publicar release ou criar PR sem autorização específica do agente responsável por DevOps. A autorização de publicação foi concedida nesta rodada; a execução e as evidências externas ficam registradas no QA abaixo.

## Acceptance Criteria

- [ ] `/consultoria` exibe Agendados, Concluídos, Presenciais e Não iniciados com dados persistidos e permite filtrar Todos, Não iniciado, Agendado, Concluído e Reagendado.
- [ ] `/consultoria` permite filtrar Todas, Online, Presencial e A definir, e a lista apresenta número, título, objetivo, consultor, modalidade e status.
- [ ] A seleção de um encontro/cliente abre detalhe com abas administrativas 360 e ações funcionais para Plano Estratégico, Plano de Ação e Consultoria.
- [ ] `/produtos` exibe catálogo, métricas de encontros/presenciais/contratos, filtros, Novo Produto e tabela de ações.
- [ ] Produto possui ciclo de vida, versão, jornada, modalidade/presença, contratos, descrição e vínculo opcional ao plano estratégico.
- [ ] Somente um produto ativo no grupo `CONSULTORIA_EVOLUTIVA_PRINCIPAL` é permitido; PMR Online e PMR Híbrido não podem ficar ativos simultaneamente.
- [ ] Produto publicado com clientes não pode ser excluído, e editar produto publicado cria uma nova versão em rascunho sem mutar a versão publicada.
- [ ] Duplicação e nova versão copiam módulos, tempos e vínculo de pacote com tratamento explícito de erro e sem deixar registros parciais silenciosos.
- [ ] Detalhe do produto expõe abas Módulos, Tempos e Capacidade e Plano Estratégico, com contagens e ações coerentes com o estado do produto.
- [ ] A matriz expõe Menu, Incluído, Obrigatório, Etapa, Visibilidade e Status técnico; bloqueia menus obrigatórios/indisponíveis e permite visualizar por Dono, Gerente e Vendedor.
- [ ] A matriz permite marcar itens não obrigatórios, restaurar padrão do produto e registrar a origem da configuração como padrão ou personalizada.
- [ ] O vínculo cliente → produto resolve o pacote de indicadores efetivo e permite criar/obter roster/sincronização do plano estratégico no ciclo MX existente, sem criar um segundo modelo de ciclo.
- [ ] A migration é reversível/compatível com dados existentes, possui RLS/grants adequados e os tipos gerados refletem os campos usados pelo código.
- [ ] Os testes direcionados cobrem regras de exclusividade, versionamento, exclusão, clonagem, matriz e bridges produto → plano estratégico.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam, ou falhas preexistentes são isoladas e documentadas sem mascarar falhas introduzidas.
- [ ] A validação autenticada em navegador real cobre `/consultoria` e `/produtos` em 1440×900 e 390×844, com cliques nas ações principais, sem overflow, erros de runtime ou console errors introduzidos; a evidência possui `summary.status == "passed"`.

## Plano de implementação

1. Mapear contratos atuais, schema autoritativo e referências Base44; criar migration e tipos necessários.
2. Extrair regras puras e bridges produto → pacote/plano estratégico, com testes antes da UI dependente.
3. Completar catálogo, ciclo de vida, versionamento e detalhe/matriz de produtos.
4. Completar overview e detalhe da consultoria, preservando o workspace de planejamento existente.
5. Aplicar tokens MX e comportamento responsivo sem importar CSS Base44.
6. Rodar gates locais, reconstruir Graphify e executar a matriz de navegador real.

## Evidências e QA

- [x] Checklist de story atualizado.
- [x] File List atualizado.
- [x] `npx graphify hook-rebuild` executado após alterações de código.
- [ ] Screenshots/summary desktop e mobile anexados ou referenciados.
- [x] Regressões e limitações externas documentadas.

## File List

- `docs/stories/story-CONS-20-20260821-base44-consultoria-produtos.md`
- `docs/base44-import/GAP-03-clientes-equipe-produtos-consultoria.md`
- `docs/base44-import/_source/src/lib/productPackageOps.js`
- `docs/base44-import/_source/src/lib/capabilityCatalog.js`
- `src/features/internal-mx-planning/InternalConsultingPage.tsx`
- `src/test/internal-mx-planning-pages.test.ts`
- `src/features/admin-mx/consultoria/AdminConsultingOverviewPage.tsx`
- `src/features/admin-mx/AdminConsultoriaMxPage.tsx`
- `src/features/admin-mx/consultoria-mx/OverviewTab.tsx`
- `src/features/admin-mx/consultoria-mx/methodology.ts`
- `src/features/admin-mx/consultoria/consultingOverview.ts`
- `src/features/admin-mx/consultoria/consultingOverview.test.ts`
- `src/features/admin-mx/AdminProdutosConsultoriaPage.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/produtos/ConsultingProductFormModal.tsx`
- `src/features/admin-mx/produtos/ProductDetailDrawer.tsx`
- `src/features/admin-mx/produtos/ProductStrategicPlanTab.tsx`
- `src/features/admin-mx/produtos/capabilityCatalog.ts`
- `src/features/admin-mx/produtos/consultingProducts.ts`
- `src/features/admin-mx/produtos/consultingProducts.test.ts`
- `src/features/admin-mx/produtos/strategicPlan.ts`
- `src/features/admin-mx/produtos/strategicPlan.test.ts`
- `src/features/strategic-plan/productPackageOps.ts`
- `src/features/strategic-plan/clientProductPackage.ts`
- `src/features/strategic-plan/planCycle.ts`
- `src/features/admin-mx/indicadores/StrategicPlanAdminPanels.tsx`
- `src/features/admin-mx/indicadores/strategicPlanAdmin.ts`
- `src/features/admin-mx/indicadores/indicatorCatalog.ts`
- `src/features/admin-mx/indicadores/metasRealizados.ts`
- `src/features/admin-mx/components/MetasRealizadosTab.tsx`
- `src/features/admin-mx/components/CreateIndicatorWizard.tsx`
- `src/features/admin-mx/components/ParameterPickerModal.tsx`
- `src/features/admin-mx/produtos/ProductDetailDrawer.tsx`
- `src/features/admin-mx/produtos/consultingProducts.ts`
- `src/features/admin-mx/produtos/consultingProducts.test.ts`
- `src/features/strategic-plan/StrategicPlanWorkspace.tsx`
- `src/types/database.generated.ts`
- `supabase/migrations/20260821170000_indicator_catalog_origin.sql`
- `supabase/migrations/20260821173000_admin_strategic_plan_aggregates.sql`
- `supabase/migrations/20260821180000_action_plan_base44_template_parity.sql`
- `supabase/migrations/20260821200000_consulting_product_base44_capabilities.sql`
- `supabase/migrations/20260821210000_consulting_product_capability_origin.sql`

## Dev Agent Record

### Completion Notes

- Implementação local concluída para o overview operacional de `/consultoria`, catálogo/ciclo de vida/matriz de `/produtos`, bridges produto → plano estratégico e detalhe 360.
- **Atualização Impeccable de `/consultoria` — 2026-09-01:** correção local aplicada no overview, shell da página, aba de overview/metodologia e contratos puros. A frente agora suporta busca por cliente/encontro/consultor/objetivo/produto, filtros de período/status/modalidade, ordenação por prioridade/data/recentes/cliente, contagem filtrada, atualização e atrasos, alerta de status/data efetiva inconsistente, modal responsivo, `Executar encontro` como ação primária, `Visão 360 do cliente` como ação secundária, Planos em `Mais ações`, metodologia agrupada e resumo/KPIs recolhíveis no mobile. Esta alteração ainda não recebeu commit, push ou deploy; o deployment descrito abaixo é anterior e não comprova este delta local.
- A validação manual autenticada desta rodada usou a sessão `SynVolt` (`Admin geral`) no Chrome real: ACERTT retornou 13 resultados; concluídos 9; concluídos online 4; atrasados 338; próximos 7 dias 8. Foram exercidos detalhe/modal, fechamento por Escape, `Mais ações`, execução do encontro, Visão 360, Plano de Ação, Plano Estratégico, metodologia e conteúdo, em `1440×900` e `390×844`, sem overflow ou erros de console.
- Gates desta rodada: `npm run lint` passou com 0 erros e apenas os 2 avisos preexistentes de `MetasRealizadosTab.tsx` e `IndicatorPicker.tsx`; `npm run typecheck` passou; testes focados passaram com 14 testes/104 expectativas; `npm test` passou com 4.774 testes/27.509 expectativas; `npm run build` passou com 5.274 módulos transformados e verificação de sourcemaps sem `.map` em `dist/`.
- O detector Impeccable executado nos três componentes TSX alterados (`AdminConsultingOverviewPage.tsx`, `AdminConsultoriaMxPage.tsx` e `OverviewTab.tsx`) retornou `[]` (exit 0). Para a URL de produção, a injeção do detector de navegador permaneceu bloqueada pela CSP; portanto, o snapshot automático não deve ser tratado como evidência autenticada nem como “clean” determinístico.
- `/consultoria` e `/produtos` foram validadas com dados persistidos em navegador real, desktop 1440×900 e mobile 390×844; as duas evidências finais têm `status: passed`, axe com 0 violações e 0 erros de runtime/console.
- Gates locais verdes no SHA `6b7ad31ab231ad7321b0ab72192306954e6890d6`: `npm run lint`, `npm run typecheck`, `npm test` (4.246 testes, 25.277 expectativas, 705 arquivos), `npm run build`, reversibilidade de migrations e testes direcionados (24 testes / 65 expectativas); o build também confirmou ausência de sourcemaps públicos.
- `npx graphify hook-rebuild` concluído com runtime TypeScript; seis scripts PowerShell ficaram fora da extração por ausência de `tree-sitter-powershell`, limitação conhecida do parser.
- O projeto Supabase confirmado é `fbhcmzzgwjdgkctlfvbo`. A leitura remota mostra `pmr_hibrido` publicado/ativo, `pmr_online` suspenso/inativo, `pmr_9_copia` inexistente e `configuration_origin` existente; as migrations `20260821170000`, `20260821173000`, `20260821180000`, `20260821200000` e `20260821210000` constam aplicadas.
- `npm run gen:db-types` continua bloqueado por privilégio do endpoint: `Your account does not have the necessary privileges to access this endpoint`; por isso a geração autoritativa de tipos permanece um gate externo, sem habilitar cliente tipado à força.
- A produção foi publicada no deployment Vercel `dpl_FvkR5VxmEg1VoXpWdSdJLy2f7LAU`, `Ready`, com aliases `https://www.mxperformance.com.br`, `https://mxperformance.com.br` e `https://mxperformance.vercel.app`, a partir do SHA `95c74dc4ed29f2a4f2a156c023dff105eaec0303`.
- O audit de dependências permanece com uma preocupação HIGH preexistente em `xlsx` (`<0.20.2`, ReDoS/Prototype Pollution); não foi executado `npm audit fix --force` porque não há patch upstream seguro no contrato atual.

### Debug Log References

- `.impeccable/critique/2026-09-01T02-37-25Z__www-mxperformance-com-br-consultoria.md` — snapshot da crítica da URL; registra a CSP que bloqueou `detect.js` no navegador e a ausência de overlay/conclusão determinística para a página publicada.
- Evidência manual autenticada desta rodada: sessão `SynVolt` (`Admin geral`) no Chrome real; ACERTT, filtros, detalhe, ações, metodologia/conteúdo, desktop `1440×900` e mobile `390×844` verificados sem overflow ou erros de console. O `agent-browser` automático caiu na tela de login e não foi usado como prova autenticada.
- `node .agents/skills/impeccable/scripts/detect.mjs --json src/features/admin-mx/consultoria/AdminConsultingOverviewPage.tsx src/features/admin-mx/AdminConsultoriaMxPage.tsx src/features/admin-mx/consultoria-mx/OverviewTab.tsx` — `[]`, exit 0.
- Gates desta rodada: `npm run lint` exit 0 (2 warnings preexistentes), `npm run typecheck` exit 0, `npm test` com 4.774/4.774 testes e 27.509 expectativas, `npm run build` exit 0; `dist/` sem sourcemaps públicos.
- `viewportCap.reset()` executado após a inspeção autenticada para restaurar o viewport temporário do navegador.
- `visual-evidence/agent-browser/cons20-produtos-final-2026-08-21T20-08-56/summary.json` — `status: passed`, `1440x900`/`390x844`, axe 0, sem falhas/erros.
- `visual-evidence/agent-browser/cons20-consultoria-final-2026-08-21T20-09-09/summary.json` — `status: passed`, `1440x900`/`390x844`, axe 0, sem falhas/erros.
- As ações manuais do detalhe da consultoria navegaram para `/plano-estrategico?storeId=...` e `/plano-acao?storeId=...`, sem alertas na página.
- A verificação remota do Supabase confirmou `pmr_hibrido` ativo, `pmr_online` suspenso, ausência de `pmr_9_copia`, presença de `configuration_origin` e aplicação das cinco migrations da story.
- A validação final de produção confirmou o deployment `Ready`, HTTP 200 em `/consultoria` e `/produtos`, métricas/listas/tabelas reais, detalhe/matriz de produto, `scrollWidth` sem overflow em desktop 1710px e mobile 390px, e console sem erros/warnings.
- O bloqueio de `npm run gen:db-types` permanece: `Your account does not have the necessary privileges to access this endpoint`.

### CodeRabbit Integration

- A primeira revisão dirigida do CodeRabbit retornou 0 findings no escopo analisado, mas cobriu apenas `src/features/admin-mx/clientes/storeMutations.ts`; a tentativa de revisão incluindo os arquivos não rastreados foi bloqueada por `Rate limit exceeded` (quota de 24 minutos). Não tratar isso como revisão integral limpa.
- @aiox-devops executou o push e a publicação; a validação autenticada em produção foi repetida após o deploy nas duas rotas desta story.

### QA Results

- **Addendum 2026-09-01 — correção Impeccable de `/consultoria`:** gates locais e inspeção autenticada manual concluídos para o delta desta rodada. Não houve publicação; a validação `agent-browser` automática sem sessão autenticada foi deliberadamente excluída da prova de produção. O aceite externo/deploy do delta permanece pendente de autorização e execução de release.
- **Decision:** PASS WITH CONCERNS — implementação publicada e validada em produção; permanecem apenas gates externos não bloqueantes para este release.
- **PASS:** push em `main`, SHA remoto, Vercel `Ready`, CI completo (Quality Gates, Typecheck/unit, Gitleaks, a11y e Atomic Design), lint/typecheck/test/build locais, cinco migrations aplicadas, secret scan e browser autenticado desktop/mobile de `/consultoria` e `/produtos`.
- **OPEN:** liberar `npm run gen:db-types` e repetir CodeRabbit com quota/seat disponível; registrar separadamente as vulnerabilidades Dependabot reportadas pelo GitHub e a depreciação do Node 20 nas actions.
