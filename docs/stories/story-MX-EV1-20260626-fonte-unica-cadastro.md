# Story MX-EV1-20260626 - Fonte Única de Verdade para Cadastrar Venda/Agendamentos

## Status

Ready for Review

## Story

**As a** vendedor,
**I want** que meus cadastros de venda/agendamento do Fechamento sobrevivam à troca de navegador/dispositivo,
**so that** eu não perca histórico de disciplina e funil se limpar o cache do navegador.

## Source Requirements

- Especificação Funcional — Tela Fechamento Diário, seções 9, 10, 11, 13, 26.
- PRD EV-1.7 (`docs/prd/modulo-vendedor/01-epic-fechamento.md#EV-1.7`).
- Achado de código: `CheckinCrmSection.tsx` já grava em `clientes`/`oportunidades` (Supabase, EV-1.2), mas `clientesList` (`ClienteRow[]`) exibido na tabela é só espelhado em `localStorage['mx-checkin-clientes:*']` (`useCheckinPage.ts:191-232`) — nunca reconstruído a partir do banco.

## Acceptance Criteria

1. `clientesList` passa a ser derivado de uma consulta real (`oportunidades` join `clientes`, filtrando por `seller_user_id` e pela janela de competência do fechamento) em vez de `localStorage.getItem`.
2. `tipoRegistroCalculado`/`contaParaDisciplina` continuam calculados no client via `calcularTipoRegistro` (já correto, não reescrever) — agora a partir dos dados vindos da consulta, não do objeto salvo em localStorage.
3. `localStorage` pode continuar como cache otimista de UI (resposta instantânea ao salvar antes do refetch confirmar), mas nunca como única fonte — após o refetch, os dados do banco têm prioridade.
4. Campos hoje presentes só na linha local e ausentes no banco (`observacoes`, `dataNovoAgendamento`/replanejamento) — checar schema de `oportunidades` e adicionar coluna(s) faltante(s) se necessário (`motivo_perda` já existe).
5. Sem migração de dados antigos do localStorage — não há valor de produção a recuperar; a partir do deploy, a consulta passa a ser a fonte.
6. Testes: hook/seletor que deriva `clientesList` do banco cobrindo os 5 tipos de classificação (Venda, Agendamento D+1, Agendamento do Dia, Agendamento Futuro, Perda).
7. Gates obrigatórios da story passam: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Dev Notes

- Reaproveitar `useClientes`/`useOportunidades` (`src/features/crm/hooks/`) já existentes — este slice troca a fonte de leitura da tabela do Fechamento, a escrita já está correta desde EV-1.2.
- Recomendado executar depois de EV-1.5 para já nascer compatível com `lancamento_id` oficial, mas não é bloqueante tecnicamente.
- Imports absolutos `@/*` são padrão do projeto e da Constituição AIOX. [Source: .aiox-core/constitution.md#vi-absolute-imports-should]

## Tasks / Subtasks

- [x] Criar função pura que deriva `ClienteRow[]` de `oportunidades`+`agendamentos` por vendedor/competência (AC: 1, 2).
- [x] Substituir leitura de `localStorage` por essa fonte em `useCheckinPage.ts` (AC: 1, 3 revisado — ver Completion Notes).
- [x] Persistir o agendamento vinculado em `agendamentos` (não em coluna nova de `oportunidades`) (AC: 4 revisado — ver Completion Notes).
- [x] Reescrever `handleCadastrar`/`handleEdit`/`handleDelete`/`handleSaveInline` em `CheckinCrmSection.tsx` para ler/escrever a fonte real (create vs update de oportunidade + agendamento vinculado).
- [x] Testes do seletor cobrindo as 5 classificações (AC: 6).
- [x] Rodar gates e atualizar File List / Dev Agent Record (AC: 7).

## File List

- `docs/stories/story-MX-EV1-20260626-fonte-unica-cadastro.md`
- `src/features/checkin/lib/clientes-list-from-crm.ts` (novo)
- `src/features/checkin/lib/clientes-list-from-crm.test.ts` (novo)
- `src/features/checkin/hooks/useCheckinPage.ts`
- `src/features/checkin/sections/CheckinCrmSection.tsx`
- `src/features/crm/hooks/useOportunidades.ts` (`createOportunidade` agora retorna `id`; novos `updateOportunidade`/`updateMotivoPerda`)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (aiox-master orquestrando, hat @dev)

### Debug Log References

- `npm run typecheck`, `npm run lint`, `npm test` (645/645, 0 falhas), `npm run build` — todos verdes.
- 2026-08-12: reprodução do caso do vídeo no Fechamento Diário; venda convertida de oportunidade antiga não era incluída quando `created_at`/`data_competencia` eram anteriores. A lista agora também considera `closed_at` na data operacional de São Paulo.
- 2026-08-12: leitura autenticada somente leitura no Supabase para o vendedor: 27 oportunidades e 15 agendamentos; `2026-07-28` derivou 1 linha/1 venda (`Venda`) e `2026-08-12` derivou 0/0.
- 2026-08-12: teste focado `clientes-list-from-crm.test.ts` (8 pass), `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` passaram; lint mantém 1 warning preexistente em `PdiTab.jsx:304`.
- 2026-08-12: validação renderizada local autenticada em `/fechamento-diario`, desktop e `474x850`, sem overlay, erro de console ou overflow horizontal. A suíte global do checkout limpo teve 2.768 pass/0 fail.
- 2026-08-12: validação renderizada local autenticada em `/fechamento-diario`, desktop e `474x850`, sem overlay, erro de console ou overflow horizontal. A suíte global atual teve 2.819 pass/2 fail em contratos visuais de arquivos paralelamente modificados (`Modal.tsx` e `sidebar/tokens.ts`), fora deste ajuste.
- 2026-08-12: após novas alterações paralelas no worktree, o `git diff --check` global passou a apontar apenas trailing whitespace em `ForcePasswordChange.tsx:74` e `UserCreationModal.tsx:171`; o escopo desta story permanece limpo.

### Completion Notes

- **AC4 revisado:** a premissa original do AC4/Dev Notes ("a escrita já está correta desde EV-1.2, este slice mexe só na leitura") estava **errada** — investigação mostrou que o campo "Data Agendamento" do form "+ Novo Cliente" nunca foi persistido em `oportunidades` (não existe essa coluna) nem em nenhuma outra tabela; só existia em `localStorage`. Em vez de criar uma coluna ad-hoc em `oportunidades`, optei por usar a tabela `agendamentos` já existente (FK `oportunidade_id`, já é a fonte oficial de Agendamentos D+1 usada em `crm-derived-totals.ts`) — decisão tomada antes de escrever código, evita inconsistência futura entre o que o Fechamento mostra e o resto do CRM vê.
- **AC1/AC3 revisado:** implementei sem cache otimista de localStorage — `clientesList` é um `useMemo` puro sobre `oportunidades`+`agendamentos` (ambos vindos de `useOportunidades()`/`useAgendamentos()`), e toda escrita (`handleCadastrar`/`handleSaveInline`/`handleDelete`) chama `refetchClientesList()` (que dispara os 2 `refetch()`) ao final. Não há resposta "instantânea" antes da confirmação do banco — dado que as próprias mutações já fazem `await` + refetch dentro dos hooks (~200-400ms local), a latência percebida é baixa e não justificou a complexidade extra de um cache otimista paralelo que poderia divergir do servidor.
- **Bug pré-existente corrigido de carona:** `handleCadastrar` sempre chamava `createOportunidade` mesmo ao editar um registro existente (`editingClientId` setado) — isso criava uma oportunidade duplicada no banco a cada edição, mascarado porque a tabela exibida era só o `localStorage`. Como `ClienteRow.id` agora é o `oportunidades.id` real (não mais um id local aleatório), adicionei `updateOportunidade` e troquei a lógica para create-or-update conforme `editingClientId`.
- `clientesList` é derivado por `data_competencia`, pelo evento terminal `closed_at` ou, para oportunidades legadas sem competência, por `created_at`, sempre casando com `selectedDate` na data operacional de São Paulo.
- `handleDelete` agora também apaga o `agendamentos` vinculado antes de apagar a oportunidade — o FK é `ON DELETE SET NULL`, não cascade, então sem essa exclusão explícita o agendamento ficaria órfão.
- 2026-08-12: vendas terminais passaram a usar também `closed_at` como data do Fechamento. Isso preserva `created_at` e `data_competencia` históricos, mas alinha uma oportunidade antiga convertida no dia à linha e ao contador de `Vendas Realizadas` daquele dia.
- 2026-08-12: a regressão foi coberta com oportunidade criada em `2026-06-20`, competência antiga e fechamento em `2026-06-23`; nenhuma venda real foi criada, editada ou excluída durante a validação.
- A publicação não foi executada: o `main` local está 15 commits à frente de `origin/main` e contém mudanças não relacionadas; o worktree também possui alterações paralelas não pertencentes a esta correção.

### Change Log

- 2026-06-26: Story criada a partir de PRD EV-1.7 (gerado pela Especificação Funcional — Tela Fechamento Diário).
- 2026-06-26: Validação @po — GO. Escopo bem isolado (troca de fonte de leitura, escrita já correta). Risco principal é regressão de UX (latência de refetch vs. resposta instantânea do localStorage) — cobrir com cache otimista conforme AC3. Status definido como Ready.
- 2026-06-26: Implementação concluída por @dev. Premissa do AC4 corrigida durante a investigação (escrita do agendamento nunca existiu, não só a leitura) — resolvida via tabela `agendamentos` existente em vez de coluna nova. Bug pré-existente de duplicação de oportunidade ao editar corrigido de carona. Gates verdes. Status: Ready for Review.
- 2026-06-26: QA (@qa, Quinn) — PASS. Confirmado em código: RLS `FOR ALL` de `oportunidades`/`agendamentos` cobre os fluxos de create/update/delete usados por `CheckinCrmSection.tsx`; `createOportunidade` agora retorna `id` via `.select('id').single()` (testado que a policy de SELECT pós-insert não bloqueia, já que é a mesma `FOR ALL` do seller). Ver relatório completo em `docs/reports/qa-gate-ev1-fechamento-stories-20260626.md`. Status: InReview.
 - 2026-08-12: Correção de vendas convertidas em oportunidade antiga usando `closed_at`, com validação real somente leitura e prova visual local. Status permanece InReview até a publicação isolada.

## QA Results

**Verdict:** ✅ PASS
**Relatório completo:** `docs/reports/qa-gate-ev1-fechamento-stories-20260626.md`

- `clientesList` confirmado como `useMemo` puro sobre `oportunidades`+`agendamentos`, sem leitura de localStorage residual.
- Bug de duplicação de oportunidade ao editar (pré-existente, corrigido de carona) confirmado: antes desta story, `handleCadastrar` sempre chamava `createOportunidade`, nunca `updateOportunidade` (que não existia). Agora correto.
- RLS de `oportunidades`/`agendamentos` (`FOR ALL TO authenticated` para o seller dono da linha) confirmada suficiente para todos os novos caminhos de escrita (create/update/delete de agendamento vinculado).
- `ON DELETE SET NULL` do FK `agendamentos.oportunidade_id` confirmado — `handleDelete` corretamente apaga o agendamento vinculado de forma explícita antes/junto da oportunidade, evitando órfãos.
