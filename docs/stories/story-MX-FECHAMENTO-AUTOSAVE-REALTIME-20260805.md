# Story MX-FECHAMENTO-AUTOSAVE-REALTIME-20260805 — Autosave do fechamento, estados gerenciais e sincronização realtime

## Status

InReview — implementação completa e banco aplicado; validação em produção bloqueada pela restrição de cota do projeto Supabase (HTTP 402 em `rest` e `auth`).

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
- [x] T2 Testes RED dos 8 defeitos
- [x] T3 Modelo canônico `ClosingOperationalState`
- [x] T4 Migration `draft_revision` + `submit_checkin` com controle otimista
- [x] T5/T6 Coordenador de autosave e integração em `useCheckinPage`
- [x] T7/T8/T9 Rascunho visível, fluxo unificado, finalização segura
- [x] T10/T11 Central do gerente e contratos dos read models
- [x] T12/T13 Realtime de funil e agendamentos
- [x] T14/T15 RPCs comerciais transacionais e backfill de órfãos
- [x] T16–T19 Observabilidade, segurança, a11y, unit tests
- [x] T20/T22 Quality gate local completo (1922 testes, build, lint, auditorias)
- [ ] T21/T28 E2E multiusuário e smoke em produção — **bloqueado**: `rest` e `auth` do projeto Supabase em HTTP 402 (`exceed_cached_egress_quota`), sem login possível
- [x] T24 Migrations aplicadas em produção (6)
- [ ] T25–T27 Push, CI e deploy — **retidos** até a produção voltar
- [x] T29/T30 Rollback documentado e relatório final

### File List

- `src/features/checkin/lib/closing-operational-state.ts` (+ teste)
- `src/features/checkin/autosave/` — coordenador, hook, status, telemetria, classificação (+ testes)
- `src/features/checkin/hooks/useCheckinPage.ts`
- `src/features/checkin/sections/CheckinForm.tsx`, `FluxoFechamento.tsx` (+ testes)
- `src/hooks/checkins/useCheckinsSubmit.ts`, `src/hooks/checkins/types.ts`
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`, `manager-closing-metrics.ts` (+ teste)
- `src/features/manager/shared/manager-metrics.ts`
- `src/features/manager/day-routine/ManagerDayRoutine.container.tsx`
- `src/features/gerente/hooks/useTeamFunnel.ts`, `team-funnel-realtime.ts` (+ teste)
- `src/features/crm/hooks/useOportunidades.ts`, `useAgendamentos.ts` (+ teste de integridade)
- `src/types/database.ts`, `src/types/database.generated.ts`
- `supabase/migrations/20260805220000` … `20260805231000` (6 migrations)
- `docs/stories/`, `docs/superpowers/`, `docs/reports/`, `.superpowers/sdd/`

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
