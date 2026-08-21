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
- `/consultoria` e `/produtos` foram validadas com dados persistidos em navegador real, desktop 1440×900 e mobile 390×844; as duas evidências finais têm `status: passed`, axe com 0 violações e 0 erros de runtime/console.
- Gates locais verdes no SHA `6b7ad31ab231ad7321b0ab72192306954e6890d6`: `npm run lint`, `npm run typecheck`, `npm test` (4.246 testes, 25.277 expectativas, 705 arquivos), `npm run build`, reversibilidade de migrations e testes direcionados (24 testes / 65 expectativas); o build também confirmou ausência de sourcemaps públicos.
- `npx graphify hook-rebuild` concluído com runtime TypeScript; seis scripts PowerShell ficaram fora da extração por ausência de `tree-sitter-powershell`, limitação conhecida do parser.
- O projeto Supabase confirmado é `fbhcmzzgwjdgkctlfvbo`. A leitura remota mostra `pmr_hibrido` publicado/ativo, `pmr_online` suspenso/inativo, `pmr_9_copia` inexistente e `configuration_origin` existente; as migrations `20260821170000`, `20260821173000`, `20260821180000`, `20260821200000` e `20260821210000` constam aplicadas.
- `npm run gen:db-types` continua bloqueado por privilégio do endpoint: `Your account does not have the necessary privileges to access this endpoint`; por isso a geração autoritativa de tipos permanece um gate externo, sem habilitar cliente tipado à força.
- A produção em `https://www.mxperformance.com.br` ainda está stale em relação ao checkout: `/produtos` mostra a matriz antiga sem status técnico/origem/restauração e `/consultoria` mostra “Nenhum programa vinculado” com lojas desabilitadas. HTTP 200 e smoke genérico não comprovam a funcionalidade nova; não há prova de deploy desta implementação.
- O audit de dependências permanece com uma preocupação HIGH preexistente em `xlsx` (`<0.20.2`, ReDoS/Prototype Pollution); não foi executado `npm audit fix --force` porque não há patch upstream seguro no contrato atual.

### Debug Log References

- `visual-evidence/agent-browser/cons20-produtos-final-2026-08-21T20-08-56/summary.json` — `status: passed`, `1440x900`/`390x844`, axe 0, sem falhas/erros.
- `visual-evidence/agent-browser/cons20-consultoria-final-2026-08-21T20-09-09/summary.json` — `status: passed`, `1440x900`/`390x844`, axe 0, sem falhas/erros.
- As ações manuais do detalhe da consultoria navegaram para `/plano-estrategico?storeId=...` e `/plano-acao?storeId=...`, sem alertas na página.
- A verificação remota do Supabase confirmou `pmr_hibrido` ativo, `pmr_online` suspenso, ausência de `pmr_9_copia`, presença de `configuration_origin` e aplicação das cinco migrations da story.
- A validação de produção confirmou HTTP 200, mas também confirmou superfície stale nos dois caminhos; o bloqueio de `npm run gen:db-types` retornou `Your account does not have the necessary privileges to access this endpoint`.

### CodeRabbit Integration

- A primeira revisão dirigida do CodeRabbit retornou 0 findings no escopo analisado, mas cobriu apenas `src/features/admin-mx/clientes/storeMutations.ts`; a tentativa de revisão incluindo os arquivos não rastreados foi bloqueada por `Rate limit exceeded` (quota de 24 minutos). Não tratar isso como revisão integral limpa.
- O veredito permanece condicionado à publicação por @aiox-devops e à repetição do navegador autenticado em produção após o deploy; o agente dev não executou push/deploy.

### QA Results

- **Decision:** CONCERNS — implementação e gates locais concluídos, mas a versão publicada ainda não contém esta implementação; geração de tipos e revisão integral do CodeRabbit continuam bloqueadas por autoridade/quota externa.
- **PASS:** lint, typecheck, regressão completa, build no SHA atual, testes direcionados, reversibilidade, secret scan, Graphify, cinco migrations aplicadas no projeto confirmado e navegador local autenticado de `/consultoria` e `/produtos` em desktop/mobile.
- **OPEN:** publicar o SHA `6b7ad31ab231ad7321b0ab72192306954e6890d6`, confirmar CI/deployment/alias atual e repetir CRUD/matriz/detalhe de `/produtos`, `/consultoria` e workspace de `/plano-estrategico` em navegador autenticado de produção; liberar `npm run gen:db-types`; repetir CodeRabbit com quota disponível.
