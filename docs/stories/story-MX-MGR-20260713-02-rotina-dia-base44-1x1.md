# Story MX-MGR-20260713-02 — Rotina do Dia Base44 1:1

## Status

**InProgress**

## Executor Assignment

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools:
  - bun-test
  - playwright
  - chrome-devtools
  - supabase-contract-review
```

## Story

**Como** gerente autenticado do MX Performance,
**quero** que a rota `/rotina` reproduza integralmente a Rotina do Dia do módulo Base44,
**para que** eu conduza tarefas automáticas e manuais, pendências, acompanhamentos e histórico com os mesmos estados e fluxos usando dados reais e isolamento de loja do Supabase.

## Contexto e precedência

- Story filha do epic `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md` e sucessora de `MX-MGR-20260713-01`.
- O usuário aprovou em 2026-07-13 a reconstrução vertical tela por tela e autorizou iniciar esta vertical após a homologação de Início.
- O ZIP `/Users/pedroguilherme/Downloads/mx-gerente.zip` e a aplicação autenticada `https://mx-gerente.base44.app/rotina-dia` são o contrato observável.
- O Base44 vence em composição, textos, famílias de tarefa, fórmulas, horários, estados, ordenação, formulários, ações e fluxos; React/Auth/Supabase/RLS permanecem infraestrutura.
- O sidebar escuro atual permanece sem alteração nesta story.
- Evidência no Chrome real em 2026-07-13 confirmou a tela estabilizada, o modal de nova atividade, a aba Minha Rotina, o layout mobile, o estado vazio e a navegação `Meta da Loja?acao=acompanhar`.

## Acceptance Criteria

1. `/rotina` renderiza a Rotina do Dia Base44 dentro do shell autenticado atual, sem segundo router, AuthProvider ou sidebar, preservando integralmente o sidebar escuro existente.
2. O cabeçalho reproduz título, subtítulo, dia da semana, data extensa, unidade e ação `Atualizar`; usa o dia civil atual em `America/Sao_Paulo`, atualiza todas as fontes da tela e distingue loading, erro, sem loja e vazio.
3. As abas `Hoje` e `Minha Rotina` reproduzem labels, indicador de pendentes, seleção, espaçamento e troca de conteúdo da referência; ao retornar de um módulo, filtro e ordenação são restaurados de `mx_contexto_navegacao` e o contexto é consumido.
4. O gerador TypeScript porta sem reinterpretação `classificarUrgencia`, `calcularDiasAtraso`, `filtrarTarefas`, `ordenarTarefas` e `calcularExecucaoGerente` do ZIP, incluindo `vencida`, `critica`, `atencao`, `normal` e `futura`, desempate por horário e labels/pluralizações correspondentes.
5. Todas as famílias automáticas do ZIP são formadas por adaptadores sobre dados reais MX e só aparecem quando sua condição normativa é satisfeita:
   - regularização do Fechamento Diário às `09:30`;
   - confirmação de agendamentos às `10:30`;
   - execução do Plano de Ataque às `11:00`;
   - prospecção às `12:00`;
   - atualização dos clientes às `16:00`;
   - necessidade da Meta da Loja às `18:00`;
   - feedbacks e ações de PDI às `17:00`;
   - reuniões de PDI no horário persistido;
   - compromissos/reuniões/conferências da agenda no horário persistido;
   - atividades manuais.
6. As fórmulas e exclusões de cada família seguem `rotinaDiaGerente.js`, inclusive status de fechamento, dia elegível, erros/não aplicável dos blocos da rotina, previstos versus executados/qualificados/atualizados, meta diária `meta_mensal / (dias_uteis_mes || 22)`, prazos de feedback/PDI e supressão de tarefa automática já encerrada.
7. Fontes MX são compostas sem dados fictícios: membership/loja/gerente, vendedores ativos, fechamento atual/anterior, agendamentos CRM, Central de Execução/Plano de Ataque, meta, feedback, PDI e agenda executiva; `execution_actions` persiste tarefas e resultados gerenciais com RLS. Migration nova só é aceita se auditoria provar que metadata e contratos existentes são insuficientes.
8. O banner de pendências anteriores reproduz o Base44 em vermelho, com ícone, textos, pluralização, botão `Ver pendências` e retorno `← Ver todas as tarefas`; em modo vencidas, filtros ficam ocultos e título/subtítulo mudam exatamente como a referência.
9. Os filtros `Todas`, `Resultado`, `Equipe`, `Desenvolvimento` e `Operação`, o contador de pendentes e a ordenação `Prioridade`, `Horário` e `Origem` reproduzem comportamento e conteúdo Base44; `futura` não entra no contador de hoje e vencidas são tratadas pelo banner.
10. Cada tarefa reproduz o card horizontal desktop/tablet e o card vertical mobile do ZIP: horário, dias de atraso, barra/ícone por categoria, título, descrição, selo Manual, origem, prioridade dinâmica e botões de consulta/ação. O estado vazio usa os dois textos Base44, sem mensagem substituta.
11. Antes de navegar, `mx_contexto_navegacao` registra `origemNavegacao: ROTINA_DO_DIA_GERENTE`, `tarefaId`, data, módulo, filtro e ordenação. Rotas/queries canônicas MX preservam semanticamente todas as ações Base44, e os destinos exibem retorno para `/rotina` sem perder o contexto.
12. `Nova atividade` abre o formulário Base44 com título obrigatório, data, horário padrão `12:00`, categoria, prioridade Normal/Atenção/Crítica, vendedor opcional e observação; cancelar/fechar não grava, salvar valida, persiste uma única tarefa manual escopada à loja/gerente e atualiza a lista sem recarregar a página.
13. `Concluir` em tarefas manuais e compromissos abre o modal Base44 com resumo, resultado obrigatório `Concluída`, `Concluída parcialmente`, `Reagendada` ou `Não realizada`, observação opcional e ação `Confirmar`; cada estado é persistido e reaparece com o label/cor correto em Minha Rotina, sem duplicação de tarefa.
14. `Minha Rotina` oferece `7 dias`, `15 dias`, `30 dias` e intervalo customizado; agrupa registros por data decrescente, marca Hoje, mostra contagens concluídas/vencidas e preserva os cinco status (`concluida`, `concluida_parcial`, `reagendada`, `nao_realizada`, `pendente`), horário, categoria e observação. O vazio diz `Nenhuma atividade registrada no período.`
15. A tela e os modais são operáveis por teclado, mantêm foco/fechamento acessível, não apresentam overflow horizontal e reproduzem o conteúdo carregado em `1440×900`, `768×1024` e `390×844` no Chrome real.
16. Testes unitários cobrem todas as famílias, urgência, atraso, filtros, ordenação, execução e serialização de resultados; testes de componente cobrem abas, banner, estado vazio, criação, conclusão e contexto; E2E autenticado cobre refresh, filtros, ações, persistência e retorno.
17. `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam antes do handoff para QA; a regressão de Início e a matriz de acesso por papel permanecem verdes.
18. Após QA, a story só é concluída quando o commit estiver em `origin/main`, o deploy estiver promovido a `mxperformance.vercel.app` e a rota pública autenticada tiver sido homologada nos três viewports sem erro de console nem resposta 4xx/5xx causada pela story.

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `.aiox-core/core-config.yaml`.
> Quality validation will use the manual review process and the existing repository command when available.

## Tasks / Subtasks

- [x] 1. Fixar baseline e contrato observável (AC: 1–15)
  - [x] Auditar Hoje, Minha Rotina, filtros, ordenação, vazio, modais e ações no Chrome autenticado.
  - [x] Salvar capturas Base44 estabilizadas em desktop, tablet e mobile.
  - [x] Registrar no teste de domínio todas as ramificações do ZIP antes de alterar produção.
- [x] 2. Portar o domínio Base44 para funções puras TypeScript (AC: 4–6, 9, 13–14, 16)
  - [x] Implementar tipos, configurações, urgência, atraso, filtros, ordenação, contagem e histórico.
  - [x] Implementar as onze famílias automáticas com fixtures de todas as condições e bordas.
- [x] 3. Implementar o adaptador Supabase/RLS (AC: 2, 5–7, 11–14)
  - [x] Compor fechamento, CRM, Central de Execução, meta, desenvolvimento e agenda sem fallback inventado.
  - [x] Persistir criação e os quatro resultados em `execution_actions`, preservando contrato DB e metadata tipada.
  - [x] Auditar queries por loja/usuário e comportamento sem vínculo/erro.
- [x] 4. Reconstruir UI e fluxos Base44 (AC: 1–3, 8–15)
  - [x] Cabeçalho, abas, banner, filtros, títulos, estados e cards desktop/mobile.
  - [x] Modal de nova atividade e modal de conclusão com os quatro resultados.
  - [x] Minha Rotina agrupada por data e período.
  - [x] Contexto de navegação, queries canônicas e retorno.
- [ ] 5. Validar e publicar a vertical (AC: 15–18)
  - [x] Rodar testes focados RED/GREEN, regressão completa, lint, typecheck e build.
  - [x] Comparar Base44 × local no Chrome em `1440×900`, `768×1024` e `390×844`.
  - [x] Executar QA AIOX, atualizar checkboxes, Dev Agent Record, File List e QA Results.
  - [ ] Publicar via `@devops`, promover o deployment e homologar a produção autenticada.

## Dev Notes

### Fontes normativas

- `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md#decisão`: Base44 é o contrato observável e Supabase/RLS são a plataforma de persistência/autorização.
- `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md#boundaries`: Rotina porta o gerador automático/manual, horários, urgência, filtros, conclusão e restauração de contexto.
- `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md#padrão-de-adaptação`: entrega vertical exige adaptador, testes e comparação em três viewports.
- `docs/architecture/MODULO_GERENCIAL_DATA_MAPPING.md#regra-de-transformação`: Plano de Ataque/rotina compõe Central de Execução, templates e `execution_actions`; agenda usa `eventos_agenda_executiva`.
- `/tmp/mx-gerente-rotina.e3AEcc/src/pages/RotinaDia.jsx`: orquestração, fontes, persistência, contexto e composição normativa.
- `/tmp/mx-gerente-rotina.e3AEcc/src/lib/rotinaDiaGerente.js`: onze famílias, fórmulas, prioridades, filtros, ordenação e execução normativa.
- `/tmp/mx-gerente-rotina.e3AEcc/src/components/rotina-dia/`: cards, filtros, banner, modais, histórico e retorno normativos.
- `output/playwright/manager-parity/reference/rotina-dia-01-hoje-desktop-1440x900.png`: Base44 Hoje estabilizado.
- `output/playwright/manager-parity/reference/rotina-dia-02-nova-atividade-modal.png`: formulário Base44 desktop.
- `output/playwright/manager-parity/reference/rotina-dia-03-minha-rotina-desktop.png`: filtros de Minha Rotina.
- `output/playwright/manager-parity/reference/rotina-dia-04-hoje-mobile-390x844.png`: card móvel Base44.
- `output/playwright/manager-parity/reference/rotina-dia-05-nova-atividade-mobile.png`: modal móvel Base44.

### Integração e estrutura

- React 19, TypeScript estrito, Vite, Tailwind v4 e Lucide pertencem ao stack existente. [Source: `docs/architecture/00-overview.md#tech-stack-alignment`]
- Organismos podem consumir hooks; apresentação não consulta Supabase diretamente. [Source: `docs/architecture/01-component-arch.md#atomic-design-layer-definitions`]
- Estado remoto e estado de UI permanecem separados; filtros/abas são locais e mutations invalidam/recarregam a fonte remota. [Source: `docs/architecture/02-data-layer.md#server-state-vs-client-state`]
- Testes ficam co-localizados e E2E cobre fluxos críticos por papel. [Source: `docs/architecture/04-testing-deploy.md#unit-tests-for-new-components`; `#integration-tests`]
- Pontos atuais: `src/features/manager/day-routine/ManagerDayRoutine.container.tsx`, `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx`, `src/features/dashboard-loja/hooks/useDashboardLojaData.ts`, hooks de lojas/feedback/PDI e tabelas tipadas em `src/types/database.generated.ts`.
- A implementação deve separar domínio (`manager-day-routine.ts`), adaptador/hook e componentes; o container apenas orquestra.

### Contrato de persistência

- `execution_actions` aceita status DB `pendente`, `em_andamento`, `concluida`, `justificada`, `cancelada`; os resultados Base44 adicionais devem ser preservados em metadata tipada e mapeados sem quebrar o constraint existente.
- `source_type` permanece em `pdi`, `feedback`, `funil` ou `manual`; registros gerenciais manuais usam `manual` e metadata `manager_daily`.
- Manager/admin podem selecionar, inserir e atualizar ações de lojas autorizadas por RLS; toda query ainda deve filtrar `store_id`, gerente responsável e período.
- Uma conclusão atualiza a ação persistida quando ela já existe; conclusão de tarefa automática cria no máximo um registro idempotente por `automatic_key`/data.

### Diferenças comprovadas antes da implementação

- MX atual fixa três prioridades; Base44 recalcula cinco prioridades pelo prazo e pelo relógio.
- MX atual possui cinco famílias automáticas; o ZIP possui onze e inclui CRM, prospecção, atualização, reuniões e compromissos.
- MX atual usa banner amber e vazio substituto; Base44 usa banner vermelho e dois textos específicos.
- MX atual conclui em um único estado; Base44 exige quatro resultados.
- MX atual achata o histórico; Base44 agrupa por data, mantém todos os estados e contagens.
- Base44 observado às 06:02 mostrou a tarefa das 18:00 como `Normal`; com relógio da aba fixado às 19:30 ela mudou para `Crítica`, comprovando classificação dinâmica.
- O clique `Acompanhar` observado navegou para `/meta-loja?acao=acompanhar`.

### Testing

- Testes do domínio devem congelar data/hora em `America/Sao_Paulo` e cobrir antes do prazo, menos de 60 minutos, após o prazo, dia anterior e dia futuro.
- Testes de família precisam cobrir inclusão e exclusão, pluralização, origem, rota/params, horário, categoria e idempotência.
- Testes de persistência devem provar criação única, quatro resultados, metadata e filtro por loja/gerente.
- Chrome é evidência obrigatória; snapshot DOM ou leitura de código isolada não aprova paridade visual.

## Project Structure Notes

- Criar domínio e componentes em `src/features/manager/day-routine/`; não importar arquivos de `/tmp` ou Downloads no bundle.
- Reutilizar `ManagerHomeReturnLink` e o shell atual; não alterar o sidebar nesta vertical.
- Evitar migration até a auditoria provar uma lacuna que metadata de `execution_actions` não consegue representar.

## Story Draft Checklist

| Categoria | Status | Observação |
|---|---|---|
| Goal & Context Clarity | PASS | Resultado, precedência, valor e relação com o epic definidos. |
| Technical Implementation Guidance | PASS | Famílias, fórmulas, persistência, arquivos e integrações identificados. |
| Reference Effectiveness | PASS | ZIP, arquivos, docs e capturas específicas apontados. |
| Self-Containment Assessment | PASS | Estados, exceções, rotas, bordas e idempotência incluídos. |
| Testing Guidance | PASS | Unitário, componente, E2E, Chrome e deploy mensuráveis. |
| CodeRabbit Integration | N/A | Desativado no core-config; revisão manual permanece obrigatória. |

**Readiness:** READY — clareza 10/10; nenhuma dependência bloqueante conhecida.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-13 | 1.0 | Story criada após auditoria ZIP e Chrome real da Rotina do Dia. | River (@sm) |
| 2026-07-13 | 1.1.0 | Development started (yolo mode) — Status: Ready → InProgress. | Dex (@dev) |

## Dev Agent Record

### Agent Model Used

Codex GPT-5 — continuação da implementação por @dev, coordenada por `aiox-master`/Orion na sessão `019f5a47-f208-7830-9433-2e697a5bbc66`.

### Debug Log References

Validação funcional retomada no Chrome autenticado local em `http://localhost:3002/rotina`:

- Modal `Nova atividade` fechado sem persistência.
- Filtro `Equipe` exibiu somente `Conferir execução do Plano de Ataque`.
- Ordenação `Origem` aplicada e restaurada no retorno.
- Ação `Cobrar` navegou para `/rotina-equipe?data=2026-07-13&acao=cobrar`.
- Retorno `Voltar para a Rotina do Dia` restaurou filtro e ordenação.
- Console sem mensagens de erro após o fluxo.

### Completion Notes List

Implementação da vertical concluída e validada localmente. Os gates técnicos e a homologação Chrome local passaram; publicação, promoção e homologação autenticada em produção permanecem pendentes de autorização explícita.

### File List

- `docs/stories/story-MX-MGR-20260713-02-rotina-dia-base44-1x1.md`
- `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md`
- `src/components/organisms/Modal.tsx`
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`
- `src/features/manager/day-routine/ManagerDayRoutine.container.tsx`
- `src/features/manager/day-routine/ManagerDayRoutineView.test.tsx`
- `src/features/manager/day-routine/ManagerDayRoutineView.tsx`
- `src/features/manager/day-routine/manager-day-routine-adapter.test.ts`
- `src/features/manager/day-routine/manager-day-routine-adapter.ts`
- `src/features/manager/day-routine/manager-day-routine-navigation.test.ts`
- `src/features/manager/day-routine/manager-day-routine-navigation.ts`
- `src/features/manager/day-routine/manager-day-routine-sources.test.ts`
- `src/features/manager/day-routine/manager-day-routine-sources.ts`
- `src/features/manager/day-routine/manager-day-routine.test.ts`
- `src/features/manager/day-routine/manager-day-routine.ts`
- `src/test/manager-day-routine.playwright.ts`
- `src/features/manager/home/ManagerHomeReturnLink.test.tsx`
- `src/features/manager/home/ManagerHomeReturnLink.tsx`
- `src/pages/ManagerDevelopment.tsx`

## QA Results

### Local QA — 2026-07-13

- `npm test`: 873 passed, 0 failed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- Chrome real local autenticado: `1440×900`, `768×1024` e `390×844` sem overflow horizontal.
- Modal mobile: dentro do viewport (`x=16`, `width=358`, `height≈537`).
- Dados reais Supabase carregados com respostas `200`; o único `400` observado ocorreu no refresh token expirado antes do login.
- Console sem erros após login e após o smoke de filtros/navegação.
- Evidências: `output/playwright/manager-parity/final/rotina-dia-local-desktop-1440x900.png`, `output/playwright/manager-parity/final/rotina-dia-local-tablet-768x1024.png`, `output/playwright/manager-parity/final/rotina-dia-local-mobile-390x844.png`, `output/playwright/manager-parity/final/rotina-dia-local-modal-mobile-390x844.png`.

### Release gate

QA local aprovado. AC18 permanece aberto até commit em `origin/main`, deploy promovido e homologação autenticada em produção; nenhuma dessas ações foi executada nesta retomada.
