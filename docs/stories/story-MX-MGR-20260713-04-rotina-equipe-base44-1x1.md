# Story MX-MGR-20260713-04 — Rotina da Equipe Base44 1:1

## Status

**Em auditoria**

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
**quero** que `/rotina-equipe` reproduza integralmente a Rotina da Equipe do Base44,
**para que** eu acompanhe execução, follow-ups, atualizações, agendamentos e ações de cada vendedor usando dados oficiais da Central de Execução.

## Contexto e precedência

- Story filha do epic `docs/stories/epics/epic-modulo-gerencial-base44-rebuild.md` e sucessora do Fechamento Diário.
- A aplicação autenticada `https://mx-gerente.base44.app/rotina-equipe` é o contrato observável; a matriz versionada em `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md` registra a comparação reproduzível.
- O Base44 vence em composição, textos, fórmulas, estados, ordenação, gráfico, comparativos, modais e ações; React/Auth/Supabase/RLS permanecem infraestrutura.
- O sidebar escuro atual permanece sem alteração.
- Evidência Chrome real em 2026-07-13: Base44 exibe cabeçalho com data `11/07/2026`, busca `Vendedor...`, cards `Execução Média`, `Em Dia`, `Em Atenção`, `Críticos`, tabela `Rotina — 11/07/2026`, gráfico de evolução e comparativo de rede; o local foi atualizado para reproduzir essa estrutura e seus estados.

## Acceptance Criteria

1. `/rotina-equipe` mantém o shell e sidebar atuais e reproduz cabeçalho, subtítulo, data civil, busca por `Vendedor...` e `Atualizar`.
2. Os cards `Execução Média`, `Em Dia`, `Em Atenção` e `Críticos` reproduzem labels, valores, cores, estados e fórmulas Base44, sem usar fechamento diário como fonte substituta.
3. A tabela `Rotina — DD/MM/AAAA` reproduz as colunas `Vendedor`, `Unidade`, `Execução`, `Follow-ups`, `Atualização`, `Agendamentos`, `Status` e `Ações`, com valores oficiais e estado vazio/carregando/erro distintos.
4. Busca filtra vendedores sem perder o escopo da loja, a data altera o período da Central de Execução e `Atualizar` refaz as consultas sem recarregar a página.
5. `Ver rotina` abre o detalhe da rotina do vendedor correto, exibindo ações planejadas/executadas, origem, status, horários e retorno para a lista sem inventar atividades.
6. `Cobrar` abre confirmação Base44, envia uma única notificação/auditoria por vendedor e atualiza o estado; falhas são exibidas explicitamente e não produzem sucesso falso.
7. `Evolução da Execução Média` reproduz períodos `7 dias`, `15 dias` e `30 dias`, gráfico, estado vazio/parcial/oficial e texto de orientação do Base44.
8. `Comparativo de Execução Média` reproduz `Sua Equipe`, `Média da Rede` e `Top 25% da Rede`; ausência de snapshots oficiais exibe `—`, sem médias fabricadas no cliente.
9. Todas as consultas e mutações permanecem escopadas à loja e ao gerente autenticado; a fonte canônica é Central de Execução (`execution_actions` e contratos associados), não `lancamentos_diarios`.
10. Ações e modais são acessíveis por teclado, restauram foco, fecham por Escape e não existe overflow horizontal em `1440×900`, `768×1024` e `390×844`.
11. Testes unitários cobrem classificação, agregação, busca, datas, execução, follow-ups, estados vazios e comparativos; componentes/E2E cobrem detalhe, cobrança, retorno e erro.
12. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `git diff --check` passam.
13. Após QA, a story só é concluída com commit em `origin/main`, deployment promovido a `mxperformance.vercel.app` e homologação autenticada nos três viewports sem erro de console ou 4xx/5xx causado pela story.

## Tasks / Subtasks

- [x] 1. Fixar baseline Base44 × local no Chrome (AC: 1–10)
  - [x] Capturar desktop e mobile após conteúdo estabilizar; tablet permanece pendente.
  - [x] Registrar cards, tabela, detalhe vazio, cobrança, gráfico, comparativo e estados vazios.
- [x] 2. Portar domínio e contratos da Central de Execução (AC: 2–5, 9, 11)
  - [x] Separar ações planejadas, executadas, follow-ups, atualização e agendamentos por vendedor/data.
  - [x] Cobrir classificação, agregação e busca por testes RED/GREEN.
- [ ] 3. Reconciliar ações e notificações (AC: 5–6, 9, 11)
  - [ ] Confirmar RPCs/tabelas canônicas para detalhe, cobrança, auditoria e idempotência.
  - [x] Garantir isolamento por loja e tratamento explícito de erro no caminho de notificação.
- [x] 4. Alinhar UI, gráfico e comparativos (AC: 1–10)
  - [x] Reproduzir textos, cards, tabela, gráfico de 7/15/30 dias e comparativo de rede.
  - [x] Reproduzir modais, foco, Escape, filtros, estados e responsividade desktop/mobile Base44.
- [ ] 5. Validar e publicar (AC: 11–13)
  - [ ] Executar gates completos e QA AIOX local com E2E autenticado não omitido.
  - [ ] Entregar publicação via `@devops` no `origin/main` e promover um deployment somente após os gates.
  - [ ] Homologar novamente produção autenticada em desktop, tablet e mobile com console limpo; o canal Chrome não esteve disponível nesta retomada.

## Dev Notes

### Fontes normativas

- `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`
- `docs/architecture/MODULO_GERENCIAL_BASE44_MIGRATION.md`
- `docs/architecture/MODULO_GERENCIAL_DATA_MAPPING.md`
- `https://mx-gerente.base44.app/rotina-equipe` (Chrome autenticado)
- Evidência Chrome Base44 `https://mx-gerente.base44.app/rotina-equipe` capturada em 2026-07-13.

### Pontos atuais

- Container: `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx`.
- O local possui cards, busca, tabela, ações `Ver rotina`/`Cobrar`, data, gráfico, comparativo e modais; a paridade local foi validada no Chrome após a correção do placeholder e dos fluxos de detalhe/cobrança.
- A rotina deve continuar derivada da Central de Execução e não pode reintroduzir dependência de fechamento diário.
- Migration nova só é permitida se a auditoria comprovar lacuna real no contrato canônico.

## Testing

- Testes co-localizados com domínio e componentes; E2E autenticado no Chrome cobre refresh, filtro, detalhe, cobrança, retorno, gráfico e comparativos.
- Chrome é evidência obrigatória; capturas de spinner/loading não aprovam a story.
- O sidebar não entra no escopo de alteração visual.

## Change Log

| Date | Version | Description | Author |
|---|---|---|---|
| 2026-07-13 | 1.0 | Story criada após comparação autenticada Base44 × local da Rotina da Equipe no Chrome real. | River (@sm) |
| 2026-07-13 | 1.1 | Implementação publicada em `origin/main`; deployment Vercel e resposta HTTP da rota de produção registrados. Homologação visual final permanece pendente enquanto o canal Chrome não anexa. | Codex (@devops) |

## Dev Agent Record

### Agent Model Used

Codex com `aiox-master`/Orion coordenando implementação e QA local.

### Completion Notes List

- `execution_actions` continua sendo a fonte canônica; a série histórica respeita dias sem dados e os comparativos exibem `—` sem snapshot oficial.
- Follow-ups e Atualização são derivados da metadata oficial (`source_type`, `requires_customer_update`, `customer_updated`), sem duplicar contadores de execução.
- `Ver rotina` reproduz o vazio Base44 quando não há ação registrada; quando há dados, mostra origem, status, horário, descrição e justificativa.
- `Cobrar` abre formulário com vendedor, data e mensagem editável; o envio só ocorre após confirmação e falhas exibem erro.
- Evidência Chrome local: `output/playwright/manager-parity/local/14-rotina-equipe-mobile-after-vertical.png` e `output/playwright/manager-parity/local/15-rotina-equipe-desktop-after-vertical.png`.
- Gates locais: `npm test` (883 pass), `npm run lint` (0 erros, 22 warnings preexistentes), `npm run typecheck`, `npm run build` e `git diff --check`.
- Produção publicada no commit `225f7b139a8e4f5e54d420eaef82d9c3f1b272cf`, deployment `dpl_AsrVJp9UDcvnEvS9etjmceKbZ8hU`, alias `https://mxperformance.vercel.app`; a entrada `/rotina-equipe` respondeu `HTTP 200` e entregou `MX PERFORMANCE`/`#root`.
- Homologação visual autenticada de produção, snapshot preenchido e idempotência/auditoria da cobrança permanecem como gate de QA; nesta retomada o Chrome real estava instalado e rodando, mas o canal de controle não conseguiu anexar ao perfil.
- 2026-07-14: score oficial ligado às seis fontes canônicas por vendedor/data; série histórica passou a reutilizar o mesmo score; detalhe passou a exibir os seis componentes e denominador. Unit/component `8 pass`, suíte completa `909 pass`, typecheck/lint/build/diff-check verdes. E2E autenticado Chromium `5/5` e mobile-chrome `5/5`; story permanece em auditoria por fixture de mutação, paridade Base44 carregada e homologação final.

### File List

- `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx`
- `src/features/manager/team-routine/manager-team-routine.ts`
- `src/features/manager/team-routine/manager-team-routine.test.ts`
- `src/features/manager/team-routine/ManagerRoutineChargeModal.tsx`
- `src/features/manager/team-routine/ManagerRoutineChargeModal.test.tsx`
- `src/features/manager/team-routine/ManagerRoutineDetailModal.tsx`
- `src/features/manager/team-routine/ManagerRoutineDetailModal.test.tsx`

## QA Results

Pendente de QA.
