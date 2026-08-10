import type { CheckinCorrectionRequest, DailyCheckin } from '@/types/database'
import { isSubmittedClosing } from './active-closing-context'
import { isCheckinLateForReferenceDate } from '@/hooks/checkins/types'

// MX-22.3 (Spec §8.1): os 7 estados mínimos do Histórico de Fechamentos.
// Combina lancamentos_diarios (estado do lançamento) com a solicitação de
// regularização mais recente daquela data (quando existir) — uma única
// função pura testável, mesmo padrão de active-closing-context.ts (22.1),
// para não espalhar a regra por vários componentes.
export type HistoryRowState =
  | 'em_andamento'
  | 'finalizado'
  | 'pendente'
  | 'fora_do_horario'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'recusado'

export interface ResolveHistoryRowStateArgs {
  date: string
  checkin: DailyCheckin | null
  /** Solicitação mais recente para esta data (por created_at), ou null. */
  latestRequest: CheckinCorrectionRequest | null
  now: Date
  isToday: boolean
}

export function resolveHistoryRowState({
  date,
  checkin,
  latestRequest,
  now,
  isToday,
}: ResolveHistoryRowStateArgs): HistoryRowState {
  // Uma solicitação de regularização sempre tem precedência sobre o estado
  // bruto do lançamento: é ela quem representa o que o vendedor realmente
  // vê acontecer com a data depois de agir.
  if (latestRequest?.status === 'pending') return 'aguardando_aprovacao'
  if (latestRequest?.status === 'approved') return 'aprovado'
  if (latestRequest?.status === 'rejected') return 'recusado'

  // Finalizado independe de on_time/late: o AUTO-DECISION original (§8.1)
  // restringia a on_time, mas isso deixaria um lançamento finalizado-porém-
  // tardio (só alcançável por clock skew do cliente, ver isCheckinLateForReferenceDate
  // em 22.2) sem estado nenhum. isSubmittedClosing já é a fonte de verdade
  // de "isto foi mesmo enviado" — decisão registrada aqui, não silenciosa.
  if (isSubmittedClosing(checkin)) return 'finalizado'

  if (isToday) return 'em_andamento'

  // Sem lançamento oficial e sem solicitação: distinguir "ainda dá tempo de
  // enviar no prazo" de "só resta regularizar", reaproveitando o mesmo
  // corte de 12:00 (SP) de reference_date+1 já usado em 22.1/22.2 — não
  // inventar uma segunda régua de tempo.
  return isCheckinLateForReferenceDate(date, now) ? 'fora_do_horario' : 'pendente'
}

export const HISTORY_ROW_STATE_LABEL: Record<HistoryRowState, string> = {
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  pendente: 'Pendente de Fechamento',
  fora_do_horario: 'Fora do Horário',
  aguardando_aprovacao: 'Aguardando Aprovação',
  aprovado: 'Regularizado Aprovado',
  recusado: 'Regularização Recusada',
}

// MX-22.3 (Spec §8.2): ações disponíveis por estado. `Aguardando aprovação`
// nunca oferece Ajustar/Regularizar — evitar colidir com o guard de
// duplicidade `pending` do servidor (solicitar_regularizacao_fechamento).
export type HistoryRowAction =
  | 'ver_detalhes'
  | 'ajustar'
  | 'regularizar'
  | 'ver_solicitacao'
  | 'ver_versao_original'
  | 'ver_versao_aprovada'
  | 'ver_auditoria'
  | 'ver_motivo_recusa'
  | 'criar_nova_versao'

export function actionsForHistoryRowState(state: HistoryRowState): HistoryRowAction[] {
  switch (state) {
    case 'finalizado':
      return ['ver_detalhes', 'ajustar']
    case 'pendente':
    case 'fora_do_horario':
      return ['regularizar']
    case 'aguardando_aprovacao':
      return ['ver_solicitacao']
    case 'aprovado':
      return ['ver_versao_original', 'ver_versao_aprovada', 'ver_auditoria']
    case 'recusado':
      return ['ver_motivo_recusa', 'criar_nova_versao']
    case 'em_andamento':
      return []
  }
}

/** Solicitação mais recente (por created_at) para um checkin_id, ou null. */
export function latestRequestForCheckin(
  requests: CheckinCorrectionRequest[],
  checkinId: string | undefined,
): CheckinCorrectionRequest | null {
  if (!checkinId) return null
  const forCheckin = requests.filter(r => r.checkin_id === checkinId)
  if (forCheckin.length === 0) return null
  return forCheckin.reduce((latest, r) =>
    new Date(r.created_at).getTime() > new Date(latest.created_at).getTime() ? r : latest,
  )
}

/**
 * Solicitação mais recente (por created_at) para uma data de referência.
 * Usado como fallback quando não existe checkin 'daily' para a data (ex: produção
 * zero retroativa que criou apenas um placeholder 'historical').
 */
export function latestRequestForDate(
  requests: CheckinCorrectionRequest[],
  referenceDate: string,
): CheckinCorrectionRequest | null {
  const forDate = requests.filter(r => {
    const reqDate = (r.requested_values as Record<string, unknown>)?.reference_date
    return reqDate === referenceDate
  })
  if (forDate.length === 0) return null
  return forDate.reduce((latest, r) =>
    new Date(r.created_at).getTime() > new Date(latest.created_at).getTime() ? r : latest,
  )
}
