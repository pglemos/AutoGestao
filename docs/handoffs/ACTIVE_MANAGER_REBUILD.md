# Handoff ativo — Reconstrução do Módulo Gerencial

## Objetivo
Reconstruir o Módulo Gerencial do MX com Base44 como referência visual/funcional e arquitetura MX (React 19, Supabase, RLS, capabilities, tokens) como fonte de verdade. Árvore única do módulo gerencial (rotas raiz) dentro de `Layout`/`SellerLayoutShell`.

## Prompt mestre
`/Users/pedroguilherme/AIOX-FLEET/MX_GERENTE_REBUILD_AIOX/PROMPT_EXECUCAO_REBUILD_MODULO_GERENTE.md` (1730 linhas). Referências em `/Users/pedroguilherme/AIOX-FLEET/MX_GERENTE_REBUILD_AIOX/reference/`.

## Agente atual
Codex CLI com `aiox-devops`; publicação e homologação concluídas.

## Branch
`main` (regra do prompt mestre: trabalhar direto na main, sem branch).

## Commit-base
`f2b57792` — feat(aiox): install full squads catalog and dashboard integration (HEAD = origin/main no início da sessão Claude).

## Último commit relacionado
Nenhum commit do rebuild gerencial ainda. Todo o trabalho do Codex está **uncommitted** (working tree).

## Trabalho concluído (evidência: working tree + docs + QA gate no epic)
- Arquitetura e mapeamento de dados documentados (`docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md`, `MODULO_GERENCIAL_DATA_MAPPING.md`).
- Matriz de paridade Base44↔MX (`docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`).
- Sidebar gerente com exatamente 9 menus na ordem contratada (`src/components/Layout.tsx`).
- Rotas canônicas do módulo (raiz, sem prefixo) registradas e protegidas por papel (`src/App.tsx`, `src/lib/auth/routeAccess.ts` + teste em `routeAccess.test.ts`).
- Mobile titles para rotas gerente (`src/components/SellerSidebar.tsx`).
- `ManagerDailyClosing.container.tsx` — versão básica: header com data, 4 cards (Agendamentos, Pendentes Hoje, Regularizações, Disciplina Média), tabela de movimento, aprovar/recusar regularização server-side via `useCheckinAuditor` (RPCs canônicas).
- `ManagerTeamRoutine.container.tsx` — consome `execution_actions` + `agendamentos` (Central de Execução, NÃO deriva do fechamento), cards, tabela, ação Cobrar via notificação.
- `ManagerDevelopment.tsx` (Feedbacks/PDIs) e `ManagerMentor.tsx` (sem IA ampla) criados.
- `manager-metrics.ts` + testes (classifyDiscipline, getClosingStatus, classifyRoutine, percent).
- Remoção de fallbacks numéricos inventados no cockpit (`ManagerOperationalCockpit.tsx`: 68→0, 64→0, 58→0, 72→real).
- Minha Equipe/Meta da Loja reutilizam `DashboardLoja` com tab por pathname.
- QA rodado: 791 unit/component/integration PASS; E2E manager 2/2 PASS (login gerente real, 9 rotas, 4 viewports); lint/typecheck/build/sync:ide:check/validate:* PASS.

## Trabalho concluído em 2026-07-12
- Fechamento Diário com faixa de ação, cobrança coletiva, Agenda D+1 completa, regularização por RPC e correção auditável de leads.
- Rotina da Equipe com detalhe e ações por vendedor sobre a Central de Execução.
- Minha Equipe com cards de performance, busca e perfil em cinco abas.
- Feedbacks/PDIs com quatro KPIs e Agenda de Reuniões.
- Universidade sem `NaN` e com equipe, matriz e trilha.
- Bundle consolidado em `jsPDF` + `html2canvas`: 1671.59/1800 KB gzip.
- 810 testes, lint/typecheck/build e gates AIOX verdes.
- E2E gerente 4/4 e 18 capturas finais desktop/mobile.

## Trabalho ainda não iniciado
- Teste E2E específico de selects/dropdowns do módulo gerente (§13.2 exige).
- Comparação visual autenticada com preview Base44 (bloqueado: acesso indisponível).
- Homologação final Início (AC "sem fallbacks inventados" — código já corrigido, falta aprovação visual).

## QA Gate anterior (registrado no epic): **FAIL**
- FAIL: bundle total 1949.25 KB > gate 1800 KB.
- FAIL: E2E Chromium global tem assertions preexistentes da Agenda Admin para texto/botão removido.
- FAIL: comparação visual Base44 autenticada indisponível (bloqueio externo).
- CONCERN: Agenda D+1 e Corrigir Leads não implementados na central gerencial.
- CONCERN: snapshots de comparação de rede para rotina indisponíveis (UI evita valores fabricados — correto).

## Arquivos modificados pelo trabalho gerencial (uncommitted, origem: Codex)
- `src/App.tsx` — lazy imports + 8 rotas raiz do módulo gerencial com RoleSwitch
- `src/components/Layout.tsx` — sidebar gerente 9 menus
- `src/components/SellerSidebar.tsx` — mobile titles gerente
- `src/lib/auth/routeAccess.ts` + `.test.ts` — patterns raiz do módulo com MANAGEMENT_ROLES
- `src/features/dashboard-loja/DashboardLoja.container.tsx` — tab por pathname gerente
- `src/features/dashboard-loja/hooks/useDashboardLojaData.ts` — ajustes
- `src/features/dashboard-loja/sections/ManagerOperationalCockpit.tsx` — remove fallbacks inventados
- `src/hooks/useCheckinAuditor.ts` — captura de error no fetch
- `scripts/cleanup_v5.js` — diretórios auditoria/logs
- Novos: `src/features/manager/**`, `src/pages/ManagerDevelopment.tsx`, `src/pages/ManagerMentor.tsx`, `src/test/manager-module.playwright.ts`, docs architecture/qa/epic, `scripts/*_v6.js`

## Arquivos protegidos de outros agentes
Nenhuma alteração de terceiro detectada no diff atual — todas as mudanças são coerentes com o rebuild gerencial. `test-results/.last-run.json` é artefato de execução (não commitar).

## Migrations criadas
Nenhuma até agora.

## Rotas criadas ou alteradas
`/fechamento-diario`, `/rotina-equipe`, `/minha-equipe`, `/meta-loja`, `/mentor`, `/feedbacks-pdis`, `/ranking`, `/universidade-mx` (+ `/home` reutilizado). Vendedor bloqueado em todas via RoleSwitch + routeAccess.

## Componentes criados ou alterados
Ver seção "Arquivos modificados". Principais novos: `ManagerDailyClosing.container.tsx`, `ManagerTeamRoutine.container.tsx`, `manager-metrics.ts`, `ManagerDevelopment.tsx`, `ManagerMentor.tsx`.

## Testes executados / aprovados / falhando
- Aprovados: 791 unit/component/integration; E2E manager 2/2; lint (0 erros, 22 warnings preexistentes); typecheck; build; sync:ide:check; validate:structure/agents/parity; matriz de rotas nega vendedor nas rotas exclusivas do módulo.
- Falhando: E2E Chromium global (Agenda Admin, assertions preexistentes de UI removida); gate de bundle (1949 KB > 1800 KB).

## Erros conhecidos
Nenhum bloqueio funcional conhecido. Produção mantém o aviso preexistente de Sentry sem `VITE_SENTRY_DSN`.

## Decisões arquiteturais
Ver `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md` e `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`. Resumo: shell/9 menus Base44 migrados; auth/entidades/localStorage/dados demo Base44 rejeitados; Rotina vem da Central de Execução (nunca do fechamento); regularização só server-side por RPC canônica; sem números fabricados no cliente.

## Próxima ação exata
Nenhuma para o rebuild gerencial. Configurar `VITE_SENTRY_DSN` em uma tarefa separada de observabilidade, quando o DSN oficial estiver disponível.

## Atualização visual 2026-07-11

- Chrome DevTools MCP operacional; extensão Codex/Chrome instalada e habilitada, mas a conexão da extensão não respondeu nesta sessão.
- Vendedor e gerente autenticados com contas reais apenas em runtime.
- Nove telas gerenciais capturadas em desktop e mobile; Home e Fechamento do vendedor capturados como referência.
- Console limpo nas nove rotas.
- Fechamento, Rotina e Mentor receberam correções renderizadas e recapturas.
- `PageHeading` e `ManagerVisualPrimitives` agora concentram a correção responsiva compartilhada.

## Comandos para retomar
```bash
cd "/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA"
git status --short && git log -5 --oneline
npm run typecheck && npm run lint
npm test
npm run build            # verificar gate de bundle
npm run sync:ide:check && npm run validate:structure && npm run validate:agents && npm run validate:parity
```

## Data e hora da atualização
2026-07-11 — sessão Claude Code iniciada (handoff criado a partir de evidências do working tree; nada commitado ainda).
