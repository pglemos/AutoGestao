# Spec executável — Autosave do fechamento, estados gerenciais e realtime

**Data:** 2026-08-05 · **SHA base:** `ed52e0ad` · **Branch:** `main`

## 1. Sintomas

1. Vendedor preenche, acredita ter enviado, gerente não recebe nada.
2. "Salvar rascunho" existe mas está escondido em 1 px.
3. "Confirmar etapa" muda a navegação, não persiste.
4. Central de Fechamento conta rascunho como finalizado.
5. Funil gerencial fica obsoleto até F5.
6. Evento comercial pode falhar sem invalidar a operação principal.
7. Mobile começa por Internet, desktop por Showroom.

## 2. Causa raiz

| Sintoma | Causa raiz |
|---|---|
| 1, 2, 3 | Não existe disparo automático de persistência: `saveCheckin(isDraft=true)` só é chamado por `handleSaveDraft`, ligado a um botão oculto |
| 4 | `ManagerDailyClosing.container.tsx:186` decide "submitted" por `Boolean(row.checkin)`, ignorando `submission_status` |
| 5 | `useTeamFunnel` não assina `eventos_comerciais` |
| 6 | `registrarEventoComercial` trata erro com `console.error` e retorna; call-sites não checam retorno |
| 7 | Duas implementações do fluxo: bloco `md:hidden` (Internet-first) e `FluxoFechamento` `hidden md:block` (Showroom-first) |

Causa raiz comum a 1–4: **não há um estado operacional canônico do fechamento** — cada tela deduz o seu, e uma delas deduz errado.

## 3. Escopo

Dentro: autosave do fechamento diário, controle otimista de revisão, visibilidade do rascunho, unificação do fluxo responsivo, leitura gerencial de estados, realtime do funil, atomicidade dos eventos comerciais e backfill de órfãos.

Fora: redesenho visual do fechamento, mudança nas regras de disciplina/pontuação, alterações no módulo Dono, alterações de metas.

## 4. Estados canônicos

```typescript
type ClosingOperationalState =
  | 'not_started'
  | 'draft'
  | 'submitted_on_time'
  | 'submitted_late'
  | 'regularization_pending'
  | 'regularization_approved'
  | 'regularization_rejected';

interface ClosingStateResolution {
  state: ClosingOperationalState;
  official: boolean;
  countsAsSubmitted: boolean;
  editable: boolean;
  managerLabel: string;
}
```

Regras:

| Entrada | state | official | countsAsSubmitted | editable |
|---|---|---|---|---|
| sem linha | `not_started` | false | false | true |
| `submission_status='draft'` (mesmo com `submitted_at`) | `draft` | false | false | true |
| `submission_status='on_time'` | `submitted_on_time` | true | true | false |
| `submission_status='late'` | `submitted_late` | true | true | false |
| pedido de correção `pending` | `regularization_pending` | mantém o do fechamento | mantém | false |
| pedido `approved` | `regularization_approved` | true | true | true |
| pedido `rejected` | `regularization_rejected` | mantém o do fechamento | mantém | false |
| status desconhecido | tratado como não oficial, com aviso | false | false | false |

`Boolean(checkin)` é proibido como critério de "finalizado".

## 5. Concorrência e persistência

- Colunas novas em `lancamentos_diarios`: `draft_revision BIGINT NOT NULL DEFAULT 0`, `last_draft_saved_at TIMESTAMPTZ NULL`.
- `submit_checkin` aceita `expected_draft_revision` opcional. Ausente = comportamento legado (compatibilidade durante rollout).
- Sucesso devolve `{ok:true, data:{id, draft_revision, updated_at, submission_status}}`.
- Conflito devolve `{ok:false, code:'DRAFT_VERSION_CONFLICT', data:{server_revision}}`.
- `draft_revision` é server-owned: o cliente nunca escolhe o valor, apenas informa o que conhece.
- Coordenador de autosave é serial: uma request em voo, apenas o snapshot pendente mais recente é enviado depois (latest-wins, sem fila crescente).

## 6. Segurança

- `submit_checkin` permanece `SECURITY DEFINER` com `search_path` fixo e `GRANT EXECUTE ... TO authenticated` (sem `anon`).
- Campos server-owned: `submission_status` oficial, `submitted_at`, `seller_user_id`, `store_id`, `draft_revision`.
- Novas RPCs de CRM validam `auth.uid()`, vínculo ativo, loja e ownership antes de escrever.

## 7. Rollback

- Código: `git revert` do commit de release.
- Banco: as colunas novas são aditivas e nullable/default; a RPC mantém a assinatura `(jsonb)`. Rollback = migration compensatória que volta o corpo da função, preservando colunas e dados.

## 8. Matriz requisito → task → teste

| AC | Task | Teste |
|---|---|---|
| AC-1, AC-2 | T5, T6 | `checkin-autosave.regression.test.ts`, `useCheckinPage` |
| AC-3 | T5, T6 | integração + E2E refresh |
| AC-4 | T4, T5 | teste da migration + conflito no coordenador |
| AC-5, AC-6 | T3, T10, T11 | `ManagerDailyClosing.draft-state.test.tsx`, contratos de read model |
| AC-7 | T14, T15 | `commercial-event-integrity.test.ts` |
| AC-8 | T12 | `useTeamFunnel.realtime.test.tsx` |
| AC-9 | T8 | `FluxoFechamento.regression.test.tsx` + viewports |
| AC-10 | T7 | `CheckinForm.test.ts` atualizado |
| AC-11 | T9 | finalização com flush pendente |
| AC-12 | T11, T19 | suíte existente sem regressão |
