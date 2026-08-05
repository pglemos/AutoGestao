import type { CheckinCorrectionRequest, DailyCheckin } from '@/types/database'

/**
 * Estado operacional canônico do fechamento diário.
 *
 * Antes desta função cada tela deduzia o seu: a Central de Fechamento usava
 * `Boolean(checkin)` e passou a contar rascunho como finalizado assim que o
 * autosave começou a gravar linhas `draft`. Aqui existe uma fonte única —
 * quem precisa decidir "isto conta?" pergunta a `countsAsSubmitted`, nunca à
 * existência da linha.
 *
 * Complementar a `checkin-history-state.ts`, que resolve a linha do histórico
 * do próprio vendedor (com régua de horário e ações disponíveis). Este módulo
 * responde à pergunta gerencial/oficial, sem depender do relógio.
 */
export type ClosingOperationalState =
  | 'not_started'
  | 'draft'
  | 'submitted_on_time'
  | 'submitted_late'
  | 'regularization_pending'
  | 'regularization_approved'
  | 'regularization_rejected'

export interface ClosingStateResolution {
  state: ClosingOperationalState
  /** Entra em indicador oficial (dashboard, ranking, relatório, pontuação). */
  official: boolean
  /** Conta como fechamento concluído na contagem de submitted do gerente. */
  countsAsSubmitted: boolean
  /** Vendedor ainda pode editar diretamente o formulário. */
  editable: boolean
  managerLabel: string
}

export interface ResolveClosingOperationalStateArgs {
  checkin: DailyCheckin | null | undefined
  /** Solicitação de regularização mais recente para a mesma data, ou null. */
  latestRequest?: CheckinCorrectionRequest | null
}

export const CLOSING_OPERATIONAL_STATE_LABEL: Record<ClosingOperationalState, string> = {
  not_started: 'Não iniciado',
  draft: 'Em andamento',
  submitted_on_time: 'Finalizado no prazo',
  submitted_late: 'Finalizado em atraso',
  regularization_pending: 'Regularização pendente',
  regularization_approved: 'Regularização aprovada',
  regularization_rejected: 'Regularização recusada',
}

/** `draft` é o único status de escrita não oficial aceito pelo banco. */
export function isDraftClosing(checkin: DailyCheckin | null | undefined): boolean {
  return String(checkin?.submission_status || '') === 'draft'
}

function resolveBaseState(checkin: DailyCheckin | null | undefined): {
  state: ClosingOperationalState
  official: boolean
  editable: boolean
} {
  if (!checkin) return { state: 'not_started', official: false, editable: true }
  if (isDraftClosing(checkin)) return { state: 'draft', official: false, editable: true }

  const status = String(checkin.submission_status || '')
  const late = status === 'late' || checkin.submitted_late === true || checkin.finalizado_apos_prazo === true

  if (status === 'on_time' || status === 'late') {
    return {
      state: late ? 'submitted_late' : 'submitted_on_time',
      official: true,
      editable: false,
    }
  }

  // Status desconhecido (schema à frente do cliente, dado corrompido): nunca
  // promover a oficial e nunca liberar edição às cegas.
  return { state: late ? 'submitted_late' : 'submitted_on_time', official: false, editable: false }
}

export function resolveClosingOperationalState({
  checkin,
  latestRequest = null,
}: ResolveClosingOperationalStateArgs): ClosingStateResolution {
  const base = resolveBaseState(checkin)

  if (latestRequest?.status === 'pending') {
    return {
      state: 'regularization_pending',
      official: base.official,
      countsAsSubmitted: base.official,
      editable: false,
      managerLabel: CLOSING_OPERATIONAL_STATE_LABEL.regularization_pending,
    }
  }

  if (latestRequest?.status === 'approved') {
    // A regularização aprovada substitui o fechamento: o dado passa a valer
    // oficialmente mesmo que a linha original ainda esteja como rascunho.
    return {
      state: 'regularization_approved',
      official: true,
      countsAsSubmitted: true,
      editable: true,
      managerLabel: CLOSING_OPERATIONAL_STATE_LABEL.regularization_approved,
    }
  }

  if (latestRequest?.status === 'rejected') {
    return {
      state: 'regularization_rejected',
      official: base.official,
      countsAsSubmitted: base.official,
      editable: base.editable,
      managerLabel: CLOSING_OPERATIONAL_STATE_LABEL.regularization_rejected,
    }
  }

  return {
    state: base.state,
    official: base.official,
    countsAsSubmitted: base.official,
    editable: base.editable,
    managerLabel: CLOSING_OPERATIONAL_STATE_LABEL[base.state],
  }
}

/** Atalho para read models: a linha entra nos indicadores oficiais? */
export function countsAsOfficialClosing(
  checkin: DailyCheckin | null | undefined,
  latestRequest?: CheckinCorrectionRequest | null,
): boolean {
  return resolveClosingOperationalState({ checkin, latestRequest }).countsAsSubmitted
}
