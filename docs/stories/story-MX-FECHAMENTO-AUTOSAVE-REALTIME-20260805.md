# Story MX-FECHAMENTO-AUTOSAVE-REALTIME-20260805 — Autosave do fechamento, estados gerenciais e sincronização realtime

## Status

In Progress

## Executor Assignment

| Fase | Papel |
|---|---|
| Spec/arquitetura | @architect |
| Schema/RPC/backfill | @data-engineer |
| Implementação | @dev |
| UX responsiva | @ux-design-expert |
| Testes e gates | @qa |
| Push/deploy | @devops |

## Story

**Como** vendedor que preenche o fechamento diário,
**quero** que cada alteração seja gravada como rascunho no servidor e que a finalização continue sendo um ato explícito,
**para que** nada se perca em refresh/troca de dispositivo e a liderança veja o andamento em tempo real sem confundir rascunho com fechamento oficial.

## Contexto e precedência

Baseline e evidência por arquivo: `docs/reports/2026-08-05-fechamento-autosave-baseline.md`.
Especificação executável: `docs/superpowers/specs/2026-08-05-fechamento-autosave-realtime-design.md`.
Plano de execução: `docs/superpowers/plans/2026-08-05-fechamento-autosave-realtime-main.md`.

Precedência: o rascunho real já existe no banco (`submission_status='draft'`, migration `20260708124500`) e o `saveCheckin(..., isDraft=true)` já grava. O que falta é disparo automático, controle de concorrência, visibilidade e leitura gerencial correta.

## Acceptance Criteria

- **AC-1** Alterar um campo marca `Alterações não salvas` e agenda gravação de rascunho (debounce 750 ms).
- **AC-2** Confirmar uma etapa força flush imediato do rascunho.
- **AC-3** Rascunho sobrevive a refresh, fechamento de aba e troca de dispositivo.
- **AC-4** Duas sessões concorrentes não se sobrescrevem silenciosamente: revisão desatualizada recebe `DRAFT_VERSION_CONFLICT`.
- **AC-5** Gerente vê `Em andamento` com horário do último salvamento e prévia marcada como não oficial.
- **AC-6** `draft` não conta como finalizado em nenhum indicador oficial (submitted, disciplina, ranking, resumo, tendência).
- **AC-7** Venda/agendamento é gravado com o evento comercial no mesmo commit; nenhum registro principal fica sem evento.
- **AC-8** Funil gerencial atualiza sem F5 ao chegar novo `eventos_comerciais`, com fallback de polling.
- **AC-9** Mobile, tablet e desktop seguem a mesma ordem: Showroom → Carteira → Internet → Vendas.
- **AC-10** Botão "Salvar rascunho" deixa de estar oculto; status de salvamento é sempre visível com `aria-live`.
- **AC-11** Finalizar faz flush do rascunho pendente e recusa finalizar sobre revisão desatualizada.
- **AC-12** Regularização, ajuste técnico e disciplina não regridem.

## Tasks / Subtasks

- [x] T0 Preflight, baseline, tag de checkpoint, ledger
- [x] T1 Story, spec e plano
- [ ] T2 Testes RED dos 8 defeitos
- [ ] T3 Modelo canônico `ClosingOperationalState`
- [ ] T4 Migration `draft_revision` + `submit_checkin` com controle otimista
- [ ] T5/T6 Coordenador de autosave e integração em `useCheckinPage`
- [ ] T7/T8/T9 Rascunho visível, fluxo unificado, finalização segura
- [ ] T10/T11 Central do gerente e contratos dos read models
- [ ] T12/T13 Realtime de funil e agendamentos
- [ ] T14/T15 RPCs comerciais transacionais e backfill de órfãos
- [ ] T16–T19 Observabilidade, segurança, a11y, unit tests
- [ ] T20–T23 Integração, E2E, quality gate, revisão adversarial
- [ ] T24–T30 Migration em produção, push, deploy, smoke e relatório final

## Dev Notes

### Fontes normativas

- `lancamentos_diarios` é a tabela do fechamento; `submission_status ∈ {draft, on_time, late}` (constraint da migration `20260708124500`).
- `submit_checkin(p_payload jsonb)` é o único caminho de escrita do fechamento (`useCheckinsSubmit.ts:131`).
- `eventos_comerciais` é a fonte do funil (`useTeamFunnel.ts`).

### Contrato de persistência

Rascunho e fechamento oficial usam a mesma linha. A diferença é `submission_status`. `draft` nunca é oficial e nunca conta como submitted.

### Testing

`bun test` (colocado ao lado do código), Playwright para E2E. Nenhum teste existente pode ser removido ou enfraquecido — em particular `CheckinForm.test.ts`, que hoje exige a presença do botão de rascunho.

## Change Log

| Data | Alteração |
|---|---|
| 2026-08-05 | Story criada a partir do prompt-mestre; baseline e defeitos confirmados no código |

## Dev Agent Record

### Agent Model Used

claude-opus-5

### File List

(preenchido ao longo da execução)

## QA Results

(pendente)
